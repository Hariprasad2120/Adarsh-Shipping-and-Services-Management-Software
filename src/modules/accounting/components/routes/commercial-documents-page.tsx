import { FileText, Plus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { deleteInvoiceAction } from "@/modules/crm/actions";
import { listInvoices } from "@/modules/crm/service";
import { AccountingDeleteAction } from "@/modules/accounting/components/accounting-delete-action";
import {
  AccountingAction,
  AccountingActionLink,
  AccountingAlert,
  AccountingEmptyTableRow,
  AccountingField,
  AccountingInput,
  AccountingRoutePageHeader,
  AccountingSection,
  AccountingSelect,
  AccountingStatus,
  AccountingTable,
  AccountingToolbar,
} from "@/modules/accounting/components/accounting-workspace";

interface SearchParams {
  type?: string;
  search?: string;
  accountId?: string;
}

interface CommercialDocumentsPageProps {
  title: string;
  description: string;
  basePath: string;
  createHref: string;
  typeFilter?: string;
  showTypeFilter?: boolean;
  searchParams: Promise<SearchParams>;
}

export async function CommercialDocumentsPage({
  title,
  description,
  basePath,
  createHref,
  typeFilter,
  showTypeFilter = true,
  searchParams,
}: CommercialDocumentsPageProps) {
  const session = await getSession();
  if (!session?.user) redirect("/login");
  if (!session.user.orgId) {
    return <AccountingAlert variant="danger">Missing organisation context. Contact an administrator before using commercial documents.</AccountingAlert>;
  }

  try {
    await requirePermission(session.user.id, "crm.invoice.manage");
  } catch {
    return <AccountingAlert variant="danger">You do not have permission to view commercial documents.</AccountingAlert>;
  }

  const params = await searchParams;
  const selectedType = typeFilter || params.type || "";
  const search = params.search || "";
  const records = await listInvoices(session.user.orgId, {
    type: selectedType || undefined,
    search: search || undefined,
    accountId: params.accountId || undefined,
  });

  return (
    <>
      <AccountingRoutePageHeader
        title={title}
        description={description}
        actions={
          <AccountingActionLink href={createHref} variant="primary">
            <Plus aria-hidden="true" /> Generate document
          </AccountingActionLink>
        }
      />
      <AccountingSection
        eyebrow="Commercial register"
        title="Document register"
        description={`${records.length} document${records.length === 1 ? "" : "s"} match the current filters.`}
      >
        <form method="GET">
          <AccountingToolbar>
            <AccountingField label="Search documents">
              <AccountingInput
                type="search"
                name="search"
                defaultValue={search}
                placeholder="Document number or account"
              />
            </AccountingField>
            {showTypeFilter && !typeFilter ? (
              <AccountingField label="Document type">
                <AccountingSelect name="type" defaultValue={selectedType}>
                  <option value="">All document types</option>
                  <option value="QUOTE">Quotes</option>
                  <option value="INVOICE">Invoices</option>
                  <option value="SALES_ORDER">Sales orders</option>
                  <option value="PURCHASE_ORDER">Purchase orders</option>
                </AccountingSelect>
              </AccountingField>
            ) : null}
            <AccountingAction type="submit">Apply filters</AccountingAction>
            {search || (!typeFilter && selectedType) ? <AccountingActionLink href={basePath}>Reset</AccountingActionLink> : null}
          </AccountingToolbar>
        </form>
        <AccountingTable>
          <thead>
            <tr>
              <th>Document</th>
              <th>Type</th>
              <th>Client account</th>
              <th>Issue date</th>
              <th>Total</th>
              <th>Status</th>
              <th>Owner</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {records.length ? records.map((record) => (
              <tr key={record.id}>
                <td><strong>{record.invoiceNumber}</strong></td>
                <td>{record.type.replaceAll("_", " ")}</td>
                <td>
                  {record.type === "PURCHASE_ORDER" && record.vendor ? (
                    <div>
                      <strong>{record.vendor.name}</strong>
                      <span>Supplier</span>
                    </div>
                  ) : record.account ? (
                    <Link className="mnx-accounting-record-link" href={`/crm/customers/${record.account.id}`}>
                      <strong>{record.account.name}</strong>
                      <span>Customer account</span>
                    </Link>
                  ) : "—"}
                </td>
                <td>{new Date(record.date).toLocaleDateString("en-IN")}</td>
                <td className="mnx-accounting-amount">₹{record.total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                <td><AccountingStatus status={record.status} /></td>
                <td>{record.owner.name}</td>
                <td>
                  <div className="mnx-accounting-inline-actions">
                    {record.type === "PURCHASE_ORDER" ? (
                      <AccountingActionLink
                        className="mnx-button-compact"
                        href={`/accounting/purchase-orders/${record.id}`}
                      >
                        Review
                      </AccountingActionLink>
                    ) : null}
                    <AccountingDeleteAction
                      id={record.id}
                      action={deleteInvoiceAction}
                      confirmMessage="Delete this commercial document? This action cannot be undone."
                    />
                  </div>
                </td>
              </tr>
            )) : (
              <AccountingEmptyTableRow colSpan={8}>
                <FileText aria-hidden="true" /> No commercial documents match the current filters.
              </AccountingEmptyTableRow>
            )}
          </tbody>
        </AccountingTable>
      </AccountingSection>
    </>
  );
}
