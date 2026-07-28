"use client";

import {
  PeopleControlButton as MnxAction,
  PeopleControlInput as MnxInput,
  PeopleControlTextarea as MnxTextarea,
  PeopleControlTable as MnxTable,
} from "@/components/monolith/people-controls";

import { NativeSelect } from "@/components/monolith/native-select";
import { DateInput } from "@/components/monolith/date-input";
import { WorkspaceDialog } from "@/components/monolith/workspace-dialog";
import React, { useState, useEffect } from "react";
import {
  Plus,
  Check,
  X,
  Clock,
  HelpCircle,
  User,
  MapPin,
  Send,
} from "lucide-react";
import { toast } from "sonner";

interface WorkReport {
  id: string;
  date: string;
  workedOn: "Office" | "Home" | "Others";
  jobNoName: string;
  description: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  addedAddress: string | null;
  modifiedAddress: string | null;
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
    status: "PENDING" | "APPROVED" | "REJECTED";
    comments: string | null;
    approverId: string;
    createdAt: string;
  }>;
}

export function WorkReportsView() {
  const [reports, setReports] = useState<WorkReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"my" | "reportees" | "all">("all");

  // Selection
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [approvalComment, setApprovalComment] = useState("");

  // Create Form State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newReport, setNewReport] = useState({
    date: new Date().toISOString().split("T")[0],
    workedOn: "Office" as "Office" | "Home" | "Others",
    jobNoName: "",
    description: "",
    addedAddress: "",
  });

  const loadReports = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/hrms/work-reports?filter=${filter}`);
      const json = await res.json();
      if (json.ok) {
        setReports(json.data);
        if (json.data.length > 0 && !selectedReportId) {
          setSelectedReportId(json.data[0].id);
        }
      }
    } catch (e) {
      toast.error("Failed to load work reports ledger");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [filter]);

  const handleCreateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReport.jobNoName || !newReport.description) {
      toast.error("Please fill in all required fields.");
      return;
    }

    try {
      const res = await fetch("/api/hrms/work-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newReport),
      });
      const json = await res.json();
      if (json.ok) {
        toast.success("Daily report submitted successfully.");
        setShowAddModal(false);
        setNewReport({
          date: new Date().toISOString().split("T")[0],
          workedOn: "Office",
          jobNoName: "",
          description: "",
          addedAddress: "",
        });
        loadReports();
      } else {
        toast.error(json.error?.message || "Failed to submit report");
      }
    } catch (err) {
      toast.error("Network error while submitting report");
    }
  };

  const handleApprovalAction = async (
    reportId: string,
    status: "APPROVED" | "REJECTED",
  ) => {
    try {
      const res = await fetch(`/api/hrms/work-reports/${reportId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, comments: approvalComment }),
      });
      const json = await res.json();
      if (json.ok) {
        toast.success(`Report status updated to ${status}`);
        setApprovalComment("");
        loadReports();
      } else {
        toast.error(json.error?.message || "Failed to process decision");
      }
    } catch (err) {
      toast.error("Network error while submitting decision");
    }
  };

  const selectedReport = reports.find((r) => r.id === selectedReportId) || null;

  return (
    <div className="flex flex-col gap-6 select-none animate-in fade-in duration-200">
      {/* Subtab Header filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[var(--mnx-card)] p-4 border border-[var(--mnx-border)] rounded-xl">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[var(--mnx-muted)] uppercase">
            Daily Reports View
          </span>
          <span className="text-xs font-semibold text-[var(--mnx-muted)]">
            /
          </span>
          <span className="text-xs font-bold text-[var(--mnx-accent)]">
            Edit
          </span>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <NativeSelect
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="text-xs font-bold bg-[var(--mnx-card)] border border-[var(--mnx-border)] rounded-lg p-1.5 outline-none cursor-pointer"
          >
            <option value="all">Reportees + My Data</option>
            <option value="my">My Data</option>
            <option value="reportees">Reportees Only</option>
          </NativeSelect>

          <MnxAction
            type="button"
            onClick={() => setShowAddModal(true)}
            className="bg-[var(--mnx-accent)] hover:bg-[var(--mnx-accent-text)] text-[var(--mnx-text)] text-[11.5px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 shadow-sm transition-colors cursor-pointer ml-auto sm:ml-0"
          >
            <Plus className="size-3.5" />
            Add Record
          </MnxAction>
        </div>
      </div>

      {/* Main Grid: Split List and Details Bottom Pane */}
      <div className="flex flex-col gap-6">
        {/* Table List View */}
        <div className="bg-[var(--mnx-card)] border border-[var(--mnx-border)] rounded-2xl overflow-hidden shadow-sm">
          <MnxTable className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[var(--mnx-card)] border-b border-[var(--mnx-border)] text-[var(--mnx-muted)] font-bold uppercase tracking-wider text-[10px]">
                <th className="px-6 py-3 w-10"></th>
                <th className="px-6 py-3 w-16">Status</th>
                <th className="px-6 py-3">Added By</th>
                <th className="px-6 py-3">Added Time</th>
                <th className="px-6 py-3">Modified By</th>
                <th className="px-6 py-3">Modified Time</th>
                <th className="px-6 py-3">Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--mnx-border)]">
              {loading && reports.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="text-center py-12 text-[var(--mnx-muted)] font-medium"
                  >
                    Syncing work report logs...
                  </td>
                </tr>
              ) : reports.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="text-center py-12 text-[var(--mnx-muted)] font-medium"
                  >
                    No work reports logged.
                  </td>
                </tr>
              ) : (
                reports.map((report) => {
                  const isSelected = report.id === selectedReportId;
                  const addedByStr = `${report.user.name} ${report.user.employeeNumber ?? ""}`;
                  return (
                    <tr
                      key={report.id}
                      onClick={() => setSelectedReportId(report.id)}
                      className={`hover:bg-[var(--mnx-card)]/50 transition-colors cursor-pointer ${
                        isSelected ? "bg-[var(--mnx-accent)]/5" : ""
                      }`}
                    >
                      <td className="px-6 py-4">
                        <MnxInput
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => setSelectedReportId(report.id)}
                          className="rounded text-[var(--mnx-accent)] focus:ring-[var(--mnx-accent)]"
                        />
                      </td>
                      <td className="px-6 py-4">
                        {report.status === "PENDING" ? (
                          <span title="Pending approval">
                            <Clock className="size-4 text-[var(--mnx-warning)]" />
                          </span>
                        ) : report.status === "APPROVED" ? (
                          <span title="Approved">
                            <Check className="size-4 text-[var(--mnx-success)]" />
                          </span>
                        ) : (
                          <span title="Rejected">
                            <X className="size-4 text-[var(--mnx-danger)]" />
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-bold text-[var(--mnx-text)]">
                        {addedByStr}
                      </td>
                      <td className="px-6 py-4 text-[var(--mnx-muted)] font-semibold">
                        {new Date(report.createdAt).toLocaleString("en-US", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                        })}
                      </td>
                      <td className="px-6 py-4 font-bold text-[var(--mnx-text)]">
                        {addedByStr}
                      </td>
                      <td className="px-6 py-4 text-[var(--mnx-muted)] font-semibold">
                        {new Date(report.updatedAt).toLocaleString("en-US", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                        })}
                      </td>
                      <td className="px-6 py-4 font-semibold text-[var(--mnx-muted)] max-w-xs truncate">
                        {report.addedAddress || "Office HQ, Chennai"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </MnxTable>
        </div>

        {/* Bottom Split Layout Pane */}
        {selectedReport && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 bg-[var(--mnx-card)] border border-[var(--mnx-border)] rounded-2xl p-6 shadow-sm">
            {/* Left 2 Columns: Report details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Profile sub-header */}
              <div className="flex items-center gap-3 pb-4 border-b border-[var(--mnx-border)]">
                <div className="size-10 rounded-full bg-[var(--mnx-accent)]/10 flex items-center justify-center text-[var(--mnx-accent)] font-bold text-sm shrink-0">
                  {selectedReport.user.photo ? (
                    <img
                      src={selectedReport.user.photo}
                      alt={selectedReport.user.name}
                      className="size-full rounded-full object-cover"
                    />
                  ) : (
                    selectedReport.user.name.charAt(0)
                  )}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[var(--mnx-text)]">
                    {selectedReport.user.employeeNumber} -{" "}
                    {selectedReport.user.name}
                  </h4>
                  <span
                    className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full ${
                      selectedReport.status === "PENDING"
                        ? "bg-[var(--mnx-warning-bg)] text-[var(--mnx-warning)] border border-[var(--mnx-warning)]"
                        : selectedReport.status === "APPROVED"
                          ? "bg-[var(--mnx-success-bg)] text-[var(--mnx-success)] border border-[var(--mnx-success)]"
                          : "bg-[var(--mnx-danger-bg)] text-[var(--mnx-danger)] border border-[var(--mnx-danger)]"
                    }`}
                  >
                    {selectedReport.status}
                  </span>
                </div>
              </div>

              {/* Subtabs inner panel: Daily Update Report / Add Jobs */}
              <div className="space-y-4">
                <div className="flex gap-4 border-b border-[var(--mnx-border)] pb-2">
                  <span className="text-xs font-bold text-[var(--mnx-accent)] pb-2 border-b-2 border-[var(--mnx-accent)]">
                    Daily Update report
                  </span>
                  <span className="text-xs font-semibold text-[var(--mnx-muted)] cursor-not-allowed">
                    Add Jobs
                  </span>
                </div>

                {/* Sub-table workedOn logs */}
                <div className="border border-[var(--mnx-border)] rounded-xl overflow-hidden shadow-inner bg-[var(--mnx-card)]/20">
                  <MnxTable className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-[var(--mnx-card)]/80 border-b border-[var(--mnx-border)] text-[var(--mnx-muted)] font-bold uppercase tracking-wider text-[9.5px]">
                        <th className="px-4 py-2">Worked On</th>
                        <th className="px-4 py-2">Specify Job No/Name</th>
                        <th className="px-4 py-2">Detailed Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--mnx-border)]">
                      <tr>
                        <td className="px-4 py-3 text-[var(--mnx-text)] font-bold">
                          {selectedReport.workedOn}
                        </td>
                        <td className="px-4 py-3 text-[var(--mnx-text)] font-bold">
                          {selectedReport.jobNoName}
                        </td>
                        <td className="px-4 py-3 text-[var(--mnx-muted)] font-medium leading-relaxed max-w-sm">
                          {selectedReport.description}
                        </td>
                      </tr>
                    </tbody>
                  </MnxTable>
                </div>

                {/* Metadata Fields list */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 text-xs bg-[var(--mnx-card)]/30 border border-[var(--mnx-border)] p-4 rounded-xl">
                  <div>
                    <span className="text-[10px] text-[var(--mnx-muted)] font-bold uppercase block">
                      Added By
                    </span>
                    <span className="text-[var(--mnx-text)] font-bold mt-1 block">
                      {selectedReport.user.name}{" "}
                      {selectedReport.user.employeeNumber}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[var(--mnx-muted)] font-bold uppercase block">
                      Modified By
                    </span>
                    <span className="text-[var(--mnx-text)] font-bold mt-1 block">
                      {selectedReport.user.name}{" "}
                      {selectedReport.user.employeeNumber}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[var(--mnx-muted)] font-bold uppercase block">
                      Added Time
                    </span>
                    <span className="text-[var(--mnx-muted)] font-semibold mt-1 block">
                      {new Date(selectedReport.createdAt).toLocaleString(
                        "en-US",
                      )}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[var(--mnx-muted)] font-bold uppercase block">
                      Modified Time
                    </span>
                    <span className="text-[var(--mnx-muted)] font-semibold mt-1 block">
                      {new Date(selectedReport.updatedAt).toLocaleString(
                        "en-US",
                      )}
                    </span>
                  </div>
                  <div className="md:col-span-2">
                    <span className="text-[10px] text-[var(--mnx-muted)] font-bold uppercase block">
                      Added address
                    </span>
                    <span className="text-[var(--mnx-muted)] font-bold mt-1 block leading-normal flex items-start gap-1">
                      <MapPin className="size-3.5 text-[var(--mnx-accent)] mt-0.5 shrink-0" />
                      {selectedReport.addedAddress || "Office HQ, Chennai"}
                    </span>
                  </div>
                  <div className="md:col-span-2">
                    <span className="text-[10px] text-[var(--mnx-muted)] font-bold uppercase block">
                      Modified address
                    </span>
                    <span className="text-[var(--mnx-muted)] font-bold mt-1 block leading-normal flex items-start gap-1">
                      <MapPin className="size-3.5 text-[var(--mnx-accent)] mt-0.5 shrink-0" />
                      {selectedReport.modifiedAddress || "Office HQ, Chennai"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Approval Timeline board */}
            <div className="border-l border-[var(--mnx-border)] pl-6 space-y-4">
              <h5 className="text-xs font-bold text-[var(--mnx-text)] uppercase tracking-wider pb-2 border-b border-[var(--mnx-border)]">
                Approval Timeline
              </h5>

              {/* Status Header */}
              <div className="grid grid-cols-2 gap-4 bg-[var(--mnx-card)]/50 p-3 border border-[var(--mnx-border)] rounded-xl text-center">
                <div>
                  <span className="text-[9.5px] font-bold text-[var(--mnx-muted)] uppercase block">
                    Total Duration
                  </span>
                  <span className="text-xs font-bold text-[var(--mnx-text)] block mt-1">
                    12 Hrs 9 Mins
                  </span>
                </div>
                <div>
                  <span className="text-[9.5px] font-bold text-[var(--mnx-muted)] uppercase block">
                    Status
                  </span>
                  <span className="text-xs font-bold text-[var(--mnx-warning)] block mt-1">
                    {selectedReport.status === "PENDING"
                      ? "Pending 0/1 Levels"
                      : selectedReport.status}
                  </span>
                </div>
              </div>

              {/* Timeline nodes */}
              <div className="relative border-l border-[var(--mnx-border)] ml-3 pl-6 space-y-6 text-xs">
                {/* Node 1: Submitted */}
                <div className="relative">
                  <div className="absolute -left-[30px] top-1.5 size-3.5 rounded-full bg-[var(--mnx-card)] border-2 border-[var(--mnx-border)]" />
                  <p className="font-semibold text-[var(--mnx-text)]">
                    {selectedReport.user.employeeNumber} -{" "}
                    {selectedReport.user.name}'s request has been sent for
                    approval
                  </p>
                  <span className="text-[10px] text-[var(--mnx-muted)] font-medium block mt-1">
                    {new Date(selectedReport.createdAt).toLocaleString("en-US")}
                  </span>
                </div>

                {/* Node 2: Pending action */}
                {selectedReport.status === "PENDING" && (
                  <div className="relative bg-[var(--mnx-card)] border border-[var(--mnx-border)] rounded-xl p-4 space-y-3">
                    <div className="absolute -left-[30px] top-4.5 size-3.5 rounded-full bg-[var(--mnx-warning-bg)] border-2 border-[var(--mnx-border)]" />

                    <div className="flex items-center gap-2">
                      <div className="size-6 rounded-full bg-[var(--mnx-accent)]/10 flex items-center justify-center text-[var(--mnx-accent)] font-bold text-[10px]">
                        Y
                      </div>
                      <div>
                        <span className="font-bold text-[var(--mnx-text)] block text-[11px]">
                          Pending Approval
                        </span>
                        <span className="text-[9.5px] text-[var(--mnx-muted)] font-medium block">
                          purushothaman.v@adarshshipping.in
                        </span>
                      </div>
                    </div>

                    <MnxTextarea
                      placeholder="Write approval comment..."
                      value={approvalComment}
                      onChange={(e) => setApprovalComment(e.target.value)}
                      className="w-full text-xs p-2 border border-[var(--mnx-border)] rounded-lg outline-none focus:border-[var(--mnx-accent)] h-16 resize-none bg-[var(--mnx-card)]"
                    />

                    <div className="flex items-center gap-2">
                      <MnxAction
                        type="button"
                        onClick={() =>
                          handleApprovalAction(selectedReport.id, "APPROVED")
                        }
                        className="bg-[var(--mnx-accent)] hover:bg-[var(--mnx-accent-text)] text-[var(--mnx-text)] text-[10px] font-bold px-3 py-1.5 rounded-lg shadow-sm transition-colors cursor-pointer"
                      >
                        Approve
                      </MnxAction>
                      <MnxAction
                        type="button"
                        onClick={() =>
                          handleApprovalAction(selectedReport.id, "REJECTED")
                        }
                        className="bg-[var(--mnx-card)] border border-[var(--mnx-danger)] text-[var(--mnx-danger)] hover:bg-[var(--mnx-danger-bg)] text-[10px] font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                      >
                        Reject
                      </MnxAction>
                      <MnxAction
                        type="button"
                        onClick={() => toast.info("Forward option placeholder")}
                        className="bg-[var(--mnx-card)] border border-[var(--mnx-border)] text-[var(--mnx-muted)] hover:bg-[var(--mnx-card)] text-[10px] font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                      >
                        Forward
                      </MnxAction>
                    </div>
                  </div>
                )}

                {/* Approvals logs */}
                {selectedReport.approvals
                  .filter((a) => a.status !== "PENDING")
                  .map((app) => (
                    <div key={app.id} className="relative">
                      <div
                        className={`absolute -left-[30px] top-1.5 size-3.5 rounded-full border-2 border-[var(--mnx-border)] ${
                          app.status === "APPROVED"
                            ? "bg-[var(--mnx-success-bg)]"
                            : "bg-[var(--mnx-danger-bg)]"
                        }`}
                      />
                      <p className="font-bold text-[var(--mnx-text)]">
                        Report {app.status}
                      </p>
                      {app.comments && (
                        <p className="text-[var(--mnx-muted)] italic bg-[var(--mnx-card)] p-2 rounded-lg border border-[var(--mnx-border)] mt-1">
                          "{app.comments}"
                        </p>
                      )}
                      <span className="text-[10px] text-[var(--mnx-muted)] block mt-1">
                        {new Date(app.createdAt).toLocaleString("en-US")}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <WorkspaceDialog
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        eyebrow="Work reporting"
        title="Add daily report"
        description="Record the day, work context, job, activity, and location."
        className="mnx-people-dialog-compact"
      >
        <form onSubmit={handleCreateReport} className="space-y-4 text-xs">
          <div className="flex flex-col gap-1">
            <label className="font-bold text-[var(--mnx-muted)]">Date</label>
            <DateInput
              value={newReport.date}
              onChange={(e) =>
                setNewReport({ ...newReport, date: e.target.value })
              }
              className="p-2 bg-[var(--mnx-card)] border border-[var(--mnx-border)] rounded-lg outline-none focus:border-[var(--mnx-accent)]"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-bold text-[var(--mnx-muted)]">
              Worked On
            </label>
            <NativeSelect
              value={newReport.workedOn}
              onChange={(e) =>
                setNewReport({ ...newReport, workedOn: e.target.value as any })
              }
              className="p-2 bg-[var(--mnx-card)] border border-[var(--mnx-border)] rounded-lg outline-none focus:border-[var(--mnx-accent)]"
            >
              <option value="Office">Office</option>
              <option value="Home">Home</option>
              <option value="Others">Others</option>
            </NativeSelect>
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-bold text-[var(--mnx-muted)]">
              Specify Job No/Name
            </label>
            <MnxInput
              type="text"
              placeholder="e.g. Kolkata clearance clearance"
              value={newReport.jobNoName}
              onChange={(e) =>
                setNewReport({ ...newReport, jobNoName: e.target.value })
              }
              className="p-2 bg-[var(--mnx-card)] border border-[var(--mnx-border)] rounded-lg outline-none focus:border-[var(--mnx-accent)]"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-bold text-[var(--mnx-muted)]">
              Detailed Description
            </label>
            <MnxTextarea
              placeholder="Explain today's clearances and clearances clearance logs..."
              value={newReport.description}
              onChange={(e) =>
                setNewReport({ ...newReport, description: e.target.value })
              }
              className="p-2 bg-[var(--mnx-card)] border border-[var(--mnx-border)] rounded-lg outline-none focus:border-[var(--mnx-accent)] h-20 resize-none"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-bold text-[var(--mnx-muted)]">
              Location Address
            </label>
            <MnxInput
              type="text"
              placeholder="e.g. Nimu Gossain Lane, Shobha Bazar, Kolkata..."
              value={newReport.addedAddress}
              onChange={(e) =>
                setNewReport({ ...newReport, addedAddress: e.target.value })
              }
              className="p-2 bg-[var(--mnx-card)] border border-[var(--mnx-border)] rounded-lg outline-none focus:border-[var(--mnx-accent)]"
            />
          </div>

          <div className="flex items-center gap-3 justify-end pt-2">
            <MnxAction
              type="button"
              onClick={() => setShowAddModal(false)}
              className="bg-[var(--mnx-card)] border border-[var(--mnx-border)] text-[var(--mnx-muted)] hover:bg-[var(--mnx-card)] px-4 py-2 rounded-lg font-bold transition-colors cursor-pointer"
            >
              Cancel
            </MnxAction>
            <MnxAction
              type="submit"
              className="bg-[var(--mnx-accent)] hover:bg-[var(--mnx-accent-text)] text-[var(--mnx-text)] px-4 py-2 rounded-lg font-bold transition-colors cursor-pointer"
            >
              Submit
            </MnxAction>
          </div>
        </form>
      </WorkspaceDialog>
    </div>
  );
}
