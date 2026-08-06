import { redirect } from "next/navigation";

export default function CrmItemsPage() {
  redirect("/crm/masters?tab=item-master");
}
