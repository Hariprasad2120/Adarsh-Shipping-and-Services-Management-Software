import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Clock3,
  FileCheck2,
  FileText,
  LockKeyhole,
  MessageSquareText,
  PackageCheck,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  UserRound,
} from "lucide-react";
import { requirePortalSession } from "@/modules/customer-portal/auth";
import {
  getPortalShipmentDetail,
  listPortalRatingCategories,
} from "@/modules/customer-portal/service";
import {
  PortalChecklistActionForm,
  PortalDocumentUploadForm,
  PortalQueryReplyForm,
  PortalRatingForm,
} from "../../_components/client-actions";

type PortalRequirementView = {
  id: string;
  name: string;
  customerSubmissions: Array<{
    status: string;
    reviewerComment?: string | null;
    versions?: Array<{ id: string }>;
  }>;
};

type PortalThreadView = {
  id: string;
  title: string;
  description: string;
  requiresCustomerAction: boolean;
  messages: Array<{ id: string; body: string }>;
};

type PortalStageView = {
  id: string;
  internalStageKey: string;
  sortOrder: number;
  label: string;
  description?: string | null;
};

type StageState = "completed" | "active" | "locked";

const nestedDetailKeys = [
  "boeDetails",
  "billOfEntryDetails",
  "filingDetails",
  "additionalData",
  "shipmentDetails",
  "metadata",
] as const;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function readFirstValue(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }

  for (const nestedKey of nestedDetailKeys) {
    const nested = asRecord(record[nestedKey]);
    if (!nested) continue;
    for (const key of keys) {
      const value = nested[key];
      if (value !== undefined && value !== null && value !== "") return value;
    }
  }

  return null;
}

function readText(record: Record<string, unknown>, keys: string[], fallback = "Not shared yet") {
  const value = readFirstValue(record, keys);
  if (typeof value === "string" || typeof value === "number") return String(value);
  return fallback;
}

function formatDate(value: unknown, includeTime = false) {
  if (!value) return "Not shared yet";
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(includeTime
      ? {
          hour: "2-digit" as const,
          minute: "2-digit" as const,
        }
      : {}),
  }).format(date);
}

