import { Plus } from "lucide-react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { listJournalEntries } from "@/modules/accounting/service";
import {
  AccountingActionLink,
  AccountingEmptyTableRow,
  AccountingRoutePageHeader,
  AccountingSection,
  AccountingStatus,
  AccountingTable,
} from "@/modules/accounting/components/accounting-workspace";

export default async function JournalEntriesPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const jvs = await listJournalEntries(session.user.orgId!);

  return (
    <>
      <AccountingRoutePageHeader
        actions={
          <AccountingActionLink
            href="/accounting/journal-entries/new"
            variant="primary"
          >
            <Plus aria-hidden="true" size={16} />
            New voucher
          </AccountingActionLink>
        }
      />
      <AccountingSection
        eyebrow="General journal"
        title="Voucher register"
        description={`${jvs.length} journal ${jvs.length === 1 ? "entry" : "entries"} in the current organisation.`}
      >
        <AccountingTable>
          <thead>
            <tr>
              <th>Voucher no.</th>
              <th>Posting date</th>
              <th>Remarks</th>
              <th>Branch</th>
              <th>Total amount</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {jvs.length === 0 ? (
              <AccountingEmptyTableRow colSpan={7}>
                No journal entries have been created yet.
              </AccountingEmptyTableRow>
            ) : (
              jvs.map((jv) => (
                <tr key={jv.id}>
                  <td>
                    <AccountingActionLink
                      className="mnx-button-compact"
                      href={`/accounting/journal-entries/${jv.id}`}
                    >
                      {jv.voucherNo}
                    </AccountingActionLink>
                  </td>
                  <td>{new Date(jv.postingDate).toLocaleDateString("en-IN")}</td>
                  <td>{jv.remarks || "—"}</td>
                  <td>{jv.branch?.name || "Global / Head office"}</td>
                  <td className="mnx-accounting-amount">
                    ₹
                    {Number(jv.totalDebit).toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                  <td>
                    <AccountingStatus status={jv.status} />
                  </td>
                  <td>
                    <AccountingActionLink
                      className="mnx-button-compact"
                      href={`/accounting/journal-entries/${jv.id}`}
                    >
                      Details
                    </AccountingActionLink>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </AccountingTable>
      </AccountingSection>
    </>
  );
}
