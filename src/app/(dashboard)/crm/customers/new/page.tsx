import { redirect } from "next/navigation";

export default async function CrmNewAccountPage() {
  redirect("/cha/customers/new");
}
