"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CircleHelp,
  FileText,
  LifeBuoy,
  MessageSquare,
  RefreshCcw,
  Search,
  Send,
  Ticket,
} from "lucide-react";
import { toast } from "sonner";
import {
  PeopleControlButton as MnxAction,
  PeopleControlInput as MnxInput,
  PeopleControlTextarea as MnxTextarea,
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

const PRIORITY_OPTIONS: HelpDeskPriority[] = [
  "LOW",
  "MEDIUM",
  "HIGH",
  "URGENT",
];

function formatDateTime(value: string) {
  return new Date(value).toLocaleString();
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

async function readApiResponse<T>(response: Response) {
  const payload = (await response.json().catch(() => null)) as
    | ApiResponse<T>
    | null;
  if (!response.ok || !payload?.ok || !payload.data) {
    throw new Error(payload?.error?.message || "The HR help desk request failed.");
  }
  return payload.data;
}

export function HelpDeskView() {
  const [data, setData] = useState<HelpDeskPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
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

  async function loadCases() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/hrms/hr-cases", { cache: "no-store" });
      const payload = await readApiResponse<HelpDeskPayload>(response);
      setData(payload);
      setForm((current) => ({
        ...current,
        categoryId: current.categoryId || payload.categories[0]?.id || "",
      }));
      setSelectedCaseId((current) => current ?? payload.cases[0]?.id ?? null);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "The HR help desk workspace could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadCases();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  const categoryMap = useMemo(() => {
    return new Map(
      (data?.categories ?? []).map((category) => [category.id, category]),
    );
  }, [data?.categories]);

  const filteredCases = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return data?.cases ?? [];
    return (data?.cases ?? []).filter((item) => {
      const categoryName = categoryMap.get(item.categoryId)?.name ?? "";
      return [
        item.id,
        item.title,
        item.description,
        item.status,
        item.user.name,
        categoryName,
      ]
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [categoryMap, data?.cases, search]);

  const activeCaseId =
    selectedCaseId && data?.cases.some((item) => item.id === selectedCaseId)
      ? selectedCaseId
      : data?.cases[0]?.id ?? null;
  const selectedCase =
    data?.cases.find((item) => item.id === activeCaseId) ?? null;
  const selectedCategory =
    data?.categories.find((item) => item.id === form.categoryId) ?? null;

  const openCount = (data?.cases ?? []).filter((item) =>
    ["OPEN", "ASSIGNED", "IN_PROGRESS"].includes(item.status),
  ).length;
  const closedCount = (data?.cases ?? []).filter((item) =>
    ["RESOLVED", "CLOSED"].includes(item.status),
  ).length;
  const faqCount = (data?.categories ?? []).reduce(
    (sum, item) => sum + item.faqs.length,
    0,
  );

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
      toast.success("Your HR case has been raised.");
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
          : "The HR case could not be created.",
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
      toast.success("Update added to the case.");
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

  if (loading && !data) {
    return (
      <PeopleLoadingState description="Loading your HR help desk cases and category guidance." />
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
          label="Total cases"
          value={data?.cases.length ?? 0}
        />
        <PeopleSummary
          icon={<LifeBuoy aria-hidden="true" />}
          label="Open cases"
          value={openCount}
        />
        <PeopleSummary
          icon={<MessageSquare aria-hidden="true" />}
          label="Resolved or closed"
          value={closedCount}
        />
        <PeopleSummary
          icon={<CircleHelp aria-hidden="true" />}
          label="FAQ guidance"
          value={faqCount}
          detail={`${data?.categories.length ?? 0} categories available`}
        />
      </PeopleSummaryGrid>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <PeopleSection>
          <PeopleSectionHeader
            eyebrow="Raise a query"
            title="Create a confidential HR case"
            description="Use the existing HR service workflow to raise policy, payroll, access, employee-data, or workplace support questions."
          />
          <form className="grid gap-4 p-5 sm:p-6" onSubmit={submitCase}>
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
                  {(data?.categories ?? []).map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
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
              hint="Keep the title concise so HR can route the case quickly."
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
                placeholder="Example: Salary slip mismatch for July"
                disabled={submitting}
              />
            </PeopleField>

            <PeopleField
              label="Description"
              htmlFor="hr-case-description"
              hint="Explain the issue, impact, and any dates or employee details HR should review."
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
                placeholder="Describe the case in enough detail for HR to act without a follow-up."
                rows={6}
                disabled={submitting}
              />
            </PeopleField>

            {(data?.categories.length ?? 0) === 0 ? (
              <WorkspaceAlert variant="warning">
                <CircleHelp aria-hidden="true" />
                No help desk categories are configured yet. Add at least one
                category before employees raise cases from this workspace.
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
                {submitting ? "Submitting..." : "Raise HR case"}
              </MnxAction>
            </div>
          </form>
        </PeopleSection>

        <PeopleSection>
          <PeopleSectionHeader
            eyebrow="Self-service guidance"
            title={selectedCategory?.name ?? "Category FAQs"}
            description={
              selectedCategory?.description ??
              "Choose a category to see the most relevant HR guidance before raising a case."
            }
          />
          <div className="grid gap-4 p-5 sm:p-6">
            {selectedCategory?.faqs.length ? (
              selectedCategory.faqs.map((faq) => (
                <article
                  key={faq.id}
                  className="rounded-[var(--mn-radius-card)] border border-[var(--mnx-border)] bg-[var(--mnx-soft)] p-4"
                >
                  <p className="text-sm font-semibold text-[var(--mnx-text-strong)]">
                    {faq.question}
                  </p>
                  <p className="mt-2 text-sm text-[var(--mnx-text-muted)]">
                    {faq.answer}
                  </p>
                </article>
              ))
            ) : (
              <WorkspaceAlert variant="info">
                <FileText aria-hidden="true" />
                This category does not have FAQ guidance yet. You can still
                raise a case directly.
              </WorkspaceAlert>
            )}
          </div>
        </PeopleSection>
      </div>

      <PeopleSection>
        <PeopleSectionHeader
          eyebrow="Case register"
          title="Track case progress"
          description="Search existing tickets, review the current service status, and open the full case conversation below."
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
        <div className="grid gap-4 p-5 sm:p-6">
          <div className="mnx-search-field max-w-xl">
            <Search aria-hidden="true" />
            <MnxInput
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by ticket, subject, employee, status, or category"
              aria-label="Search HR cases"
            />
          </div>

          {error ? <WorkspaceAlert variant="danger">{error}</WorkspaceAlert> : null}

          <PeopleTable aria-label="HR help desk cases">
            <PeopleTableHeader>
              <PeopleTableRow>
                <PeopleTableHead>Case</PeopleTableHead>
                <PeopleTableHead>Category</PeopleTableHead>
                <PeopleTableHead>Raised by</PeopleTableHead>
                <PeopleTableHead>Priority</PeopleTableHead>
                <PeopleTableHead>Status</PeopleTableHead>
                <PeopleTableHead>Updated</PeopleTableHead>
                <PeopleTableHead className="text-right">Action</PeopleTableHead>
              </PeopleTableRow>
            </PeopleTableHeader>
            <PeopleTableBody>
              {loading ? (
                <PeopleTableEmpty colSpan={7} message="Refreshing cases..." />
              ) : filteredCases.length === 0 ? (
                <PeopleTableEmpty
                  colSpan={7}
                  message={
                    search
                      ? "No cases match this search."
                      : "No HR cases have been raised yet."
                  }
                />
              ) : (
                filteredCases.map((item) => (
                  <PeopleTableRow key={item.id}>
                    <PeopleTableCell>
                      <div className="grid gap-1">
                        <strong>{item.title}</strong>
                        <span className="mnx-people-muted text-xs">{item.id}</span>
                      </div>
                    </PeopleTableCell>
                    <PeopleTableCell>
                      {categoryMap.get(item.categoryId)?.name ?? "Uncategorised"}
                    </PeopleTableCell>
                    <PeopleTableCell>{item.user.name}</PeopleTableCell>
                    <PeopleTableCell>
                      <WorkspaceBadge variant={badgeVariantForPriority(item.priority)}>
                        {item.priority}
                      </WorkspaceBadge>
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
          eyebrow="Conversation"
          title={selectedCase ? selectedCase.title : "Select a case"}
          description={
            selectedCase
              ? `Raised by ${selectedCase.user.name} on ${formatDateTime(selectedCase.createdAt)}.`
              : "Choose a case from the register to review its details and add updates."
          }
        />
        {selectedCase ? (
          <div className="grid gap-5 p-5 sm:p-6">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
              <div className="grid gap-3">
                <WorkspaceAlert variant="info">
                  <Ticket aria-hidden="true" />
                  <span>
                    <strong>{categoryMap.get(selectedCase.categoryId)?.name ?? "Uncategorised"}.</strong>{" "}
                    {selectedCase.description}
                  </span>
                </WorkspaceAlert>
                <div className="flex flex-wrap gap-2">
                  <WorkspaceBadge variant={badgeVariantForPriority(selectedCase.priority)}>
                    {selectedCase.priority}
                  </WorkspaceBadge>
                  <WorkspaceBadge variant={badgeVariantForStatus(selectedCase.status)}>
                    {selectedCase.status.replaceAll("_", " ")}
                  </WorkspaceBadge>
                  <WorkspaceBadge variant="neutral">
                    {selectedCase.comments.length} update{selectedCase.comments.length === 1 ? "" : "s"}
                  </WorkspaceBadge>
                </div>
              </div>
              <div className="text-sm text-[var(--mnx-text-muted)] lg:text-right">
                <p>Created: {formatDateTime(selectedCase.createdAt)}</p>
                <p>Last updated: {formatDateTime(selectedCase.updatedAt)}</p>
              </div>
            </div>

            <div className="grid gap-3">
              {selectedCase.comments.length === 0 ? (
                <WorkspaceAlert variant="info">
                  <MessageSquare aria-hidden="true" />
                  No conversation updates have been added yet.
                </WorkspaceAlert>
              ) : (
                selectedCase.comments.map((comment, index) => (
                  <article
                    key={comment.id}
                    className="rounded-[var(--mn-radius-card)] border border-[var(--mnx-border)] bg-[var(--mnx-soft)] p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <strong className="text-sm text-[var(--mnx-text-strong)]">
                        Update {index + 1}
                      </strong>
                      <span className="text-xs text-[var(--mnx-text-muted)]">
                        {formatDateTime(comment.createdAt)}
                      </span>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--mnx-text-muted)]">
                      {comment.message}
                    </p>
                  </article>
                ))
              )}
            </div>

            <form className="grid gap-3" onSubmit={submitComment}>
              <PeopleField
                label="Add an update"
                htmlFor="hr-case-comment"
                hint="Use this to provide additional context or respond to HR follow-ups on the selected case."
              >
                <MnxTextarea
                  id="hr-case-comment"
                  rows={4}
                  value={commentMessage}
                  onChange={(event) => setCommentMessage(event.target.value)}
                  placeholder="Add a case update or answer from the employee or HR side."
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
        ) : (
          <div className="p-5 sm:p-6">
            <WorkspaceAlert variant="info">
              <CircleHelp aria-hidden="true" />
              Select a case from the register to review its current status and
              conversation history.
            </WorkspaceAlert>
          </div>
        )}
      </PeopleSection>
    </>
  );
}
