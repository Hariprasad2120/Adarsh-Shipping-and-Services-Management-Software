"use client";

import React, { useState, useEffect } from "react";
import { Plus, Check, X, Clock, HelpCircle, User, MapPin, Send } from "lucide-react";
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
    addedAddress: ""
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
        body: JSON.stringify(newReport)
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
          addedAddress: ""
        });
        loadReports();
      } else {
        toast.error(json.error?.message || "Failed to submit report");
      }
    } catch (err) {
      toast.error("Network error while submitting report");
    }
  };

  const handleApprovalAction = async (reportId: string, status: "APPROVED" | "REJECTED") => {
    try {
      const res = await fetch(`/api/hrms/work-reports/${reportId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, comments: approvalComment })
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 border border-slate-200 rounded-xl">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-400 uppercase">Daily Reports View</span>
          <span className="text-xs font-semibold text-slate-300">/</span>
          <span className="text-xs font-bold text-[#00c4b6]">Edit</span>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="text-xs font-bold bg-white border border-slate-200 rounded-lg p-1.5 outline-none cursor-pointer"
          >
            <option value="all">Reportees + My Data</option>
            <option value="my">My Data</option>
            <option value="reportees">Reportees Only</option>
          </select>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="bg-[#00c4b6] hover:bg-[#00b0a3] text-white text-[11.5px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 shadow-sm transition-colors cursor-pointer ml-auto sm:ml-0"
          >
            <Plus className="size-3.5" />
            Add Record
          </button>
        </div>
      </div>

      {/* Main Grid: Split List and Details Bottom Pane */}
      <div className="flex flex-col gap-6">
        
        {/* Table List View */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="px-6 py-3 w-10"></th>
                <th className="px-6 py-3 w-16">Status</th>
                <th className="px-6 py-3">Added By</th>
                <th className="px-6 py-3">Added Time</th>
                <th className="px-6 py-3">Modified By</th>
                <th className="px-6 py-3">Modified Time</th>
                <th className="px-6 py-3">Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150">
              {loading && reports.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400 font-medium">Syncing work report logs...</td>
                </tr>
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400 font-medium">No work reports logged.</td>
                </tr>
              ) : (
                reports.map((report) => {
                  const isSelected = report.id === selectedReportId;
                  const addedByStr = `${report.user.name} ${report.user.employeeNumber ?? ""}`;
                  return (
                    <tr
                      key={report.id}
                      onClick={() => setSelectedReportId(report.id)}
                      className={`hover:bg-slate-50/50 transition-colors cursor-pointer ${
                        isSelected ? "bg-[#00c4b6]/5" : ""
                      }`}
                    >
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => setSelectedReportId(report.id)}
                          className="rounded text-[#00c4b6] focus:ring-[#00c4b6]"
                        />
                      </td>
                      <td className="px-6 py-4">
                        {report.status === "PENDING" ? (
                          <span title="Pending approval"><Clock className="size-4 text-amber-500" /></span>
                        ) : report.status === "APPROVED" ? (
                          <span title="Approved"><Check className="size-4 text-emerald-500" /></span>
                        ) : (
                          <span title="Rejected"><X className="size-4 text-rose-500" /></span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-700">{addedByStr}</td>
                      <td className="px-6 py-4 text-slate-400 font-semibold">
                        {new Date(report.createdAt).toLocaleString("en-US", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true
                        })}
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-700">{addedByStr}</td>
                      <td className="px-6 py-4 text-slate-400 font-semibold">
                        {new Date(report.updatedAt).toLocaleString("en-US", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true
                        })}
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-400 max-w-xs truncate">
                        {report.addedAddress || "Office HQ, Chennai"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Bottom Split Layout Pane */}
        {selectedReport && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            
            {/* Left 2 Columns: Report details */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Profile sub-header */}
              <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                <div className="size-10 rounded-full bg-[#00c4b6]/10 flex items-center justify-center text-[#00c4b6] font-bold text-sm shrink-0">
                  {selectedReport.user.photo ? (
                    <img src={selectedReport.user.photo} alt={selectedReport.user.name} className="size-full rounded-full object-cover" />
                  ) : (
                    selectedReport.user.name.charAt(0)
                  )}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">
                    {selectedReport.user.employeeNumber} - {selectedReport.user.name}
                  </h4>
                  <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full ${
                    selectedReport.status === "PENDING"
                      ? "bg-amber-50 text-amber-600 border border-amber-100"
                      : selectedReport.status === "APPROVED"
                      ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                      : "bg-rose-50 text-rose-500 border border-rose-100"
                  }`}>
                    {selectedReport.status}
                  </span>
                </div>
              </div>

              {/* Subtabs inner panel: Daily Update Report / Add Jobs */}
              <div className="space-y-4">
                <div className="flex gap-4 border-b border-slate-100 pb-2">
                  <span className="text-xs font-bold text-[#00c4b6] pb-2 border-b-2 border-[#00c4b6]">Daily Update report</span>
                  <span className="text-xs font-semibold text-slate-400 cursor-not-allowed">Add Jobs</span>
                </div>

                {/* Sub-table workedOn logs */}
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-inner bg-slate-50/20">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[9.5px]">
                        <th className="px-4 py-2">Worked On</th>
                        <th className="px-4 py-2">Specify Job No/Name</th>
                        <th className="px-4 py-2">Detailed Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150">
                      <tr>
                        <td className="px-4 py-3 text-slate-700 font-bold">{selectedReport.workedOn}</td>
                        <td className="px-4 py-3 text-slate-600 font-bold">{selectedReport.jobNoName}</td>
                        <td className="px-4 py-3 text-slate-400 font-medium leading-relaxed max-w-sm">
                          {selectedReport.description}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Metadata Fields list */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 text-xs bg-slate-50/30 border border-slate-150 p-4 rounded-xl">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Added By</span>
                    <span className="text-slate-700 font-bold mt-1 block">
                      {selectedReport.user.name} {selectedReport.user.employeeNumber}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Modified By</span>
                    <span className="text-slate-700 font-bold mt-1 block">
                      {selectedReport.user.name} {selectedReport.user.employeeNumber}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Added Time</span>
                    <span className="text-slate-400 font-semibold mt-1 block">
                      {new Date(selectedReport.createdAt).toLocaleString("en-US")}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Modified Time</span>
                    <span className="text-slate-400 font-semibold mt-1 block">
                      {new Date(selectedReport.updatedAt).toLocaleString("en-US")}
                    </span>
                  </div>
                  <div className="md:col-span-2">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Added address</span>
                    <span className="text-slate-500 font-bold mt-1 block leading-normal flex items-start gap-1">
                      <MapPin className="size-3.5 text-[#00c4b6] mt-0.5 shrink-0" />
                      {selectedReport.addedAddress || "Office HQ, Chennai"}
                    </span>
                  </div>
                  <div className="md:col-span-2">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Modified address</span>
                    <span className="text-slate-500 font-bold mt-1 block leading-normal flex items-start gap-1">
                      <MapPin className="size-3.5 text-[#00c4b6] mt-0.5 shrink-0" />
                      {selectedReport.modifiedAddress || "Office HQ, Chennai"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Approval Timeline board */}
            <div className="border-l border-slate-100 pl-6 space-y-4">
              <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider pb-2 border-b border-slate-100">
                Approval Timeline
              </h5>

              {/* Status Header */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50/50 p-3 border border-slate-150 rounded-xl text-center">
                <div>
                  <span className="text-[9.5px] font-bold text-slate-400 uppercase block">Total Duration</span>
                  <span className="text-xs font-bold text-slate-700 block mt-1">12 Hrs 9 Mins</span>
                </div>
                <div>
                  <span className="text-[9.5px] font-bold text-slate-400 uppercase block">Status</span>
                  <span className="text-xs font-bold text-amber-500 block mt-1">
                    {selectedReport.status === "PENDING" ? "Pending 0/1 Levels" : selectedReport.status}
                  </span>
                </div>
              </div>

              {/* Timeline nodes */}
              <div className="relative border-l border-slate-200 ml-3 pl-6 space-y-6 text-xs">
                
                {/* Node 1: Submitted */}
                <div className="relative">
                  <div className="absolute -left-[30px] top-1.5 size-3.5 rounded-full bg-slate-300 border-2 border-white" />
                  <p className="font-semibold text-slate-600">
                    {selectedReport.user.employeeNumber} - {selectedReport.user.name}'s request has been sent for approval
                  </p>
                  <span className="text-[10px] text-slate-400 font-medium block mt-1">
                    {new Date(selectedReport.createdAt).toLocaleString("en-US")}
                  </span>
                </div>

                {/* Node 2: Pending action */}
                {selectedReport.status === "PENDING" && (
                  <div className="relative bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                    <div className="absolute -left-[30px] top-4.5 size-3.5 rounded-full bg-amber-500 border-2 border-white" />
                    
                    <div className="flex items-center gap-2">
                      <div className="size-6 rounded-full bg-[#00c4b6]/10 flex items-center justify-center text-[#00c4b6] font-bold text-[10px]">
                        Y
                      </div>
                      <div>
                        <span className="font-bold text-slate-800 block text-[11px]">Pending Approval</span>
                        <span className="text-[9.5px] text-slate-400 font-medium block">purushothaman.v@adarshshipping.in</span>
                      </div>
                    </div>

                    <textarea
                      placeholder="Write approval comment..."
                      value={approvalComment}
                      onChange={(e) => setApprovalComment(e.target.value)}
                      className="w-full text-xs p-2 border border-slate-200 rounded-lg outline-none focus:border-[#00c4b6] h-16 resize-none bg-white"
                    />

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleApprovalAction(selectedReport.id, "APPROVED")}
                        className="bg-[#00c4b6] hover:bg-[#00b0a3] text-white text-[10px] font-bold px-3 py-1.5 rounded-lg shadow-sm transition-colors cursor-pointer"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApprovalAction(selectedReport.id, "REJECTED")}
                        className="bg-white border border-rose-200 text-rose-500 hover:bg-rose-50 text-[10px] font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                      >
                        Reject
                      </button>
                      <button
                        type="button"
                        onClick={() => toast.info("Forward option placeholder")}
                        className="bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 text-[10px] font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                      >
                        Forward
                      </button>
                    </div>
                  </div>
                )}

                {/* Approvals logs */}
                {selectedReport.approvals.filter(a => a.status !== "PENDING").map((app) => (
                  <div key={app.id} className="relative">
                    <div className={`absolute -left-[30px] top-1.5 size-3.5 rounded-full border-2 border-white ${
                      app.status === "APPROVED" ? "bg-emerald-500" : "bg-rose-500"
                    }`} />
                    <p className="font-bold text-slate-700">
                      Report {app.status}
                    </p>
                    {app.comments && (
                      <p className="text-slate-400 italic bg-slate-50 p-2 rounded-lg border border-slate-100 mt-1">
                        "{app.comments}"
                      </p>
                    )}
                    <span className="text-[10px] text-slate-400 block mt-1">
                      {new Date(app.createdAt).toLocaleString("en-US")}
                    </span>
                  </div>
                ))}

              </div>
            </div>

          </div>
        )}
      </div>

      {/* Add Record Drawer Modal overlay */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xl w-full max-w-md space-y-4">
            <h4 className="text-sm font-bold text-slate-800">Add Daily Report</h4>
            
            <form onSubmit={handleCreateReport} className="space-y-4 text-xs">
              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-500">Date</label>
                <input
                  type="date"
                  value={newReport.date}
                  onChange={(e) => setNewReport({ ...newReport, date: e.target.value })}
                  className="p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-[#00c4b6]"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-500">Worked On</label>
                <select
                  value={newReport.workedOn}
                  onChange={(e) => setNewReport({ ...newReport, workedOn: e.target.value as any })}
                  className="p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-[#00c4b6]"
                >
                  <option value="Office">Office</option>
                  <option value="Home">Home</option>
                  <option value="Others">Others</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-500">Specify Job No/Name</label>
                <input
                  type="text"
                  placeholder="e.g. Kolkata clearance clearance"
                  value={newReport.jobNoName}
                  onChange={(e) => setNewReport({ ...newReport, jobNoName: e.target.value })}
                  className="p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-[#00c4b6]"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-500">Detailed Description</label>
                <textarea
                  placeholder="Explain today's clearances and clearances clearance logs..."
                  value={newReport.description}
                  onChange={(e) => setNewReport({ ...newReport, description: e.target.value })}
                  className="p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-[#00c4b6] h-20 resize-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-500">Location Address</label>
                <input
                  type="text"
                  placeholder="e.g. Nimu Gossain Lane, Shobha Bazar, Kolkata..."
                  value={newReport.addedAddress}
                  onChange={(e) => setNewReport({ ...newReport, addedAddress: e.target.value })}
                  className="p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-[#00c4b6]"
                />
              </div>

              <div className="flex items-center gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 px-4 py-2 rounded-lg font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#00c4b6] hover:bg-[#00b0a3] text-white px-4 py-2 rounded-lg font-bold transition-colors cursor-pointer"
                >
                  Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
