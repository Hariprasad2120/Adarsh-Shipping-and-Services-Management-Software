import {
  CalendarClock,
  Clock3,
  FileText,
  Fingerprint,
  Settings2,
} from "lucide-react";
import {
  PeopleActionLink,
  PeopleLinkCard,
  PeopleLinkGrid,
  PeopleSection,
  PeopleSectionHeader,
  PeopleSummary,
  PeopleSummaryGrid,
} from "@/modules/people/components/people-workspace";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

const controlAreas = [
  {
    href: "/attendance/ot",
    title: "Shifts, overtime, and holidays",
    description:
      "Manage working calendars, overtime review, loss-of-pay handling, and month-end attendance processing.",
    icon: <Clock3 aria-hidden="true" />,
  },
  {
    href: "/attendance/leaves",
    title: "Leave workflow",
    description:
      "Review request handling, balance-aware approvals, and the employee-facing leave experience.",
    icon: <CalendarClock aria-hidden="true" />,
  },
  {
    href: "/attendance/leaves/policies",
    title: "Leave types & policies",
    description:
      "Configure entitlement, accrual, reset, carry-forward, and approval routing for each leave type.",
    icon: <Settings2 aria-hidden="true" />,
  },
  {
    href: "/attendance/leaves/hr-console",
    title: "HR leave operations",
    description:
      "Manually adjust balances, grant special leave, and approve compensatory-off credits — all ledger-audited.",
    icon: <FileText aria-hidden="true" />,
  },
  {
    href: "/attendance/leaves/team-calendar",
    title: "Team leave calendar",
    description:
      "See direct reports' scheduled leave for the month and flag overlapping absences before approving.",
    icon: <CalendarClock aria-hidden="true" />,
  },
  {
    href: "/attendance/biometric-sync",
    title: "Biometric integrations",
    description:
      "Inspect device synchronization, mapping coverage, and attendance import exceptions.",
    icon: <Fingerprint aria-hidden="true" />,
  },
  {
    href: "/attendance/reports",
    title: "Monthly reporting",
    description:
      "Validate the payroll-month summary that closes the operational attendance cycle.",
    icon: <FileText aria-hidden="true" />,
  },
];

export default async function AttendanceSettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <>
      <PeopleSummaryGrid>
        <PeopleSummary
          icon={<Settings2 aria-hidden="true" />}
          label="Control areas"
          value={controlAreas.length}
          detail="Policy, processing, sync, and reporting"
        />
        <PeopleSummary
          icon={<Clock3 aria-hidden="true" />}
          label="Operational cycle"
          value="Monthly"
          detail="Designed around payroll-period closure"
        />
        <PeopleSummary
          icon={<Fingerprint aria-hidden="true" />}
          label="Integration focus"
          value="Biometric"
          detail="Device sync and exception handling"
        />
        <PeopleSummary
          icon={<CalendarClock aria-hidden="true" />}
          label="Employee workflow"
          value="Leave"
          detail="Balances, requests, and approvals"
        />
      </PeopleSummaryGrid>

      <PeopleSection>
        <PeopleSectionHeader
          eyebrow="Configuration workspace"
          title="Attendance settings and controls"
          description="Use these operational areas to tune how attendance is captured, reviewed, synchronized, and closed each month."
          actions={
            <PeopleActionLink href="/attendance/punch">
              Open punch workspace
            </PeopleActionLink>
          }
        />
        <PeopleLinkGrid>
          {controlAreas.map((area) => (
            <PeopleLinkCard
              key={area.href}
              href={area.href}
              title={area.title}
              description={area.description}
              icon={area.icon}
            />
          ))}
        </PeopleLinkGrid>
      </PeopleSection>
    </>
  );
}
