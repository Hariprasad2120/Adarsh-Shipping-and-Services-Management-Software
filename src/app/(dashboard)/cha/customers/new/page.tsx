import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";
import { NewCustomerClient } from "./new-customer-client";

export default async function ChaNewCustomerPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const orgId = session.user.orgId;
  if (!orgId) redirect("/setup");

  const [canManageChaCustomers, canManageCrmAccounts, employees] = await Promise.all([
    can(session.user.id, "cha.customer.manage"),
    can(session.user.id, "crm.account.manage"),
    db.user.findMany({
      where: { orgId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!canManageChaCustomers && !canManageCrmAccounts) {
    redirect("/cha/customers");
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <NewCustomerClient employees={employees} />
    </div>
  );
}

