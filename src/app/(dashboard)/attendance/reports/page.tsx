import { DataTable, DataTableBody, DataTableCell, DataTableEmpty, DataTableHead, DataTableHeader, DataTableRow } from "@/components/data-table";
import { DropdownSelect } from "@/components/ui/dropdown-select";
import { auth } from "@/lib/auth";
import { getNow } from "@/lib/clock";
import { requirePermission } from "@/lib/rbac";
import { getMonthlyReport } from "@/modules/attendance/service";
import { redirect } from "next/navigation";

export default async function AttendanceReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const session = await auth();
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <form className="flex gap-2">
          <AttendanceReportFilters month={month} now={now} year={year} />
          <button
            type="submit"
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-700"
          >
            View
          </button>
        </form>
      </div>

      <DataTable>
        <DataTableHeader>
          <tr>
            {["Employee", "Designation", "Days Present"].map((h) => (
              <DataTableHead key={h}>{h}</DataTableHead>
            ))}
          </tr>
        </DataTableHeader>
        <DataTableBody>
          {report.length === 0 ? (
            <DataTableEmpty colSpan={3} message="No data." />
          ) : (
            report.map((r) => (
              <DataTableRow key={r.user.id}>
                <DataTableCell className="font-medium text-gray-900">{r.user.name}</DataTableCell>
                <DataTableCell className="text-gray-500">{r.user.designation ?? "-"}</DataTableCell>
                <DataTableCell>{r.days}</DataTableCell>
              </DataTableRow>
            ))
          )}
        </DataTableBody>
      </DataTable>
    </div>
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
      <DropdownSelect
        name="month"
        defaultValue={String(month)}
        options={Array.from({ length: 12 }, (_, index) => ({
          value: String(index + 1),
          label: new Date(2000, index, 1).toLocaleString("en-IN", { month: "long" }),
        }))}
        triggerClassName="py-1.5"
      />
      <DropdownSelect
        name="year"
        defaultValue={String(year)}
        options={[now.getFullYear() - 1, now.getFullYear()].map((optionYear) => ({
          value: String(optionYear),
          label: String(optionYear),
        }))}
        triggerClassName="py-1.5"
      />
    </>
  );
}
