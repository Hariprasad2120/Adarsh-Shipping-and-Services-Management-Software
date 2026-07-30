import { redirect } from "next/navigation";

export default function LegacyPaymentEntriesCompatibilityPage() {
  redirect("/accounting/payments");
}
