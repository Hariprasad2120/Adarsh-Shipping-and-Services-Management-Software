import type { CarbonIconType } from "@carbon/icons-react";
import {
  Analytics,
  Calendar,
  Dashboard,
  DocumentAdd,
  Folder,
  Group,
  Notification,
  Report,
  Security,
  Settings,
  Task,
  UserAvatar,
  UserMultiple,
  View,
} from "@carbon/icons-react";
import type { Caps } from "@/lib/rbac";

export type SecondaryNavItem = {
  href: string;
  label: string;
  icon: CarbonIconType;
  permission?: string | string[];
  hideFor?: string;
  matchPaths?: string[];
};

export type PrimaryNavSection = {
  id: string;
  href: string;
  label: string;
  icon: CarbonIconType;
  alwaysVisible?: boolean;
  permission?: string | string[];
  hideFor?: string;
  matchPaths?: string[];
  items: SecondaryNavItem[];
};

export const NAV_SECTIONS: PrimaryNavSection[] = [
  {
    id: "dashboard",
    href: "/dashboard",
    label: "Dashboard",
    icon: Dashboard,
    alwaysVisible: true,
    matchPaths: ["/dashboard"],
    items: [{ href: "/dashboard", label: "Overview", icon: View, matchPaths: ["/dashboard"] }],
  },
  {
    id: "hrms",
    href: "/hrms",
    label: "HRMS",
    icon: UserMultiple,
    permission: "hrms.employee.read",
    matchPaths: ["/hrms"],
    items: [
      {
        href: "/hrms/employees",
        label: "Employees",
        icon: Group,
        permission: "hrms.employee.read",
        matchPaths: ["/hrms/employees"],
      },
      {
        href: "/hrms/employees/new",
        label: "Onboard Employee",
        icon: DocumentAdd,
        permission: "hrms.employee.create",
        matchPaths: ["/hrms/employees/new"],
      },
      {
        href: "/hrms/salary-structure",
        label: "Salary Structure",
        icon: Analytics,
        permission: "hrms.employee.create",
        matchPaths: ["/hrms/salary-structure"],
      },
      {
        href: "/hrms/salary-revisions",
        label: "Salary Revisions",
        icon: Report,
        permission: "hrms.employee.read",
        matchPaths: ["/hrms/salary-revisions"],
      },
    ],
  },
  {
    id: "attendance",
    href: "/attendance",
    label: "Attendance",
    icon: Calendar,
    permission: "attendance.punch.self",
    matchPaths: ["/attendance"],
    items: [
      {
        href: "/attendance/punch",
        label: "Punch In / Out",
        icon: Task,
        permission: "attendance.punch.self",
        matchPaths: ["/attendance/punch"],
      },
      {
        href: "/attendance/leaves",
        label: "Leaves",
        icon: Report,
        permission: "attendance.leave.request",
        matchPaths: ["/attendance/leaves"],
      },
      {
        href: "/attendance/reports",
        label: "Reports",
        icon: Analytics,
        permission: "attendance.reports.view",
        matchPaths: ["/attendance/reports"],
      },
    ],
  },
  {
    id: "ams",
    href: "/ams",
    label: "AMS",
    icon: Folder,
    matchPaths: ["/ams"],
    items: [
      {
        href: "/ams/appraisals",
        label: "Appraisals",
        icon: Folder,
        permission: "ams.appraisal.assign_reviewers",
        matchPaths: ["/ams/appraisals"],
      },
      {
        href: "/ams/my-reviews",
        label: "My Reviews",
        icon: Task,
        permission: "ams.appraisal.review",
        hideFor: "admin.org.manage",
        matchPaths: ["/ams/my-reviews"],
      },
      {
        href: "/ams/my-appraisal",
        label: "My Appraisal",
        icon: UserAvatar,
        hideFor: "admin.org.manage",
        matchPaths: ["/ams/my-appraisal"],
      },
      {
        href: "/ams/cycles",
        label: "Cycles",
        icon: Calendar,
        permission: "ams.cycle.manage",
        matchPaths: ["/ams/cycles"],
      },
      {
        href: "/ams/criteria",
        label: "Criteria",
        icon: Settings,
        permission: "ams.criteria.manage",
        matchPaths: ["/ams/criteria"],
      },
    ],
  },
  {
    id: "crm",
    href: "/crm",
    label: "CRM",
    icon: Analytics,
    permission: "crm.access",
    matchPaths: ["/crm"],
    items: [
      {
        href: "/crm",
        label: "Overview",
        icon: View,
        permission: "crm.access",
        matchPaths: ["/crm"],
      },
    ],
  },
  {
    id: "admin",
    href: "/admin",
    label: "Admin",
    icon: Security,
    permission: "admin.org.manage",
    matchPaths: ["/admin"],
    items: [
      {
        href: "/admin/org-structure",
        label: "Organisation Structure",
        icon: Group,
        permission: "admin.org.manage",
        matchPaths: ["/admin/org-structure"],
      },
      {
        href: "/admin/roles",
        label: "Roles & Permissions",
        icon: UserMultiple,
        permission: "admin.org.manage",
        matchPaths: ["/admin/roles"],
      },
      {
        href: "/admin/settings",
        label: "Appraisal Settings",
        icon: Settings,
        permission: "admin.org.manage",
        matchPaths: ["/admin/settings"],
      },
      {
        href: "/admin/simulation",
        label: "Date Simulation",
        icon: Notification,
        permission: "admin.org.manage",
        matchPaths: ["/admin/simulation"],
      },
      {
        href: "/admin/notifications",
        label: "Notifications",
        icon: Notification,
        permission: "admin.org.manage",
        matchPaths: ["/admin/notifications"],
      },
    ],
  },
];

export function isVisible(caps: Caps, permission?: string | string[], hideFor?: string) {
  if (hideFor && caps[hideFor]) return false;
  if (!permission) return true;
  if (Array.isArray(permission)) return permission.some((key) => caps[key]);
  return Boolean(caps[permission]);
}

export function matchesPath(pathname: string, href: string, matchPaths?: string[]) {
  const paths = matchPaths && matchPaths.length > 0 ? matchPaths : [href];
  return paths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export function getActiveItemHref(pathname: string, items: SecondaryNavItem[]) {
  const rankedMatches = items
    .flatMap((item) => {
      const paths = item.matchPaths && item.matchPaths.length > 0 ? item.matchPaths : [item.href];
      return paths
        .filter((path) => pathname === path || pathname.startsWith(`${path}/`))
        .map((path) => ({ href: item.href, weight: path.length }));
    })
    .sort((left, right) => right.weight - left.weight);

  return rankedMatches[0]?.href ?? null;
}

export function getVisibleSections(caps: Caps) {
  return NAV_SECTIONS.map((section) => {
    const visibleItems = section.items.filter((item) => isVisible(caps, item.permission, item.hideFor));
    return { ...section, items: visibleItems };
  }).filter((section) => {
    const canSeeSection = isVisible(caps, section.permission, section.hideFor);
    if (section.alwaysVisible) return true;
    return section.items.length > 0 || Boolean(section.permission && canSeeSection);
  });
}

export function getVisibleSectionById(caps: Caps, id: string) {
  return getVisibleSections(caps).find((section) => section.id === id) ?? null;
}
