"use client";

import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { getBreadcrumbLabels, subscribeBreadcrumb } from "@/lib/breadcrumb-store";
import { Breadcrumbs } from "./breadcrumbs";

const PATH_LABELS: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/todo": "To-Do",
  "/notifications": "Notifications",
  "/hrms": "HRMS",
  "/hrms/employees": "Employees",
  "/hrms/employees/new": "Onboard Employee",
  "/hrms/users": "User Control",
  "/hrms/org-structure": "Organisation Structure",
  "/hrms/ownership": "Ownership",
  "/hrms/salary-structure": "Salary Structure",
  "/hrms/salary-revisions": "Salary Revisions",
  "/hrms/settings": "HRMS Settings",
  "/attendance": "Attendance",
  "/attendance/punch": "My Attendance",
  "/attendance/leaves": "Leaves",
  "/attendance/ot": "OT Management",
  "/attendance/timesheets": "Timesheets",
  "/attendance/biometric-sync": "Biometric Sync",
  "/attendance/reports": "Reports",
  "/ams": "AMS",
  "/ams/appraisals": "Appraisals",
  "/ams/my-reviews": "My Reviews",
  "/ams/my-appraisal": "My Appraisal",
  "/ams/cycles": "All Cycles",
  "/ams/criteria": "Criteria Questions",
  "/ams/slabs": "Increment Slabs",
  "/ams/extensions": "Extensions",
  "/ams/kpi": "Department KPI",
  "/ams/history": "History",
  "/lms": "LMS",
  "/lms/courses": "Courses",
  "/lms/my-learning": "My Learning",
  "/lms/assignments": "Assignments",
  "/lms/reports": "Reports",
  "/crm": "CRM",
  "/crm/dashboard": "Dashboard",
  "/crm/leads": "Leads",
  "/crm/efficiency": "Sales Efficiency",
  "/crm/leads/new": "New Lead",
  "/crm/contacts": "Contacts",
  "/crm/contacts/new": "New Contact",
  "/crm/customers": "Customers",
  "/crm/customers/new": "New Customer",
  "/crm/deals": "Deals Pipeline",
  "/crm/deals/new": "New Deal",
  "/crm/products": "Products & Services",
  "/crm/vendors": "Vendors",
  "/crm/tickets": "Support Cases",
  "/crm/tickets/new": "New Ticket",
  "/crm/lead-sources": "Lead Sources",
  "/crm/lead-sources/justdial": "JustDial Import",
  "/crm/lead-sources/logs": "Import History",
  "/crm/projects": "Projects",
  "/accounting/invoices-sales": "Invoices & Sales",
  "/accounting/invoices-sales/new": "New Commercial Document",
  "/accounting/sales-orders": "Sales Orders",
  "/accounting/sales-orders/new": "New Sales Order",
  "/accounting/purchase-orders": "Purchase Orders",
  "/accounting/purchase-orders/new": "New Purchase Order",
  "/admin": "Admin",
  "/admin/roles": "Roles & Permissions",
  "/admin/settings": "Appraisal Settings",
  "/admin/passkeys": "Passkey Resets",
  "/admin/sessions": "Session Monitor",
  "/admin/data-tools": "Data Tools",
  "/admin/simulation": "Simulation",
  "/admin/notifications": "Notifications",
};

const SEGMENT_LABELS: Record<string, string> = {
  new: "New",
  edit: "Edit",
  assign: "Assign",
  "management-review": "Management Review",
  "self-assessment": "Self Assessment",
  justdial: "JustDial Import",
  logs: "Import History",
};

function segmentToLabel(segment: string): string {
  if (SEGMENT_LABELS[segment]) return SEGMENT_LABELS[segment];
  if (/^[0-9a-f]{8}-[0-9a-f]{4}/i.test(segment) || /^[0-9a-f]{20,}$/i.test(segment)) return "Detail";
  return segment.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const TOP_LEVEL_ONLY = new Set(["/dashboard", "/todo", "/notifications"]);

export function AutoBreadcrumb() {
  const pathname = usePathname();
  const dynamicLabels = useSyncExternalStore(
    subscribeBreadcrumb,
    getBreadcrumbLabels,
    getBreadcrumbLabels,
  );

  if (TOP_LEVEL_ONLY.has(pathname)) return null;

  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return null;

  const items = segments.map((seg, i) => {
    const path = "/" + segments.slice(0, i + 1).join("/");
    const label = dynamicLabels[seg] ?? PATH_LABELS[path] ?? segmentToLabel(seg);
    const isLast = i === segments.length - 1;
    return { label, href: isLast ? undefined : path };
  });

  return (
    <div className="w-full shrink-0 px-6 py-1.5 lg:px-8 xl:px-10">
      <Breadcrumbs items={items} />
    </div>
  );
}
