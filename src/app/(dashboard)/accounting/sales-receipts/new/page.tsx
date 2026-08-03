import { redirect } from "next/navigation";

export default function NewSalesReceiptPage() {
  redirect("/accounting/payment-entries/new?type=RECEIVE");
}
