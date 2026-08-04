import Link from "next/link";
import { redirect } from "next/navigation";
import type { Prisma } from "@/generated/prisma/client";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";
import { DeleteRecordButton } from "@/modules/crm/components/delete-record-button";
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
  OperationalDataTable,
  OperationalDataTableFooter,
  OperationalDataTableWrap,
  OperationalPrimaryCell,
  OperationalStatus,
  OperationalTable,
  OperationalTableCell,
  OperationalTableEmpty,
  OperationalTableHead,
} from "@/components/data-display/operational-data-table";
import {
  ChaPageHeader,
  ChaMetricCard,
  ChaMetrics,
} from "@/modules/cha/components/workspace/cha-operations-shared";
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

  const session = await getSession();
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
  const visibleCount = customers.length;
  const currencyFormatter = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  });

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
      <ChaMetrics>
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
      </ChaMetrics>

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
      <OperationalDataTable>
        <OperationalDataTableWrap>
          <OperationalTable>
            <thead>
              <tr>
                <OperationalTableHead>Customer Name</OperationalTableHead>
                <OperationalTableHead>Company Name</OperationalTableHead>
                <OperationalTableHead>Contact Info</OperationalTableHead>
                <OperationalTableHead>Outstanding Balance</OperationalTableHead>
                <OperationalTableHead>Last Updated</OperationalTableHead>
                <OperationalTableHead>Status</OperationalTableHead>
                <OperationalTableHead className="text-right">Actions</OperationalTableHead>
              </tr>
            </thead>
            <tbody>
              {customers.length === 0 ? (
                <OperationalTableEmpty colSpan={7}>
                  <div className="flex flex-col items-center justify-center p-14 text-center">
                    <p className="text-sm mnx-text-primary">
                      {hasActiveFilters ? "No customers match the current filters." : "No customers found in your master database."}
                    </p>
                    <p className="mt-1 text-xs mnx-text-muted">
                      {hasActiveFilters ? "Try clearing filters or broadening the search." : "Create a new customer profile to start building the register."}
                    </p>
                  </div>
                </OperationalTableEmpty>
              ) : (
                customers.map((customer) => {
                  const balance = customer.openingBalanceAmount || 0;
                  const statusTone = customer.status === "ACTIVE" ? "success" : "neutral";

                  return (
                    <tr key={customer.id}>
                      <OperationalPrimaryCell
                        primary={customer.name}
                        secondary={customer.customerSubType || "Business"}
                      />
                      <OperationalTableCell>{customer.companyName || customer.name}</OperationalTableCell>
                      <OperationalTableCell>
                        {customer.email || customer.phone ? (
                          <div className="space-y-1 text-sm mnx-text-primary">
                            {customer.email ? (
                              <div className="flex items-center gap-2">
                                <Mail className="size-4 mnx-text-muted" />
                                <span>{customer.email}</span>
                              </div>
                            ) : null}
                            {customer.phone ? (
                              <div className="flex items-center gap-2">
                                <Phone className="size-4 mnx-text-muted" />
                                <span>{customer.phone}</span>
                              </div>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-sm italic mnx-text-muted">No contact details</span>
                        )}
                      </OperationalTableCell>
                      <OperationalTableCell>
                        <span className="mnx-numeric text-sm mnx-text-primary">
                          {currencyFormatter.format(balance)}
                        </span>
                      </OperationalTableCell>
                      <OperationalTableCell className="mnx-numeric mnx-text-muted">
                        {customer.updatedAt.toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </OperationalTableCell>
                      <OperationalTableCell>
                        <OperationalStatus tone={statusTone}>
                          {customer.status || "ACTIVE"}
                        </OperationalStatus>
                      </OperationalTableCell>
                      <OperationalTableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/crm/customers/${customer.id}`}
                            className="mnx-operational-row-action mnx-text-info"
                            title="View details"
                            aria-label={`View ${customer.name}`}
                          >
                            <Eye className="size-4" />
                          </Link>
                          {(canManageChaCustomers || canManageCrmAccounts) ? (
                            <>
                              <Link
                                href={`/cha/customers/${customer.id}/edit`}
                                className="mnx-operational-row-action mnx-text-accent"
                                title="Edit customer"
                                aria-label={`Edit ${customer.name}`}
                              >
                                <Pencil className="size-4" />
                              </Link>
                              <DeleteRecordButton
                                recordId={customer.id}
                                confirmMessage="Are you sure you want to delete this customer account? All linked contacts, jobs, and portal access may be affected."
                                deleteAction={deleteAccountAction}
                                className="mnx-plain mnx-operational-row-action mnx-text-danger"
                              />
                            </>
                          ) : null}
                        </div>
                      </OperationalTableCell>
                    </tr>
                  );
                })
              )}
            </tbody>
          </OperationalTable>
        </OperationalDataTableWrap>
        <OperationalDataTableFooter
          summary={`Showing ${visibleCount === 0 ? "0" : `1-${visibleCount}`} of ${totalCount} customers`}
        />
      </OperationalDataTable>
    </div>
  );
}
