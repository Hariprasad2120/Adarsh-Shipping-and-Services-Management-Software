import { PerformanceTableRow } from "@/modules/performance/components/performance-workspace";
import {
  PerformanceSection,
  PerformanceSectionHeader,
} from "@/modules/performance/components/performance-workspace";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import {
  OperationalDataTableWrap,
  OperationalTable,
  OperationalTableCell,
  OperationalTableEmpty,
  OperationalTableHead,
} from "@/components/data-display/operational-data-table";
import { WorkspaceBadge } from "@/components/layout/workspace";
import { getSession } from "@/lib/auth";
import { getNow } from "@/lib/clock";
import { requirePermission } from "@/lib/rbac";
import {
  listAppraisals,
  listAppraisalEligibleUsers,
  listCycles,
  listDueAppraisals,
} from "@/modules/ams/service";
import {
  EligibleAppraisalFilterMenu,
  InProgressFilterMenu,
} from "./appraisal-filters-menu";
import { DueThisMonthRow } from "./due-this-month-row";

type Appraisals = Awaited<ReturnType<typeof listAppraisals>>;
type Cycles = Awaited<ReturnType<typeof listCycles>>;

const STAGE_COLOR: Record<string, string> = {
  DUE_NOTIFIED: "bg-[var(--mnx-warning-bg)] text-[var(--mnx-warning)]",
  REVIEWERS_ASSIGNED: "bg-mono-accent/10 text-mono-accent",
  SELF_ASSESSMENT_OPEN: "bg-mono-accent/10 text-mono-accent",
  REVIEWER_RATING: "bg-mono-accent/10 text-mono-accent",
  MANAGEMENT_REVIEW: "bg-[var(--mnx-warning-bg)] text-[var(--mnx-warning)]",
  MEETING_PENDING: "bg-mono-accent/10 text-mono-accent",
  MEETING_LIVE: "bg-[var(--mnx-success-bg)] text-[var(--mnx-success)]",
  HIKE_FINALISATION: "bg-mono-accent/10 text-mono-accent",
  CLOSED: "bg-mono-soft text-mono-muted",
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

const dueDateFormatter = new Intl.DateTimeFormat("en-IN", { timeZone: "UTC" });

function parseDueMonth(
  value: string | undefined,
  fallbackYear: number,
  fallbackMonth: number,
) {
  if (!value) return { year: fallbackYear, month: fallbackMonth };

  const match = value.match(/^(\d{4})-(\d{2})$/);
  if (!match) return { year: fallbackYear, month: fallbackMonth };

  const [, rawYear, rawMonth] = match;
  const year = Number(rawYear);
  const month = Number(rawMonth) - 1;

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    month < 0 ||
    month > 11
  ) {
    return { year: fallbackYear, month: fallbackMonth };
  }

  return { year, month };
}

