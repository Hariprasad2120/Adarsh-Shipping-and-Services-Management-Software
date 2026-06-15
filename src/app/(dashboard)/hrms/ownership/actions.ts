"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";

async function requireAccess() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  await requirePermission(session.user.id, "hrms.hierarchy.manage");
  return session;
}

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function refreshPaths() {
  revalidatePath("/hrms/ownership");
  revalidatePath("/hrms/employees");
}

export async function assignEmployeesToTlAction(formData: FormData): Promise<void> {
  await requireAccess();
  const tlId = text(formData, "tlId");
  const employeeIds = formData
    .getAll("employeeId")
    .filter((v): v is string => typeof v === "string" && v.length > 0);

  if (!tlId) throw new Error("Choose a TL");
  const tl = await db.user.findFirst({
    where: { id: tlId, active: true, roles: { some: { role: { name: "TL" } } } },
  });
  if (!tl) throw new Error("Choose an active TL");
  if (employeeIds.length === 0) throw new Error("Choose at least one employee");

  await db.user.updateMany({
    where: { id: { in: employeeIds }, active: true },
    data: { tlId },
  });

  refreshPaths();
}

export async function unassignEmployeeFromTlAction(formData: FormData): Promise<void> {
  await requireAccess();
  const employeeId = text(formData, "employeeId");
  if (!employeeId) throw new Error("Missing employee ID");

  await db.user.update({
    where: { id: employeeId },
    data: { tlId: null },
  });

  refreshPaths();
}

export async function assignTlsToManagerAction(formData: FormData): Promise<void> {
  await requireAccess();
  const managerId = text(formData, "managerId");
  const tlIds = formData
    .getAll("tlId")
    .filter((v): v is string => typeof v === "string" && v.length > 0);

  if (!managerId) throw new Error("Choose a Manager");
  const manager = await db.user.findFirst({
    where: { id: managerId, active: true, roles: { some: { role: { name: "Manager" } } } },
  });
  if (!manager) throw new Error("Choose an active Manager");
  if (tlIds.length === 0) throw new Error("Choose at least one TL");

  await db.user.updateMany({
    where: { id: { in: tlIds }, active: true },
    data: { managerId },
  });

  refreshPaths();
}

export async function unassignTlFromManagerAction(formData: FormData): Promise<void> {
  await requireAccess();
  const tlId = text(formData, "tlId");
  if (!tlId) throw new Error("Missing TL ID");

  await db.user.update({
    where: { id: tlId },
    data: { managerId: null },
  });

  refreshPaths();
}
