import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import {
  Users,
  CheckCircle2,
  Globe,
  Plus,
  Search,
  ChevronRight,
  MoreVertical,
} from "lucide-react";
import {
  ChaPageHeader,
  ChaMetricCard,
} from "../_components/cha-operations-shared";
import { Badge } from "@/components/ui/badge";

export default async function ChaCustomersPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const orgId = session.user.orgId;
  if (!orgId) redirect("/setup");

  // Check permissions
  const [canReadChaCustomers, canManageChaCustomers, canManageCrmAccounts] = await Promise.all([
    can(session.user.id, "cha.customer.read"),
    can(session.user.id, "cha.customer.manage"),
    can(session.user.id, "crm.account.manage"),
  ]);

  if (!canReadChaCustomers && !canManageChaCustomers && !canManageCrmAccounts) {
    redirect("/cha");
  }

  // Run database queries
  const [customers, totalCount, activeCount, portalCount] = await Promise.all([
    db.crmAccount.findMany({
      where: { orgId, type: "Customer" },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        companyName: true,
        email: true,
        phone: true,
        status: true,
        isPortalEnabled: true,
        updatedAt: true,
      },
    }),
    db.crmAccount.count({ where: { orgId, type: "Customer" } }),
    db.crmAccount.count({ where: { orgId, type: "Customer", status: "ACTIVE" } }),
    db.crmAccount.count({ where: { orgId, type: "Customer", isPortalEnabled: true } }),
  ]);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <ChaPageHeader
        eyebrow={
          <>
            <span>CHA</span>
            <ChevronRight size={14} />
            <span>Customers</span>
          </>
        }
        title="Customers"
        description="Monitor and manage your customer master list, portal accessibility, and corporate parameters."
        icon={<Users size={20} />}
        actions={
          (canManageChaCustomers || canManageCrmAccounts) ? (
            <Link href="/cha/customers/new">
              <button className="flex items-center gap-1.5 bg-cha-primary text-white hover:bg-cha-primary-hover px-4 py-2 rounded-xl text-sm font-medium tracking-wide transition-all shadow-sm">
                <Plus size={16} /> New Customer
              </button>
            </Link>
          ) : null
        }
      />

      {/* KPI Metrics */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <ChaMetricCard
          title="Total Customers"
          value={totalCount}
          note="All registered profiles"
          icon={<Users size={16} />}
          accent="blue"
        />
        <ChaMetricCard
          title="Active Customers"
          value={activeCount}
          note="Currently trading profiles"
          icon={<CheckCircle2 size={16} />}
          accent="green"
        />
        <ChaMetricCard
          title="Portal Access Enabled"
          value={portalCount}
          note="Customers with portal logins"
          icon={<Globe size={16} />}
          accent="violet"
        />
      </div>

      {/* Action/Filter Command Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border border-cha-border bg-cha-surface rounded-2xl p-4 dark:border-cha-border-strong">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-cha-text-muted" />
          <input
            type="text"
            placeholder="Search customer, email, phone..."
            className="w-full h-10 pl-9 pr-4 rounded-xl border border-cha-border bg-cha-surface-subtle text-sm text-cha-text-primary placeholder-cha-text-muted focus:outline-none focus:ring-2 focus:ring-cha-primary/30"
          />
        </div>
      </div>

      {/* Customers Data Table */}
      <div className="overflow-hidden rounded-xl border border-cha-border bg-cha-surface shadow-sm dark:border-cha-border-strong">
        <div className="overflow-x-auto">
          <table className="ds-table">
            <thead>
              <tr>
                <th className="px-6 py-4">Customer Name</th>
                <th className="px-6 py-4">Company Name</th>
                <th className="px-6 py-4">Email Address</th>
                <th className="px-6 py-4">Phone Number</th>
                <th className="px-6 py-4">Portal Status</th>
                <th className="px-6 py-4">Last Updated</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-sm text-cha-text-muted">
                    No customers found in your master database.
                  </td>
                </tr>
              ) : (
                customers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-cha-primary-soft/30 transition-colors">
                    <td className="px-6 py-4 font-medium text-cha-primary dark:text-blue-400">
                      {customer.name}
                    </td>
                    <td className="px-6 py-4 text-cha-text-secondary">{customer.companyName || "—"}</td>
                    <td className="px-6 py-4 text-cha-text-secondary">{customer.email || "—"}</td>
                    <td className="px-6 py-4 text-cha-text-secondary">{customer.phone || "—"}</td>
                    <td className="px-6 py-4">
                      {customer.isPortalEnabled ? (
                        <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 uppercase text-[9px] font-bold">
                          Enabled
                        </Badge>
                      ) : (
                        <Badge className="bg-cha-primary-soft text-cha-text-muted border border-cha-border uppercase text-[9px] font-semibold">
                          Disabled
                        </Badge>
                      )}
                    </td>
                    <td className="px-6 py-4 ds-numeric text-cha-text-secondary">
                      {customer.updatedAt.toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {(canManageChaCustomers || canManageCrmAccounts) ? (
                          <Link href={`/cha/customers/${customer.id}/edit`}>
                            <button className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cha-primary text-white text-[11px] font-semibold uppercase tracking-wider hover:bg-cha-primary-hover hover:shadow-[0_0_12px_var(--cha-primary-ring)] transition-all duration-200 ds-plain">
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                              Edit
                            </button>
                          </Link>
                        ) : (
                          <span className="text-cha-text-muted text-xs">View Only</span>
                        )}
                      </div>
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
