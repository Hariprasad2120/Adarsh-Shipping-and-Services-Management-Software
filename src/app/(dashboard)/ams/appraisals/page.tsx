import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { redirect } from "next/navigation";
import {
  Badge,
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableEmpty,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
} from "@/components/data-table";
import { auth } from "@/lib/auth";
import { getNow } from "@/lib/clock";
import { requirePermission } from "@/lib/rbac";
import { listAppraisals, listAppraisalEligibleUsers, listCycles, listDueAppraisals } from "@/modules/ams/service";
import { EligibleAppraisalFilterMenu, InProgressFilterMenu } from "./appraisal-filters-menu";
import { DueThisMonthRow } from "./due-this-month-row";

type Appraisals = Awaited<ReturnType<typeof listAppraisals>>;
type Cycles = Awaited<ReturnType<typeof listCycles>>;

const STAGE_COLOR: Record<string, string> = {
  DUE_NOTIFIED: "bg-yellow-50 text-yellow-700",
  REVIEWERS_ASSIGNED: "bg-blue-50 text-blue-700",
  SELF_ASSESSMENT_OPEN: "bg-purple-50 text-purple-700",
  REVIEWER_RATING: "bg-indigo-50 text-indigo-700",
  MANAGEMENT_REVIEW: "bg-orange-50 text-orange-700",
  MEETING_PENDING: "bg-cyan-50 text-cyan-700",
  MEETING_LIVE: "bg-green-50 text-green-700",
  HIKE_FINALISATION: "bg-pink-50 text-pink-700",
  CLOSED: "bg-gray-100 text-gray-500",
};

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function parseDueMonth(value: string | undefined, fallbackYear: number, fallbackMonth: number) {
  if (!value) return { year: fallbackYear, month: fallbackMonth };

  const match = value.match(/^(\d{4})-(\d{2})$/);
  if (!match) return { year: fallbackYear, month: fallbackMonth };

  const [, rawYear, rawMonth] = match;
  const year = Number(rawYear);
  const month = Number(rawMonth) - 1;

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 0 || month > 11) {
    return { year: fallbackYear, month: fallbackMonth };
  }

  return { year, month };
}

