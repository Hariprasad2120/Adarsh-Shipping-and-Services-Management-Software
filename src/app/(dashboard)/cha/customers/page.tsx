import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";

export default async function ChaCustomersPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const orgId = session.user.orgId;
  if (!orgId) redirect("/setup");

  const [canReadChaCustomers, canManageChaCustomers, canManageCrmAccounts, customers] = await Promise.all([
    can(session.user.id, "cha.customer.read"),
    can(session.user.id, "cha.customer.manage"),
    can(session.user.id, "crm.account.manage"),
    db.crmAccount.findMany({
      where: { orgId, type: "Customer" },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        companyName: true,
        email: true,
        phone: true,
        updatedAt: true,
      },
    }),
  ]);

  if (!canReadChaCustomers && !canManageChaCustomers && !canManageCrmAccounts) {
    redirect("/cha");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-outline-variant/30 pb-4">
        <div>
          <h1 className="ds-h1 text-[#00cec4]">CHA Customers</h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Shared customer records used by both CHA and CRM.
          </p>
        </div>
        {(canManageChaCustomers || canManageCrmAccounts) && (
          <Link href="/cha/customers/new">
            <Button>New Customer</Button>
          </Link>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface shadow-sm">
        <div className="overflow-x-auto">
          <table className="ds-table">
            <thead>
              <tr>
                <th className="px-6 py-3">Customer</th>
                <th className="px-6 py-3">Company</th>
                <th className="px-6 py-3">Email</th>
                <th className="px-6 py-3">Phone</th>
                <th className="px-6 py-3">Updated</th>
                <th className="px-6 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {customers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-sm text-on-surface-variant">
                    No customers available yet.
                  </td>
                </tr>
              ) : (
                customers.map((customer) => (
                  <tr key={customer.id}>
                    <td className="px-6 py-4 font-medium">{customer.name}</td>
                    <td className="px-6 py-4">{customer.companyName || "—"}</td>
                    <td className="px-6 py-4">{customer.email || "—"}</td>
                    <td className="px-6 py-4">{customer.phone || "—"}</td>
                    <td className="px-6 py-4 ds-numeric">
                      {customer.updatedAt.toLocaleDateString("en-IN")}
                    </td>
                    <td className="px-6 py-4">
                      {(canManageChaCustomers || canManageCrmAccounts) ? (
                        <Link href={`/cha/customers/${customer.id}/edit`} className="text-[#00cec4] hover:underline text-sm">
                          Edit
                        </Link>
                      ) : (
                        <span className="text-on-surface-variant text-sm">View in CRM</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
