import "dotenv/config";
import XLSX from "xlsx";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
} as ConstructorParameters<typeof PrismaClient>[0]);

const DEFAULT_FILE = "C:/Users/SilverCloud/Documents/Data Excel/User_Download_08062026_105614_File.xlsx";
const APPLY = process.argv.includes("--apply");
const SOURCE_FILE = process.argv.find((arg) => arg.endsWith(".xlsx")) ?? DEFAULT_FILE;
const MANUAL_MATCHES = new Map<string, { currentEmail?: string; currentName?: string }>([
  ["dineshan pm", { currentEmail: "mohandineshan@gmail.com" }],
  ["goswami p p", { currentName: "Patit Paban Goswami" }],
  ["hari haran", { currentName: "Hari Haran V" }],
  ["sathya moorthy", { currentName: "Sathiya Moorhty Dhanasekaran" }],
]);

type ExcelUser = {
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  status: string;
};

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function buildFirstLastInitial(fullName: string) {
  const parts = normalize(fullName).split(" ").filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1].charAt(0)}`;
}

function normalizeAlias(value: string) {
  return normalize(value).replace(/\b([a-z])\./g, "$1");
}

function readExcelUsers(filePath: string): ExcelUser[] {
  const workbook = XLSX.readFile(filePath, { cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null, raw: false });

  return rows
    .map((row) => {
      const firstName = String(row["First Name [Required]"] ?? "").trim();
      const lastName = String(row["Last Name [Required]"] ?? "").trim();
      const email = String(row["Email Address [Required]"] ?? "").trim().toLowerCase();
      const status = String(row["Status [READ ONLY]"] ?? "").trim();
      return {
        firstName,
        lastName,
        fullName: `${firstName} ${lastName}`.trim().replace(/\s+/g, " "),
        email,
        status,
      };
    })
    .filter((user) => user.email);
}

async function main() {
  const excelUsers = readExcelUsers(SOURCE_FILE);
  const users = await db.user.findMany({
    select: {
      id: true,
      orgId: true,
      name: true,
      email: true,
      active: true,
      roles: { select: { roleId: true, role: { select: { name: true } } } },
    },
    orderBy: { name: "asc" },
  });

  const employeeRoles = await db.role.findMany({
    where: { name: "Employee" },
    select: { id: true, orgId: true },
  });

  const userByEmail = new Map(users.map((user) => [user.email.toLowerCase(), user]));
  const usersByName = new Map<string, typeof users>();
  const usersByShortName = new Map<string, typeof users>();

  for (const user of users) {
    const nameKey = normalize(user.name);
    const shortKey = buildFirstLastInitial(user.name);
    usersByName.set(nameKey, [...(usersByName.get(nameKey) ?? []), user]);
    usersByShortName.set(shortKey, [...(usersByShortName.get(shortKey) ?? []), user]);
  }

  const updates: Array<{
    id: string;
    name: string;
    fromEmail: string;
    toEmail: string;
    fromActive: boolean;
    toActive: boolean;
    addEmployeeRole: boolean;
  }> = [];
  const unchanged: Array<{ name: string; email: string }> = [];
  const unmatchedExcel: ExcelUser[] = [];
  const ambiguousExcel: Array<{
    excel: ExcelUser;
    candidates: Array<{
      id: string;
      name: string;
      email: string;
      active: boolean;
      roles: string[];
    }>;
  }> = [];
  const seenUserIds = new Set<string>();

  for (const excelUser of excelUsers) {
    const direct = userByEmail.get(excelUser.email);
    const exactNameCandidates = usersByName.get(normalize(excelUser.fullName)) ?? [];
    const shortNameCandidates = usersByShortName.get(buildFirstLastInitial(excelUser.fullName)) ?? [];
    const manualMatch = MANUAL_MATCHES.get(normalizeAlias(excelUser.fullName));
    const manualCandidates = manualMatch
      ? users.filter((user) =>
        (manualMatch.currentEmail && user.email.toLowerCase() === manualMatch.currentEmail.toLowerCase()) ||
        (manualMatch.currentName && normalize(user.name) === normalize(manualMatch.currentName)))
      : [];

    const candidatePool = [
      ...(direct ? [direct] : []),
      ...manualCandidates,
      ...exactNameCandidates,
      ...shortNameCandidates,
    ].filter((candidate, index, array) => array.findIndex((item) => item.id === candidate.id) === index);

    if (candidatePool.length === 0) {
      unmatchedExcel.push(excelUser);
      console.log(`[NOT FOUND] ${excelUser.fullName}: user not found`);
      continue;
    }

    if (candidatePool.length > 1 && !direct && manualCandidates.length !== 1 && exactNameCandidates.length !== 1) {
      ambiguousExcel.push({
        excel: excelUser,
        candidates: candidatePool.map((candidate) => ({
          id: candidate.id,
          name: candidate.name,
          email: candidate.email,
          active: candidate.active,
          roles: candidate.roles.map((role) => role.role.name),
        })),
      });
      continue;
    }

    const user = direct ?? exactNameCandidates[0] ?? shortNameCandidates[0];
    if (!user || seenUserIds.has(user.id)) continue;
    seenUserIds.add(user.id);

    const toActive = excelUser.status.toLowerCase() === "active";
    const hasAnyRole = user.roles.length > 0;
    const employeeRole = employeeRoles.find((role) => role.orgId === user.orgId);
    const addEmployeeRole = !hasAnyRole && Boolean(employeeRole);

    if (user.email === excelUser.email && !addEmployeeRole) {
      unchanged.push({ name: user.name, email: user.email });
      continue;
    }

    updates.push({
      id: user.id,
      name: user.name,
      fromEmail: user.email,
      toEmail: excelUser.email,
      fromActive: user.active,
      toActive: user.active, // Keep active state unchanged
      addEmployeeRole,
    });
  }

  const summary = {
    sourceFile: SOURCE_FILE,
    apply: APPLY,
    excelUsers: excelUsers.length,
    matchedUsers: updates.length + unchanged.length,
    updates: updates.length,
    unchanged: unchanged.length,
    unmatchedExcel: unmatchedExcel.length,
    ambiguousExcel: ambiguousExcel.length,
    sampleUpdates: updates.slice(0, 20),
    sampleUnmatchedExcel: unmatchedExcel.slice(0, 20),
    sampleAmbiguousExcel: ambiguousExcel.slice(0, 20),
  };

  console.log(JSON.stringify(summary, null, 2));

  if (!APPLY) {
    return;
  }

  for (const update of updates) {
    await db.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: update.id },
        data: {
          email: update.toEmail,
        },
      });
      console.log(`[UPDATE] Mapped name "${update.name}" -> Email: "${update.toEmail}"`);

      if (update.addEmployeeRole) {
        const user = users.find((item) => item.id === update.id);
        const employeeRole = employeeRoles.find((role) => role.orgId === user?.orgId);
        if (employeeRole) {
          await tx.userRole.upsert({
            where: { userId_roleId: { userId: update.id, roleId: employeeRole.id } },
            update: {},
            create: { userId: update.id, roleId: employeeRole.id },
          });
        }
      }
    });
  }

  console.log(`Applied ${updates.length} user updates.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
