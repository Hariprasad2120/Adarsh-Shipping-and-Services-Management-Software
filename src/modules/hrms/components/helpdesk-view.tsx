"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CircleAlert,
  CircleHelp,
  FileText,
  FolderKanban,
  KeyRound,
  LaptopMinimal,
  LifeBuoy,
  MessageSquare,
  RefreshCcw,
  Search,
  Send,
  ShieldCheck,
  Siren,
  Ticket,
  TimerReset,
  UserCog,
  Workflow,
} from "lucide-react";
import { toast } from "sonner";
import {
  PeopleControlButton as MnxAction,
  PeopleControlInput as MnxInput,
  PeopleControlTextarea as MnxTextarea,
  PeopleToggleButton,
} from "@/components/monolith/people-controls";
import {
  PeopleErrorState,
  PeopleField,
  PeopleLoadingState,
  PeopleSection,
  PeopleSectionHeader,
  PeopleSelect,
  PeopleSummary,
  PeopleSummaryGrid,
  PeopleTable,
  PeopleTableBody,
  PeopleTableCell,
  PeopleTableEmpty,
  PeopleTableHead,
  PeopleTableHeader,
  PeopleTableRow,
  PeopleTextarea,
} from "@/components/monolith/people-workspace";
import { WorkspaceAlert, WorkspaceBadge } from "@/components/monolith/workspace";

type HelpDeskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
type ServiceDeskKind = "HR" | "IT";
type QueueFilter = "ALL" | "OPEN" | "AT_RISK" | "OVERDUE" | "RESOLVED";
type SlaState = "ON_TRACK" | "AT_RISK" | "OVERDUE" | "RESOLVED";

type HelpDeskFaq = {
  id: string;
  question: string;
  answer: string;
};

type HelpDeskCategory = {
  id: string;
  name: string;
  description: string | null;
  faqs: HelpDeskFaq[];
};

type HelpDeskComment = {
  id: string;
  message: string;
  createdAt: string;
};

type HelpDeskCase = {
  id: string;
  categoryId: string;
  title: string;
  description: string;
  priority: HelpDeskPriority;
  status: string;
  createdAt: string;
  updatedAt: string;
  user: {
    name: string;
  };
  comments: HelpDeskComment[];
};

type HelpDeskPayload = {
  cases: HelpDeskCase[];
  categories: HelpDeskCategory[];
};

type ApiResponse<T> = {
  ok: boolean;
  data?: T;
  error?: {
    message?: string;
  };
};

type ServiceTemplate = {
  desk: ServiceDeskKind;
  title: string;
  description: string;
  keywords: string[];
  suggestedSubject: string;
};

type FunctionCard = {
  icon: typeof Workflow;
  title: string;
  description: string;
};

const PRIORITY_OPTIONS: HelpDeskPriority[] = [
  "LOW",
  "MEDIUM",
  "HIGH",
  "URGENT",
];

const QUEUE_FILTERS: Array<{
  value: QueueFilter;
  label: string;
  description: string;
}> = [
  { value: "ALL", label: "All", description: "Every request in the register" },
  { value: "OPEN", label: "Open", description: "Open, assigned, or in progress" },
  { value: "AT_RISK", label: "SLA risk", description: "Approaching target" },
  { value: "OVERDUE", label: "Overdue", description: "Needs escalation" },
  { value: "RESOLVED", label: "Resolved", description: "Resolved or closed" },
];

const SERVICE_TEMPLATES: ServiceTemplate[] = [
  {
    desk: "HR",
    title: "Payroll and compensation",
    description:
      "Salary slips, payout corrections, tax proofs, deductions, incentives, and benefits clarifications.",
    keywords: ["payroll", "salary", "benefit", "tax", "compensation", "incentive"],
    suggestedSubject: "Payroll clarification request",
  },
  {
    desk: "HR",
    title: "Policy and employee records",
    description:
      "Leave rules, attendance concerns, employee master data, letters, onboarding, and manager routing questions.",
    keywords: ["policy", "attendance", "leave", "record", "onboarding", "letter"],
    suggestedSubject: "Employee policy or records support",
  },
  {
    desk: "HR",
    title: "Workplace and people support",
    description:
      "Confidential workplace concerns, reporting issues, grievance handling, or process guidance.",
    keywords: ["workplace", "grievance", "manager", "confidential", "people"],
    suggestedSubject: "Confidential workplace support request",
  },
  {
    desk: "IT",
    title: "Access and identity",
    description:
      "Password resets, role access, MFA help, onboarding access, mailbox permissions, and account lockouts.",
    keywords: ["access", "password", "login", "account", "mfa", "mailbox"],
    suggestedSubject: "Access support required",
  },
  {
    desk: "IT",
    title: "Hardware and workplace tech",
    description:
      "Laptop issues, peripherals, printers, damaged devices, replacement requests, or meeting-room equipment.",
    keywords: ["laptop", "hardware", "device", "printer", "monitor", "equipment"],
    suggestedSubject: "Device or hardware support required",
  },
  {
    desk: "IT",
    title: "Software, network, and VPN",
    description:
      "Application incidents, ERP access, VPN, Wi-Fi, software installation, and productivity-tool issues.",
    keywords: ["software", "network", "vpn", "wifi", "application", "erp"],
    suggestedSubject: "Software or network incident",
  },
];

