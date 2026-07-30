import { headers } from "next/headers";
import type { ReactNode } from "react";
import { requirePortalSession } from "@/modules/customer-portal/auth";
import { getCustomerPortalApprovalQueue } from "@/modules/customer-portal/shipments";
import { PortalShellClient } from "./_components/client-actions";
import { db } from "@/lib/db";

export default async function CustomerPortalLayout({
  children,
}: {
  children: ReactNode;
}) {
  const currentPath = (await headers()).get("x-current-pathname") ?? "";
  if (
    currentPath === "/customer-portal/login" ||
    currentPath === "/customer-portal/activate" ||
    currentPath === "/customer-portal/forgot-password"
  ) {
    return <>{children}</>;
  }

  const session = await requirePortalSession();

  // Query live counts for dashboard & sidebar badges
  const [
    activeShipmentsCount,
    unreadPortalNotificationsCount,
    pendingApprovals,
    latestJobWithCoordinator,
    customerAccount,
  ] = await Promise.all([
    db.chaJob.count({
      where: {
        orgId: session.orgId,
        customerId: session.customerId,
        status: "ACTIVE",
        stage: { not: "FILED" },
        deletedAt: null,
      },
    }),
    db.customerPortalNotification.count({
      where: {
        portalUserId: session.portalUserId,
        readAt: null,
      },
    }),
    getCustomerPortalApprovalQueue(session),
    db.chaJob.findFirst({
      where: {
        orgId: session.orgId,
        customerId: session.customerId,
        status: "ACTIVE",
        deletedAt: null,
      },
      orderBy: { updatedAt: "desc" },
      include: {
        primaryOwner: {
          select: {
            name: true,
            email: true,
            personalPhone: true,
            designation: true,
          },
        },
        assignedManager: {
          select: {
            name: true,
            email: true,
            personalPhone: true,
            designation: true,
          },
        },
      },
    }),
    db.crmAccount.findUnique({
      where: { id: session.customerId },
      include: {
        owner: {
          select: {
            name: true,
            email: true,
            personalPhone: true,
            designation: true,
          },
        },
      },
    }),
  ]);
  const pendingApprovalsCount = pendingApprovals.length;
  const unreadNotificationsCount =
    unreadPortalNotificationsCount + pendingApprovalsCount;

  // Determine assigned support contact (coordinator)
  let coordinator: {
    name: string;
    email: string;
    phone?: string | null;
    designation?: string | null;
    officeHours?: string | null;
    escalationName?: string | null;
    escalationEmail?: string | null;
  } | null = null;

  const primaryOwner = latestJobWithCoordinator?.primaryOwner;
  const assignedManager = latestJobWithCoordinator?.assignedManager;
  const accountOwner = customerAccount?.owner;

  if (primaryOwner) {
    coordinator = {
      name: primaryOwner.name,
      email: primaryOwner.email,
      phone: primaryOwner.personalPhone,
      designation: primaryOwner.designation || "Primary Coordinator",
      officeHours: "9:00 AM - 6:00 PM (IST)",
      escalationName: assignedManager?.name || "Operations Manager",
      escalationEmail: assignedManager?.email || "ops-escalations@monolith.com",
    };
  } else if (assignedManager) {
    coordinator = {
      name: assignedManager.name,
      email: assignedManager.email,
      phone: assignedManager.personalPhone,
      designation: assignedManager.designation || "Assigned Manager",
      officeHours: "9:00 AM - 6:00 PM (IST)",
      escalationName: "Operations Director",
      escalationEmail: "ops-escalations@monolith.com",
    };
  } else if (accountOwner) {
    coordinator = {
      name: accountOwner.name,
      email: accountOwner.email,
      phone: accountOwner.personalPhone,
      designation: accountOwner.designation || "Account Manager",
      officeHours: "9:30 AM - 6:30 PM (IST)",
      escalationName: "CRM Coordinator",
      escalationEmail: "crm-escalations@monolith.com",
    };
  } else {
    // Standard default fallback support contact
    coordinator = {
      name: "Monolith Support",
      email: "support@adarshshipping.com",
      phone: "+91 44 2490 1234",
      designation: "Customer Care Desk",
      officeHours: "24/7 Operations Support",
      escalationName: "Operations Escalation Desk",
      escalationEmail: "escalation@adarshshipping.com",
    };
  }

  const portalUserContext = {
    name: session.portalUser.name,
    email: session.portalUser.email,
    designation:
      session.portalUser.contact?.designation || "Authorized Contact",
    customer: {
      id: session.customerId,
      name: session.portalUser.customer.name,
    },
  };

  return (
    <PortalShellClient
      portalUser={portalUserContext}
      unreadNotificationsCount={unreadNotificationsCount}
      pendingApprovalsCount={pendingApprovalsCount}
      activeShipmentsCount={activeShipmentsCount}
      coordinator={coordinator}
    >
      {children}
    </PortalShellClient>
  );
}
