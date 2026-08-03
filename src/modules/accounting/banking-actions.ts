"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";

import {
  mapAccountingError,
} from "./operational-helpers";
import {
  markBankAccountInactive,
  saveManualBankAccount,
  type BankingManageInput,
} from "./banking-service";
import {
  commitBankStatementImport,
  previewBankStatementImport,
} from "./banking-statements-service";
import type {
  BankStatementDateFormat,
  BankStatementPreviewConfig,
} from "./banking-import";

type ActionResponse = { ok: true; data?: unknown } | { ok: false; error: string };

function safeBankingActionError(error: unknown) {
  return mapAccountingError(error).message;
}

async function requireBankingSession() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  if (!session.user.orgId) {
    throw new Error("Missing organisation config");
  }
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, orgId: true, branchId: true },
  });
  if (!user?.orgId) {
    throw new Error("Missing organisation config");
  }
  return user;
}

function parseStatementConfig(formData: FormData) {
  const rawDateFormat = String(formData.get("dateFormat") ?? "").trim();
  const dateFormat: BankStatementDateFormat | null =
    rawDateFormat === "DD/MM/YYYY" ||
    rawDateFormat === "MM/DD/YYYY" ||
    rawDateFormat === "YYYY-MM-DD"
      ? rawDateFormat
      : null;
  return {
    headerRowIndex: Number(formData.get("headerRowIndex") ?? 1),
    dateFormat,
    decimalSeparator:
      String(formData.get("decimalSeparator") ?? ".").trim() === "," ? "," : ".",
    statementStart: String(formData.get("statementStart") ?? "").trim() || null,
    statementEnd: String(formData.get("statementEnd") ?? "").trim() || null,
    openingBalance: String(formData.get("openingBalance") ?? "").trim() || null,
    closingBalance: String(formData.get("closingBalance") ?? "").trim() || null,
    columns: {
      dateColumn: String(formData.get("dateColumn") ?? "").trim(),
      descriptionColumn: String(formData.get("descriptionColumn") ?? "").trim(),
      referenceColumn: String(formData.get("referenceColumn") ?? "").trim() || null,
      debitColumn: String(formData.get("debitColumn") ?? "").trim() || null,
      creditColumn: String(formData.get("creditColumn") ?? "").trim() || null,
      amountColumn: String(formData.get("amountColumn") ?? "").trim() || null,
      balanceColumn: String(formData.get("balanceColumn") ?? "").trim() || null,
      currencyColumn: String(formData.get("currencyColumn") ?? "").trim() || null,
    },
  } satisfies BankStatementPreviewConfig;
}

export async function saveManualBankAccountAction(
  input: BankingManageInput,
): Promise<ActionResponse> {
  try {
    const user = await requireBankingSession();
    await requirePermission(user.id, "accounting.settings.manage");

    const result = await saveManualBankAccount(
      user.orgId!,
      user.id,
      user.branchId ?? null,
      input,
    );

    revalidatePath("/accounting/banking");
    if (input.bankAccountId) {
      revalidatePath(`/accounting/banking/${input.bankAccountId}`);
    }
    return { ok: true, data: result };
  } catch (error: unknown) {
    return { ok: false, error: safeBankingActionError(error) };
  }
}

export async function markBankAccountInactiveAction(input: {
  bankAccountId: string;
  reason: string;
}): Promise<ActionResponse> {
  try {
    const user = await requireBankingSession();
    await requirePermission(user.id, "accounting.settings.manage");

    const result = await markBankAccountInactive(
      user.orgId!,
      user.id,
      user.branchId ?? null,
      input.bankAccountId,
      input.reason,
    );

    revalidatePath("/accounting/banking");
    revalidatePath(`/accounting/banking/${input.bankAccountId}`);
    return { ok: true, data: result };
  } catch (error: unknown) {
    return { ok: false, error: safeBankingActionError(error) };
  }
}

export async function previewBankStatementImportAction(
  formData: FormData,
): Promise<ActionResponse> {
  try {
    const user = await requireBankingSession();
    await requirePermission(user.id, "accounting.settings.manage");
    const bankAccountId = String(formData.get("bankAccountId") ?? "").trim();
    const fileValue = formData.get("file");
    const storedFileKey = String(formData.get("storedFileKey") ?? "").trim() || undefined;
    const storedDisplayName =
      String(formData.get("storedDisplayName") ?? "").trim() || undefined;
    const storedFileHash = String(formData.get("storedFileHash") ?? "").trim() || undefined;

    const result = await previewBankStatementImport({
      orgId: user.orgId!,
      actorId: user.id,
      branchId: user.branchId ?? null,
      bankAccountId,
      config: parseStatementConfig(formData),
      file: fileValue instanceof File && fileValue.size > 0 ? fileValue : undefined,
      storedFileKey,
      storedDisplayName,
      storedFileHash,
    });

    return { ok: true, data: result };
  } catch (error: unknown) {
    return { ok: false, error: safeBankingActionError(error) };
  }
}

export async function commitBankStatementImportAction(
  formData: FormData,
): Promise<ActionResponse> {
  try {
    const user = await requireBankingSession();
    await requirePermission(user.id, "accounting.settings.manage");
    const bankAccountId = String(formData.get("bankAccountId") ?? "").trim();
    const storedFileKey = String(formData.get("storedFileKey") ?? "").trim();
    const storedDisplayName = String(formData.get("storedDisplayName") ?? "").trim();
    const storedFileHash = String(formData.get("storedFileHash") ?? "").trim();

    const result = await commitBankStatementImport({
      orgId: user.orgId!,
      actorId: user.id,
      branchId: user.branchId ?? null,
      bankAccountId,
      config: parseStatementConfig(formData),
      storedFileKey,
      storedDisplayName,
      storedFileHash,
    });

    revalidatePath("/accounting/banking");
    revalidatePath(`/accounting/banking/${bankAccountId}`);
    return { ok: true, data: result };
  } catch (error: unknown) {
    return { ok: false, error: safeBankingActionError(error) };
  }
}
