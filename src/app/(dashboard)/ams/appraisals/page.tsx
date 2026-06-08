import Link from "next/link";
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
import { DropdownSelect } from "@/components/ui/dropdown-select";
import { auth } from "@/lib/auth";
import { getNow } from "@/lib/clock";
import { requirePermission } from "@/lib/rbac";
import { listAppraisals, listCycles, listDueAppraisals } from "@/modules/ams/service";
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
  const year = now.getFullYear();
  const month = now.getMonth();

  const [appraisals, cycles, dueRows] = await Promise.all([
    listAppraisals(session.user.orgId!, {
      cycleId: sp.cycleId,
      stage: sp.stage,
    }),
    listCycles(session.user.orgId!),
    listDueAppraisals(session.user.orgId!, year, month),
  ]);

  const dueRowsSafe = dueRows.map((row) => ({
    ...row,
    dueDate: row.dueDate.toISOString(),
  }));

  return (
    <div className="space-y-8">
      <h1 className="ds-h1 text-gray-900">Appraisals</h1>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="ds-h2 text-gray-900">Due This Month</h2>
          <span className="text-sm text-gray-500">
            - {MONTH_NAMES[month]} {year}
          </span>
          {dueRowsSafe.length > 0 && (
            <Badge className="bg-red-50 text-red-600">{dueRowsSafe.length}</Badge>
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
            {dueRowsSafe.length === 0 ? (
              <DataTableEmpty colSpan={6} message="No appraisals due this month." className="py-6 text-sm" />
            ) : (
              dueRowsSafe.map((row) => <DueThisMonthRow key={row.employeeId} row={row} />)
            )}
          </DataTableBody>
        </DataTable>
      </section>

      <section className="space-y-3">
        <h2 className="ds-h2 text-gray-900">In Progress</h2>

        <form className="flex flex-wrap gap-3">
          <AppraisalFilters cycleId={sp.cycleId ?? ""} cycles={cycles as Cycles} stage={sp.stage ?? ""} />
          <button type="submit" className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm text-white">
            Filter
          </button>
        </form>

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
                  <DataTableCell className="font-medium text-gray-900">{appraisal.employee.name}</DataTableCell>
                  <DataTableCell className="text-gray-500">{appraisal.cycle.name}</DataTableCell>
                  <DataTableCell>
                    <Badge className={STAGE_COLOR[appraisal.stage] ?? "bg-gray-100 text-gray-500"}>
                      {appraisal.stage.replace(/_/g, " ")}
                    </Badge>
                  </DataTableCell>
                  <DataTableCell className="text-gray-500">
                    {new Date(appraisal.dueDate).toLocaleDateString("en-IN")}
                  </DataTableCell>
                  <DataTableCell>
                    <Link
                      href={
                        appraisal.stage === "DUE_NOTIFIED"
                          ? `/ams/appraisals/assign/${appraisal.employee.id}`
                          : `/ams/appraisals/${appraisal.id}`
                      }
                      className="text-xs text-indigo-600 hover:underline"
                    >
                      {appraisal.stage === "DUE_NOTIFIED" ? "Assign Reviewers ->" : "Manage ->"}
                    </Link>
                  </DataTableCell>
                </DataTableRow>
              ))
            )}
          </DataTableBody>
        </DataTable>
      </section>
    </div>
  );
}

function AppraisalFilters({
  cycleId,
  cycles,
  stage,
}: {
  cycleId: string;
  cycles: Cycles;
  stage: string;
}) {
  return (
    <>
      <DropdownSelect
        name="cycleId"
        defaultValue={cycleId}
        options={[
          { value: "", label: "All cycles" },
          ...cycles.map((cycle) => ({ value: cycle.id, label: cycle.name })),
        ]}
        triggerClassName="min-w-48 py-1.5"
      />
      <DropdownSelect
        name="stage"
        defaultValue={stage}
        options={[
          { value: "", label: "All stages" },
          ...Object.keys(STAGE_COLOR).map((stageKey) => ({
            value: stageKey,
            label: stageKey.replace(/_/g, " "),
          })),
        ]}
        triggerClassName="min-w-48 py-1.5"
      />
    </>
  );
}
