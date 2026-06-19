import { redirect } from "next/navigation";
export default async function NewInvoicePage() {
  redirect("/accounting/invoices-sales/new");
}
