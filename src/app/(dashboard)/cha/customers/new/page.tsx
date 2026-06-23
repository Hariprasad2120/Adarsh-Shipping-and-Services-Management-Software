import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";
import { AccountForm } from "@/app/(dashboard)/crm/customers/account-form";

export default async function ChaNewCustomerPage() {
  const session = await auth();
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
      <AccountForm employees={employees} />
    </div>
  );
}
