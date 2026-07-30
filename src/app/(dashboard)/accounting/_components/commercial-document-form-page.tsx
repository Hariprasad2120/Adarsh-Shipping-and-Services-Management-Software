/* eslint-disable @typescript-eslint/no-explicit-any */

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";
import { AccountingCommercialDocumentForm } from "@/modules/accounting/components/accounting-commercial-document-form";
import {
  AccountingAlert,
  AccountingRoutePageHeader,
} from "@/components/monolith/accounting-workspace";

interface CommercialDocumentFormPageProps {
  title: string;
  description: string;
  defaultType: "INVOICE" | "SALES_ORDER" | "PURCHASE_ORDER";
  redirectPath: string;
  allowedTypes: ("INVOICE" | "SALES_ORDER" | "PURCHASE_ORDER")[];
}

export async function CommercialDocumentFormPage({
  title,
  description,
  defaultType,
  redirectPath,
  allowedTypes,
}: CommercialDocumentFormPageProps) {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const orgId = session.user.orgId;
  if (!orgId) {
    return <AccountingAlert variant="danger">Missing organisation context. Contact an administrator before creating documents.</AccountingAlert>;
  }

  try {
    await requirePermission(session.user.id, "crm.invoice.manage");
  } catch {
    return <AccountingAlert variant="danger">You do not have permission to manage commercial documents.</AccountingAlert>;
  }

  const [accounts, contacts, vendors, employees, products, bankAccounts, quoteCount, invoiceCount, debitNoteCount, salesOrderCount, purchaseOrderCount] =
    await Promise.all([
      db.crmAccount.findMany({
        where: { orgId },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      db.crmContact.findMany({
        where: { orgId },
        select: { id: true, firstName: true, lastName: true, accountId: true },
        orderBy: { lastName: "asc" },
      }),
      db.crmVendor.findMany({
        where: { orgId },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      db.user.findMany({
        where: { orgId },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      db.crmProduct.findMany({
        where: { orgId, active: true },
        select: { id: true, name: true, price: true, taxPercent: true },
        orderBy: { name: "asc" },
      }),
      (db as any).account.findMany({
        where: { orgId, accountType: "BANK", isActive: true },
        select: { id: true, accountName: true, accountCode: true },
        orderBy: { accountName: "asc" },
      }),
      db.crmInvoice.count({ where: { orgId, type: "QUOTE" } }),
      db.crmInvoice.count({ where: { orgId, type: "INVOICE" } }),
      db.crmInvoice.count({ where: { orgId, type: "DEBIT_NOTE" } }),
      db.crmInvoice.count({ where: { orgId, type: "SALES_ORDER" } }),
      db.crmInvoice.count({ where: { orgId, type: "PURCHASE_ORDER" } }),
    ]);

  const formattedContacts = contacts.map((c: { id: string; firstName: string | null; lastName: string | null; accountId: string | null }) => ({
    id: c.id,
    name: `${c.firstName || ""} ${c.lastName}`.trim(),
    accountId: c.accountId,
  }));

  const nextNumbers = {
    QUOTE: `CHN-Quote-${String(quoteCount + 1).padStart(3, "0")}`,
    INVOICE: `CHN-Invoice-${String(invoiceCount + 1).padStart(3, "0")}`,
    DEBIT_NOTE: `CHN-DN-${String(debitNoteCount + 1).padStart(3, "0")}`,
    SALES_ORDER: `CHN-SO-${String(salesOrderCount + 1).padStart(3, "0")}`,
    PURCHASE_ORDER: `CHN-PO-${String(purchaseOrderCount + 1).padStart(3, "0")}`,
  };

  return (
    <>
      <AccountingRoutePageHeader title={title} description={description} />
      <AccountingCommercialDocumentForm
        accounts={accounts}
        contacts={formattedContacts}
        vendors={vendors}
        employees={employees}
        products={products}
        bankAccounts={bankAccounts}
        nextNumbers={nextNumbers}
        defaultType={defaultType}
        redirectPath={redirectPath}
        allowedTypes={allowedTypes}
      />
    </>
  );
}
