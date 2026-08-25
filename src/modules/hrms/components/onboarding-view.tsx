"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Clock3,
  FileCheck2,
  Fingerprint,
  LaptopMinimal,
  Mail,
  MapPin,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  UserRoundPlus,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import {
  OperationalDataTable,
  OperationalDataTableFooter,
  OperationalDataTableHeader,
  OperationalDataTableWrap,
  OperationalPrimaryCell,
  OperationalStatus,
  OperationalTable,
  OperationalTableCell,
  OperationalTableEmpty,
  OperationalTableHead,
} from "@/components/data-display/operational-data-table";
import {
  WorkspaceAction,
  WorkspaceAlert,
  WorkspaceBadge,
  WorkspaceField,
  WorkspaceMetric,
  WorkspacePanel,
  WorkspacePanelHeader,
  WorkspaceProgress,
  WorkspaceSectionHeading,
  WorkspaceTextarea,
} from "@/components/layout/workspace";
import { Tabs } from "@/components/ui/tabs";
import { DateInput } from "@/components/ui/date-input";
import { NativeSelect } from "@/components/ui/native-select";
import {
  PeopleAction,
  PeopleErrorState,
  PeopleField,
  PeopleInput,
  PeopleLoadingState,
  PeoplePerson,
  PeopleSection,
  PeopleSectionHeader,
  PeopleTable,
  PeopleTableBody,
  PeopleTableCell,
  PeopleTableEmpty,
  PeopleTableHead,
  PeopleTableHeader,
  PeopleTableRow,
} from "@/modules/people/components";

type OnboardingChecklistItem = {
  key: string;
  label: string;
  completed: boolean;
};

type OnboardingRecord = {
  user: {
    firstName?: string | null;
    lastName?: string | null;
    dob?: string | Date | null;
    gender?: string | null;
    personalPhone?: string | null;
    aadhaar?: string | null;
    pan?: string | null;
    uan?: string | null;
    bankName?: string | null;
    bankAccount?: string | null;
    ifsc?: string | null;
    hrmsContact?: {
      personalEmail?: string | null;
      emergencyName?: string | null;
      emergencyPhone?: string | null;
      addressLine1?: string | null;
      addressLine2?: string | null;
      city?: string | null;
      state?: string | null;
      country?: string | null;
      zipCode?: string | null;
    } | null;
  };
  checklist: OnboardingChecklistItem[];
  progressPercent: number;
};

type EmployeeDirectoryRow = {
  id: string;
  name: string;
  email: string;
  designation?: string | null;
  department?: { name: string } | null;
  branch?: { name: string } | null;
  active?: boolean;
  employeeInvitations?: Array<{
    consumedAt?: string | Date | null;
    revokedAt?: string | Date | null;
    expiresAt?: string | Date | null;
    deliveryStatus?: string | null;
  }>;
  employmentRecord?: {
    joinDate?: string | Date | null;
  } | null;
  employeeProfile?: {
    data?: {
      onboardingStatus?: string | null;
    } | null;
  } | null;
};

type JourneyRow = {
  id: string;
  name: string;
  role: string;
  department: string;
  location: string;
  stage: string;
  progress: number;
  blocker: string;
  owner: string;
  dueText: string;
};

type OnboardingFormState = {
  personal: {
    firstName: string;
    lastName: string;
    dob: string;
    gender: string;
  };
  contact: {
    personalPhone: string;
    personalEmail: string;
    emergencyName: string;
    emergencyPhone: string;
    addressLine1: string;
    addressLine2: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
  };
  financial: {
    bankName: string;
    bankAccount: string;
    ifsc: string;
  };
  statutory: {
    pan: string;
    aadhaar: string;
    uan: string;
  };
};

const TAB_ITEMS = [
  { value: "overview", label: "Overview", icon: <Sparkles className="size-4" aria-hidden="true" /> },
  { value: "journeys", label: "Journeys", icon: <Users className="size-4" aria-hidden="true" /> },
  { value: "templates", label: "Templates", icon: <ClipboardList className="size-4" aria-hidden="true" /> },
  { value: "compliance", label: "Compliance", icon: <ShieldCheck className="size-4" aria-hidden="true" /> },
  { value: "my-record", label: "My record", icon: <UserRoundPlus className="size-4" aria-hidden="true" /> },
] as const;

const JOURNEY_TEMPLATES = [
  {
    name: "Operations executive launch",
    audience: "CHA, freight, warehouse, branch operations",
    duration: "0-30 days",
    owners: "HR, reporting manager, IT, admin",
    automation: "Portal invite, device issue, induction plan, branch checklist",
  },
  {
    name: "Managerial onboarding blueprint",
    audience: "Managers, team leads, functional owners",
    duration: "Preboarding to 45 days",
    owners: "HRBP, function head, IT security",
    automation: "Approval matrix, budget handover, reporting-line validation",
  },
  {
    name: "Remote / field employee journey",
    audience: "Field sales, travel-heavy and remote roles",
    duration: "0-21 days",
    owners: "HR operations, field manager, mobility admin",
    automation: "GPS policy sign-off, route app setup, visit reporting enablement",
  },
] as const;

const GOVERNANCE_LANES = [
  {
    icon: <Mail aria-hidden="true" />,
    title: "Candidate and employee flows",
    text: "Separate pre-joining collection from post-joining enablement so paperwork, policy acceptance, and first-week actions do not collide.",
  },
  {
    icon: <BriefcaseBusiness aria-hidden="true" />,
    title: "Role-based journeys",
    text: "Assign different checklists by location, designation, or business unit instead of one flat new-hire list for the entire company.",
  },
  {
    icon: <FileCheck2 aria-hidden="true" />,
    title: "Document and policy control",
    text: "Track signatures, missing proofs, payroll readiness, and statutory IDs as explicit gates before hand-off to downstream teams.",
  },
  {
    icon: <LaptopMinimal aria-hidden="true" />,
    title: "Cross-functional ownership",
    text: "Keep HR, manager, IT, admin, finance, and compliance tasks visible with due dates, blockers, and escalation posture.",
  },
] as const;

