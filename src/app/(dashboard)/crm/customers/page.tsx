import Link from "next/link";
import { redirect } from "next/navigation";
import type { Prisma } from "@/generated/prisma/client";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { deleteAccountAction } from "@/modules/crm/actions";
import { DeleteRecordButton } from "../_components/delete-record-button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  Eye,
  Globe,
  Mail,
  Pencil,
  Phone,
  ShieldAlert,
  Users,
} from "lucide-react";
import {
  ChaMetricCard,
  ChaPageHeader,
} from "../../cha/_components/cha-operations-shared";
import { CustomersFilterBar } from "../../cha/customers/customers-filter-bar";

interface SearchParams {
  search?: string;
  status?: string;
  portal?: string;
  balance?: string;
}

export default async function CrmCustomersPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const orgId = session.user.orgId;
  if (!orgId) {
    return (
      <div className="text-center text-red-400">
        <ShieldAlert className="mx-auto mb-4 size-12" />
        <h2 className="ds-h2 text-on-surface">Configuration Error</h2>
        <p className="mt-1 text-sm text-on-surface-variant">Missing organisation context.</p>
      </div>
    );
  }

  const params = await searchParams;
  const searchTerm = params.search?.trim() ?? "";
  const statusFilter = params.status ?? "";
  const portalFilter = params.portal ?? "";
  const balanceFilter = params.balance ?? "";
  const hasActiveFilters = Boolean(searchTerm || statusFilter || portalFilter || balanceFilter);

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
        updatedAt: true,
      },
    }),
    db.crmAccount.count({ where: { orgId, type: "Customer" } }),
    db.crmAccount.count({ where: { orgId, type: "Customer", status: "ACTIVE" } }),
    db.crmAccount.count({ where: { orgId, type: "Customer", isPortalEnabled: true } }),
  ]);

  return (
    <div className="space-y-8">
      <ChaPageHeader
        eyebrow={null}
        title="Customers"
        description="Monitor and manage your customer master list, portal accessibility, and corporate parameters."
        icon={<Users size={20} />}
      />

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

      <CustomersFilterBar
        basePath="/crm/customers"
        createHref="/crm/customers/new"
        filters={{
          search: searchTerm,
          status: statusFilter,
          portal: portalFilter,
          balance: balanceFilter,
        }}
        canCreateCustomer
      />

      <div className="overflow-hidden rounded-xl border border-outline-variant/60 bg-surface shadow-sm">
        <div className="overflow-x-auto">
          <table className="ds-table min-w-full">
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
                  <td colSpan={7} className="px-6 py-12 text-center text-sm text-on-surface-variant">
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
                          <p className="text-base text-on-surface">{customer.name}</p>
                          <p className="mt-1 text-xs text-on-surface-variant">{customer.customerSubType || "Business"}</p>
                        </div>
                      </td>
                      <td className="text-base text-on-surface">{customer.companyName || customer.name}</td>
                      <td>
                        {customer.email || customer.phone ? (
                          <div className="space-y-1 text-sm text-on-surface">
                            {customer.email ? (
                              <div className="flex items-center gap-2">
                                <Mail className="size-4 text-on-surface-variant" />
                                <span>{customer.email}</span>
                              </div>
                            ) : null}
                            {customer.phone ? (
                              <div className="flex items-center gap-2">
                                <Phone className="size-4 text-on-surface-variant" />
                                <span>{customer.phone}</span>
                              </div>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-sm italic text-on-surface-variant">No contact details</span>
                        )}
                      </td>
                      <td>
                        <span className="ds-numeric text-sm text-on-surface">
                          {new Intl.NumberFormat("en-IN", {
                            style: "currency",
                            currency: "INR",
                            maximumFractionDigits: 2,
                          }).format(balance)}
                        </span>
                      </td>
                      <td className="ds-numeric text-on-surface-variant">
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
                          <Link href={`/crm/customers/${customer.id}`} className="ds-action-icon ds-action-icon-view" title="View details">
                            <Eye className="size-4" />
                          </Link>
                          <Link href={`/crm/customers/${customer.id}/edit`} className="ds-action-icon ds-action-icon-edit" title="Edit customer">
                            <Pencil className="size-4" />
                          </Link>
                          <DeleteRecordButton
                            recordId={customer.id}
                            confirmMessage="Are you sure you want to delete this customer account? All linked contacts, deals, and projects will be affected."
                            deleteAction={deleteAccountAction}
                            className="ds-plain ds-action-icon ds-action-icon-delete"
                          />
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
