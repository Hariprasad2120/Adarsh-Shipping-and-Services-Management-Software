"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { db } from "@/lib/db";

type ActionResponse = { ok: true } | { ok: false; error: string };

function asNumber(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

async function nextChallanNumber(orgId: string) {
  const count = await db.payrollTaxChallan.count({ where: { orgId } });
  return `TAX-CHALLAN-${String(count + 1).padStart(5, "0")}`;
}

export async function listPayrollTaxChallans(orgId: string) {
  const challans = await db.payrollTaxChallan.findMany({
    where: { orgId },
    include: { associations: true },
    orderBy: { createdAt: "desc" },
  });
  return challans.map((c) => {
    const associatedAmount = c.associations.reduce((sum, a) => sum + asNumber(a.amount), 0);
    return {
      id: c.id,
      challanNumber: c.challanNumber,
      amount: c.amount,
      paymentDate: c.paymentDate.toISOString(),
      reference: c.reference,
      associatedAmount,
      unassociatedAmount: Math.max(0, c.amount - associatedAmount),
      isFullyAssociated: associatedAmount >= c.amount - 0.01,
      associations: c.associations.map((a) => ({
        id: a.id,
        liabilityMonth: a.liabilityMonth.toISOString(),
        amount: a.amount,
      })),
    };
  });
}

export async function recordTaxChallanAction(input: {
  amount: number;
  paymentDate: string;
  reference?: string;
}): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    await requirePermission(session.user.id, "accounting.integration.post");

    if (!(input.amount > 0)) return { ok: false, error: "Amount must be greater than zero" };

    const challanNumber = await nextChallanNumber(orgId);
    await db.payrollTaxChallan.create({
      data: {
        orgId,
        challanNumber,
        amount: input.amount,
        paymentDate: new Date(input.paymentDate),
        reference: input.reference?.trim() || null,
      },
    });

    revalidatePath("/payroll/taxes-and-forms/tax-payments");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to record challan" };
  }
}

export async function associateChallanAction(input: {
  challanId: string;
  liabilityMonth: string;
  amount: number;
}): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Unauthorized" };
    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Missing organisation config" };
    await requirePermission(session.user.id, "accounting.integration.post");

    if (!(input.amount > 0)) return { ok: false, error: "Association amount must be greater than zero" };

    const challan = await db.payrollTaxChallan.findFirst({
      where: { id: input.challanId, orgId },
      include: { associations: true },
    });
    if (!challan) return { ok: false, error: "Challan not found" };

    const alreadyAssociated = challan.associations.reduce((sum, a) => sum + asNumber(a.amount), 0);
    const remaining = challan.amount - alreadyAssociated;
    if (input.amount > remaining + 0.01) {
      return { ok: false, error: `Association exceeds unassociated challan balance of ${remaining.toFixed(2)}` };
    }

    await db.payrollTaxChallanAssociation.create({
      data: {
        challanId: input.challanId,
        liabilityMonth: new Date(input.liabilityMonth),
        amount: input.amount,
      },
    });

    revalidatePath("/payroll/taxes-and-forms/tax-payments");
    revalidatePath("/payroll/taxes-and-forms/tax-liabilities");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to associate challan" };
  }
}
