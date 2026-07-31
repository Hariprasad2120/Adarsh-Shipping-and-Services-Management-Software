import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";
import { EditCustomerClient } from "./edit-customer-client";

export default async function ChaEditCustomerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const orgId = session.user.orgId;
  if (!orgId) redirect("/setup");

  const { id } = await params;

  const [canManageChaCustomers, canManageCrmAccounts, employees, account] =
    await Promise.all([
      can(session.user.id, "cha.customer.manage"),
      can(session.user.id, "crm.account.manage"),
      db.user.findMany({
        where: { orgId },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      db.crmAccount.findFirst({
        where: { id, orgId, type: "Customer" },
        include: {
          contacts: {
            where: { isActive: true },
            orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
          },
        },
      }),
    ]);

  if (!canManageChaCustomers && !canManageCrmAccounts) {
    redirect("/cha/customers");
  }
  if (!account) {
    redirect("/cha/customers");
  }

  return (
    <EditCustomerClient
      initialData={JSON.parse(JSON.stringify(account))}
      employees={employees}
    />
  );
}