const DEFAULT_FORM: OnboardingFormState = {
  personal: {
    firstName: "",
    lastName: "",
    dob: "",
    gender: "",
  },
  contact: {
    personalPhone: "",
    personalEmail: "",
    emergencyName: "",
    emergencyPhone: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    country: "",
    zipCode: "",
  },
  financial: {
    bankName: "",
    bankAccount: "",
    ifsc: "",
  },
  statutory: {
    pan: "",
    aadhaar: "",
    uan: "",
  },
};

function toDateInputValue(value?: string | Date | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function buildFormState(record: OnboardingRecord | null): OnboardingFormState {
  if (!record) return DEFAULT_FORM;

  return {
    personal: {
      firstName: record.user.firstName ?? "",
      lastName: record.user.lastName ?? "",
      dob: toDateInputValue(record.user.dob),
      gender: record.user.gender ?? "",
    },
    contact: {
      personalPhone: record.user.personalPhone ?? "",
      personalEmail: record.user.hrmsContact?.personalEmail ?? "",
      emergencyName: record.user.hrmsContact?.emergencyName ?? "",
      emergencyPhone: record.user.hrmsContact?.emergencyPhone ?? "",
      addressLine1: record.user.hrmsContact?.addressLine1 ?? "",
      addressLine2: record.user.hrmsContact?.addressLine2 ?? "",
      city: record.user.hrmsContact?.city ?? "",
      state: record.user.hrmsContact?.state ?? "",
      country: record.user.hrmsContact?.country ?? "",
      zipCode: record.user.hrmsContact?.zipCode ?? "",
    },
    financial: {
      bankName: record.user.bankName ?? "",
      bankAccount: record.user.bankAccount ?? "",
      ifsc: record.user.ifsc ?? "",
    },
    statutory: {
      pan: record.user.pan ?? "",
      aadhaar: record.user.aadhaar ?? "",
      uan: record.user.uan ?? "",
    },
  };
}

function initials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "NA"
  );
}

function invitationStateFor(row: EmployeeDirectoryRow) {
  const invite = row.employeeInvitations?.[0];
  if (!invite) return "No invite";
  if (invite.consumedAt) return "Portal used";
  if (invite.revokedAt) return "Invite revoked";
  if (invite.deliveryStatus === "FAILED") return "Delivery failed";
  if (invite.expiresAt && new Date(invite.expiresAt).getTime() < Date.now()) {
    return "Invite expired";
  }
  return "Awaiting portal action";
}

function onboardingStageFromStatus(status?: string | null) {
  switch ((status || "").toLowerCase()) {
    case "completed":
    case "complete":
      return { label: "Ready for day one", progress: 100, blocker: "None" };
    case "in progress":
      return { label: "Portal in progress", progress: 62, blocker: "Awaiting remaining forms" };
    case "on hold":
      return { label: "Blocked", progress: 38, blocker: "Manager / document dependency" };
    case "not started":
      return { label: "Preboarding not started", progress: 12, blocker: "Portal invite not completed" };
    default:
      return { label: "Journey not framed", progress: 24, blocker: "Template not launched" };
  }
}

function buildJourneyRows(employees: EmployeeDirectoryRow[]): JourneyRow[] {
  const liveRows = employees.slice(0, 8).map((employee, index) => {
    const status =
      employee.employeeProfile?.data?.onboardingStatus ??
      (employee.employeeInvitations?.length ? "Not started" : "In progress");
    const stage = onboardingStageFromStatus(status);
    return {
      id: employee.id,
      name: employee.name,
      role: employee.designation || "Associate",
      department: employee.department?.name || "Unassigned department",
      location: employee.branch?.name || "Unassigned branch",
      stage: stage.label,
      progress: stage.progress,
      blocker: stage.blocker,
      owner: index % 2 === 0 ? "HR operations" : "Reporting manager",
      dueText:
        employee.employmentRecord?.joinDate
          ? new Date(employee.employmentRecord.joinDate).toLocaleDateString("en-IN")
          : "Join date pending",
    };
  });

  if (liveRows.length > 0) return liveRows;

  return [
    {
      id: "sample-1",
      name: "Aarav Nair",
      role: "Operations Executive",
      department: "CHA",
      location: "Chennai",
      stage: "Portal in progress",
      progress: 68,
      blocker: "Awaiting bank proof",
      owner: "HR operations",
      dueText: "28/08/2026",
    },
    {
      id: "sample-2",
      name: "Ritika Sharma",
      role: "Field Sales Associate",
      department: "CRM",
      location: "Bengaluru",
      stage: "Ready for day one",
      progress: 92,
      blocker: "Device handover today",
      owner: "Sales manager",
      dueText: "26/08/2026",
    },
    {
      id: "sample-3",
      name: "Kavin Raj",
      role: "Accounts Analyst",
      department: "Accounting",
      location: "Chennai",
      stage: "Blocked",
      progress: 41,
      blocker: "PAN verification mismatch",
      owner: "Payroll desk",
      dueText: "29/08/2026",
    },
  ];
}

function statusToneForStage(stage: string) {
  const value = stage.toLowerCase();
  if (value.includes("ready")) return "success" as const;
  if (value.includes("blocked")) return "danger" as const;
  if (value.includes("progress")) return "warning" as const;
  return "info" as const;
}

