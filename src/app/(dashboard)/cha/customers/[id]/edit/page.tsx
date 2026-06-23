import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";
import { AccountForm } from "@/app/(dashboard)/crm/customers/account-form";

export default async function ChaEditCustomerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const orgId = session.user.orgId;
  if (!orgId) redirect("/setup");

  const { id } = await params;

  const [canManageChaCustomers, canManageCrmAccounts, employees, account] = await Promise.all([
    can(session.user.id, "cha.customer.manage"),
    can(session.user.id, "crm.account.manage"),
    db.user.findMany({
      where: { orgId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.crmAccount.findFirst({
      where: { id, orgId, type: "Customer" },
    }),
  ]);

  if (!canManageChaCustomers && !canManageCrmAccounts) {
    redirect("/cha/customers");
  }
  if (!account) {
    redirect("/cha/customers");
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <AccountForm initialData={account} employees={employees} />
    </div>
  );
}
