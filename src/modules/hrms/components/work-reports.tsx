"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  CheckCircle2,
  Clock,
  LocateFixed,
  MapPin,
  Plus,
  Send,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  PeopleControlButton as MnxAction,
  PeopleControlInput as MnxInput,
  PeopleControlTable as MnxTable,
  PeopleControlTextarea as MnxTextarea,
} from "@/modules/people/components";
import { NativeSelect } from "@/components/ui/native-select";
import { DateInput } from "@/components/ui/date-input";
import { WorkspaceDialog } from "@/components/layout/workspace-dialog";

type WorkReportStatus = "PENDING" | "APPROVED" | "REJECTED";
type ApprovalStatus =
  "WAITING" | "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
type FieldType = "TEXT" | "TEXTAREA" | "NUMBER" | "DATE" | "SELECT" | "BOOLEAN";
type WorkContext = "Office" | "Home" | "Others";
type ReportFilter = "my" | "reportees" | "all";

type WorkReportItem = {
  id: string;
  jobNoName: string;
  description: string;
};

type WorkReportField = {
  id: string;
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  options: unknown;
  position: number;
};

type WorkReport = {
  id: string;
  date: string;
  workedOn: WorkContext;
  jobNoName: string;
  description: string;
  items: unknown;
  customValues: unknown;
  status: WorkReportStatus;
  addedAddress: string | null;
  modifiedAddress: string | null;
  latitude: number | null;
  longitude: number | null;
  locationAccuracy: number | null;
  locationCapturedAt: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    employeeNumber: number | null;
    photo: string | null;
    email: string;
  };
  approvals: Array<{
    id: string;
    level: number;
    status: ApprovalStatus;
    comments: string | null;
    approverId: string;
    decidedAt: string | null;
    createdAt: string;
    approver: {
      id: string;
      name: string;
      email: string;
      employeeNumber: number | null;
    };
  }>;
};

type WorkReportForm = {
  date: string;
  workedOn: WorkContext;
  items: WorkReportItem[];
  customValues: Record<string, string | boolean>;
};

type CapturedLocation = {
  latitude: number;
  longitude: number;
  accuracy?: number;
  address: string;
  previewCapturedAt: Date;
};

type WorkReportsViewProps = {
  currentUserId: string;
  canApprove: boolean;
  canSubmit: boolean;
  canViewAll: boolean;
};

function todayInputValue() {
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
}

function newLineId() {
  return globalThis.crypto?.randomUUID?.() ?? `line-${Date.now()}`;
}

function emptyForm(): WorkReportForm {
  return {
    date: todayInputValue(),
    workedOn: "Office",
    items: [{ id: "line-1", jobNoName: "", description: "" }],
    customValues: {},
  };
}

function reportItems(report: WorkReport): WorkReportItem[] {
  if (Array.isArray(report.items)) {
    const items = report.items
      .map((item, index) => {
        if (!item || typeof item !== "object") return null;
        const row = item as Record<string, unknown>;
        if (
          typeof row.jobNoName !== "string" ||
          typeof row.description !== "string"
        ) {
          return null;
        }
        return {
          id: typeof row.id === "string" ? row.id : `line-${index + 1}`,
          jobNoName: row.jobNoName,
          description: row.description,
        };
      })
      .filter((item): item is WorkReportItem => item !== null);
    if (items.length > 0) return items;
  }
  return [
    {
      id: "legacy-line",
      jobNoName: report.jobNoName,
      description: report.description,
    },
  ];
}

function reportCustomValues(report: WorkReport) {
  if (
    report.customValues &&
    typeof report.customValues === "object" &&
    !Array.isArray(report.customValues)
  ) {
    return report.customValues as Record<string, unknown>;
  }
  return {};
}

