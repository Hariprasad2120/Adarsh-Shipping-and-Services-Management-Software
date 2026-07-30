import { Plus } from "lucide-react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { listSalesInvoices } from "@/modules/accounting/service";
import {
  AccountingActionLink,
  AccountingEmptyTableRow,
  AccountingRoutePageHeader,
  AccountingSection,
  AccountingStatus,
  AccountingTable,
} from "@/modules/accounting/components/accounting-workspace";

export default async function SalesInvoicesPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const invoices = await listSalesInvoices(session.user.orgId!);

  return (
    <>
      <AccountingRoutePageHeader
        actions={
          <AccountingActionLink
            href="/accounting/sales-invoices/new"
            variant="primary"
          >
            <Plus aria-hidden="true" size={16} />
            New sales invoice
          </AccountingActionLink>
        }
      />
      <AccountingSection
        eyebrow="Accounts receivable"
        title="Customer invoice register"
        description={`${invoices.length} sales ${invoices.length === 1 ? "invoice" : "invoices"} in the current organisation.`}
      >
        <AccountingTable>
          <thead>
            <tr>
              <th>Invoice number</th>
              <th>Customer</th>
              <th>Posting date</th>
              <th>Grand total</th>
              <th>Outstanding</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {invoices.length === 0 ? (
              <AccountingEmptyTableRow colSpan={7}>
                No sales invoices have been created yet.
              </AccountingEmptyTableRow>
            ) : (
              invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td>{invoice.invoiceNumber}</td>
                  <td>{invoice.customer?.name || "—"}</td>
                  <td>
                    {new Date(invoice.postingDate).toLocaleDateString("en-IN")}
                  </td>
                  <td className="mnx-accounting-amount">
                    ₹
                    {Number(invoice.grandTotal).toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                  <td className="mnx-accounting-amount mnx-accounting-amount-warning">
                    ₹
                    {Number(invoice.outstandingAmount).toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                  <td>
                    <AccountingStatus status={invoice.status} />
                  </td>
                  <td>
                    <AccountingActionLink
                      className="mnx-button-compact"
                      href={`/accounting/sales-invoices/${invoice.id}`}
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
