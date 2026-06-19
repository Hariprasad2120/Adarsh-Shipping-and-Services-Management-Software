import { redirect } from "next/navigation";
export default async function CrmInvoicesPage() {
  redirect("/accounting/invoices-sales");
}