const ADVANCED_FUNCTIONS: FunctionCard[] = [
  {
    icon: Workflow,
    title: "Category-based routing",
    description:
      "Route each request to the right HR or IT specialist based on category ownership and workload.",
  },
  {
    icon: TimerReset,
    title: "SLA and escalation watch",
    description:
      "Track first-action and resolution targets, then surface risk before a queue slips.",
  },
  {
    icon: FolderKanban,
    title: "Knowledge-first intake",
    description:
      "Deflect repeat questions with FAQs, references, and guided request playbooks before submission.",
  },
  {
    icon: ShieldCheck,
    title: "Confidential case handling",
    description:
      "Separate sensitive HR concerns from standard service work while keeping a single employee entry point.",
  },
];

const SLA_TARGET_HOURS: Record<HelpDeskPriority, number> = {
  LOW: 48,
  MEDIUM: 24,
  HIGH: 8,
  URGENT: 4,
};

const IT_KEYWORD_PATTERN =
  /\b(it|access|password|login|hardware|device|laptop|software|application|mailbox|vpn|network|wifi|system|account)\b/i;

function formatDateTime(value: string) {
  return new Date(value).toLocaleString();
}

function formatHoursLabel(hours: number) {
  if (hours % 24 === 0) {
    const days = hours / 24;
    return `${days} day${days === 1 ? "" : "s"}`;
  }

  return `${hours} hour${hours === 1 ? "" : "s"}`;
}

function formatRelativeDeadline(targetAt: Date) {
  const diffMs = targetAt.getTime() - Date.now();
  const diffHours = Math.round(diffMs / 36e5);

  if (Math.abs(diffHours) < 1) {
    const diffMinutes = Math.round(diffMs / 6e4);
    if (diffMinutes >= 0) {
      return `due in ${Math.max(diffMinutes, 0)} min`;
    }
    return `${Math.abs(diffMinutes)} min late`;
  }

  if (diffHours >= 0) {
    return `due in ${diffHours}h`;
  }

  return `${Math.abs(diffHours)}h late`;
}

function badgeVariantForPriority(priority: HelpDeskPriority) {
  switch (priority) {
    case "LOW":
      return "neutral";
    case "MEDIUM":
      return "accent";
    case "HIGH":
      return "warning";
    case "URGENT":
      return "danger";
    default:
      return "neutral";
  }
}

function badgeVariantForStatus(status: string) {
  switch (status) {
    case "RESOLVED":
    case "CLOSED":
      return "success";
    case "IN_PROGRESS":
    case "ASSIGNED":
      return "warning";
    case "OPEN":
      return "accent";
    default:
      return "neutral";
  }
}

function badgeVariantForDesk(desk: ServiceDeskKind) {
  return desk === "IT" ? "warning" : "accent";
}

function badgeVariantForSla(state: SlaState) {
  switch (state) {
    case "RESOLVED":
      return "success";
    case "AT_RISK":
      return "warning";
    case "OVERDUE":
      return "danger";
    default:
      return "neutral";
  }
}

function inferDeskFromCategory(category?: HelpDeskCategory | null): ServiceDeskKind {
  const haystack = [
    category?.name,
    category?.description,
    ...(category?.faqs ?? []).map((faq) => `${faq.question} ${faq.answer}`),
  ]
    .filter(Boolean)
    .join(" ");

  return IT_KEYWORD_PATTERN.test(haystack) ? "IT" : "HR";
}

function isResolvedStatus(status: string) {
  return status === "RESOLVED" || status === "CLOSED";
}

function getSlaInsight(item: HelpDeskCase): {
  state: SlaState;
  targetAt: Date;
  label: string;
  targetHours: number;
} {
  const targetHours = SLA_TARGET_HOURS[item.priority];
  const targetAt = new Date(new Date(item.createdAt).getTime() + targetHours * 36e5);

  if (isResolvedStatus(item.status)) {
    return {
      state: "RESOLVED",
      targetAt,
      label: "completed",
      targetHours,
    };
  }

  const now = Date.now();
  const remainingRatio = (targetAt.getTime() - now) / (targetHours * 36e5);

  if (now > targetAt.getTime()) {
    return {
      state: "OVERDUE",
      targetAt,
      label: formatRelativeDeadline(targetAt),
      targetHours,
    };
  }

  if (remainingRatio <= 0.25) {
    return {
      state: "AT_RISK",
      targetAt,
      label: formatRelativeDeadline(targetAt),
      targetHours,
    };
  }

  return {
    state: "ON_TRACK",
    targetAt,
    label: formatRelativeDeadline(targetAt),
    targetHours,
  };
}

