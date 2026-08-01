import {
  PeopleAction,
  PeopleField,
  PeopleSection,
  PeopleSectionHeader,
  PeopleSelect,
  PeopleTable,
  PeopleTableBody,
  PeopleTableCell,
  PeopleTableEmpty,
  PeopleTableHead,
  PeopleTableHeader,
  PeopleTableRow,
} from "@/modules/people/components/people-workspace";
import { getSession } from "@/lib/auth";
import { getNow } from "@/lib/clock";
import { requirePermission } from "@/lib/rbac";
import { getMonthlyReport } from "@/modules/attendance/service";
import { redirect } from "next/navigation";

export default async function AttendanceReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  await requirePermission(session.user.id, "attendance.reports.view");

  const sp = await searchParams;
  const now = await getNow();
  const year = Number(sp.year ?? now.getFullYear());
  const month = Number(sp.month ?? now.getMonth() + 1);

  const report = await getMonthlyReport(session.user.orgId!, year, month);
  const monthName = new Date(year, month - 1, 1).toLocaleString("en-IN", {
    month: "long",
    year: "numeric",
  });

  return (
    <PeopleSection>
      <PeopleSectionHeader
        eyebrow="Monthly report"
        title={monthName}
        description="Attendance presence totals returned by the production attendance service."
        actions={
          <form className="mnx-people-filter-form">
            <AttendanceReportFilters month={month} now={now} year={year} />
            <PeopleAction type="submit">View report</PeopleAction>
          </form>
        }
      />

      <PeopleTable>
        <PeopleTableHeader>
          <tr>
            {["Employee", "Designation", "Days Present"].map((h) => (
              <PeopleTableHead key={h}>{h}</PeopleTableHead>
            ))}
          </tr>
        </PeopleTableHeader>
        <PeopleTableBody>
          {report.length === 0 ? (
            <PeopleTableEmpty
              colSpan={3}
              message="No attendance data for this month."
            />
          ) : (
            report.map((r) => (
              <PeopleTableRow key={r.user.id}>
                <PeopleTableCell>{r.user.name}</PeopleTableCell>
                <PeopleTableCell className="mnx-people-muted">
                  {r.user.designation ?? "—"}
                </PeopleTableCell>
                <PeopleTableCell>{r.days}</PeopleTableCell>
              </PeopleTableRow>
            ))
          )}
        </PeopleTableBody>
      </PeopleTable>
    </PeopleSection>
  );
}

function AttendanceReportFilters({
  month,
  now,
  year,
}: {
  month: number;
  now: Date;
  year: number;
}) {
  return (
    <>
      <PeopleField label="Month" htmlFor="attendance-report-month">
        <PeopleSelect
          id="attendance-report-month"
          name="month"
          defaultValue={String(month)}
        >
          {Array.from({ length: 12 }, (_, index) => (
            <option key={index + 1} value={String(index + 1)}>
              {new Date(2000, index, 1).toLocaleString("en-IN", {
                month: "long",
              })}
            </option>
          ))}
        </PeopleSelect>
      </PeopleField>
      <PeopleField label="Year" htmlFor="attendance-report-year">
        <PeopleSelect
          id="attendance-report-year"
          name="year"
          defaultValue={String(year)}
        >
          {[now.getFullYear() - 1, now.getFullYear()].map((optionYear) => (
            <option key={optionYear} value={String(optionYear)}>
              {optionYear}
            </option>
          ))}
        </PeopleSelect>
      </PeopleField>
    </>
  );
}