export default async function AppraisalsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  await requirePermission(session.user.id, "ams.appraisal.assign_reviewers");

  const sp = await searchParams;
  const now = await getNow();
  const defaultYear = now.getFullYear();
  const defaultMonth = now.getMonth();
  const isDueFilterApplied = Boolean(sp.dueMonth);
  const { year, month } = parseDueMonth(sp.dueMonth, defaultYear, defaultMonth);

  const [appraisals, cycles, dueThisMonthRows, eligibleDueRows, allEmployees] =
    await Promise.all([
      listAppraisals(session.user.orgId!, {
        cycleId: sp.cycleId,
        stage: sp.stage,
      }),
      listCycles(session.user.orgId!),
      listDueAppraisals(session.user.orgId!, defaultYear, defaultMonth),
      isDueFilterApplied
        ? listDueAppraisals(session.user.orgId!, year, month)
        : Promise.resolve([]),
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
  const eligibleRowsToShow = isDueFilterApplied
    ? eligibleDueRowsSafe
    : allEmployeesRows;

  return (
    <div className="space-y-8">
      <PerformanceSection>
        <PerformanceSectionHeader
          eyebrow="Urgent workload"
          title="Due this month"
          description={`Appraisal items due in ${MONTH_NAMES[defaultMonth]} ${defaultYear}.`}
          actions={
            dueThisMonthRowsSafe.length > 0 ? (
              <WorkspaceBadge variant="warning">
                {dueThisMonthRowsSafe.length} due
              </WorkspaceBadge>
            ) : undefined
          }
        />
        <OperationalDataTableWrap>
          <OperationalTable>
            <thead>
              <PerformanceTableRow>
                {[
                  "Employee",
                  "Designation",
                  "Department",
                  "Type",
                  "Due Date",
                  "",
                ].map((header) => (
                  <OperationalTableHead key={header}>{header}</OperationalTableHead>
                ))}
              </PerformanceTableRow>
            </thead>
            <tbody>
              {dueThisMonthRowsSafe.length === 0 ? (
                <OperationalTableEmpty colSpan={6} className="py-6 text-sm">
                  No appraisals due this month.
                </OperationalTableEmpty>
              ) : (
                dueThisMonthRowsSafe.map((row) => (
                  <DueThisMonthRow
                    key={`${row.employeeId}-${row.kind}-${row.dueDate}`}
                    row={row}
                  />
                ))
              )}
            </tbody>
          </OperationalTable>
        </OperationalDataTableWrap>
      </PerformanceSection>

      <PerformanceSection>
        <PerformanceSectionHeader
          eyebrow="Live workflow"
          title="In progress"
          description="Track open appraisals and move each record through its active stage."
          actions={
            <InProgressFilterMenu
              cycles={cycles as Cycles}
              stageOptions={Object.keys(STAGE_COLOR)}
            />
          }
        />

        {sp.cycleId || sp.stage ? (
          <div className="flex flex-wrap gap-2 px-5">
            {sp.cycleId ? (
              <Badge className="bg-mono-accent/10 text-mono-accent">
                Cycle:{" "}
                {(cycles as Cycles).find((cycle) => cycle.id === sp.cycleId)
                  ?.name ?? "Selected"}
              </Badge>
            ) : null}
            {sp.stage ? (
              <Badge className="bg-mono-accent/10 text-mono-accent">
                Stage: {sp.stage.replace(/_/g, " ")}
              </Badge>
            ) : null}
          </div>
        ) : null}

        <OperationalDataTableWrap>
          <OperationalTable>
            <thead>
              <PerformanceTableRow>
                {["Employee", "Cycle", "Stage", "Due Date", ""].map((header) => (
                  <OperationalTableHead key={header}>{header}</OperationalTableHead>
                ))}
              </PerformanceTableRow>
            </thead>
            <tbody>
              {appraisals.length === 0 ? (
                <OperationalTableEmpty colSpan={5}>
                  No appraisals found.
                </OperationalTableEmpty>
              ) : (
                (appraisals as Appraisals).map((appraisal) => (
                  <tr key={appraisal.id}>
                    <OperationalTableCell className="px-0 py-0">
                      <Link
                        href={
                          appraisal.stage === "DUE_NOTIFIED"
                            ? `/ams/appraisals/assign/${appraisal.employee.id}`
                            : `/ams/appraisals/${appraisal.id}`
                        }
                        className="block px-5 py-3.5 font-medium text-mono-text"
                      >
                        <span>{appraisal.employee.name}</span>
                      </Link>
                    </OperationalTableCell>
                    <OperationalTableCell className="text-mono-muted">
                      {appraisal.cycle.name}
                    </OperationalTableCell>
                    <OperationalTableCell>
                      <Badge
                        className={
                          STAGE_COLOR[appraisal.stage] ??
                          "bg-mono-soft text-mono-muted"
                        }
                      >
                        {appraisal.stage.replace(/_/g, " ")}
                      </Badge>
                    </OperationalTableCell>
                    <OperationalTableCell className="text-mono-muted">
                      {dueDateFormatter.format(new Date(appraisal.dueDate))}
                    </OperationalTableCell>
                    <OperationalTableCell className="text-right">
                      <Link
                        href={
                          appraisal.stage === "DUE_NOTIFIED"
                            ? `/ams/appraisals/assign/${appraisal.employee.id}`
                            : `/ams/appraisals/${appraisal.id}`
                        }
                        aria-label={`${appraisal.stage === "DUE_NOTIFIED" ? "Assign reviewers for" : "Manage"} ${appraisal.employee.name}`}
                        className="inline-flex text-outline-variant transition-colors hover:text-mono-accent"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </OperationalTableCell>
                  </tr>
                ))
              )}
            </tbody>
          </OperationalTable>
        </OperationalDataTableWrap>
      </PerformanceSection>

      <PerformanceSection>
        <PerformanceSectionHeader
          eyebrow="Appraisal readiness"
          title={isDueFilterApplied ? "Eligible for appraisal" : "All employees"}
          description={
            isDueFilterApplied
              ? `Eligibility view for ${MONTH_NAMES[month]} ${year}.`
              : "Company directory with appraisal-ready employees."
          }
          actions={<EligibleAppraisalFilterMenu />}
        />

        {eligibleRowsToShow.length > 0 ? (
          <div className="px-5">
            <WorkspaceBadge variant="accent">
              {eligibleRowsToShow.length} visible
            </WorkspaceBadge>
          </div>
        ) : null}

        <OperationalDataTableWrap>
          <OperationalTable>
            <thead>
              <PerformanceTableRow>
                {[
                  "Employee",
                  "Designation",
                  "Department",
                  "Type",
                  "Due Date",
                  "",
                ].map((header) => (
                  <OperationalTableHead key={header}>{header}</OperationalTableHead>
                ))}
              </PerformanceTableRow>
            </thead>
            <tbody>
              {eligibleRowsToShow.length === 0 ? (
                <OperationalTableEmpty colSpan={6} className="py-6 text-sm">
                  {isDueFilterApplied
                    ? `No employees are eligible for appraisal in ${MONTH_NAMES[month]} ${year}.`
                    : "No active employees found."}
                </OperationalTableEmpty>
              ) : (
                eligibleRowsToShow.map((row) => (
                  <DueThisMonthRow
                    key={`${row.employeeId}-${row.dueDate ?? "all"}`}
                    row={row}
                  />
                ))
              )}
            </tbody>
          </OperationalTable>
        </OperationalDataTableWrap>
      </PerformanceSection>
    </div>
  );
}