async function readApiResponse<T>(response: Response) {
  const payload = (await response.json().catch(() => null)) as
    | ApiResponse<T>
    | null;
  if (!response.ok || !payload?.ok || !payload.data) {
    throw new Error(payload?.error?.message || "The help desk request failed.");
  }
  return payload.data;
}

function pickBestCategoryId(
  categories: HelpDeskCategory[],
  desk: ServiceDeskKind,
  keywords: string[] = [],
) {
  const deskCategories = categories.filter(
    (category) => inferDeskFromCategory(category) === desk,
  );

  if (deskCategories.length === 0) {
    return categories[0]?.id ?? "";
  }

  if (keywords.length === 0) {
    return deskCategories[0]?.id ?? "";
  }

  const keywordMatcher = new RegExp(`\\b(${keywords.join("|")})\\b`, "i");
  const matched = deskCategories.find((category) =>
    keywordMatcher.test(`${category.name} ${category.description ?? ""}`),
  );

  return matched?.id ?? deskCategories[0]?.id ?? "";
}

export function HelpDeskView() {
  const [data, setData] = useState<HelpDeskPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedDesk, setSelectedDesk] = useState<ServiceDeskKind>("HR");
  const [queueFilter, setQueueFilter] = useState<QueueFilter>("ALL");
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [commenting, setCommenting] = useState(false);
  const [commentMessage, setCommentMessage] = useState("");
  const [form, setForm] = useState({
    categoryId: "",
    priority: "MEDIUM" as HelpDeskPriority,
    title: "",
    description: "",
  });

  const loadCases = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/hrms/hr-cases", { cache: "no-store" });
      const payload = await readApiResponse<HelpDeskPayload>(response);
      setData(payload);
      setForm((current) => {
        const nextCategoryId =
          current.categoryId ||
          payload.categories[0]?.id ||
          "";

        return {
          ...current,
          categoryId: nextCategoryId,
        };
      });
      setSelectedCaseId((current) => current ?? payload.cases[0]?.id ?? null);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "The service desk workspace could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  function switchDesk(nextDesk: ServiceDeskKind) {
    setSelectedDesk(nextDesk);

    if (!data?.categories.length) {
      return;
    }

    const nextCategoryId = pickBestCategoryId(data.categories, nextDesk);
    setForm((current) => ({
      ...current,
      categoryId: nextCategoryId,
    }));
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadCases();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadCases]);

  const categoryMap = useMemo(() => {
    return new Map(
      (data?.categories ?? []).map((category) => [category.id, category]),
    );
  }, [data?.categories]);

  const categoryInsights = useMemo(() => {
    return (data?.categories ?? []).map((category) => {
      const desk = inferDeskFromCategory(category);
      const caseCount = (data?.cases ?? []).filter(
        (item) => item.categoryId === category.id,
      ).length;
      const openCount = (data?.cases ?? []).filter(
        (item) =>
          item.categoryId === category.id &&
          ["OPEN", "ASSIGNED", "IN_PROGRESS"].includes(item.status),
      ).length;

      return {
        ...category,
        desk,
        caseCount,
        openCount,
      };
    });
  }, [data?.cases, data?.categories]);

  const caseInsights = useMemo(() => {
    return (data?.cases ?? []).map((item) => {
      const category = categoryMap.get(item.categoryId) ?? null;
      const desk = inferDeskFromCategory(category);
      const sla = getSlaInsight(item);

      return {
        ...item,
        category,
        desk,
        sla,
      };
    });
  }, [categoryMap, data?.cases]);

  const visibleCases = useMemo(() => {
    const term = search.trim().toLowerCase();

    return caseInsights.filter((item) => {
      if (item.desk !== selectedDesk) {
        return false;
      }

      if (queueFilter === "OPEN" && isResolvedStatus(item.status)) {
        return false;
      }

      if (queueFilter === "AT_RISK" && item.sla.state !== "AT_RISK") {
        return false;
      }

      if (queueFilter === "OVERDUE" && item.sla.state !== "OVERDUE") {
        return false;
      }

      if (queueFilter === "RESOLVED" && !isResolvedStatus(item.status)) {
        return false;
      }

      if (!term) return true;

      return [
        item.id,
        item.title,
        item.description,
        item.status,
        item.user.name,
        item.category?.name ?? "",
        item.desk,
      ]
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [caseInsights, queueFilter, search, selectedDesk]);

  const activeCaseId =
    selectedCaseId && visibleCases.some((item) => item.id === selectedCaseId)
      ? selectedCaseId
      : visibleCases[0]?.id ?? null;

  const selectedCase =
    visibleCases.find((item) => item.id === activeCaseId) ?? null;

  const selectedCategory =
    data?.categories.find((item) => item.id === form.categoryId) ?? null;

  const selectedCategoryDesk = inferDeskFromCategory(selectedCategory);
  const configuredHrCategories = categoryInsights.filter((item) => item.desk === "HR");
  const configuredItCategories = categoryInsights.filter((item) => item.desk === "IT");
  const openCases = caseInsights.filter((item) =>
    ["OPEN", "ASSIGNED", "IN_PROGRESS"].includes(item.status),
  );
  const atRiskCases = caseInsights.filter((item) => item.sla.state === "AT_RISK");
  const overdueCases = caseInsights.filter((item) => item.sla.state === "OVERDUE");
  const faqCount = (data?.categories ?? []).reduce(
    (sum, item) => sum + item.faqs.length,
    0,
  );
  const currentDeskTemplates = SERVICE_TEMPLATES.filter(
    (template) => template.desk === selectedDesk,
  );
  const currentDeskCategories = categoryInsights.filter(
    (category) => category.desk === selectedDesk,
  );
  const currentDeskOpenCount = openCases.filter((item) => item.desk === selectedDesk).length;
  const currentDeskRiskCount = atRiskCases.filter((item) => item.desk === selectedDesk).length;
  const currentDeskOverdueCount = overdueCases.filter((item) => item.desk === selectedDesk).length;

  async function submitCase(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const response = await fetch("/api/hrms/hr-cases", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });
      await readApiResponse<HelpDeskCase>(response);
      toast.success(
        `${selectedDesk === "IT" ? "IT support" : "HR"} request raised successfully.`,
      );
      setForm((current) => ({
        ...current,
        priority: "MEDIUM",
        title: "",
        description: "",
      }));
      setCommentMessage("");
      await loadCases();
    } catch (submitError) {
      toast.error(
        submitError instanceof Error
          ? submitError.message
          : "The help desk request could not be created.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function submitComment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedCase) return;
    setCommenting(true);
    try {
      const response = await fetch(
        `/api/hrms/hr-cases/${selectedCase.id}/comments`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ message: commentMessage }),
        },
      );
      await readApiResponse<HelpDeskComment>(response);
      toast.success("Conversation update added.");
      setCommentMessage("");
      await loadCases();
      setSelectedCaseId(selectedCase.id);
    } catch (commentError) {
      toast.error(
        commentError instanceof Error
          ? commentError.message
          : "The case comment could not be saved.",
      );
    } finally {
      setCommenting(false);
    }
  }

  function applyTemplate(template: ServiceTemplate) {
    if (!data?.categories.length) return;

    const nextCategoryId = pickBestCategoryId(
      data.categories,
      template.desk,
      template.keywords,
    );

    switchDesk(template.desk);
    setForm((current) => ({
      ...current,
      categoryId: nextCategoryId,
      title: current.title.trim() ? current.title : template.suggestedSubject,
    }));
  }

  if (loading && !data) {
    return (
      <PeopleLoadingState description="Loading help desk requests, categories, FAQ guidance, and queue health." />
    );
  }

  if (error && !data) {
    return <PeopleErrorState description={error} onRetry={() => void loadCases()} />;
  }

  return (
    <>
      <PeopleSummaryGrid>
        <PeopleSummary
          icon={<Ticket aria-hidden="true" />}
          label="Total requests"
          value={data?.cases.length ?? 0}
          detail="All logged cases across help desk categories"
        />
        <PeopleSummary
          icon={<LifeBuoy aria-hidden="true" />}
          label={`${selectedDesk} open queue`}
          value={currentDeskOpenCount}
          detail="Open, assigned, and in-progress work"
        />
        <PeopleSummary
          icon={<CircleAlert aria-hidden="true" />}
          label="SLA risk"
          value={currentDeskRiskCount}
          detail="Requests close to the target window"
        />
        <PeopleSummary
          icon={<Siren aria-hidden="true" />}
          label="Overdue"
          value={currentDeskOverdueCount}
          detail="Items that need immediate follow-up"
        />
        <PeopleSummary
          icon={<UserCog aria-hidden="true" />}
          label="HR categories"
          value={configuredHrCategories.length}
          detail={`${configuredHrCategories.reduce((sum, item) => sum + item.openCount, 0)} open across people services`}
        />
        <PeopleSummary
          icon={<LaptopMinimal aria-hidden="true" />}
          label="IT categories"
          value={configuredItCategories.length}
          detail={`${configuredItCategories.reduce((sum, item) => sum + item.openCount, 0)} open across workplace tech`}
        />
      </PeopleSummaryGrid>

      <div className="mnx-helpdesk-shell">
        <PeopleSection>
          <PeopleSectionHeader
            eyebrow="Unified intake"
            title="Raise an HR or IT service request"
            description="Model this page like an internal service desk: route work by category, deflect common questions with guidance, and keep a clean employee conversation trail."
          />
          <div className="mnx-helpdesk-stack">
            <div className="mnx-helpdesk-toggle-row" role="tablist" aria-label="Choose service desk">
              <PeopleToggleButton
                active={selectedDesk === "HR"}
                onClick={() => switchDesk("HR")}
              >
                <UserCog aria-hidden="true" />
                HR help desk
              </PeopleToggleButton>
              <PeopleToggleButton
                active={selectedDesk === "IT"}
                onClick={() => switchDesk("IT")}
              >
                <LaptopMinimal aria-hidden="true" />
                IT support desk
              </PeopleToggleButton>
            </div>

            <div className="mnx-helpdesk-template-grid">
              {currentDeskTemplates.map((template) => (
                // eslint-disable-next-line no-restricted-syntax -- Intentional custom service-template button with richer card layout.
                <button
                  key={template.title}
                  type="button"
                  className="mnx-helpdesk-template-card"
                  onClick={() => applyTemplate(template)}
                >
                  <span className="mnx-helpdesk-template-icon" aria-hidden="true">
                    {template.desk === "IT" ? (
                      <KeyRound aria-hidden="true" />
                    ) : (
                      <FileText aria-hidden="true" />
                    )}
                  </span>
                  <span>
                    <strong>{template.title}</strong>
                    <small>{template.description}</small>
                  </span>
                </button>
              ))}
            </div>

            <form className="grid gap-4" onSubmit={submitCase}>
              <div className="grid gap-4 md:grid-cols-2">
                <PeopleField label="Category" htmlFor="hr-case-category" required>
                  <PeopleSelect
                    id="hr-case-category"
                    value={form.categoryId}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        categoryId: event.target.value,
                      }))
                    }
                    disabled={submitting || (data?.categories.length ?? 0) === 0}
                  >
                    {currentDeskCategories.length ? (
                      currentDeskCategories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))
                    ) : (
                      <option value="">No {selectedDesk} categories configured</option>
                    )}
                  </PeopleSelect>
                </PeopleField>

                <PeopleField label="Priority" htmlFor="hr-case-priority" required>
                  <PeopleSelect
                    id="hr-case-priority"
                    value={form.priority}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        priority: event.target.value as HelpDeskPriority,
                      }))
                    }
                    disabled={submitting}
                  >
                    {PRIORITY_OPTIONS.map((priority) => (
                      <option key={priority} value={priority}>
                        {priority}
                      </option>
                    ))}
                  </PeopleSelect>
                </PeopleField>
              </div>

              <PeopleField
                label="Subject"
                htmlFor="hr-case-title"
                hint="Keep the title outcome-focused so the service owner can route it immediately."
                required
              >
                <MnxInput
                  id="hr-case-title"
                  value={form.title}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  placeholder={
                    selectedDesk === "IT"
                      ? "Example: VPN access issue for remote shift"
                      : "Example: Salary slip mismatch for July"
                  }
                  disabled={submitting}
                />
              </PeopleField>

              <PeopleField
                label="Description"
                htmlFor="hr-case-description"
                hint="Describe the issue, business impact, timeline, and what action you need from the service team."
                required
              >
                <PeopleTextarea
                  id="hr-case-description"
                  value={form.description}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  placeholder={
                    selectedDesk === "IT"
                      ? "Share the application, device, error message, location, urgency, and any troubleshooting already attempted."
                      : "Describe the policy, payroll, employee-data, or workplace issue in enough detail for HR to act without another follow-up."
                  }
                  rows={6}
                  disabled={submitting}
                />
              </PeopleField>

              {selectedCategory ? (
                <div className="mnx-helpdesk-note-card">
                  <div className="mnx-helpdesk-note-head">
                    <strong>{selectedCategory.name}</strong>
                    <WorkspaceBadge variant={badgeVariantForDesk(selectedCategoryDesk)}>
                      {selectedCategoryDesk === "IT" ? "IT support" : "HR"}
                    </WorkspaceBadge>
                  </div>
                  <p>
                    {selectedCategory.description ||
                      "Use this category when you need specialist handling instead of a general query."}
                  </p>
                  <div className="mnx-helpdesk-inline-badges">
                    <WorkspaceBadge variant="neutral">
                      {selectedCategory.faqs.length} FAQ
                      {selectedCategory.faqs.length === 1 ? "" : "s"}
                    </WorkspaceBadge>
                    <WorkspaceBadge variant="neutral">
                      Suggested SLA {formatHoursLabel(SLA_TARGET_HOURS[form.priority])}
                    </WorkspaceBadge>
                  </div>
                </div>
              ) : null}

              {(data?.categories.length ?? 0) === 0 ? (
                <WorkspaceAlert variant="warning">
                  <CircleHelp aria-hidden="true" />
                  No help desk categories are configured yet. Add at least one
                  category before employees raise cases from this workspace.
                </WorkspaceAlert>
              ) : currentDeskCategories.length === 0 ? (
                <WorkspaceAlert variant="warning">
                  <CircleHelp aria-hidden="true" />
                  No {selectedDesk === "IT" ? "IT support" : "HR"} categories
                  are configured yet. Add a category such as Access, Payroll,
                  Hardware, Policy, or Leave to make this lane operational.
                </WorkspaceAlert>
              ) : null}

              <div className="flex justify-end">
                <MnxAction
                  type="submit"
                  variant="primary"
                  disabled={
                    submitting ||
                    !form.categoryId ||
                    !form.title.trim() ||
                    !form.description.trim()
                  }
                >
                  <Send aria-hidden="true" />
                  {submitting
                    ? "Submitting..."
                    : selectedDesk === "IT"
                      ? "Raise IT request"
                      : "Raise HR case"}
                </MnxAction>
              </div>
            </form>
          </div>
        </PeopleSection>

        <div className="mnx-helpdesk-stack">
          <PeopleSection>
            <PeopleSectionHeader
              eyebrow="Service design"
              title="Advanced desk functions"
              description="Inspired by modern service-desk workflows: category owners, SLA targets, self-service, and clean escalation handling."
            />
            <div className="mnx-helpdesk-function-grid">
              {ADVANCED_FUNCTIONS.map((item) => {
                const Icon = item.icon;

                return (
                  <article key={item.title} className="mnx-helpdesk-function-card">
                    <span className="mnx-helpdesk-template-icon" aria-hidden="true">
                      <Icon aria-hidden="true" />
                    </span>
                    <div>
                      <strong>{item.title}</strong>
                      <p>{item.description}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          </PeopleSection>

          <PeopleSection>
            <PeopleSectionHeader
              eyebrow="Self-service and ownership"
              title={`${selectedDesk === "IT" ? "IT" : "HR"} category board`}
              description="Configured categories become your routing, FAQ, and service-level foundation."
            />
            <div className="mnx-helpdesk-category-grid">
              {currentDeskCategories.length ? (
                currentDeskCategories.map((category) => (
                  <article key={category.id} className="mnx-helpdesk-category-card">
                    <div className="mnx-helpdesk-note-head">
                      <strong>{category.name}</strong>
                      <WorkspaceBadge variant={badgeVariantForDesk(category.desk)}>
                        {category.desk === "IT" ? "IT" : "HR"}
                      </WorkspaceBadge>
                    </div>
                    <p>
                      {category.description ||
                        "Use this category to route related requests to the correct service owner."}
                    </p>
                    <div className="mnx-helpdesk-inline-badges">
                      <WorkspaceBadge variant="neutral">
                        {category.caseCount} request
                        {category.caseCount === 1 ? "" : "s"}
                      </WorkspaceBadge>
                      <WorkspaceBadge variant="neutral">
                        {category.openCount} open
                      </WorkspaceBadge>
                      <WorkspaceBadge variant="neutral">
                        {category.faqs.length} FAQ
                        {category.faqs.length === 1 ? "" : "s"}
                      </WorkspaceBadge>
                    </div>
                  </article>
                ))
              ) : (
                <WorkspaceAlert variant="info">
                  <FileText aria-hidden="true" />
                  No {selectedDesk === "IT" ? "IT support" : "HR"} categories
                  are configured yet. Once categories exist, this board becomes
                  the operating surface for ownership, knowledge, and queue health.
                </WorkspaceAlert>
              )}

              <div className="mnx-helpdesk-note-card">
                <div className="mnx-helpdesk-note-head">
                  <strong>Knowledge coverage</strong>
                  <WorkspaceBadge variant="neutral">{faqCount} FAQ total</WorkspaceBadge>
                </div>
                <p>
                  Official HR help desks typically use category FAQs, references,
                  agents, subcategories, and SLA targets to keep intake clean and
                  reduce repeat tickets.
                </p>
              </div>
            </div>
          </PeopleSection>
        </div>
      </div>

      <PeopleSection>
        <PeopleSectionHeader
          eyebrow="Queue management"
          title={`${selectedDesk === "IT" ? "IT support" : "HR"} request register`}
          description="Track queue health, search live requests, and prioritise items that need triage or escalation."
          actions={
            <MnxAction
              variant="secondary"
              onClick={() => void loadCases()}
              disabled={loading}
            >
              <RefreshCcw aria-hidden="true" />
              Refresh
            </MnxAction>
          }
        />
        <div className="mnx-helpdesk-stack">
          <div className="mnx-helpdesk-toolbar">
            <div className="mnx-search-field">
              <Search aria-hidden="true" />
              <MnxInput
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by request, subject, employee, category, or status"
                aria-label="Search help desk requests"
              />
            </div>

            <div className="mnx-helpdesk-filter-cluster">
              <div className="mnx-helpdesk-toggle-row" role="tablist" aria-label="Queue filters">
                {QUEUE_FILTERS.map((filter) => (
                  <PeopleToggleButton
                    key={filter.value}
                    active={queueFilter === filter.value}
                    onClick={() => setQueueFilter(filter.value)}
                    title={filter.description}
                  >
                    {filter.label}
                  </PeopleToggleButton>
                ))}
              </div>
            </div>
          </div>

          {error ? <WorkspaceAlert variant="danger">{error}</WorkspaceAlert> : null}

          <PeopleTable aria-label="Help desk requests">
            <PeopleTableHeader>
              <PeopleTableRow>
                <PeopleTableHead>Request</PeopleTableHead>
                <PeopleTableHead>Desk</PeopleTableHead>
                <PeopleTableHead>Category</PeopleTableHead>
                <PeopleTableHead>Raised by</PeopleTableHead>
                <PeopleTableHead>Priority</PeopleTableHead>
                <PeopleTableHead>SLA</PeopleTableHead>
                <PeopleTableHead>Status</PeopleTableHead>
                <PeopleTableHead>Updated</PeopleTableHead>
                <PeopleTableHead className="text-right">Action</PeopleTableHead>
              </PeopleTableRow>
            </PeopleTableHeader>
            <PeopleTableBody>
              {loading ? (
                <PeopleTableEmpty colSpan={9} message="Refreshing requests..." />
              ) : visibleCases.length === 0 ? (
                <PeopleTableEmpty
                  colSpan={9}
                  message={
                    search
                      ? "No requests match this search."
                      : `No ${selectedDesk === "IT" ? "IT support" : "HR"} requests match the active queue filter.`
                  }
                />
              ) : (
                visibleCases.map((item) => (
                  <PeopleTableRow key={item.id}>
                    <PeopleTableCell>
                      <div className="grid gap-1">
                        <strong>{item.title}</strong>
                        <span className="mnx-people-muted text-xs">{item.id}</span>
                      </div>
                    </PeopleTableCell>
                    <PeopleTableCell>
                      <WorkspaceBadge variant={badgeVariantForDesk(item.desk)}>
                        {item.desk === "IT" ? "IT support" : "HR"}
                      </WorkspaceBadge>
                    </PeopleTableCell>
                    <PeopleTableCell>
                      {item.category?.name ?? "Uncategorised"}
                    </PeopleTableCell>
                    <PeopleTableCell>{item.user.name}</PeopleTableCell>
                    <PeopleTableCell>
                      <WorkspaceBadge variant={badgeVariantForPriority(item.priority)}>
                        {item.priority}
                      </WorkspaceBadge>
                    </PeopleTableCell>
                    <PeopleTableCell>
                      <div className="grid gap-1">
                        <WorkspaceBadge variant={badgeVariantForSla(item.sla.state)}>
                          {item.sla.state === "AT_RISK"
                            ? "Risk"
                            : item.sla.state === "OVERDUE"
                              ? "Overdue"
                              : item.sla.state === "RESOLVED"
                                ? "Completed"
                                : "On track"}
                        </WorkspaceBadge>
                        <span className="mnx-people-muted text-xs">{item.sla.label}</span>
                      </div>
                    </PeopleTableCell>
                    <PeopleTableCell>
                      <WorkspaceBadge variant={badgeVariantForStatus(item.status)}>
                        {item.status.replaceAll("_", " ")}
                      </WorkspaceBadge>
                    </PeopleTableCell>
                    <PeopleTableCell>{formatDateTime(item.updatedAt)}</PeopleTableCell>
                    <PeopleTableCell>
                      <span className="mnx-table-cell-actions">
                        <MnxAction
                          variant={activeCaseId === item.id ? "primary" : "secondary"}
                          size="compact"
                          onClick={() => setSelectedCaseId(item.id)}
                        >
                          Open
                        </MnxAction>
                      </span>
                    </PeopleTableCell>
                  </PeopleTableRow>
                ))
              )}
            </PeopleTableBody>
          </PeopleTable>
        </div>
      </PeopleSection>

      <PeopleSection>
        <PeopleSectionHeader
          eyebrow="Conversation and handling"
          title={selectedCase ? selectedCase.title : "Select a request"}
          description={
            selectedCase
              ? `Raised by ${selectedCase.user.name} on ${formatDateTime(selectedCase.createdAt)}.`
              : "Choose a request from the register to review service details, SLA posture, and the conversation trail."
          }
        />
        {selectedCase ? (
          <div className="mnx-helpdesk-detail-grid">
            <div className="mnx-helpdesk-stack">
              <div className="mnx-helpdesk-note-card">
                <div className="mnx-helpdesk-note-head">
                  <strong>{selectedCase.category?.name ?? "Uncategorised"}</strong>
                  <WorkspaceBadge variant={badgeVariantForDesk(selectedCase.desk)}>
                    {selectedCase.desk === "IT" ? "IT support" : "HR"}
                  </WorkspaceBadge>
                </div>
                <p>{selectedCase.description}</p>
                <div className="mnx-helpdesk-inline-badges">
                  <WorkspaceBadge variant={badgeVariantForPriority(selectedCase.priority)}>
                    {selectedCase.priority}
                  </WorkspaceBadge>
                  <WorkspaceBadge variant={badgeVariantForStatus(selectedCase.status)}>
                    {selectedCase.status.replaceAll("_", " ")}
                  </WorkspaceBadge>
                  <WorkspaceBadge variant={badgeVariantForSla(selectedCase.sla.state)}>
                    SLA {selectedCase.sla.state === "OVERDUE"
                      ? "overdue"
                      : selectedCase.sla.state === "AT_RISK"
                        ? "risk"
                        : selectedCase.sla.state === "RESOLVED"
                          ? "completed"
                          : "on track"}
                  </WorkspaceBadge>
                </div>
              </div>

              <div className="mnx-helpdesk-note-card">
                <div className="mnx-helpdesk-note-head">
                  <strong>Handling guidance</strong>
                  <WorkspaceBadge variant="neutral">
                    Target {formatHoursLabel(selectedCase.sla.targetHours)}
                  </WorkspaceBadge>
                </div>
                <p>
                  {selectedCase.sla.state === "OVERDUE"
                    ? "This request has crossed the expected handling window and should be escalated or reprioritised."
                    : selectedCase.sla.state === "AT_RISK"
                      ? "This request is approaching its target window. Review assignment, status, and the next update now."
                      : isResolvedStatus(selectedCase.status)
                        ? "This request is completed. Keep the conversation trail for audit and feedback."
                        : "This request is within target. Maintain updates and keep the employee informed through the conversation thread."}
                </p>
                <div className="mnx-helpdesk-meta-list">
                  <span>Created: {formatDateTime(selectedCase.createdAt)}</span>
                  <span>Last updated: {formatDateTime(selectedCase.updatedAt)}</span>
                  <span>SLA posture: {selectedCase.sla.label}</span>
                </div>
              </div>

              {selectedCase.category?.faqs.length ? (
                <div className="mnx-helpdesk-note-card">
                  <div className="mnx-helpdesk-note-head">
                    <strong>Category guidance</strong>
                    <WorkspaceBadge variant="neutral">
                      {selectedCase.category.faqs.length} FAQ
                    </WorkspaceBadge>
                  </div>
                  <p>
                    This request category already has self-service guidance, so
                    the service owner can reuse the same knowledge path for future cases.
                  </p>
                </div>
              ) : null}
            </div>

            <div className="mnx-helpdesk-stack">
              <div className="mnx-helpdesk-timeline">
                {selectedCase.comments.length === 0 ? (
                  <WorkspaceAlert variant="info">
                    <MessageSquare aria-hidden="true" />
                    No conversation updates have been added yet.
                  </WorkspaceAlert>
                ) : (
                  selectedCase.comments.map((comment, index) => (
                    <article key={comment.id} className="mnx-helpdesk-timeline-item">
                      <div className="mnx-helpdesk-note-head">
                        <strong>Update {index + 1}</strong>
                        <span className="mnx-people-muted text-xs">
                          {formatDateTime(comment.createdAt)}
                        </span>
                      </div>
                      <p>{comment.message}</p>
                    </article>
                  ))
                )}
              </div>

              <form className="mnx-helpdesk-note-card" onSubmit={submitComment}>
                <PeopleField
                  label="Add an update"
                  htmlFor="hr-case-comment"
                  hint="Use this for employee clarifications, HR notes, IT troubleshooting progress, or next-step updates."
                >
                  <MnxTextarea
                    id="hr-case-comment"
                    rows={4}
                    value={commentMessage}
                    onChange={(event) => setCommentMessage(event.target.value)}
                    placeholder="Add the next conversation update for this request."
                    disabled={commenting}
                  />
                </PeopleField>
                <div className="flex justify-end">
                  <MnxAction
                    type="submit"
                    variant="secondary"
                    disabled={commenting || !commentMessage.trim()}
                  >
                    <Send aria-hidden="true" />
                    {commenting ? "Saving..." : "Add update"}
                  </MnxAction>
                </div>
              </form>
            </div>
          </div>
        ) : (
          <div className="p-5 sm:p-6">
            <WorkspaceAlert variant="info">
              <CircleHelp aria-hidden="true" />
              Select a request from the register to review its SLA posture and
              conversation history.
            </WorkspaceAlert>
          </div>
        )}
      </PeopleSection>
    </>
  );
}