function normalizeLabel(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function StatusPill({ state }: { state: StageState }) {
  if (state === "completed") {
    return (
      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
        Completed
      </span>
    );
  }

  if (state === "active") {
    return (
      <span className="inline-flex items-center rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-semibold text-violet-700 ring-1 ring-inset ring-violet-200">
        In Progress
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-500 ring-1 ring-inset ring-slate-200">
      Locked
    </span>
  );
}

function WorkflowStep({
  stage,
  index,
  state,
  isLast,
}: {
  stage: PortalStageView;
  index: number;
  state: StageState;
  isLast: boolean;
}) {
  const circleClass =
    state === "completed"
      ? "bg-emerald-500 text-white shadow-[0_8px_24px_rgba(16,185,129,0.25)]"
      : state === "active"
        ? "bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-[0_8px_24px_rgba(99,102,241,0.28)]"
        : "bg-slate-100 text-slate-500 ring-1 ring-inset ring-slate-200";

  return (
    <div
      className={`relative rounded-2xl px-3 py-3.5 transition-colors ${
        state === "active" ? "bg-gradient-to-r from-indigo-50/90 to-violet-50/70" : ""
      }`}
    >
      {!isLast ? (
        <span
          aria-hidden="true"
          className={`absolute left-[31px] top-[54px] h-[calc(100%+12px)] border-l ${
            state === "completed" ? "border-dashed border-emerald-300" : "border-slate-200"
          }`}
        />
      ) : null}
      <div className="relative z-10 flex gap-4">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${circleClass}`}>
          {state === "completed" ? (
            <Check size={20} strokeWidth={2.5} />
          ) : state === "locked" ? (
            <LockKeyhole size={17} />
          ) : (
            <span className="text-sm font-semibold">{index + 1}</span>
          )}
        </div>
        <div className="min-w-0 flex-1 pt-0.5">
          <div className="flex items-start justify-between gap-2">
            <p className={`text-sm font-semibold ${state === "active" ? "text-indigo-950" : "text-on-surface"}`}>
              {index + 1}. {stage.label}
            </p>
            {state !== "locked" ? <ChevronDown size={15} className="mt-0.5 shrink-0 text-slate-400" /> : null}
          </div>
          <div className="mt-1.5">
            <StatusPill state={state} />
          </div>
          {stage.description ? (
            <p className="mt-2 line-clamp-2 text-xs leading-5 text-on-surface-variant">{stage.description}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{label}</p>
      <div className="flex min-h-12 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-800 shadow-[0_1px_2px_rgba(15,23,42,0.02)]">
        {value}
      </div>
    </div>
  );
}

export default async function CustomerPortalShipmentDetailPage({
  params,
}: {
  params: Promise<{ shipmentId: string }>;
}) {
  const session = await requirePortalSession();
  const { shipmentId } = await params;
  const detail = await getPortalShipmentDetail(session.portalUserId, shipmentId);
  const ratingCategories = await listPortalRatingCategories(session.portalUserId);
  const ratingSubmitted = detail.job.shipmentRatings.some(
    (rating: { portalUserId: string }) => rating.portalUserId === session.portalUserId,
  );

  const stages = [...(detail.stageMappings as PortalStageView[])].sort((left, right) => left.sortOrder - right.sortOrder);
  const matchedStageIndex = stages.findIndex((stage) => stage.internalStageKey === detail.job.stage);
  const activeStageIndex = matchedStageIndex >= 0 ? matchedStageIndex : 0;
  const isShipmentCompleted = detail.job.status === "COMPLETED" || detail.job.stage === "FILED";
  const completedStageCount = isShipmentCompleted ? stages.length : Math.max(activeStageIndex, 0);
  const progressPercent = stages.length > 0 ? Math.round((completedStageCount / stages.length) * 100) : 0;
  const currentStage = stages[activeStageIndex] ?? detail.currentStage;
  const nextStage = stages[activeStageIndex + 1] ?? null;
  const jobRecord = asRecord(detail.job) ?? {};

  const boeNumber = readText(
    jobRecord,
    ["boeNumber", "billOfEntryNumber", "filingNumber", "referenceNumber", "jobNumber"],
    detail.job.jobNumber,
  );
  const boeDate = formatDate(readFirstValue(jobRecord, ["boeDate", "billOfEntryDate", "filingDate", "updatedAt"]));
  const chaName = readText(jobRecord, ["chaName", "customsBrokerName", "brokerName"], "Assigned CHA team");
  const portCode = readText(jobRecord, ["portCode", "customsPortCode", "port", "portName"]);
  const remarks = readText(
    jobRecord,
    ["boeRemarks", "filingRemarks", "remarks", "notes", "description"],
    currentStage?.description ?? "The operations team is processing this stage. Updates will appear here automatically.",
  );
  const updatedAt = formatDate(readFirstValue(jobRecord, ["updatedAt", "lastUpdatedAt"]), true);
  const shipmentLabel = detail.job.shipmentType?.name ?? "Shipment";
  const clearanceLabel = detail.job.jobType?.name ?? "CHA";
  const statusLabel = normalizeLabel(String(detail.job.status ?? "IN_PROGRESS"));
  const openQueryCount = detail.job.customerQueryThreads.filter(
    (thread: PortalThreadView) => thread.requiresCustomerAction,
  ).length;
  const portalUserRecord = asRecord(session.portalUser) ?? {};
  const portalUserLabel = readText(portalUserRecord, ["name", "email"], session.portalUser.customer.name);

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[24px] border border-slate-200/80 bg-white shadow-[0_18px_55px_rgba(15,23,42,0.08)]">
        <div className="flex min-h-20 flex-col gap-4 border-b border-slate-200/80 px-5 py-4 sm:flex-row sm:items-center sm:justify-between lg:px-7">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/customer-portal/shipments"
              aria-label="Back to shipments"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
            >
              <ArrowLeft size={18} />
            </Link>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="truncate text-lg font-semibold text-slate-950 sm:text-xl">{detail.job.title}</h1>
                <span className="text-sm font-medium text-slate-500">#{detail.job.jobNumber}</span>
                <span className="inline-flex items-center rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                  {statusLabel}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                {shipmentLabel} • {clearanceLabel} • Last updated {updatedAt}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Link
              href="/customer-portal/notifications"
              className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
              aria-label="Open notifications"
            >
              <Bell size={18} />
              {openQueryCount > 0 ? (
                <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                  {openQueryCount}
                </span>
              ) : null}
            </Link>
            <div className="hidden items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 sm:flex">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-700">
                <UserRound size={16} />
              </div>
              <div className="max-w-44">
                <p className="truncate text-xs font-semibold text-slate-800">{portalUserLabel}</p>
                <p className="truncate text-[11px] text-slate-500">{session.portalUser.customer.name}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid xl:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="border-b border-slate-200/80 bg-slate-50/35 p-4 sm:p-5 xl:border-b-0 xl:border-r">
            <div className="xl:sticky xl:top-24">
              <div className="mb-4 flex items-center justify-between gap-3 px-2">
                <div>
                  <p className="text-base font-semibold text-slate-950">Workflow Progress</p>
                  <p className="mt-1 text-xs text-slate-500">Live shipment timeline</p>
                </div>
                <PackageCheck size={20} className="text-indigo-600" />
              </div>

              <div className="space-y-1">
                {stages.map((stage, index) => {
                  const state: StageState = isShipmentCompleted || index < activeStageIndex
                    ? "completed"
                    : index === activeStageIndex
                      ? "active"
                      : "locked";
                  return (
                    <WorkflowStep
                      key={stage.id}
                      stage={stage}
                      index={index}
                      state={state}
                      isLast={index === stages.length - 1}
                    />
                  );
                })}
              </div>

              <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-800">Overall Progress</p>
                  <span className="text-2xl font-bold tracking-tight text-indigo-600">{progressPercent}%</span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 transition-[width] duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <p className="mt-3 text-xs text-slate-500">
                  {completedStageCount} of {stages.length} stages completed
                </p>
              </div>
            </div>
          </aside>

          <main className="min-w-0 bg-slate-50/20 p-4 sm:p-6 lg:p-7">
            <section className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_12px_32px_rgba(15,23,42,0.06)]">
              <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div className="flex min-w-0 items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-[0_10px_25px_rgba(99,102,241,0.25)]">
                    <FileText size={22} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate text-xl font-semibold text-slate-950">
                        {activeStageIndex + 1}. {currentStage?.label ?? normalizeLabel(detail.job.stage)}
                      </h2>
                      <StatusPill state={isShipmentCompleted ? "completed" : "active"} />
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      {currentStage?.description ?? "View the latest operational information for this shipment stage."}
                    </p>
                  </div>
                </div>
                <Link
                  href="/customer-portal/notifications"
                  className="inline-flex items-center gap-2 self-start text-sm font-semibold text-indigo-700 transition hover:text-indigo-900"
                >
                  <CircleHelp size={17} />
                  Help & updates
                </Link>
              </div>

              <div className="space-y-5 p-5 sm:p-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <ReadOnlyField label="BOE / Filing Number" value={boeNumber} />
                  <ReadOnlyField label="BOE / Filing Date" value={boeDate} />
                  <ReadOnlyField label="CHA Name" value={chaName} />
                  <ReadOnlyField label="Port Code" value={portCode} />
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Remarks / Notes</p>
                  <div className="min-h-20 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-700">
                    {remarks}
                  </div>
                </div>

                <div className="flex flex-col gap-3 rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50/80 via-white to-violet-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white">
                      {isShipmentCompleted ? <CheckCircle2 size={20} /> : <Clock3 size={20} />}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {isShipmentCompleted ? "Shipment workflow completed" : "This step is currently being processed"}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        Customer access is view-only for operational stages. The next stage unlocks automatically when the assigned team completes this step.
                      </p>
                    </div>
                  </div>
                  <div className="inline-flex min-h-11 items-center justify-center rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 text-sm font-semibold text-white shadow-[0_10px_22px_rgba(99,102,241,0.22)]">
                    {isShipmentCompleted ? (
                      <span className="inline-flex items-center gap-2"><Check size={17} /> Completed</span>
                    ) : (
                      <span className="inline-flex items-center gap-2"><Clock3 size={17} /> In Progress</span>
                    )}
                  </div>
                </div>
              </div>
            </section>

            <section className="mt-5 grid gap-4 lg:grid-cols-[1fr_auto_1fr_auto_1fr] lg:items-stretch">
              <div className="rounded-2xl border border-indigo-100 bg-white p-4 text-center shadow-sm">
                <p className="text-xs font-semibold text-slate-500">1. Current Step</p>
                <div className="mx-auto mt-4 flex h-11 max-w-52 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 text-sm font-semibold text-white">
                  <Clock3 size={17} /> {isShipmentCompleted ? "Completed" : "In Progress"}
                </div>
              </div>
              <div className="hidden items-center justify-center text-slate-700 lg:flex">
                <ArrowRight size={24} />
              </div>
              <div className="rounded-2xl border border-indigo-100 bg-white p-4 text-center shadow-sm">
                <p className="text-xs font-semibold text-slate-500">2. Operations Update</p>
                <div className="mt-4 flex items-center justify-center gap-3">
                  <span className="h-8 w-8 animate-spin rounded-full border-[3px] border-indigo-100 border-t-indigo-600" aria-hidden="true" />
                  <span className="text-sm font-medium text-slate-700">Saving & processing</span>
                </div>
                <div className="mx-auto mt-4 h-2 max-w-52 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full w-2/5 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" />
                </div>
              </div>
              <div className="hidden items-center justify-center text-slate-700 lg:flex">
                <ArrowRight size={24} />
              </div>
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/45 p-4 text-center shadow-sm">
                <p className="text-xs font-semibold text-slate-500">3. Customer Update</p>
                <div className="mx-auto mt-4 flex max-w-60 items-center gap-3 rounded-xl border border-emerald-200 bg-white/80 p-3 text-left">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                    <Check size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-emerald-800">Live status published</p>
                    <p className="mt-0.5 text-[11px] text-slate-500">Updated automatically</p>
                  </div>
                </div>
              </div>
            </section>

            {nextStage ? (
              <section className="mt-5 rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50/70 via-white to-white p-4 shadow-sm sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-[0_9px_22px_rgba(16,185,129,0.22)]">
                      <LockKeyhole size={21} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-base font-semibold text-slate-950">
                          {activeStageIndex + 2}. {nextStage.label}
                        </p>
                        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">Next Step</span>
                      </div>
                      <p className="mt-1 text-sm text-slate-500">{nextStage.description ?? "This stage will open automatically."}</p>
                    </div>
                  </div>
                  <div className="inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-white px-4 py-2.5 text-sm font-semibold text-indigo-700">
                    Unlocks automatically <ArrowRight size={16} />
                  </div>
                </div>
              </section>
            ) : null}

            <section className="mt-5 grid gap-5 2xl:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
              <div className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <UploadCloud size={19} className="text-indigo-600" />
                      <h3 className="text-base font-semibold text-slate-950">Requested Documents</h3>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">Upload requested files and preview the latest submitted version.</p>
                  </div>
                  <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    {detail.job.documentRequirements.length} items
                  </span>
                </div>

                <div className="mt-5 space-y-4">
                  {detail.job.documentRequirements.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                      <FileCheck2 className="mx-auto text-slate-400" size={28} />
                      <p className="mt-3 text-sm font-medium text-slate-700">No customer documents are required right now.</p>
                    </div>
                  ) : (
                    detail.job.documentRequirements.map((requirement: PortalRequirementView) => {
                      const submission = requirement.customerSubmissions[0];
                      const latestVersion = submission?.versions?.[0];
                      const submissionStatus = submission?.status ?? "NOT_UPLOADED";
                      const isApproved = submissionStatus === "APPROVED";
                      return (
                        <div key={requirement.id} className="rounded-2xl border border-slate-200 bg-slate-50/40 p-4">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <FileText size={17} className="shrink-0 text-indigo-600" />
                                <p className="truncate text-sm font-semibold text-slate-900">{requirement.name}</p>
                              </div>
                              <p className="mt-2 text-xs leading-5 text-slate-500">
                                {submission?.reviewerComment ?? "Upload the latest valid document for verification."}
                              </p>
                            </div>
                            <span className={`w-fit rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                              isApproved
                                ? "bg-emerald-100 text-emerald-700"
                                : submissionStatus === "NOT_UPLOADED"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-indigo-100 text-indigo-700"
                            }`}>
                              {normalizeLabel(submissionStatus)}
                            </span>
                          </div>

                          {latestVersion ? (
                            <Link
                              href={`/api/customer-portal/document-versions/${latestVersion.id}`}
                              className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-indigo-700 hover:text-indigo-900 hover:underline"
                            >
                              <FileCheck2 size={16} /> Preview latest upload
                            </Link>
                          ) : null}

                          {!isApproved ? (
                            <div className="mt-4 border-t border-slate-200 pt-4">
                              <PortalDocumentUploadForm jobId={detail.job.id} requirementId={requirement.id} />
                            </div>
                          ) : null}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="space-y-5">
                {detail.job.checklistWorkflow ? (
                  <div className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <ShieldCheck size={19} className="text-emerald-600" />
                        <h3 className="text-base font-semibold text-slate-950">Checklist Approval</h3>
                      </div>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                        {normalizeLabel(detail.job.checklistWorkflow.status)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-500">Review the latest checklist when customer approval is requested.</p>
                    {detail.job.checklistWorkflow.currentFileVersion ? (
                      <Link
                        href={`/api/customer-portal/checklist-files/${detail.job.checklistWorkflow.currentFileVersion.id}`}
                        className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-indigo-700 hover:underline"
                      >
                        <FileCheck2 size={16} /> Preview current checklist
                      </Link>
                    ) : null}
                    {detail.actions.checklistPending ? (
                      <div className="mt-4 border-t border-slate-200 pt-4">
                        <PortalChecklistActionForm jobId={detail.job.id} checklistId={detail.job.checklistWorkflow.id} />
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <details
                  className="group rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm"
                  open={openQueryCount > 0}
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <MessageSquareText size={19} className="text-indigo-600" />
                      <div>
                        <h3 className="text-base font-semibold text-slate-950">Queries & Updates</h3>
                        <p className="mt-1 text-xs text-slate-500">Open to view conversations for this shipment.</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {openQueryCount > 0 ? (
                        <span className="rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-semibold text-rose-700">
                          {openQueryCount} open
                        </span>
                      ) : null}
                      <ChevronDown size={18} className="text-slate-500 transition-transform group-open:rotate-180" />
                    </div>
                  </summary>

                  <div className="mt-5 space-y-4 border-t border-slate-200 pt-4">
                    {detail.job.customerQueryThreads.length === 0 ? (
                      <div className="rounded-2xl bg-slate-50 p-5 text-center">
                        <MessageSquareText className="mx-auto text-slate-400" size={25} />
                        <p className="mt-2 text-sm text-slate-500">No queries have been raised for this shipment.</p>
                      </div>
                    ) : (
                      detail.job.customerQueryThreads.map((thread: PortalThreadView) => (
                        <div key={thread.id} className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-slate-900">{thread.title}</p>
                              <p className="mt-1 text-xs leading-5 text-slate-500">{thread.description}</p>
                            </div>
                            {thread.requiresCustomerAction ? (
                              <span className="shrink-0 rounded-full bg-amber-100 px-2 py-1 text-[10px] font-semibold text-amber-800">Reply needed</span>
                            ) : null}
                          </div>
                          <div className="mt-3 space-y-2">
                            {thread.messages.map((message) => (
                              <div key={message.id} className="rounded-xl border border-slate-200 bg-white p-3 text-sm leading-6 text-slate-700">
                                {message.body}
                              </div>
                            ))}
                          </div>
                          {thread.requiresCustomerAction ? (
                            <div className="mt-3">
                              <PortalQueryReplyForm threadId={thread.id} />
                            </div>
                          ) : null}
                        </div>
                      ))
                    )}
                  </div>
                </details>
              </div>
            </section>
          </main>
        </div>
      </section>

      {(detail.job.status === "COMPLETED" || detail.job.stage === "FILED") && !ratingSubmitted ? (
        <section className="rounded-[22px] border border-amber-200 bg-gradient-to-r from-amber-50/70 via-white to-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
              <Sparkles size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-semibold text-slate-950">Rate this shipment experience</h3>
              <p className="mt-1 text-sm text-slate-500">Your feedback helps improve service quality and response times.</p>
              <div className="mt-4">
                <PortalRatingForm
                  jobId={detail.job.id}
                  categories={ratingCategories.map((category) => ({ key: category.key, label: category.label }))}
                />
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