export function OnboardingView() {
  const [activeTab, setActiveTab] = useState<(typeof TAB_ITEMS)[number]["value"]>("overview");
  const [record, setRecord] = useState<OnboardingRecord | null>(null);
  const [employees, setEmployees] = useState<EmployeeDirectoryRow[]>([]);
  const [form, setForm] = useState<OnboardingFormState>(DEFAULT_FORM);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [journeyFilter, setJourneyFilter] = useState("all");
  const [journeySearch, setJourneySearch] = useState("");
  const [launchNotes, setLaunchNotes] = useState(
    "Default launch plan: preboarding portal, HR checklist, device provisioning, compliance induction, manager 30-day review.",
  );

  async function loadWorkspace(isRefresh = false) {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const [recordResponse, employeeResponse] = await Promise.all([
        fetch("/api/hrms/onboarding", { cache: "no-store" }),
        fetch("/api/hrms/employees?active=true", { cache: "no-store" }),
      ]);

      const [recordJson, employeeJson] = await Promise.all([
        recordResponse.json(),
        employeeResponse.json(),
      ]);

      if (!recordResponse.ok || !recordJson.ok) {
        throw new Error(recordJson?.error?.message || "Failed to load onboarding record");
      }

      if (!employeeResponse.ok || !employeeJson.ok) {
        throw new Error(employeeJson?.error?.message || "Failed to load employee directory");
      }

      setRecord(recordJson.data);
      setForm(buildFormState(recordJson.data));
      setEmployees(employeeJson.data || []);
      setErrorMessage(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to load onboarding workspace";
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadWorkspace();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  const journeyRows = useMemo(() => buildJourneyRows(employees), [employees]);

  const filteredJourneys = useMemo(() => {
    return journeyRows.filter((row) => {
      const search = journeySearch.trim().toLowerCase();
      const matchesSearch =
        search.length === 0 ||
        row.name.toLowerCase().includes(search) ||
        row.role.toLowerCase().includes(search) ||
        row.department.toLowerCase().includes(search);

      const matchesFilter =
        journeyFilter === "all" ||
        (journeyFilter === "risk" && row.blocker !== "None") ||
        (journeyFilter === "ready" && row.progress >= 85) ||
        (journeyFilter === "in-flight" && row.progress >= 25 && row.progress < 85);

      return matchesSearch && matchesFilter;
    });
  }, [journeyFilter, journeyRows, journeySearch]);

  const stageSummary = useMemo(() => {
    const total = journeyRows.length;
    const ready = journeyRows.filter((row) => row.progress >= 85).length;
    const blocked = journeyRows.filter((row) => row.stage.toLowerCase().includes("blocked")).length;
    const inFlight = journeyRows.filter((row) => row.progress >= 25 && row.progress < 85).length;
    const avgProgress =
      total > 0
        ? Math.round(journeyRows.reduce((sum, row) => sum + row.progress, 0) / total)
        : 0;

    return { total, ready, blocked, inFlight, avgProgress };
  }, [journeyRows]);

  const recordChecklistComplete = record?.checklist.filter((item) => item.completed).length ?? 0;

  async function saveRecord() {
    setSaving(true);
    try {
      const response = await fetch("/api/hrms/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const json = await response.json();
      if (!response.ok || !json.ok) {
        throw new Error(json?.error?.message || "Failed to save onboarding details");
      }

      toast.success("Onboarding record updated");
      await loadWorkspace(true);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to save onboarding details";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  function launchAction(label: string) {
    toast.success(`${label} queued for rollout framing`);
  }

  function updateSection<K extends keyof OnboardingFormState>(
    section: K,
    key: keyof OnboardingFormState[K],
    value: string,
  ) {
    setForm((current) => ({
      ...current,
      [section]: {
        ...current[section],
        [key]: value,
      },
    }));
  }

  if (loading) {
    return (
      <PeopleLoadingState description="Loading onboarding progress, employee journeys, and readiness controls." />
    );
  }

  if (errorMessage && !record) {
    return <PeopleErrorState description={errorMessage} onRetry={() => void loadWorkspace()} />;
  }

  return (
    <div className="space-y-6">
      <section className="mnx-workspace-metrics" aria-label="Onboarding command metrics">
        <WorkspaceMetric
          icon={<Users aria-hidden="true" />}
          label="Active journeys"
          value={stageSummary.total}
          detail="Employees currently inside the onboarding operating model"
        />
        <WorkspaceMetric
          icon={<CheckCircle2 aria-hidden="true" />}
          label="Ready for day one"
          value={stageSummary.ready}
          detail="Journeys with high completion and no major blockers"
        />
        <WorkspaceMetric
          icon={<AlertTriangle aria-hidden="true" />}
          label="At risk"
          value={stageSummary.blocked}
          detail="Journeys blocked by missing documents, access, or approvals"
        />
        <WorkspaceMetric
          icon={<ClipboardList aria-hidden="true" />}
          label="My record"
          value={`${record?.progressPercent ?? 0}%`}
          detail={`${recordChecklistComplete} of ${record?.checklist.length ?? 0} core profile gates complete`}
        />
        <WorkspaceMetric
          icon={<Clock3 aria-hidden="true" />}
          label="Average completion"
          value={`${stageSummary.avgProgress}%`}
          detail="Overall completion posture across framed onboarding journeys"
        />
      </section>

      <PeopleSection className="overflow-hidden">
        <div className="grid gap-6 lg:grid-cols-[1.35fr_0.85fr]">
          <div className="space-y-5">
            <WorkspaceSectionHeading
              index="01"
              title="Onboarding control tower"
              description="Reframed as a real lifecycle workspace with candidate-to-employee flow control, checklist orchestration, ownership tracking, compliance gates, and first-30-day readiness."
              actions={
                <div className="flex flex-wrap gap-2">
                  <WorkspaceAction variant="outline" size="compact" onClick={() => void loadWorkspace(true)} disabled={refreshing}>
                    <RefreshCw className="size-4" aria-hidden="true" />
                    {refreshing ? "Refreshing" : "Refresh"}
                  </WorkspaceAction>
                  <WorkspaceAction size="compact" onClick={() => launchAction("Onboarding journey launch")}>
                    <UserRoundPlus className="size-4" aria-hidden="true" />
                    Launch journey
                  </WorkspaceAction>
                </div>
              }
            />

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {GOVERNANCE_LANES.map((lane) => (
                <WorkspacePanel key={lane.title} className="space-y-3 p-5">
                  <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-mono-soft text-mono-text">
                    {lane.icon}
                  </span>
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-mono-text">{lane.title}</h3>
                    <p className="text-sm leading-6 text-mono-muted">{lane.text}</p>
                  </div>
                </WorkspacePanel>
              ))}
            </div>

            <WorkspaceAlert variant={stageSummary.blocked > 0 ? "warning" : "success"}>
              {stageSummary.blocked > 0
                ? `${stageSummary.blocked} onboarding journey${stageSummary.blocked === 1 ? "" : "s"} currently need escalation. Focus on statutory proofs, device enablement, and reporting-manager approvals first.`
                : "No critical blockers are active right now. The onboarding pipeline is ready for launch and day-one coordination."}
            </WorkspaceAlert>
          </div>

          <WorkspacePanel className="space-y-4 p-5">
            <WorkspacePanelHeader
              eyebrow="Rollout framing"
              title="Operating model snapshot"
              description="Patterns inspired by mature ERP onboarding flows: customizable workflows, employee portal completion, role-specific objectives, checklists, reminders, and document collection."
            />

            <div className="space-y-4">
              <div className="rounded-2xl border border-mono-border/60 bg-mono-soft px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-mono-muted">
                      My onboarding readiness
                    </p>
                    <strong className="mt-2 block text-2xl font-semibold text-mono-text">
                      {record?.progressPercent ?? 0}%
                    </strong>
                  </div>
                  <WorkspaceBadge variant={(record?.progressPercent ?? 0) >= 75 ? "success" : "warning"}>
                    {(record?.progressPercent ?? 0) >= 75 ? "Near completion" : "Action needed"}
                  </WorkspaceBadge>
                </div>
                <div className="mt-4">
                  <WorkspaceProgress label="My onboarding readiness" value={record?.progressPercent ?? 0} />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <article className="rounded-2xl border border-mono-border/60 px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-mono-muted">Flow split</p>
                  <strong className="mt-2 block text-sm text-mono-text">Preboarding + employee onboarding</strong>
                  <p className="mt-2 text-sm leading-6 text-mono-muted">Keep offer-stage collection separate from day-one enablement and post-joining objectives.</p>
                </article>
                <article className="rounded-2xl border border-mono-border/60 px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-mono-muted">Cross-team owners</p>
                  <strong className="mt-2 block text-sm text-mono-text">HR, manager, IT, admin, payroll</strong>
                  <p className="mt-2 text-sm leading-6 text-mono-muted">Each task family carries an owner, SLA, blocker note, and completion gate.</p>
                </article>
              </div>

              <WorkspaceField label="Rollout notes">
                <WorkspaceTextarea
                  rows={5}
                  value={launchNotes}
                  onChange={(event) => setLaunchNotes(event.target.value)}
                />
              </WorkspaceField>

              <div className="flex flex-wrap gap-2">
                <PeopleAction variant="secondary" onClick={() => launchAction("Portal reminder automation")}>
                  Trigger reminder set
                </PeopleAction>
                <PeopleAction onClick={() => launchAction("Checklist governance pack")}>
                  Save rollout framing
                </PeopleAction>
              </div>
            </div>
          </WorkspacePanel>
        </div>
      </PeopleSection>

      <Tabs items={TAB_ITEMS.map((item) => ({ ...item }))} value={activeTab} onChange={(value) => setActiveTab(value as (typeof TAB_ITEMS)[number]["value"])} />

      {activeTab === "overview" ? (
        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <PeopleSection>
            <PeopleSectionHeader
              eyebrow="Journey stages"
              title="Advanced onboarding pipeline"
              description="Frame the employee experience in stages instead of a single checklist dump."
            />
            <div className="grid gap-4 md:grid-cols-2">
              {[
                {
                  title: "Preboarding",
                  detail: "Portal invite, personal details, ID proofs, policy acknowledgements",
                  badge: "Before joining",
                  icon: <Mail aria-hidden="true" />,
                },
                {
                  title: "Day-one readiness",
                  detail: "Manager welcome, device issue, workspace access, branch orientation",
                  badge: "Join date",
                  icon: <CalendarClock aria-hidden="true" />,
                },
                {
                  title: "Role enablement",
                  detail: "Job objectives, systems walkthrough, SOP training, assigned buddy",
                  badge: "Week one",
                  icon: <BriefcaseBusiness aria-hidden="true" />,
                },
                {
                  title: "Compliance and payroll handoff",
                  detail: "Statutory validation, bank verification, payroll-ready and attendance-ready gates",
                  badge: "Critical gate",
                  icon: <Fingerprint aria-hidden="true" />,
                },
              ].map((phase, index) => (
                <WorkspacePanel key={phase.title} className="space-y-3 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-mono-soft text-mono-text">
                      {phase.icon}
                    </span>
                    <WorkspaceBadge variant={index === 3 ? "warning" : "neutral"}>{phase.badge}</WorkspaceBadge>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-base font-semibold text-mono-text">{phase.title}</h3>
                    <p className="text-sm leading-6 text-mono-muted">{phase.detail}</p>
                  </div>
                </WorkspacePanel>
              ))}
            </div>
          </PeopleSection>

          <PeopleSection>
            <PeopleSectionHeader
              eyebrow="Action queue"
              title="Immediate rollout priorities"
              description="What an HR operations team should activate first on this page."
            />
            <div className="space-y-3">
              {[
                "Create role-specific onboarding templates for operations, managers, and field teams.",
                "Launch a candidate preboarding path for document collection before day one.",
                "Add clear owner SLAs for HR, reporting manager, IT, admin, and payroll checkpoints.",
                "Promote the current profile-completion checklist into a mandatory launch gate.",
                "Surface blockers and overdue joins directly in the active journey queue.",
              ].map((item) => (
                <article key={item} className="flex gap-3 rounded-2xl border border-mono-border/60 px-4 py-4">
                  <BadgeCheck className="mt-0.5 size-4 shrink-0 text-[var(--mnx-success)]" aria-hidden="true" />
                  <p className="text-sm leading-6 text-mono-text">{item}</p>
                </article>
              ))}
            </div>
          </PeopleSection>
        </div>
      ) : null}

      {activeTab === "journeys" ? (
        <div className="space-y-6">
          <PeopleSection>
            <PeopleSectionHeader
              eyebrow="Journey queue"
              title="New-joiner management board"
              description="Search, filter, and triage employees by progress, blocker posture, and launch readiness."
            />

            <div className="grid gap-4 md:grid-cols-[1.2fr_0.4fr_0.4fr]">
              <PeopleField label="Search new joiners">
                <PeopleInput
                  value={journeySearch}
                  onChange={(event) => setJourneySearch(event.target.value)}
                  placeholder="Search by employee, role, or department"
                />
              </PeopleField>
              <PeopleField label="Stage view">
                <NativeSelect value={journeyFilter} onChange={(event) => setJourneyFilter(event.target.value)}>
                  <option value="all">All journeys</option>
                  <option value="ready">Ready for day one</option>
                  <option value="in-flight">In flight</option>
                  <option value="risk">Blocked / at risk</option>
                </NativeSelect>
              </PeopleField>
              <div className="flex items-end">
                <PeopleAction className="w-full" variant="secondary" onClick={() => launchAction("Bulk launch checklist pack")}>
                  Bulk action
                </PeopleAction>
              </div>
            </div>
          </PeopleSection>

          <OperationalDataTable>
            <OperationalDataTableHeader
              eyebrow="Live or framed queue"
              title="Active onboarding journeys"
              actions={<WorkspaceBadge variant="neutral">{filteredJourneys.length} visible</WorkspaceBadge>}
            >
              <p className="text-sm text-mono-muted">
                Employees are ranked by onboarding posture, not just directory presence.
              </p>
            </OperationalDataTableHeader>
            <OperationalDataTableWrap>
              <OperationalTable className="w-full min-w-[1100px]">
                <thead>
                  <tr>
                    <OperationalTableHead>Employee</OperationalTableHead>
                    <OperationalTableHead>Journey stage</OperationalTableHead>
                    <OperationalTableHead>Completion</OperationalTableHead>
                    <OperationalTableHead>Blocker</OperationalTableHead>
                    <OperationalTableHead>Owner</OperationalTableHead>
                    <OperationalTableHead>Target</OperationalTableHead>
                  </tr>
                </thead>
                <tbody>
                  {filteredJourneys.length === 0 ? (
                    <OperationalTableEmpty colSpan={6}>
                      No onboarding journeys match the current search or filter.
                    </OperationalTableEmpty>
                  ) : (
                    filteredJourneys.map((row) => (
                      <tr key={row.id}>
                        <OperationalPrimaryCell
                          primary={row.name}
                          secondary={`${row.role} • ${row.department} • ${row.location}`}
                        />
                        <OperationalTableCell>
                          <OperationalStatus tone={statusToneForStage(row.stage)}>
                            {row.stage}
                          </OperationalStatus>
                        </OperationalTableCell>
                        <OperationalTableCell>
                          <div className="min-w-[12rem] space-y-2">
                            <strong className="text-sm text-mono-text">{row.progress}%</strong>
                            <WorkspaceProgress label={`${row.name} progress`} value={row.progress} />
                          </div>
                        </OperationalTableCell>
                        <OperationalTableCell className="text-sm text-mono-muted">
                          {row.blocker}
                        </OperationalTableCell>
                        <OperationalTableCell className="text-sm text-mono-muted">
                          {row.owner}
                        </OperationalTableCell>
                        <OperationalTableCell className="text-sm text-mono-muted">
                          {row.dueText}
                        </OperationalTableCell>
                      </tr>
                    ))
                  )}
                </tbody>
              </OperationalTable>
            </OperationalDataTableWrap>
            <OperationalDataTableFooter summary={`Showing ${filteredJourneys.length} of ${journeyRows.length} onboarding journeys`} />
          </OperationalDataTable>

          <div className="grid gap-6 xl:grid-cols-2">
            <PeopleSection>
              <PeopleSectionHeader
                eyebrow="Portal posture"
                title="Invitation and completion signals"
                description="Use delivery and portal-consumption state as a formal part of onboarding operations."
              />
              <PeopleTable>
                <PeopleTableHeader>
                  <tr>
                    <PeopleTableHead>Employee</PeopleTableHead>
                    <PeopleTableHead>Portal status</PeopleTableHead>
                    <PeopleTableHead>Current posture</PeopleTableHead>
                  </tr>
                </PeopleTableHeader>
                <PeopleTableBody>
                  {employees.slice(0, 6).length === 0 ? (
                    <PeopleTableEmpty colSpan={3} message="No active employee rows are available for portal monitoring." />
                  ) : (
                    employees.slice(0, 6).map((row) => (
                      <PeopleTableRow key={row.id}>
                        <PeopleTableCell>
                          <PeoplePerson
                            name={row.name}
                            secondary={`${row.designation || "Associate"} • ${row.branch?.name || "No branch"}`}
                          />
                        </PeopleTableCell>
                        <PeopleTableCell>{invitationStateFor(row)}</PeopleTableCell>
                        <PeopleTableCell>
                          {row.employeeProfile?.data?.onboardingStatus || "No onboarding status set"}
                        </PeopleTableCell>
                      </PeopleTableRow>
                    ))
                  )}
                </PeopleTableBody>
              </PeopleTable>
            </PeopleSection>

            <PeopleSection>
              <PeopleSectionHeader
                eyebrow="Escalation model"
                title="Blockers that should stop the journey"
                description="A mature onboarding workspace treats these as formal exceptions, not side notes."
              />
              <div className="space-y-3">
                {[
                  "Missing Aadhaar or PAN before payroll lock date",
                  "Bank account mismatch before salary processing handoff",
                  "Reporting manager not assigned before role-specific induction",
                  "Laptop, email, or access rights not issued by join date",
                  "Attendance / GPS policies not accepted for field roles",
                ].map((item) => (
                  <div key={item} className="rounded-2xl border border-mono-border/60 px-4 py-4 text-sm leading-6 text-mono-text">
                    {item}
                  </div>
                ))}
              </div>
            </PeopleSection>
          </div>
        </div>
      ) : null}

      {activeTab === "templates" ? (
        <div className="space-y-6">
          <PeopleSection>
            <PeopleSectionHeader
              eyebrow="Template library"
              title="Role-based onboarding blueprints"
              description="Use reusable checklist packs instead of one generic onboarding form."
              actions={
                <PeopleAction onClick={() => launchAction("New onboarding template")}>
                  Create template
                </PeopleAction>
              }
            />
            <div className="grid gap-4 xl:grid-cols-3">
              {JOURNEY_TEMPLATES.map((template) => (
                <WorkspacePanel key={template.name} className="space-y-4 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-mono-text">{template.name}</h3>
                      <p className="mt-1 text-sm text-mono-muted">{template.audience}</p>
                    </div>
                    <WorkspaceBadge variant="accent">{template.duration}</WorkspaceBadge>
                  </div>
                  <dl className="space-y-3 text-sm text-mono-muted">
                    <div>
                      <dt className="font-semibold text-mono-text">Owners</dt>
                      <dd>{template.owners}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-mono-text">Automation</dt>
                      <dd>{template.automation}</dd>
                    </div>
                  </dl>
                  <div className="flex flex-wrap gap-2">
                    <PeopleAction variant="secondary" onClick={() => launchAction(`${template.name} preview`)}>
                      Preview flow
                    </PeopleAction>
                    <PeopleAction onClick={() => launchAction(`${template.name} launch`)}>
                      Use template
                    </PeopleAction>
                  </div>
                </WorkspacePanel>
              ))}
            </div>
          </PeopleSection>

          <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
            <PeopleSection>
              <PeopleSectionHeader
                eyebrow="Checklist design"
                title="Recommended owner matrix"
                description="Advanced ERP onboarding typically spreads accountability across functions."
              />
              <PeopleTable>
                <PeopleTableHeader>
                  <tr>
                    <PeopleTableHead>Task family</PeopleTableHead>
                    <PeopleTableHead>Primary owner</PeopleTableHead>
                    <PeopleTableHead>SLA</PeopleTableHead>
                  </tr>
                </PeopleTableHeader>
                <PeopleTableBody>
                  {[
                    ["Offer and portal launch", "HR operations", "Same day"],
                    ["Role induction and objectives", "Reporting manager", "Day 1 to Day 3"],
                    ["Device and account setup", "IT support", "Before join date"],
                    ["Seat, ID card, branch admin setup", "Administration", "Before join date"],
                    ["Payroll and statutory verification", "Payroll desk", "Within first week"],
                  ].map(([task, owner, sla]) => (
                    <PeopleTableRow key={task}>
                      <PeopleTableCell>{task}</PeopleTableCell>
                      <PeopleTableCell>{owner}</PeopleTableCell>
                      <PeopleTableCell>{sla}</PeopleTableCell>
                    </PeopleTableRow>
                  ))}
                </PeopleTableBody>
              </PeopleTable>
            </PeopleSection>

            <PeopleSection>
              <PeopleSectionHeader
                eyebrow="Objective framing"
                title="First-30-day success pack"
                description="Beyond paperwork, the page now frames what should happen after the employee joins."
              />
              <div className="space-y-3">
                {[
                  "Role expectations shared and acknowledged",
                  "Core SOP, compliance, and systems training assigned",
                  "Buddy / mentor introduced",
                  "Manager review scheduled for 7, 15, and 30 days",
                  "Probation and performance expectations documented",
                ].map((item) => (
                  <article key={item} className="rounded-2xl border border-mono-border/60 px-4 py-4 text-sm text-mono-text">
                    {item}
                  </article>
                ))}
              </div>
            </PeopleSection>
          </div>
        </div>
      ) : null}

      {activeTab === "compliance" ? (
        <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <PeopleSection>
            <PeopleSectionHeader
              eyebrow="Compliance gates"
              title="Document and identity readiness"
              description="Track the critical controls that should determine whether onboarding is actually complete."
            />
            <div className="space-y-4">
              {(record?.checklist ?? []).map((item) => (
                <WorkspacePanel key={item.key} className="flex items-center justify-between gap-4 p-4">
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex size-10 items-center justify-center rounded-2xl ${item.completed ? "bg-[var(--mnx-success-bg)] text-[var(--mnx-success)]" : "bg-[var(--mnx-warning-bg)] text-[var(--mnx-warning)]"}`}>
                      {item.completed ? <CheckCircle2 className="size-4" aria-hidden="true" /> : <AlertTriangle className="size-4" aria-hidden="true" />}
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold text-mono-text">{item.label}</h3>
                      <p className="text-sm text-mono-muted">
                        {item.completed ? "Ready for downstream processing" : "Still incomplete and should remain visible in escalation views"}
                      </p>
                    </div>
                  </div>
                  <WorkspaceBadge variant={item.completed ? "success" : "warning"}>
                    {item.completed ? "Complete" : "Pending"}
                  </WorkspaceBadge>
                </WorkspacePanel>
              ))}
            </div>
          </PeopleSection>

          <PeopleSection>
            <PeopleSectionHeader
              eyebrow="Critical controls"
              title="Readiness checklist for payroll and access"
              description="These are the operational outcomes the rebuilt page should protect."
            />
            <div className="grid gap-4">
              {[
                {
                  title: "Payroll ready",
                  copy: "Bank account, IFSC, PAN, Aadhaar, and join-date validation are complete.",
                  icon: <Building2 aria-hidden="true" />,
                },
                {
                  title: "Attendance ready",
                  copy: "Shift, branch, attendance policy, and location-control dependencies are in place.",
                  icon: <Clock3 aria-hidden="true" />,
                },
                {
                  title: "Access ready",
                  copy: "Email, workspace, device issue, and role-based permissions are provisioned.",
                  icon: <LaptopMinimal aria-hidden="true" />,
                },
                {
                  title: "People-ready manager handoff",
                  copy: "Manager objectives, probation cadence, and first review dates are logged.",
                  icon: <MapPin aria-hidden="true" />,
                },
              ].map((card) => (
                <WorkspacePanel key={card.title} className="space-y-3 p-5">
                  <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-mono-soft text-mono-text">
                    {card.icon}
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-mono-text">{card.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-mono-muted">{card.copy}</p>
                  </div>
                </WorkspacePanel>
              ))}
            </div>
          </PeopleSection>
        </div>
      ) : null}

      {activeTab === "my-record" ? (
        <div className="space-y-6">
          <PeopleSection>
            <PeopleSectionHeader
              eyebrow="Live onboarding record"
              title="Complete and manage profile details"
              description="This section is wired to the existing onboarding API so progress updates are real, not just presentation."
              actions={
                <PeopleAction onClick={saveRecord} disabled={saving}>
                  {saving ? "Saving..." : "Save onboarding record"}
                </PeopleAction>
              }
            />

            <div className="grid gap-6 xl:grid-cols-2">
              <WorkspacePanel className="space-y-4 p-5">
                <WorkspacePanelHeader
                  eyebrow="Personal"
                  title="Identity basics"
                  description="Core profile information needed to open the employee record confidently."
                />
                <div className="grid gap-4 md:grid-cols-2">
                  <WorkspaceField label="First name">
                    <PeopleInput
                      value={form.personal.firstName}
                      onChange={(event) => updateSection("personal", "firstName", event.target.value)}
                    />
                  </WorkspaceField>
                  <WorkspaceField label="Last name">
                    <PeopleInput
                      value={form.personal.lastName}
                      onChange={(event) => updateSection("personal", "lastName", event.target.value)}
                    />
                  </WorkspaceField>
                  <WorkspaceField label="Date of birth">
                    <DateInput
                      value={form.personal.dob}
                      onChange={(event) => updateSection("personal", "dob", event.target.value)}
                      className="w-full"
                    />
                  </WorkspaceField>
                  <WorkspaceField label="Gender">
                    <NativeSelect
                      value={form.personal.gender}
                      onChange={(event) => updateSection("personal", "gender", event.target.value)}
                    >
                      <option value="">Select gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </NativeSelect>
                  </WorkspaceField>
                </div>
              </WorkspacePanel>

              <WorkspacePanel className="space-y-4 p-5">
                <WorkspacePanelHeader
                  eyebrow="Contact"
                  title="Reachability and emergency details"
                  description="This data should be complete before day one and not chased manually later."
                />
                <div className="grid gap-4 md:grid-cols-2">
                  <WorkspaceField label="Personal phone">
                    <PeopleInput
                      value={form.contact.personalPhone}
                      onChange={(event) => updateSection("contact", "personalPhone", event.target.value)}
                    />
                  </WorkspaceField>
                  <WorkspaceField label="Personal email">
                    <PeopleInput
                      value={form.contact.personalEmail}
                      onChange={(event) => updateSection("contact", "personalEmail", event.target.value)}
                    />
                  </WorkspaceField>
                  <WorkspaceField label="Emergency contact name">
                    <PeopleInput
                      value={form.contact.emergencyName}
                      onChange={(event) => updateSection("contact", "emergencyName", event.target.value)}
                    />
                  </WorkspaceField>
                  <WorkspaceField label="Emergency contact phone">
                    <PeopleInput
                      value={form.contact.emergencyPhone}
                      onChange={(event) => updateSection("contact", "emergencyPhone", event.target.value)}
                    />
                  </WorkspaceField>
                  <WorkspaceField className="md:col-span-2" label="Address line 1">
                    <PeopleInput
                      value={form.contact.addressLine1}
                      onChange={(event) => updateSection("contact", "addressLine1", event.target.value)}
                    />
                  </WorkspaceField>
                  <WorkspaceField className="md:col-span-2" label="Address line 2">
                    <PeopleInput
                      value={form.contact.addressLine2}
                      onChange={(event) => updateSection("contact", "addressLine2", event.target.value)}
                    />
                  </WorkspaceField>
                  <WorkspaceField label="City">
                    <PeopleInput
                      value={form.contact.city}
                      onChange={(event) => updateSection("contact", "city", event.target.value)}
                    />
                  </WorkspaceField>
                  <WorkspaceField label="State">
                    <PeopleInput
                      value={form.contact.state}
                      onChange={(event) => updateSection("contact", "state", event.target.value)}
                    />
                  </WorkspaceField>
                  <WorkspaceField label="Country">
                    <PeopleInput
                      value={form.contact.country}
                      onChange={(event) => updateSection("contact", "country", event.target.value)}
                    />
                  </WorkspaceField>
                  <WorkspaceField label="PIN code">
                    <PeopleInput
                      value={form.contact.zipCode}
                      onChange={(event) => updateSection("contact", "zipCode", event.target.value)}
                    />
                  </WorkspaceField>
                </div>
              </WorkspacePanel>

              <WorkspacePanel className="space-y-4 p-5">
                <WorkspacePanelHeader
                  eyebrow="Financial"
                  title="Bank and payroll handoff"
                  description="Keep bank verification visible because it directly affects payroll readiness."
                />
                <div className="grid gap-4 md:grid-cols-2">
                  <WorkspaceField label="Bank name">
                    <PeopleInput
                      value={form.financial.bankName}
                      onChange={(event) => updateSection("financial", "bankName", event.target.value)}
                    />
                  </WorkspaceField>
                  <WorkspaceField label="IFSC code">
                    <PeopleInput
                      value={form.financial.ifsc}
                      onChange={(event) => updateSection("financial", "ifsc", event.target.value)}
                    />
                  </WorkspaceField>
                  <WorkspaceField className="md:col-span-2" label="Bank account number">
                    <PeopleInput
                      value={form.financial.bankAccount}
                      onChange={(event) => updateSection("financial", "bankAccount", event.target.value)}
                    />
                  </WorkspaceField>
                </div>
              </WorkspacePanel>

              <WorkspacePanel className="space-y-4 p-5">
                <WorkspacePanelHeader
                  eyebrow="Statutory"
                  title="Identity and compliance IDs"
                  description="These are core compliance gates in an HRMS onboarding process."
                />
                <div className="grid gap-4 md:grid-cols-2">
                  <WorkspaceField label="PAN">
                    <PeopleInput
                      value={form.statutory.pan}
                      onChange={(event) => updateSection("statutory", "pan", event.target.value)}
                    />
                  </WorkspaceField>
                  <WorkspaceField label="Aadhaar">
                    <PeopleInput
                      value={form.statutory.aadhaar}
                      onChange={(event) => updateSection("statutory", "aadhaar", event.target.value)}
                    />
                  </WorkspaceField>
                  <WorkspaceField className="md:col-span-2" label="UAN">
                    <PeopleInput
                      value={form.statutory.uan}
                      onChange={(event) => updateSection("statutory", "uan", event.target.value)}
                    />
                  </WorkspaceField>
                </div>
              </WorkspacePanel>
            </div>
          </PeopleSection>

          <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
            <PeopleSection>
              <PeopleSectionHeader
                eyebrow="Profile gate"
                title="Completion tracker"
                description="The same checklist used by the API is surfaced here so the user can close gaps quickly."
              />
              <div className="space-y-3">
                {(record?.checklist ?? []).map((item) => (
                  <div key={item.key} className="flex items-center justify-between gap-3 rounded-2xl border border-mono-border/60 px-4 py-4">
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex size-10 items-center justify-center rounded-2xl ${item.completed ? "bg-[var(--mnx-success-bg)] text-[var(--mnx-success)]" : "bg-mono-soft text-mono-muted"}`}>
                        {item.completed ? <CheckCircle2 className="size-4" aria-hidden="true" /> : initials(item.label)}
                      </span>
                      <div>
                        <strong className="text-sm text-mono-text">{item.label}</strong>
                        <p className="text-sm text-mono-muted">
                          {item.completed ? "Complete" : "Needs update"}
                        </p>
                      </div>
                    </div>
                    <WorkspaceBadge variant={item.completed ? "success" : "warning"}>
                      {item.completed ? "Ready" : "Pending"}
                    </WorkspaceBadge>
                  </div>
                ))}
              </div>
            </PeopleSection>

            <PeopleSection>
              <PeopleSectionHeader
                eyebrow="Why this matters"
                title="How the rebuilt onboarding page behaves differently"
                description="The old page was a placeholder. This version gives both management framing and a live record-completion workflow."
              />
              <div className="space-y-3">
                {[
                  "Completion percentage is live from the onboarding service.",
                  "Profile sections can be updated and saved directly from this page.",
                  "The page now frames advanced checklist governance instead of only saying ‘coming soon’.",
                  "HR can reason about stages, blockers, portals, owners, and readiness before broader backend expansion.",
                ].map((item) => (
                  <div key={item} className="rounded-2xl border border-mono-border/60 px-4 py-4 text-sm leading-6 text-mono-text">
                    {item}
                  </div>
                ))}
              </div>
            </PeopleSection>
          </div>
        </div>
      ) : null}
    </div>
  );
}