function formatDateTime(value: string | Date | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function valueLabel(value: unknown) {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

function getBrowserLocation() {
  return new Promise<GeolocationPosition>((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Location services are not supported by this browser."));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    });
  });
}

function responseError(result: unknown, fallback: string) {
  if (
    result &&
    typeof result === "object" &&
    "error" in result &&
    result.error &&
    typeof result.error === "object" &&
    "message" in result.error &&
    typeof result.error.message === "string"
  ) {
    return result.error.message;
  }
  return fallback;
}

function isGeolocationError(
  error: unknown,
): error is { code: number; message: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "number"
  );
}

export function WorkReportsView({
  currentUserId,
  canApprove,
  canSubmit,
  canViewAll,
}: WorkReportsViewProps) {
  const initialFilter: ReportFilter = canViewAll
    ? "all"
    : canApprove
      ? "reportees"
      : "my";
  const [reports, setReports] = useState<WorkReport[]>([]);
  const [fields, setFields] = useState<WorkReportField[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ReportFilter>(initialFilter);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [approvalComment, setApprovalComment] = useState("");
  const [acting, setActing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newReport, setNewReport] = useState<WorkReportForm>(emptyForm);
  const [capturedLocation, setCapturedLocation] =
    useState<CapturedLocation | null>(null);
  const [locationState, setLocationState] = useState<
    "idle" | "capturing" | "ready" | "error"
  >("idle");
  const [submitting, setSubmitting] = useState(false);

  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/hrms/work-reports?filter=${filter}`);
      const result = await response.json();
      if (!response.ok || !result.ok) {
        throw new Error(
          responseError(result, "Failed to load work reports ledger"),
        );
      }
      const nextReports = result.data.reports as WorkReport[];
      setReports(nextReports);
      setFields(result.data.fields as WorkReportField[]);
      setSelectedReportId((current) => {
        const linkedReportId =
          typeof window === "undefined"
            ? null
            : new URLSearchParams(window.location.search).get("report");
        if (
          linkedReportId &&
          nextReports.some((report) => report.id === linkedReportId)
        ) {
          return linkedReportId;
        }
        if (current && nextReports.some((report) => report.id === current)) {
          return current;
        }
        return null;
      });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to load work reports ledger",
      );
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadReports();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadReports]);

  const captureLocation = useCallback(async () => {
    setLocationState("capturing");
    try {
      const position = await getBrowserLocation();
      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;
      const response = await fetch(
        `/api/hrms/work-reports/location?latitude=${encodeURIComponent(latitude)}&longitude=${encodeURIComponent(longitude)}`,
      );
      const result = await response.json();
      const fallbackAddress = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
      const address =
        response.ok &&
        result.ok &&
        typeof result.data?.address === "string" &&
        result.data.address.trim()
          ? result.data.address.trim()
          : fallbackAddress;
      const location: CapturedLocation = {
        latitude,
        longitude,
        accuracy: Number.isFinite(position.coords.accuracy)
          ? position.coords.accuracy
          : undefined,
        address,
        previewCapturedAt: new Date(),
      };
      setCapturedLocation(location);
      setLocationState("ready");
      return location;
    } catch (error) {
      setCapturedLocation(null);
      setLocationState("error");
      const message = isGeolocationError(error)
        ? error.code === 1
          ? "Location permission is required to submit a work report."
          : "Your current location could not be captured. Check GPS and try again."
        : error instanceof Error
          ? error.message
          : "Your current location could not be captured.";
      toast.error(message);
      throw error;
    }
  }, []);

  function openCreateDialog() {
    setNewReport(emptyForm());
    setCapturedLocation(null);
    setLocationState("idle");
    setShowAddModal(true);
    void captureLocation().catch(() => undefined);
  }

  function updateItem(
    itemId: string,
    key: "jobNoName" | "description",
    value: string,
  ) {
    setNewReport((current) => ({
      ...current,
      items: current.items.map((item) =>
        item.id === itemId ? { ...item, [key]: value } : item,
      ),
    }));
  }

  function addItem() {
    setNewReport((current) => {
      if (current.items.length >= 25) return current;
      return {
        ...current,
        items: [
          ...current.items,
          { id: newLineId(), jobNoName: "", description: "" },
        ],
      };
    });
  }

  function removeItem(itemId: string) {
    setNewReport((current) => ({
      ...current,
      items: current.items.filter((item) => item.id !== itemId),
    }));
  }

  function updateCustomValue(key: string, value: string | boolean) {
    setNewReport((current) => ({
      ...current,
      customValues: { ...current.customValues, [key]: value },
    }));
  }

  async function handleCreateReport(event: React.FormEvent) {
    event.preventDefault();
    const incompleteItem = newReport.items.find(
      (item) => !item.jobNoName.trim() || item.description.trim().length < 5,
    );
    if (incompleteItem) {
      toast.error(
        "Every line item needs a job number/name and a description of at least 5 characters.",
      );
      return;
    }

    setSubmitting(true);
    let locationWasCaptured = false;
    try {
      const location = await captureLocation();
      locationWasCaptured = true;
      const customValues = Object.fromEntries(
        fields.map((field) => {
          const rawValue = newReport.customValues[field.key];
          if (field.type === "NUMBER") {
            return [
              field.key,
              rawValue === "" || rawValue === undefined
                ? null
                : Number(rawValue),
            ];
          }
          return [
            field.key,
            rawValue ?? (field.type === "BOOLEAN" ? false : ""),
          ];
        }),
      );

      const response = await fetch("/api/hrms/work-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: newReport.date,
          workedOn: newReport.workedOn,
          items: newReport.items,
          customValues,
          location: {
            latitude: location.latitude,
            longitude: location.longitude,
            accuracy: location.accuracy,
            address: location.address,
          },
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        throw new Error(responseError(result, "Failed to submit report"));
      }

      toast.success("Daily report submitted and routed for approval.");
      setShowAddModal(false);
      setNewReport(emptyForm());
      setCapturedLocation(null);
      if (filter === "my") {
        await loadReports();
      } else {
        setFilter("my");
      }
    } catch (error) {
      if (locationWasCaptured) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Unable to submit the daily report",
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleApprovalAction(
    reportId: string,
    status: "APPROVED" | "REJECTED",
  ) {
    setActing(true);
    try {
      const response = await fetch(
        `/api/hrms/work-reports/${reportId}/approve`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status, comments: approvalComment }),
        },
      );
      const result = await response.json();
      if (!response.ok || !result.ok) {
        throw new Error(responseError(result, "Failed to process decision"));
      }
      toast.success(
        result.data.status === "PENDING"
          ? "Approved and sent to the secondary manager."
          : `Report ${result.data.status.toLowerCase()}.`,
      );
      setApprovalComment("");
      await loadReports();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to process decision",
      );
    } finally {
      setActing(false);
    }
  }

  const selectedReport =
    reports.find((report) => report.id === selectedReportId) ?? null;
  const selectedItems = useMemo(
    () => (selectedReport ? reportItems(selectedReport) : []),
    [selectedReport],
  );
  const currentApproval = selectedReport?.approvals.find(
    (approval) => approval.status === "PENDING",
  );
  const completedApprovals =
    selectedReport?.approvals.filter(
      (approval) => approval.status === "APPROVED",
    ).length ?? 0;
  const approvalLevels = selectedReport?.approvals.length ?? 0;
  const canActOnSelected =
    currentApproval?.approverId === currentUserId &&
    selectedReport?.status === "PENDING";

  return (
    <div className="flex select-none flex-col gap-6 animate-in fade-in duration-200">
      <div className="flex flex-col items-start justify-between gap-4 rounded-xl border border-[var(--mnx-border)] bg-[var(--mnx-card)] p-4 sm:flex-row sm:items-center">
        <div>
          <span className="text-xs font-bold uppercase text-[var(--mnx-muted)]">
            Daily work reports
          </span>
          <p className="mt-1 text-xs text-[var(--mnx-muted)]">
            Submit detailed line items and track manager decisions.
          </p>
        </div>

        <div className="grid w-full gap-3 sm:w-auto sm:grid-cols-[minmax(16rem,1fr)_auto] sm:items-center">
          <NativeSelect
            value={filter}
            onChange={(event) => setFilter(event.target.value as ReportFilter)}
            className="min-w-0 w-full rounded-lg border border-[var(--mnx-border)] bg-[var(--mnx-card)] p-1.5 text-xs font-bold outline-none"
          >
            {canViewAll ? (
              <option value="all">All organisation reports</option>
            ) : null}
            <option value="my">My reports</option>
            {canApprove ? (
              <option value="reportees">Reports assigned to me</option>
            ) : null}
          </NativeSelect>

          {canSubmit ? (
            <MnxAction
              type="button"
              onClick={openCreateDialog}
              variant="primary"
              className="justify-self-start whitespace-nowrap"
            >
              <Plus className="size-3.5" />
              Add report
            </MnxAction>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <div className="mnx-people-table-shell">
          <div className="mnx-table-wrap">
            <MnxTable className="mnx-workspace-table w-full">
              <thead>
                <tr>
                  <th className="mnx-people-table-head w-12" />
                  <th className="mnx-people-table-head w-20">Status</th>
                  <th className="mnx-people-table-head">Employee</th>
                  <th className="mnx-people-table-head">Report date</th>
                  <th className="mnx-people-table-head">Submitted</th>
                  <th className="mnx-people-table-head">Line items</th>
                  <th className="mnx-people-table-head">Captured location</th>
                </tr>
              </thead>
              <tbody>
                {loading && reports.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="mnx-people-table-cell py-12 text-center font-medium text-[var(--mnx-muted)]"
                    >
                      Loading work reports…
                    </td>
                  </tr>
                ) : reports.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="mnx-people-table-cell py-12 text-center font-medium text-[var(--mnx-muted)]"
                    >
                      No work reports found.
                    </td>
                  </tr>
                ) : (
                  reports.map((report) => {
                    const isSelected = report.id === selectedReportId;
                    return (
                      <tr
                        key={report.id}
                        onClick={() => setSelectedReportId(report.id)}
                        className={`mnx-people-table-row cursor-pointer ${
                          isSelected ? "is-selected" : ""
                        }`}
                      >
                        <td className="mnx-people-table-cell">
                          <MnxInput
                            type="radio"
                            name="selected-work-report"
                            checked={isSelected}
                            onChange={() => setSelectedReportId(report.id)}
                            aria-label={`Select ${report.user.name}'s report`}
                          />
                        </td>
                        <td className="mnx-people-table-cell">
                          <ReportStatusIcon status={report.status} />
                        </td>
                        <td className="mnx-people-table-cell font-bold text-[var(--mnx-text)]">
                          {report.user.name}
                          <span className="mt-0.5 block text-[10px] font-medium text-[var(--mnx-muted)]">
                            #{report.user.employeeNumber ?? "—"}
                          </span>
                        </td>
                        <td className="mnx-people-table-cell font-semibold text-[var(--mnx-text)]">
                          {new Date(report.date).toLocaleDateString("en-IN")}
                        </td>
                        <td className="mnx-people-table-cell font-semibold text-[var(--mnx-muted)]">
                          {formatDateTime(report.createdAt)}
                        </td>
                        <td className="mnx-people-table-cell font-semibold text-[var(--mnx-text)]">
                          {reportItems(report).length}
                        </td>
                        <td className="mnx-people-table-cell max-w-xs truncate font-semibold text-[var(--mnx-muted)]">
                          {report.addedAddress ?? "Coordinates unavailable"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </MnxTable>
          </div>
        </div>

        {selectedReport ? (
          <WorkspaceDialog
            open={Boolean(selectedReport)}
            onClose={() => setSelectedReportId(null)}
            eyebrow="Work report details"
            title={`${selectedReport.user.name}'s Work Report`}
            description={`${selectedReport.workedOn} · ${new Date(selectedReport.date).toLocaleDateString("en-IN")}`}
            size="workspace"
          >
            <div className="grid grid-cols-1 gap-6 p-4 sm:p-6 lg:grid-cols-3">
              <div className="space-y-6 lg:col-span-2">
                <div className="flex items-center gap-3 border-b border-[var(--mnx-border)] pb-4">
                  <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--mnx-accent)]/10 text-sm font-bold text-[var(--mnx-accent)]">
                    {selectedReport.user.photo ? (
                      // User photos may be stored on organisation-configured
                      // hosts that cannot be enumerated in Next image config.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={selectedReport.user.photo}
                        alt={selectedReport.user.name}
                        className="size-full object-cover"
                      />
                    ) : (
                      selectedReport.user.name.charAt(0)
                    )}
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-[var(--mnx-text)]">
                      {selectedReport.user.employeeNumber ?? "—"} ·{" "}
                      {selectedReport.user.name}
                    </h3>
                    <span
                      className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-[9.5px] font-bold ${statusClass(selectedReport.status)}`}
                    >
                      {selectedReport.status}
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-[var(--mnx-text)]">
                        Work completed
                      </h4>
                      <p className="mt-1 text-[10px] text-[var(--mnx-muted)]">
                        {selectedReport.workedOn} ·{" "}
                        {new Date(selectedReport.date).toLocaleDateString(
                          "en-IN",
                        )}
                      </p>
                    </div>
                    <span className="mnx-badge mnx-badge-neutral">
                      {selectedItems.length} line
                      {selectedItems.length === 1 ? "" : "s"}
                    </span>
                  </div>

                  <div className="overflow-hidden rounded-xl border border-[var(--mnx-border)] bg-[var(--mnx-card)]/20">
                    <div className="overflow-x-auto">
                      <MnxTable className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-[var(--mnx-border)] bg-[var(--mnx-card)]/80 text-[9.5px] font-bold uppercase tracking-wider text-[var(--mnx-muted)]">
                            <th className="w-12 px-4 py-2">#</th>
                            <th className="px-4 py-2">Job no. / name</th>
                            <th className="px-4 py-2">Detailed description</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--mnx-border)]">
                          {selectedItems.map((item, index) => (
                            <tr key={item.id}>
                              <td className="px-4 py-3 font-mono text-[var(--mnx-muted)]">
                                {String(index + 1).padStart(2, "0")}
                              </td>
                              <td className="px-4 py-3 font-bold text-[var(--mnx-text)]">
                                {item.jobNoName}
                              </td>
                              <td className="max-w-lg whitespace-pre-wrap px-4 py-3 font-medium leading-relaxed text-[var(--mnx-muted)]">
                                {item.description}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </MnxTable>
                    </div>
                  </div>
                </div>

                {fields.length > 0 ? (
                  <div className="grid grid-cols-1 gap-4 rounded-xl border border-[var(--mnx-border)] bg-[var(--mnx-card)]/30 p-4 text-xs md:grid-cols-2">
                    {fields.map((field) => (
                      <Metadata
                        key={field.id}
                        label={field.label}
                        value={valueLabel(
                          reportCustomValues(selectedReport)[field.key],
                        )}
                      />
                    ))}
                  </div>
                ) : null}

                <div className="grid grid-cols-1 gap-4 rounded-xl border border-[var(--mnx-border)] bg-[var(--mnx-card)]/30 p-4 text-xs md:grid-cols-2">
                  <Metadata
                    label="Submitted by"
                    value={`${selectedReport.user.name} · ${selectedReport.user.employeeNumber ?? "—"}`}
                  />
                  <Metadata
                    label="Saved at"
                    value={formatDateTime(selectedReport.createdAt)}
                  />
                  <div className="md:col-span-2">
                    <Metadata
                      label="Automatically captured address"
                      value={
                        <span className="flex items-start gap-1">
                          <MapPin className="mt-0.5 size-3.5 shrink-0 text-[var(--mnx-accent)]" />
                          {selectedReport.addedAddress ??
                            "Location was not available on this legacy report."}
                        </span>
                      }
                    />
                  </div>
                  <Metadata
                    label="Location saved at"
                    value={formatDateTime(selectedReport.locationCapturedAt)}
                  />
                  <Metadata
                    label="GPS accuracy"
                    value={
                      selectedReport.locationAccuracy === null
                        ? "—"
                        : `±${Math.round(selectedReport.locationAccuracy)} m`
                    }
                  />
                </div>
              </div>

              <div className="space-y-4 border-[var(--mnx-border)] lg:border-l lg:pl-6">
                <h4 className="border-b border-[var(--mnx-border)] pb-2 text-xs font-bold uppercase tracking-wider text-[var(--mnx-text)]">
                  Approval timeline
                </h4>

                <div className="grid grid-cols-2 gap-4 rounded-xl border border-[var(--mnx-border)] bg-[var(--mnx-card)]/50 p-3 text-center">
                  <Metadata
                    label="Progress"
                    value={
                      approvalLevels > 0
                        ? `${completedApprovals}/${approvalLevels} levels`
                        : "No approval required"
                    }
                    centered
                  />
                  <Metadata
                    label="Status"
                    value={selectedReport.status}
                    centered
                  />
                </div>

                <div className="relative ml-3 space-y-5 border-l border-[var(--mnx-border)] pl-6 text-xs">
                  <TimelineNode
                    tone="neutral"
                    title="Report submitted"
                    detail={`${selectedReport.user.name} sent the report for approval.`}
                    time={selectedReport.createdAt}
                  />

                  {selectedReport.approvals.map((approval) => (
                    <TimelineNode
                      key={approval.id}
                      tone={
                        approval.status === "APPROVED"
                          ? "success"
                          : approval.status === "REJECTED"
                            ? "danger"
                            : approval.status === "PENDING"
                              ? "warning"
                              : "neutral"
                      }
                      title={`Level ${approval.level} · ${approval.approver.name}`}
                      detail={
                        approval.status === "WAITING"
                          ? "Waiting for the previous approval level."
                          : approval.status === "PENDING"
                            ? "Decision required."
                            : approval.status === "CANCELLED"
                              ? "Cancelled after an earlier rejection."
                              : approval.comments ||
                                `Report ${approval.status.toLowerCase()}.`
                      }
                      time={approval.decidedAt ?? approval.createdAt}
                    />
                  ))}
                </div>

                {canActOnSelected && currentApproval ? (
                  <div className="space-y-3 rounded-xl border border-[var(--mnx-warning)]/30 bg-[var(--mnx-warning-bg)]/10 p-4">
                    <div>
                      <span className="text-[11px] font-bold text-[var(--mnx-text)]">
                        Your level {currentApproval.level} decision
                      </span>
                      <p className="mt-1 text-[10px] text-[var(--mnx-muted)]">
                        Approve to continue the configured route, or reject to
                        close it.
                      </p>
                    </div>
                    <MnxTextarea
                      placeholder="Add approval or rejection comments…"
                      value={approvalComment}
                      onChange={(event) => setApprovalComment(event.target.value)}
                      className="h-20 w-full resize-none rounded-lg border border-[var(--mnx-border)] bg-[var(--mnx-card)] p-2 text-xs outline-none focus:border-[var(--mnx-accent)]"
                    />
                    <div className="flex items-center gap-2">
                      <MnxAction
                        type="button"
                        disabled={acting}
                        onClick={() =>
                          handleApprovalAction(selectedReport.id, "APPROVED")
                        }
                        className="flex cursor-pointer items-center gap-1 rounded-lg bg-[var(--mnx-accent)] px-3 py-1.5 text-[10px] font-bold text-[var(--mnx-text)] disabled:opacity-50"
                      >
                        <CheckCircle2 className="size-3.5" />
                        Approve
                      </MnxAction>
                      <MnxAction
                        type="button"
                        disabled={acting}
                        onClick={() =>
                          handleApprovalAction(selectedReport.id, "REJECTED")
                        }
                        className="flex cursor-pointer items-center gap-1 rounded-lg border border-[var(--mnx-danger)] bg-[var(--mnx-card)] px-3 py-1.5 text-[10px] font-bold text-[var(--mnx-danger)] disabled:opacity-50"
                      >
                        <XCircle className="size-3.5" />
                        Reject
                      </MnxAction>
                    </div>
                  </div>
                ) : selectedReport.status === "PENDING" && currentApproval ? (
                  <div className="rounded-xl border border-[var(--mnx-border)] bg-[var(--mnx-card)]/40 p-3 text-[10px] text-[var(--mnx-muted)]">
                    Awaiting {currentApproval.approver.name} at level{" "}
                    {currentApproval.level}.
                  </div>
                ) : null}
              </div>
            </div>
          </WorkspaceDialog>
        ) : null}
      </div>

      <WorkspaceDialog
        open={showAddModal}
        onClose={() => {
          if (!submitting) setShowAddModal(false);
        }}
        eyebrow="Work reporting"
        title="Add daily report"
        description="Add multiple work items. Your current address and save time are captured automatically on submission."
        size="workspace"
        className="mnx-work-report-dialog"
        footer={
          <>
            <MnxAction
              type="button"
              disabled={submitting}
              onClick={() => setShowAddModal(false)}
            >
              Cancel
            </MnxAction>
            <MnxAction
              type="submit"
              form="daily-work-report-form"
              variant="primary"
              disabled={submitting || locationState === "capturing"}
            >
              <Send className="size-4" />
              {submitting ? "Capturing and submitting…" : "Submit report"}
            </MnxAction>
          </>
        }
      >
        <form
          id="daily-work-report-form"
          onSubmit={handleCreateReport}
          className="space-y-6 text-xs"
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField label="Date" required>
              <DateInput
                value={newReport.date}
                onChange={(event) =>
                  setNewReport((current) => ({
                    ...current,
                    date: event.target.value,
                  }))
                }
              />
            </FormField>
            <FormField label="Worked on" required>
              <NativeSelect
                value={newReport.workedOn}
                onChange={(event) =>
                  setNewReport((current) => ({
                    ...current,
                    workedOn: event.target.value as WorkContext,
                  }))
                }
              >
                <option value="Office">Office</option>
                <option value="Home">Home</option>
                <option value="Others">Others</option>
              </NativeSelect>
            </FormField>
          </div>

          <section className="space-y-3">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-[var(--mnx-text)]">
                  Work line items
                </h3>
                <p className="mt-1 text-[10px] text-[var(--mnx-muted)]">
                  Record each job or activity as a separate row.
                </p>
              </div>
              <MnxAction
                type="button"
                onClick={addItem}
                disabled={newReport.items.length >= 25}
              >
                <Plus className="size-4" />
                Add line
              </MnxAction>
            </div>

            <div className="space-y-3">
              {newReport.items.map((item, index) => (
                <div
                  key={item.id}
                  className="grid grid-cols-1 gap-3 rounded-xl border border-[var(--mnx-border)] bg-[var(--mnx-card)]/35 p-4 lg:grid-cols-[36px_minmax(220px,0.8fr)_minmax(320px,1.6fr)_36px]"
                >
                  <div className="flex size-8 items-center justify-center rounded-lg bg-[var(--mnx-accent)]/10 font-mono text-[10px] font-bold text-[var(--mnx-accent)]">
                    {String(index + 1).padStart(2, "0")}
                  </div>
                  <FormField label="Job no. / name" required>
                    <MnxInput
                      value={item.jobNoName}
                      onChange={(event) =>
                        updateItem(item.id, "jobNoName", event.target.value)
                      }
                      placeholder="e.g. Kolkata clearance"
                    />
                  </FormField>
                  <FormField label="Detailed description" required>
                    <MnxTextarea
                      value={item.description}
                      onChange={(event) =>
                        updateItem(item.id, "description", event.target.value)
                      }
                      placeholder="Describe the work completed, result, and next action…"
                      className="min-h-24 resize-y"
                    />
                  </FormField>
                  <MnxAction
                    type="button"
                    aria-label={`Remove line ${index + 1}`}
                    disabled={newReport.items.length === 1}
                    onClick={() => removeItem(item.id)}
                    className="self-start"
                  >
                    <Trash2 className="size-4" />
                  </MnxAction>
                </div>
              ))}
            </div>
          </section>

          {fields.length > 0 ? (
            <section className="space-y-3 border-t border-[var(--mnx-border)] pt-5">
              <div>
                <h3 className="text-sm font-bold text-[var(--mnx-text)]">
                  Additional details
                </h3>
                <p className="mt-1 text-[10px] text-[var(--mnx-muted)]">
                  These fields are configured by your HRMS administrator.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {fields.map((field) => (
                  <DynamicField
                    key={field.id}
                    field={field}
                    value={newReport.customValues[field.key]}
                    onChange={(value) => updateCustomValue(field.key, value)}
                  />
                ))}
              </div>
            </section>
          ) : null}

          <section className="space-y-3 border-t border-[var(--mnx-border)] pt-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-[var(--mnx-text)]">
                  Automatic location evidence
                </h3>
                <p className="mt-1 text-[10px] text-[var(--mnx-muted)]">
                  The location is refreshed again when you submit.
                </p>
              </div>
              <MnxAction
                type="button"
                onClick={() => void captureLocation().catch(() => undefined)}
                disabled={locationState === "capturing" || submitting}
              >
                <LocateFixed className="size-4" />
                Refresh
              </MnxAction>
            </div>
            <div
              className={`rounded-xl border p-4 ${
                locationState === "error"
                  ? "border-[var(--mnx-danger)]/40 bg-[var(--mnx-danger-bg)]/10"
                  : "border-[var(--mnx-border)] bg-[var(--mnx-card)]/35"
              }`}
            >
              {locationState === "capturing" ? (
                <div className="flex items-center gap-2 text-[var(--mnx-muted)]">
                  <Clock className="size-4 animate-pulse" />
                  Capturing precise location and resolving the address…
                </div>
              ) : capturedLocation ? (
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-[var(--mnx-accent)]" />
                  <div>
                    <p className="font-semibold leading-relaxed text-[var(--mnx-text)]">
                      {capturedLocation.address}
                    </p>
                    <p className="mt-1 text-[10px] text-[var(--mnx-muted)]">
                      Preview captured{" "}
                      {formatDateTime(capturedLocation.previewCapturedAt)}
                      {capturedLocation.accuracy !== undefined
                        ? ` · ±${Math.round(capturedLocation.accuracy)} m`
                        : ""}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-[var(--mnx-muted)]">
                  <LocateFixed className="size-4" />
                  Allow location access to submit this report.
                </div>
              )}
            </div>
          </section>
        </form>
      </WorkspaceDialog>
    </div>
  );
}

function DynamicField({
  field,
  value,
  onChange,
}: {
  field: WorkReportField;
  value: string | boolean | undefined;
  onChange: (value: string | boolean) => void;
}) {
  if (field.type === "BOOLEAN") {
    return (
      <label className="flex items-center gap-2 rounded-xl border border-[var(--mnx-border)] p-3 text-xs text-[var(--mnx-text)]">
        <MnxInput
          type="checkbox"
          checked={value === true}
          onChange={(event) => onChange(event.target.checked)}
        />
        {field.label}
        {field.required ? <span aria-hidden="true">*</span> : null}
      </label>
    );
  }

  if (field.type === "TEXTAREA") {
    return (
      <div className="md:col-span-2">
        <FormField label={field.label} required={field.required}>
          <MnxTextarea
            value={typeof value === "string" ? value : ""}
            onChange={(event) => onChange(event.target.value)}
            className="min-h-24 resize-y"
          />
        </FormField>
      </div>
    );
  }

  if (field.type === "SELECT") {
    const options = Array.isArray(field.options)
      ? field.options.filter(
          (option): option is string => typeof option === "string",
        )
      : [];
    return (
      <FormField label={field.label} required={field.required}>
        <NativeSelect
          value={typeof value === "string" ? value : ""}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">Select…</option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </NativeSelect>
      </FormField>
    );
  }

  if (field.type === "DATE") {
    return (
      <FormField label={field.label} required={field.required}>
        <DateInput
          value={typeof value === "string" ? value : ""}
          onChange={(event) => onChange(event.target.value)}
        />
      </FormField>
    );
  }

  return (
    <FormField label={field.label} required={field.required}>
      <MnxInput
        type={field.type === "NUMBER" ? "number" : "text"}
        value={typeof value === "string" ? value : ""}
        onChange={(event) => onChange(event.target.value)}
      />
    </FormField>
  );
}

function FormField({
  label,
  required = false,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1 font-bold text-[var(--mnx-muted)]">
      <span>
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </span>
      {children}
    </label>
  );
}

function Metadata({
  label,
  value,
  centered = false,
}: {
  label: string;
  value: React.ReactNode;
  centered?: boolean;
}) {
  return (
    <div className={centered ? "text-center" : ""}>
      <span className="block text-[9.5px] font-bold uppercase text-[var(--mnx-muted)]">
        {label}
      </span>
      <span className="mt-1 block font-semibold leading-relaxed text-[var(--mnx-text)]">
        {value}
      </span>
    </div>
  );
}

function ReportStatusIcon({ status }: { status: WorkReportStatus }) {
  if (status === "APPROVED") {
    return (
      <span title="Approved">
        <Check className="size-4 text-[var(--mnx-success)]" />
      </span>
    );
  }
  if (status === "REJECTED") {
    return (
      <span title="Rejected">
        <X className="size-4 text-[var(--mnx-danger)]" />
      </span>
    );
  }
  return (
    <span title="Pending approval">
      <Clock className="size-4 text-[var(--mnx-warning)]" />
    </span>
  );
}

function statusClass(status: WorkReportStatus) {
  if (status === "APPROVED") {
    return "border-[var(--mnx-success)] text-[var(--mnx-success)] bg-[var(--mnx-success-bg)]";
  }
  if (status === "REJECTED") {
    return "border-[var(--mnx-danger)] text-[var(--mnx-danger)] bg-[var(--mnx-danger-bg)]";
  }
  return "border-[var(--mnx-warning)] text-[var(--mnx-warning)] bg-[var(--mnx-warning-bg)]";
}

function TimelineNode({
  tone,
  title,
  detail,
  time,
}: {
  tone: "neutral" | "success" | "danger" | "warning";
  title: string;
  detail: string;
  time: string;
}) {
  const toneClass =
    tone === "success"
      ? "bg-[var(--mnx-success-bg)] border-[var(--mnx-success)]"
      : tone === "danger"
        ? "bg-[var(--mnx-danger-bg)] border-[var(--mnx-danger)]"
        : tone === "warning"
          ? "bg-[var(--mnx-warning-bg)] border-[var(--mnx-warning)]"
          : "bg-[var(--mnx-card)] border-[var(--mnx-border)]";
  return (
    <div className="relative">
      <div
        className={`absolute -left-[30px] top-1 size-3.5 rounded-full border-2 ${toneClass}`}
      />
      <p className="font-bold text-[var(--mnx-text)]">{title}</p>
      <p className="mt-1 leading-relaxed text-[var(--mnx-muted)]">{detail}</p>
      <span className="mt-1 block text-[10px] text-[var(--mnx-muted)]">
        {formatDateTime(time)}
      </span>
    </div>
  );
}
