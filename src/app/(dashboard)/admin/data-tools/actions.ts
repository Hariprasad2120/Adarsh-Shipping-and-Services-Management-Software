"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import * as XLSX from "xlsx";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

type ImportResult = { ok: true; message: string } | { ok: false; error: string };
type Row = Record<string, unknown>;

const ROLES = new Set(["ADMIN", "HR", "EMPLOYEE", "REVIEWER", "MANAGER", "MANAGEMENT", "PARTNER"]);
const ACCOUNT_STATUSES = new Set(["Pending", "Active", "Disabled"]);

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  // Check roles
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: { roles: { include: { role: true } } },
  });
  const roles = user?.roles.map((r) => r.role.name) ?? [];
  const isAdmin = roles.some((r) => ["Admin", "HR", "Management", "Director"].includes(r));

  if (!isAdmin) {
    throw new Error("Forbidden");
  }
  return session;
}

function sheet(wb: XLSX.WorkBook, name: string): Row[] {
  const ws = wb.Sheets[name];
  if (!ws) throw new Error(`Missing sheet: ${name}`);
  return XLSX.utils.sheet_to_json<Row>(ws, { defval: "" });
}

function value(row: Row, key: string) {
  return String(row[key] ?? "").trim();
}

function required(row: Row, key: string) {
  const v = value(row, key);
  if (!v) throw new Error(`Missing required field: ${key}`);
  return v;
}

function email(row: Row, key: string) {
  const v = value(row, key).toLowerCase();
  if (v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) throw new Error(`Invalid email in ${key}: ${v}`);
  return v;
}

function boolYes(row: Row, key: string) {
  return value(row, key).toLowerCase() === "yes";
}

function dateValue(row: Row, key: string) {
  const raw = row[key];
  if (raw instanceof Date) return raw;
  if (typeof raw === "number") {
    const parsed = XLSX.SSF.parse_date_code(raw);
    return new Date(parsed.y, parsed.m - 1, parsed.d);
  }
  const d = new Date(required(row, key));
  if (Number.isNaN(d.getTime())) throw new Error(`Invalid date in ${key}`);
  return d;
}

function employeeNumber(employeeId: string) {
  const numeric = Number(employeeId);
  return Number.isInteger(numeric) ? numeric : undefined;
}

export async function importWorkbookAction(formData: FormData): Promise<ImportResult> {
  try {
    const session = await requireAdmin();
    const file = formData.get("workbook");
    if (!(file instanceof File) || file.size === 0) {
      return { ok: false, error: "Choose an .xlsx workbook to import." };
    }

    const orgId = session.user.orgId;
    if (!orgId) return { ok: false, error: "Organisation missing" };

    const buffer = Buffer.from(await file.arrayBuffer());
    const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });
    const users = sheet(wb, "Users");
    const accessRows = sheet(wb, "Login Access");

    // Perform validation
    const ids = new Set<string>();
    const emails = new Set<string>();
    for (const row of users) {
      const employeeId = required(row, "employee_id");
      const officialEmail = email(row, "official_email");
      const role = required(row, "role").toUpperCase();
      if (ids.has(employeeId)) throw new Error(`Duplicate employee_id: ${employeeId}`);
      if (emails.has(officialEmail)) throw new Error(`Duplicate official_email: ${officialEmail}`);
      if (!ROLES.has(role)) throw new Error(`Invalid role for ${employeeId}: ${role}`);
      ids.add(employeeId);
      emails.add(officialEmail);
    }

    const accessByEmployee = new Map(accessRows.map((row) => [required(row, "employee_id"), row]));
    const defaultPasswordHash = await bcrypt.hash("Welcome@12345", 10);

    let imported = 0;
    for (const row of users) {
      const employeeId = required(row, "employee_id");
      const access = accessByEmployee.get(employeeId);
      if (!access) throw new Error(`Missing Login Access row for ${employeeId}`);
      const officialEmail = email(row, "official_email");
      const role = required(row, "role").toUpperCase();
      const accountStatus = required(access, "account_status");
      if (!ACCOUNT_STATUSES.has(accountStatus)) {
        throw new Error(`Invalid account_status for ${employeeId}: ${accountStatus}`);
      }

      await db.$transaction(async (tx) => {
        // Upsert User
        const user = await tx.user.upsert({
          where: { email: officialEmail },
          update: {
            name: required(row, "full_name"),
            active: accountStatus === "Active",
            passkeySetupRequired: boolYes(access, "force_passkey_setup") || boolYes(access, "passkey_required"),
            personalPhone: value(row, "phone_number") || null,
            employeeNumber: employeeNumber(employeeId),
            employmentType: required(row, "employment_type"),
            designation: required(row, "designation"),
          },
          create: {
            orgId,
            email: officialEmail,
            passwordHash: defaultPasswordHash,
            name: required(row, "full_name"),
            active: accountStatus === "Active",
            passkeySetupRequired: true,
            personalPhone: value(row, "phone_number") || null,
            employeeNumber: employeeNumber(employeeId),
            employmentType: required(row, "employment_type"),
            designation: required(row, "designation"),
          },
        });

        // Link UserRole
        let dbRole = await tx.role.findFirst({
          where: { orgId, name: role },
        });
        if (!dbRole) {
          const titleCasedRole = role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
          dbRole = await tx.role.findFirst({
            where: { orgId, name: titleCasedRole },
          });
        }
        if (dbRole) {
          await tx.userRole.upsert({
            where: { userId_roleId: { userId: user.id, roleId: dbRole.id } },
            update: {},
            create: { userId: user.id, roleId: dbRole.id },
          });
        }

        // Upsert Employment Record
        const joinDate = dateValue(row, "date_of_joining");
        await tx.employmentRecord.upsert({
          where: { userId: user.id },
          update: { joinDate },
          create: { userId: user.id, joinDate },
        });
      });
      imported++;
    }

    // Create SecurityEvent
    await db.securityEvent.create({
      data: {
        userId: session.user.id,
        event: "FRESH_DATA_IMPORT",
        outcome: "SUCCESS",
        details: { fileName: file.name, importedUsers: imported },
      },
    });

    revalidatePath("/admin/data-tools");
    revalidatePath("/hrms/employees");
    return { ok: true, message: `Imported ${imported} users from ${file.name}.` };
  } catch (error: any) {
    return { ok: false, error: error.message || "Import failed." };
  }
}
