import Link from "next/link";
import { redirect } from "next/navigation";
import type { Prisma } from "@/generated/prisma/client";
import { auth } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";
import { DeleteRecordButton } from "@/app/(dashboard)/crm/_components/delete-record-button";
import { deleteAccountAction } from "@/modules/crm/actions";
import {
  Users,
  CheckCircle2,
  Globe,
  Mail,
  Phone,
  Eye,
  Pencil,
} from "lucide-react";
import {
  ChaPageHeader,
  ChaMetricCard,
} from "../_components/cha-operations-shared";
import { Badge } from "@/components/monolith/badge";
import { CustomersFilterBar } from "./customers-filter-bar";

type CustomerSearchParams = {
  search?: string;
  status?: string;
  portal?: string;
  balance?: string;
};

export default async function ChaCustomersPage({
  searchParams,
}: {
  searchParams: Promise<CustomerSearchParams>;
}) {
  const params = await searchParams;
  const searchTerm = params.search?.trim() ?? "";
  const statusFilter = params.status ?? "";
  const portalFilter = params.portal ?? "";
  const balanceFilter = params.balance ?? "";
  const hasActiveFilters = Boolean(searchTerm || statusFilter || portalFilter || balanceFilter);

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

  const customerWhere: Prisma.CrmAccountWhereInput = {
    orgId,
    type: "Customer",
  };
  const andFilters: Prisma.CrmAccountWhereInput[] = [];

  if (searchTerm) {
    andFilters.push({
      OR: [
        { name: { contains: searchTerm, mode: "insensitive" } },
        { companyName: { contains: searchTerm, mode: "insensitive" } },
        { email: { contains: searchTerm, mode: "insensitive" } },
        { phone: { contains: searchTerm, mode: "insensitive" } },
      ],
    });
  }

  if (statusFilter) {
    customerWhere.status = statusFilter;
  }

  if (portalFilter === "enabled") {
    customerWhere.isPortalEnabled = true;
  } else if (portalFilter === "disabled") {
    customerWhere.isPortalEnabled = false;
  }

  if (balanceFilter === "outstanding") {
    customerWhere.openingBalanceAmount = { gt: 0 };
  } else if (balanceFilter === "clear") {
    andFilters.push({
      OR: [{ openingBalanceAmount: null }, { openingBalanceAmount: 0 }],
    });
  }

  if (andFilters.length > 0) {
    customerWhere.AND = andFilters;
  }

  // Run database queries
  const [customers, totalCount, activeCount, portalCount] = await Promise.all([
    db.crmAccount.findMany({
      where: customerWhere,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        companyName: true,
        email: true,
        phone: true,
        status: true,
        customerSubType: true,
        openingBalanceAmount: true,
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
        eyebrow={null}
        title="Customers"
        description="Monitor and manage your customer master list, portal accessibility, and corporate parameters."
        icon={<Users size={20} />}
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
      <CustomersFilterBar
        filters={{
          search: searchTerm,
          status: statusFilter,
          portal: portalFilter,
          balance: balanceFilter,
        }}
        canCreateCustomer={canManageChaCustomers || canManageCrmAccounts}
      />

      {/* Customers Data Table */}
      <div className="overflow-hidden rounded-xl border border-mono-border/60 bg-mono-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="monolith-table min-w-full">
            <thead>
              <tr>
                <th>Customer Name</th>
                <th>Company Name</th>
                <th>Contact Info</th>
                <th>Outstanding Balance</th>
                <th>Last Updated</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-sm text-mono-muted">
                    {hasActiveFilters ? "No customers match the current filters." : "No customers found in your master database."}
                  </td>
                </tr>
              ) : (
                customers.map((customer) => {
                  const balance = customer.openingBalanceAmount || 0;

                  return (
                    <tr key={customer.id} className="transition-colors">
                      <td>
                        <div>
                          <p className="text-base text-mono-text">{customer.name}</p>
                          <p className="mt-1 text-xs text-mono-muted">{customer.customerSubType || "Business"}</p>
                        </div>
                      </td>
                      <td className="text-base text-mono-text">{customer.companyName || customer.name}</td>
                      <td>
                        {customer.email || customer.phone ? (
                          <div className="space-y-1 text-sm text-mono-text">
                            {customer.email ? (
                              <div className="flex items-center gap-2">
                                <Mail className="size-4 text-mono-muted" />
                                <span>{customer.email}</span>
                              </div>
                            ) : null}
                            {customer.phone ? (
                              <div className="flex items-center gap-2">
                                <Phone className="size-4 text-mono-muted" />
                                <span>{customer.phone}</span>
                              </div>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-sm italic text-mono-muted">No contact details</span>
                        )}
                      </td>
                      <td>
                        <span className="monolith-numeric text-sm text-mono-text">
                          {new Intl.NumberFormat("en-IN", {
                            style: "currency",
                            currency: "INR",
                            maximumFractionDigits: 2,
                          }).format(balance)}
                        </span>
                      </td>
                      <td className="monolith-numeric text-mono-muted">
                        {customer.updatedAt.toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td>
                        <Badge variant={customer.status === "ACTIVE" ? "success" : "secondary"} className="uppercase">
                          {customer.status || "ACTIVE"}
                        </Badge>
                      </td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/crm/customers/${customer.id}`} className="monolith-action-icon monolith-action-icon-view" title="View details">
                            <Eye className="size-4" />
                          </Link>
                          {(canManageChaCustomers || canManageCrmAccounts) ? (
                            <>
                              <Link href={`/cha/customers/${customer.id}/edit`} className="monolith-action-icon monolith-action-icon-edit" title="Edit customer">
                                <Pencil className="size-4" />
                              </Link>
                              <DeleteRecordButton
                                recordId={customer.id}
                                confirmMessage="Are you sure you want to delete this customer account? All linked contacts, jobs, and portal access may be affected."
                                deleteAction={deleteAccountAction}
                                className="monolith-plain monolith-action-icon monolith-action-icon-delete"
                              />
                            </>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