export default async function AppraisalsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  await requirePermission(session.user.id, "ams.appraisal.assign_reviewers");

  const sp = await searchParams;
  const now = await getNow();
  const defaultYear = now.getFullYear();
  const defaultMonth = now.getMonth();
  const isDueFilterApplied = Boolean(sp.dueMonth);
  const { year, month } = parseDueMonth(sp.dueMonth, defaultYear, defaultMonth);

  const [appraisals, cycles, dueThisMonthRows, eligibleDueRows, allEmployees] = await Promise.all([
    listAppraisals(session.user.orgId!, {
      cycleId: sp.cycleId,
      stage: sp.stage,
    }),
    listCycles(session.user.orgId!),
    listDueAppraisals(session.user.orgId!, defaultYear, defaultMonth),
    isDueFilterApplied ? listDueAppraisals(session.user.orgId!, year, month) : Promise.resolve([]),
    listAppraisalEligibleUsers(session.user.orgId!),
  ]);

  const dueThisMonthRowsSafe = dueThisMonthRows.map((row) => ({
    ...row,
    dueDate: row.dueDate.toISOString(),
  }));
  const eligibleDueRowsSafe = eligibleDueRows.map((row) => ({
    ...row,
    dueDate: row.dueDate.toISOString(),
  }));
  const allEmployeesRows = allEmployees.map((user) => ({
    employeeId: user.id,
    employeeName: user.name,
    designation: user.designation,
    department: user.department?.name ?? null,
    dueDate: null,
    kind: null,
    appraisalId: null,
  }));
  const eligibleRowsToShow = isDueFilterApplied ? eligibleDueRowsSafe : allEmployeesRows;

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="ds-h2 text-gray-900">Due This Month</h2>
          <span className="text-sm text-gray-500">
            - {MONTH_NAMES[defaultMonth]} {defaultYear}
          </span>
          {dueThisMonthRowsSafe.length > 0 && (
            <Badge className="bg-red-50 text-red-600">{dueThisMonthRowsSafe.length}</Badge>
          )}
        </div>

        <DataTable>
          <DataTableHeader>
            <tr>
              {["Employee", "Designation", "Department", "Type", "Due Date", ""].map((header) => (
                <DataTableHead key={header}>{header}</DataTableHead>
              ))}
            </tr>
          </DataTableHeader>
          <DataTableBody>
            {dueThisMonthRowsSafe.length === 0 ? (
              <DataTableEmpty colSpan={6} message="No appraisals due this month." className="py-6 text-sm" />
            ) : (
              dueThisMonthRowsSafe.map((row) => <DueThisMonthRow key={row.employeeId} row={row} />)
            )}
          </DataTableBody>
        </DataTable>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="ds-h2 text-gray-900">In Progress</h2>
          <InProgressFilterMenu cycles={cycles as Cycles} stageOptions={Object.keys(STAGE_COLOR)} />
        </div>

        {sp.cycleId || sp.stage ? (
          <div className="flex flex-wrap gap-2">
            {sp.cycleId ? (
              <Badge className="bg-cyan-50 text-cyan-700">
                Cycle: {(cycles as Cycles).find((cycle) => cycle.id === sp.cycleId)?.name ?? "Selected"}
              </Badge>
            ) : null}
            {sp.stage ? (
              <Badge className="bg-cyan-50 text-cyan-700">
                Stage: {sp.stage.replace(/_/g, " ")}
              </Badge>
            ) : null}
          </div>
        ) : null}

        <DataTable>
          <DataTableHeader>
            <tr>
              {["Employee", "Cycle", "Stage", "Due Date", ""].map((header) => (
                <DataTableHead key={header}>{header}</DataTableHead>
              ))}
            </tr>
          </DataTableHeader>
          <DataTableBody>
            {appraisals.length === 0 ? (
              <DataTableEmpty colSpan={5} message="No appraisals found." />
            ) : (
              (appraisals as Appraisals).map((appraisal) => (
                <DataTableRow key={appraisal.id}>
                  <DataTableCell className="font-medium text-gray-900">
                    <Link
                      href={
                        appraisal.stage === "DUE_NOTIFIED"
                          ? `/ams/appraisals/assign/${appraisal.employee.id}`
                          : `/ams/appraisals/${appraisal.id}`
                      }
                      className="inline-flex items-center gap-2 transition-colors hover:text-[#00b5ad]"
                    >
                      <span>{appraisal.employee.name}</span>
                    </Link>
                  </DataTableCell>
                  <DataTableCell className="text-gray-500">{appraisal.cycle.name}</DataTableCell>
                  <DataTableCell>
                    <Badge className={STAGE_COLOR[appraisal.stage] ?? "bg-gray-100 text-gray-500"}>
                      {appraisal.stage.replace(/_/g, " ")}
                    </Badge>
                  </DataTableCell>
                  <DataTableCell className="text-gray-500">
                    {new Date(appraisal.dueDate).toLocaleDateString("en-IN")}
                  </DataTableCell>
                  <DataTableCell className="text-right">
                    <Link
                      href={
                        appraisal.stage === "DUE_NOTIFIED"
                          ? `/ams/appraisals/assign/${appraisal.employee.id}`
                          : `/ams/appraisals/${appraisal.id}`
                      }
                      aria-label={`${appraisal.stage === "DUE_NOTIFIED" ? "Assign reviewers for" : "Manage"} ${appraisal.employee.name}`}
                      className="inline-flex text-outline-variant transition-colors hover:text-[#00b5ad]"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </DataTableCell>
                </DataTableRow>
              ))
            )}
          </DataTableBody>
        </DataTable>
      </section>

      <section className="space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-center gap-2">
            <h2 className="ds-h2 text-gray-900">{isDueFilterApplied ? "Eligible For Appraisal" : "All Employees"}</h2>
            {isDueFilterApplied ? (
              <span className="text-sm text-gray-500">
                - {MONTH_NAMES[month]} {year}
              </span>
            ) : (
              <span className="text-sm text-gray-500">- Company directory</span>
            )}
            {eligibleRowsToShow.length > 0 && (
              <Badge className="bg-red-50 text-red-600">{eligibleRowsToShow.length}</Badge>
            )}
          </div>
          <EligibleAppraisalFilterMenu />
        </div>

        <DataTable>
          <DataTableHeader>
            <tr>
              {["Employee", "Designation", "Department", "Type", "Due Date", ""].map((header) => (
                <DataTableHead key={header}>{header}</DataTableHead>
              ))}
            </tr>
          </DataTableHeader>
          <DataTableBody>
            {eligibleRowsToShow.length === 0 ? (
              <DataTableEmpty
                colSpan={6}
                message={
                  isDueFilterApplied
                    ? `No employees are eligible for appraisal in ${MONTH_NAMES[month]} ${year}.`
                    : "No active employees found."
                }
                className="py-6 text-sm"
              />
            ) : (
              eligibleRowsToShow.map((row) => <DueThisMonthRow key={`${row.employeeId}-${row.dueDate ?? "all"}`} row={row} />)
            )}
          </DataTableBody>
        </DataTable>
      </section>
    </div>
  );
}
