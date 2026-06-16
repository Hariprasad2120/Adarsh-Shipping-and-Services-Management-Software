"use client";

import { Fragment, useState, useTransition, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable, DataTableBody, DataTableCell, DataTableEmpty, DataTableHead, DataTableHeader, DataTableRow } from "@/components/data-table";
import {
  Plus, Check, X, Clock, User, Calendar, AlertCircle, IndianRupee,
  Sliders, ArrowRight, Download, Trash, RefreshCw,
  Search, SlidersHorizontal, ChevronRight, ChevronDown, CheckSquare
} from "lucide-react";
import {
  decideOtRecordAction,
  bulkDecideOtRecordsAction,
  adjustOtRecordAction,
  saveOtSettingsAction,
  saveHolidayAction,
  deleteHolidayAction,
  saveLopRecordAction,
  deleteLopRecordAction,
  processMonthOtAction,
  importAttendanceDataAction,
  clearMonthOtRecordsAction
} from "./actions";

type LegacyOTEntry = {
  id: string;
  userId: string;
  date: Date | string;
  hours: number;
  status: string;
  notes?: string | null;
  createdAt: Date | string;
  user: {
    name: string;
  };
};

interface AdminData {
  stats: {
    totalOtHours: number;
    totalOtAmount: number;
    totalCompOffDays: number;
    totalLopDays: number;
    pendingCount: number;
  };
  otRecords: Array<{
    id: string;
    userId: string;
    date: string;
    dayType: string;
    hoursWorked: number;
    otHours: number;
    otRatePerHour: number;
    otAmount: number;
    compOffDays: number;
    earlyLeavingMins: number;
    approvalStatus: string;
    rejectionRemarks: string | null;
    user: {
      id: string;
      name: string;
      employeeNumber: number | null;
      department: { name: string } | null;
    };
  }>;
  holidays: Array<{
    id: string;
    date: string;
    name: string;
    holidayType: string;
    branchId: string | null;
    branch?: { name: string } | null;
  }>;
  lopRecords: Array<{
    id: string;
    userId: string;
    lopDays: number;
    remarks: string | null;
    user: {
      id: string;
      name: string;
      employeeNumber: number | null;
      department: { name: string } | null;
    };
  }>;
  settings: {
    id: string;
    orgId: string;
    standardHours: number;
    otRate: number;
    graceMinutes: number;
    compOffSlabs: Array<{ minHours: number; compOffDays: number }>;
  };
  employees: Array<{
    id: string;
    name: string;
    employeeNumber: number | null;
    department: { name: string } | null;
  }>;
  branches: Array<{
    id: string;
    name: string;
  }>;
}

interface OtClientProps {
  initialEntries: LegacyOTEntry[];
  canApprove: boolean;
  canRequest: boolean;
  currentUserId: string;
  monthStr: string;
  adminData?: AdminData | null;
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "?";
}

function formatOtDate(date: string) {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    weekday: "short",
  });
}

export function OtClient({
  initialEntries,
  canApprove,
  canRequest,
  currentUserId,
  monthStr,
  adminData,
}: OtClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"overview" | "records" | "holidays" | "lop" | "payroll" | "settings" | "import">(
    canApprove ? "overview" : "records"
  );

  // Transitions
  const [isPending, startTransition] = useTransition();

  // Local state copy for reactive UI updates
  const [otRecords, setOtRecords] = useState(adminData?.otRecords || []);
  const [lopRecords, setLopRecords] = useState(adminData?.lopRecords || []);
  const [holidays, setHolidays] = useState(adminData?.holidays || []);
  const [stats, setStats] = useState(adminData?.stats || { totalOtHours: 0, totalOtAmount: 0, totalCompOffDays: 0, totalLopDays: 0, pendingCount: 0 });
  const [otSettings, setOtSettings] = useState(adminData?.settings || { id: "global", orgId: "", standardHours: 8.0, otRate: 1.5, graceMinutes: 15, compOffSlabs: [] });

  // Month selector
  const [selectedMonth, setSelectedMonth] = useState(monthStr);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING" | "PENDING_MANAGER" | "APPROVED" | "REJECTED">("ALL");
  const [expandedUsers, setExpandedUsers] = useState<Record<string, boolean>>({});
  const [selectedRecordIds, setSelectedRecordIds] = useState<Record<string, boolean>>({});

  // Form states
  const [holidayDate, setHolidayDate] = useState("");
  const [holidayName, setHolidayName] = useState("");
  const [holidayType, setHolidayType] = useState("COMPANY");
  const [holidayBranch, setHolidayBranch] = useState("");

  const [lopUser, setLopUser] = useState("");
  const [lopDays, setLopDays] = useState("");
  const [lopRemarks, setLopRemarks] = useState("");

  // Slab manager local state
  const [slabs, setSlabs] = useState(otSettings.compOffSlabs || []);
  const [newSlabMinHours, setNewSlabMinHours] = useState("");
  const [newSlabDays, setNewSlabDays] = useState("");

  // Adjustment Modal states
  const [adjustingRecord, setAdjustingRecord] = useState<any | null>(null);
  const [adjustedMins, setAdjustedMins] = useState(0);
  const [adjustedEarlyMins, setAdjustedEarlyMins] = useState(0);
  const [adjustedCompOff, setAdjustedCompOff] = useState(0);

  // Legacy client features (normal request)
  const [legacyEntries, setLegacyEntries] = useState<LegacyOTEntry[]>(initialEntries);
  const [reqDate, setReqDate] = useState("");
  const [reqHours, setReqHours] = useState("");
  const [reqNotes, setReqNotes] = useState("");

  // CSV Import States
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<any[]>([]);
  const [csvFileName, setCsvFileName] = useState("");
  const [importMappings, setImportMappings] = useState<Record<string, string>>({
    employeeNumber: "",
    employeeName: "",
    officialEmail: "",
    attendanceDate: "",
    checkIn: "",
    checkOut: "",
    totalHours: ""
  });
  const [importSummary, setImportSummary] = useState<{
    imported: number;
    updated: number;
    skipped: number;
    errors: string[];
  } | null>(null);

  // Pure JavaScript CSV tokenizer
  const parseCsvText = (text: string): string[][] => {
    const lines: string[][] = [];
    let row: string[] = [];
    let inQuotes = false;
    let currentVal = '';

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          currentVal += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        row.push(currentVal.trim());
        currentVal = '';
      } else if ((char === '\r' || char === '\n') && !inQuotes) {
        row.push(currentVal.trim());
        if (row.some(val => val !== '')) {
          lines.push(row);
        }
        row = [];
        currentVal = '';
        if (char === '\r' && nextChar === '\n') {
          i++;
        }
      } else {
        currentVal += char;
      }
    }
    if (currentVal || row.length > 0) {
      row.push(currentVal.trim());
      if (row.some(val => val !== '')) {
        lines.push(row);
      }
    }
    return lines;
  };

  const overviewCards = [
    {
      label: "OT Hours Approved",
      badge: "Time",
      value: stats.totalOtHours.toFixed(1),
      unit: "hrs",
      helper: "Approved overtime hours captured for the selected month.",
      icon: Clock,
      cardClassName: "border-sky-200/70",
      badgeClassName: "border-sky-200/80 bg-sky-500/10 text-sky-700",
      iconClassName: "border-sky-200/80 bg-sky-500/10 text-sky-600",
      glowClassName: "bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.18),transparent_60%)]",
      orbClassName: "bg-sky-400/20",
    },
    {
      label: "Total OT Payout",
      badge: "Finance",
      value: `₹${stats.totalOtAmount.toLocaleString("en-IN", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`,
      unit: "",
      helper: "Monthly approved overtime payout ready for payroll export.",
      icon: IndianRupee,
      cardClassName: "border-emerald-200/70",
      badgeClassName: "border-emerald-200/80 bg-emerald-500/10 text-emerald-700",
      iconClassName: "border-emerald-200/80 bg-emerald-500/10 text-emerald-600",
      glowClassName: "bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.18),transparent_60%)]",
      orbClassName: "bg-emerald-400/20",
    },
    {
      label: "Holiday Comp-Offs",
      badge: "Leave",
      value: stats.totalCompOffDays.toFixed(1),
      unit: "days",
      helper: "Comp-off days earned from weekly offs and holiday shifts.",
      icon: Calendar,
      cardClassName: "border-amber-200/80",
      badgeClassName: "border-amber-200/80 bg-amber-500/10 text-amber-700",
      iconClassName: "border-amber-200/80 bg-amber-500/10 text-amber-600",
      glowClassName: "bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.18),transparent_60%)]",
      orbClassName: "bg-amber-400/20",
    },
    {
      label: "Loss of Pay Logs",
      badge: "Risk",
      value: stats.totalLopDays.toFixed(1),
      unit: "days",
      helper: "LOP days currently logged into the monthly attendance cycle.",
      icon: AlertCircle,
      cardClassName: "border-rose-200/80",
      badgeClassName: "border-rose-200/80 bg-rose-500/10 text-rose-700",
      iconClassName: "border-rose-200/80 bg-rose-500/10 text-rose-600",
      glowClassName: "bg-[radial-gradient(circle_at_top_left,rgba(244,63,94,0.18),transparent_60%)]",
      orbClassName: "bg-rose-400/20",
    },
  ];

  const handleCsvFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFileName(file.name);
    setImportSummary(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;
      
      const parsedLines = parseCsvText(text);
      if (parsedLines.length === 0) {
        toast.error("CSV file is empty");
        return;
      }
      
      const headers = parsedLines[0]!;
      setCsvHeaders(headers);
      
      const dataLines = parsedLines.slice(1);
      const rows = dataLines.map((line) => {
        const obj: Record<string, string> = {};
        headers.forEach((h, index) => {
          obj[h] = line[index] || "";
        });
        return obj;
      });
      setCsvRows(rows);
      
      // Auto map matching header names
      const autoMap: Record<string, string> = {
        employeeNumber: "",
        employeeName: "",
        officialEmail: "",
        attendanceDate: "",
        checkIn: "",
        checkOut: "",
        totalHours: ""
      };
      
      headers.forEach((h) => {
        const clean = h.toLowerCase().replace(/[^a-z0-9]/g, "");
        if (clean.includes("empid") || clean.includes("employeeno") || clean.includes("employeenumber") || clean.includes("id")) {
          autoMap.employeeNumber = h;
        } else if (clean.includes("name") || clean.includes("employeename")) {
          autoMap.employeeName = h;
        } else if (clean.includes("email")) {
          autoMap.officialEmail = h;
        } else if (clean.includes("date") || clean.includes("attendance")) {
          autoMap.attendanceDate = h;
        } else if (clean.includes("checkin") || clean.includes("in") || clean.includes("timein") || clean.includes("start")) {
          autoMap.checkIn = h;
        } else if (clean.includes("checkout") || clean.includes("out") || clean.includes("timeout") || clean.includes("end")) {
          autoMap.checkOut = h;
        } else if (clean.includes("hours") || clean.includes("worked") || clean.includes("total")) {
          autoMap.totalHours = h;
        }
      });
      setImportMappings(autoMap);
      toast.success(`Loaded ${rows.length} rows from CSV`);
    };
    reader.readAsText(file);
  };

  // Reload data for selected month
  const handleMonthChange = (newMonth: string) => {
    setSelectedMonth(newMonth);
    router.push(`/attendance/ot?month=${newMonth}`);
  };

  // Re-run batch calculations
  const handleProcessMonth = () => {
    startTransition(async () => {
      const res = await processMonthOtAction(selectedMonth);
      if (!res.ok) {
        toast.error(res.error || "Failed to process month OT calculations");
        return;
      }
      toast.success(`Recalculated OT for ${res.data?.processed || 0} punches.`);
      window.location.reload();
    });
  };

  const handleClearMonthRecords = () => {
    if (!confirm(`Are you sure you want to delete all calculated OT records AND imported CSV punches for ${selectedMonth}? This action is irreversible.`)) {
      return;
    }

    startTransition(async () => {
      const res = await clearMonthOtRecordsAction(selectedMonth);
      if (!res.ok) {
        toast.error(res.error || "Failed to clear month records");
        return;
      }
      toast.success(`Successfully cleared: ${res.data?.deletedOtCount || 0} OT records and ${res.data?.deletedPunchesCount || 0} imported punches.`);
      window.location.reload();
    });
  };

  // Approval decisions
  const handleDecideRecord = (recordId: string, decision: "APPROVED" | "PENDING_MANAGER" | "REJECTED", remarks?: string) => {
    startTransition(async () => {
      const res = await decideOtRecordAction(recordId, decision, remarks);
      if (!res.ok) {
        toast.error(res.error || "Failed to submit decision");
        return;
      }
      toast.success(`Record updated successfully`);
      
      // Update local state
      setOtRecords((prev) =>
        prev.map((r) => (r.id === recordId ? { ...r, approvalStatus: decision, rejectionRemarks: remarks || null } : r))
      );
      // Update stats
      updateStatsLocal();
    });
  };

  // Bulk decisions
  const handleBulkDecide = (decision: "APPROVED" | "PENDING_MANAGER" | "REJECTED") => {
    const ids = Object.keys(selectedRecordIds).filter((id) => selectedRecordIds[id]);
    if (ids.length === 0) return;

    startTransition(async () => {
      const res = await bulkDecideOtRecordsAction(ids, decision);
      if (!res.ok) {
        toast.error(res.error || "Failed to execute bulk action");
        return;
      }
      toast.success(`Bulk processed ${ids.length} records to ${decision.replace("_", " ").toLowerCase()}`);
      
      setOtRecords((prev) =>
        prev.map((r) => (ids.includes(r.id) ? { ...r, approvalStatus: decision } : r))
      );
      setSelectedRecordIds({});
      updateStatsLocal();
    });
  };

  // Save manual adjustments
  const handleSaveAdjustments = () => {
    if (!adjustingRecord) return;
    startTransition(async () => {
      const res = await adjustOtRecordAction(
        adjustingRecord.id,
        adjustedMins,
        adjustedEarlyMins,
        adjustedCompOff
      );
      if (!res.ok) {
        toast.error(res.error || "Failed to save adjustments");
        return;
      }
      toast.success("Manual adjustments applied and approved");
      
      // Refresh local record values
      setOtRecords((prev) =>
        prev.map((r) =>
          r.id === adjustingRecord.id
            ? {
                ...r,
                otHours: Number((adjustedMins / 60).toFixed(2)),
                otAmount: Number(((adjustedMins / 60) * (r.otRatePerHour || 150)).toFixed(2)),
                earlyLeavingMins: adjustedEarlyMins,
                compOffDays: adjustedCompOff,
                approvalStatus: "APPROVED",
              }
            : r
        )
      );
      setAdjustingRecord(null);
      updateStatsLocal();
    });
  };

  // Helper to recompute local stats after mutations
  const updateStatsLocal = () => {
    // Normally next.js server revalidates and re-renders, but local updates make UI instant
    router.refresh();
  };

  // Save Holiday
  const handleSaveHoliday = (e: FormEvent) => {
    e.preventDefault();
    if (!holidayDate || !holidayName) {
      toast.error("Date and name are required");
      return;
    }

    startTransition(async () => {
      const res = await saveHolidayAction({
        date: holidayDate,
        name: holidayName,
        holidayType,
        branchId: holidayBranch || null,
      });

      if (!res.ok) {
        toast.error(res.error || "Failed to save holiday");
        return;
      }
      toast.success("Holiday added successfully");
      setHolidayDate("");
      setHolidayName("");
      setHolidayBranch("");
      
      // Local addition helper or simple refresh
      router.refresh();
      window.location.reload();
    });
  };

  // Delete Holiday
  const handleDeleteHoliday = (id: string) => {
    if (!confirm("Are you sure you want to delete this holiday?")) return;
    startTransition(async () => {
      const res = await deleteHolidayAction(id);
      if (!res.ok) {
        toast.error(res.error || "Failed to delete holiday");
        return;
      }
      toast.success("Holiday removed");
      router.refresh();
      window.location.reload();
    });
  };

  // Save Loss of Pay
  const handleSaveLop = (e: FormEvent) => {
    e.preventDefault();
    if (!lopUser || !lopDays) {
      toast.error("Employee and LOP Days are required");
      return;
    }
    const days = parseFloat(lopDays);
    if (isNaN(days) || days < 0) {
      toast.error("Invalid days count");
      return;
    }

    startTransition(async () => {
      const res = await saveLopRecordAction({
        userId: lopUser,
        monthStr: selectedMonth,
        lopDays: days,
        remarks: lopRemarks,
      });

      if (!res.ok) {
        toast.error(res.error || "Failed to log Loss of Pay");
        return;
      }
      toast.success("LOP logged successfully");
      setLopUser("");
      setLopDays("");
      setLopRemarks("");
      router.refresh();
      window.location.reload();
    });
  };

  // Delete LOP Record
  const handleDeleteLop = (id: string) => {
    if (!confirm("Are you sure you want to remove this LOP record?")) return;
    startTransition(async () => {
      const res = await deleteLopRecordAction(id);
      if (!res.ok) {
        toast.error(res.error || "Failed to delete LOP record");
        return;
      }
      toast.success("LOP record deleted");
      router.refresh();
      window.location.reload();
    });
  };

  // Save Settings
  const handleSaveSettings = (e: FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await saveOtSettingsAction({
        standardHours: otSettings.standardHours,
        otRate: otSettings.otRate,
        graceMinutes: otSettings.graceMinutes,
        compOffSlabs: slabs,
      });
      if (!res.ok) {
        toast.error(res.error || "Failed to save settings");
        return;
      }
      toast.success("OT calculation parameters updated successfully");
      router.refresh();
    });
  };

  // Add slab helper
  const handleAddSlab = () => {
    const minHours = parseFloat(newSlabMinHours);
    const compOffDays = parseFloat(newSlabDays);
    if (isNaN(minHours) || isNaN(compOffDays)) {
      toast.error("Please fill in numeric values");
      return;
    }
    const updated = [...slabs, { minHours, compOffDays }].sort((a, b) => a.minHours - b.minHours);
    setSlabs(updated);
    setNewSlabMinHours("");
    setNewSlabDays("");
  };

  // Remove slab helper
  const handleRemoveSlab = (index: number) => {
    const updated = slabs.filter((_, i) => i !== index);
    setSlabs(updated);
  };

  // Dynamic Payroll Row Compilation
  const payrollRows = adminData
    ? adminData.employees.map((emp) => {
        const empOt = otRecords.filter((r) => r.userId === emp.id && r.approvalStatus === "APPROVED");
        const totalOtHours = empOt.reduce((sum, r) => sum + r.otHours, 0);
        const totalOtAmount = empOt.reduce((sum, r) => sum + r.otAmount, 0);
        const totalCompOffDays = empOt.reduce((sum, r) => sum + r.compOffDays, 0);

        const empLops = lopRecords.filter((r) => r.userId === emp.id);
        const totalLopDays = empLops.reduce((sum, r) => sum + r.lopDays, 0);

        return {
          id: emp.id,
          employeeName: emp.name,
          employeeNumber: emp.employeeNumber,
          department: emp.department?.name ?? null,
          totalOtHours,
          totalOtAmount,
          totalCompOffDays,
          lopDays: totalLopDays,
        };
      }).filter((r) => r.totalOtHours > 0 || r.totalCompOffDays > 0 || r.lopDays > 0)
    : [];

  const handleExportCsv = () => {
    const headers = ["Employee ID", "Employee Name", "Department", "Approved OT Hours", "Approved OT Amount (INR)", "Approved Comp-Off Days", "LOP Days"];
    const rows = payrollRows.map((r) => [
      r.employeeNumber || "N/A",
      r.employeeName,
      r.department || "N/A",
      r.totalOtHours.toFixed(2),
      r.totalOtAmount.toFixed(2),
      r.totalCompOffDays.toFixed(1),
      r.lopDays.toFixed(1)
    ]);
    
    const csvContent = [headers, ...rows]
      .map((row) => row.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(","))
      .join("\n");
      
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Adarsh_Payroll_OT_Summary_${selectedMonth}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Group daily OT records by employee for display in the cockpit records tab
  const filteredRecords = otRecords.filter((rec) => {
    const matchesSearch = rec.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(rec.user.employeeNumber || "").includes(searchTerm);
    const matchesStatus = statusFilter === "ALL" || rec.approvalStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const selectableRecords = filteredRecords.filter(
    (r) => r.approvalStatus === "PENDING" || r.approvalStatus === "PENDING_MANAGER"
  );
  const allSelectableChecked = selectableRecords.length > 0 && selectableRecords.every((r) => !!selectedRecordIds[r.id]);

  const groupedRecords = filteredRecords.reduce((acc, record) => {
    const userId = record.userId;
    if (!acc[userId]) {
      acc[userId] = {
        user: record.user,
        records: [],
        totalOtHours: 0,
        totalOtAmount: 0,
        totalCompOffDays: 0,
        totalEarlyLeavingMins: 0,
        pendingCount: 0,
      };
    }
    acc[userId].records.push(record);
    acc[userId].totalOtHours += record.otHours;
    acc[userId].totalOtAmount += record.otAmount;
    acc[userId].totalCompOffDays += record.compOffDays;
    acc[userId].totalEarlyLeavingMins += record.earlyLeavingMins;
    if (record.approvalStatus === "PENDING" || record.approvalStatus === "PENDING_MANAGER") {
      acc[userId].pendingCount++;
    }
    return acc;
  }, {} as Record<string, {
    user: any;
    records: any[];
    totalOtHours: number;
    totalOtAmount: number;
    totalCompOffDays: number;
    totalEarlyLeavingMins: number;
    pendingCount: number;
  }>);

  const toggleUserExpand = (userId: string) => {
    setExpandedUsers((prev) => ({ ...prev, [userId]: !prev[userId] }));
  };

  const handleSelectRecord = (id: string, val: boolean) => {
    setSelectedRecordIds((prev) => ({ ...prev, [id]: val }));
  };

  const hasPendingSelections = Object.values(selectedRecordIds).some((v) => v);

  // If user is normal employee (no admin privileges), display legacy requested items interface
  if (!canApprove) {
    return (
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-0 shadow-sm bg-surface">
            <CardHeader className="pb-3 border-b border-outline-variant/60">
              <CardTitle className="text-base font-bold text-on-surface dark:text-slate-200">
                My Overtime Requests
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {legacyEntries.length === 0 ? (
                <div className="text-center text-on-surface-variant/60/80 py-16 text-sm font-medium">
                  No overtime entries requested yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-outline-variant bg-surface-container-low/40 dark:bg-surface-container-lowest/50 text-left">
                        <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-on-surface-variant/60">Date</th>
                        <th className="px-4 text-xs font-bold uppercase tracking-wider text-on-surface-variant/60">Requested Hours</th>
                        <th className="px-4 text-xs font-bold uppercase tracking-wider text-on-surface-variant/60">Status</th>
                        <th className="px-4 text-xs font-bold uppercase tracking-wider text-on-surface-variant/60">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/40">
                      {legacyEntries.map((entry) => (
                        <tr key={entry.id} className="hover:bg-surface-container-high/20 dark:hover:bg-slate-800/10 transition">
                          <td className="py-3.5 px-4 font-semibold text-on-surface dark:text-on-surface-variant/40">
                            {new Date(entry.date).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </td>
                          <td className="px-4 text-on-surface-variant dark:text-on-surface-variant/60 font-bold">
                            {entry.hours} hrs
                          </td>
                          <td className="px-4">
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold border capitalize ${
                                entry.status === "approved"
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200"
                                  : entry.status === "rejected"
                                  ? "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200"
                                  : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200"
                              }`}
                            >
                              {entry.status}
                            </span>
                          </td>
                          <td className="px-4 text-xs text-on-surface-variant/60 font-semibold max-w-[200px] truncate">
                            {entry.notes || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="border-0 shadow-sm border-l-4 border-l-[#00cec4] bg-surface">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold text-on-surface dark:text-slate-200">
                Submit OT Request
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={async (e) => {
                e.preventDefault();
                if (!reqDate || !reqHours) return;
                startTransition(async () => {
                  const formData = new FormData();
                  formData.append("date", reqDate);
                  formData.append("hours", reqHours);
                  formData.append("notes", reqNotes);
                  const { requestOtAction } = await import("./actions");
                  const res = await requestOtAction(formData);
                  if (!res.ok) {
                    toast.error(res.error);
                    return;
                  }
                  toast.success("OT request sent to manager");
                  setReqDate("");
                  setReqHours("");
                  setReqNotes("");
                  window.location.reload();
                });
              }} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant/60">Date</label>
                  <input
                    type="date"
                    required
                    value={reqDate}
                    onChange={(e) => setReqDate(e.target.value)}
                    className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant/60">Hours</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="16"
                    required
                    value={reqHours}
                    onChange={(e) => setReqHours(e.target.value)}
                    placeholder="e.g. 2.0"
                    className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant/60">Work Description</label>
                  <textarea
                    value={reqNotes}
                    onChange={(e) => setReqNotes(e.target.value)}
                    placeholder="Provide details about what you worked on..."
                    rows={4}
                    className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm resize-none"
                  />
                </div>
                <Button type="submit" disabled={isPending} className="w-full">
                  {isPending ? "Submitting..." : "Submit Overtime Request"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Dynamic Navigation Tabs & Month Selector */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-outline-variant/60 pb-2">
        <div className="flex flex-wrap gap-1">
          {(["overview", "records", "holidays", "lop", "payroll", "settings", "import"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-xl px-4 py-2 text-sm font-medium capitalize transition ${
                activeTab === tab
                  ? "bg-[#00cec4]/14 text-[#008b85] shadow-[inset_0_0_0_1px_rgba(0,206,196,0.16)]"
                  : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
              }`}
            >
              {tab === "lop" ? "Loss of Pay (LOP)" : tab === "records" ? "OT Records" : tab === "import" ? "Import Punches" : tab}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <label className="shrink-0 text-xs font-semibold uppercase tracking-[0.14em] text-on-surface-variant">Month</label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => handleMonthChange(e.target.value)}
            className="rounded-xl border border-outline-variant bg-surface px-3 py-1.5 text-sm font-medium text-on-surface focus:outline-none focus:border-[#00cec4]"
          />
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* Dashboard Metrics Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {overviewCards.map((item) => {
              const Icon = item.icon;

              return (
                <Card
                  key={item.label}
                  className={cn(
                    "group relative overflow-hidden rounded-[26px] border bg-surface p-0 shadow-[0_18px_38px_-28px_rgba(15,23,42,0.3)] transition duration-300 hover:-translate-y-1.5 hover:shadow-[0_24px_50px_-28px_rgba(0,206,196,0.32)]",
                    item.cardClassName
                  )}
                >
                  <div className={cn("absolute inset-0", item.glowClassName)} />
                  <div className={cn("absolute -right-10 -top-10 h-28 w-28 rounded-full blur-2xl transition duration-300 group-hover:scale-110", item.orbClassName)} />

                  <CardContent className="relative flex min-h-[190px] flex-col justify-between p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-3">
                        <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]", item.badgeClassName)}>
                          {item.badge}
                        </span>
                        <p className="max-w-[18ch] text-xs font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
                          {item.label}
                        </p>
                      </div>

                      <span className={cn("inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] border transition duration-300 group-hover:scale-105", item.iconClassName)}>
                        <Icon className="size-7" />
                      </span>
                    </div>

                    <div>
                      <div className="flex flex-wrap items-end gap-2">
                        <h3 className="ds-numeric text-[2.35rem] font-semibold leading-none tracking-[-0.05em] text-on-surface">
                          {item.value}
                        </h3>
                        {item.unit ? (
                          <span className="pb-1 text-sm font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
                            {item.unit}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-3 max-w-[28ch] text-sm leading-5 text-on-surface-variant">
                        {item.helper}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Quick trigger panel */}
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="card-top-accent rounded-[28px] border border-outline-variant/40 bg-surface shadow-sm lg:col-span-2">
              <CardHeader className="border-b border-outline-variant/30 pb-3">
                <CardTitle className="ds-h3 text-primary">
                  Recalculate Batch Engine
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm leading-6 text-on-surface-variant">
                  Punches imported from biometric devices are processed automatically in real-time. If you change global parameters (shift timings, grace bounds, or comp-off brackets), you can recompute the entire month&apos;s variables for active employees here.
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    onClick={handleProcessMonth}
                    disabled={isPending}
                    className="flex items-center gap-2 bg-[#00cec4] hover:bg-[#00b2a9] text-white"
                  >
                    <RefreshCw className={`size-4 ${isPending ? "animate-spin" : ""}`} />
                    {isPending ? "Calculating..." : "Recompute Month OT Records"}
                  </Button>
                  <Button
                    onClick={handleClearMonthRecords}
                    disabled={isPending}
                    variant="outline"
                    className="flex items-center gap-2 !border-rose-200 !bg-transparent !text-rose-600 hover:!bg-rose-50 hover:!text-rose-700"
                  >
                    <Trash className="size-4" />
                    Clear Month OT & Punches
                  </Button>
                  {stats.pendingCount > 0 && (
                    <span className="flex items-center gap-1 text-xs font-semibold text-amber-700">
                      <AlertCircle className="size-3.5" />
                      {stats.pendingCount} records require manager decision.
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="card-top-accent rounded-[28px] border border-outline-variant/40 bg-surface shadow-sm">
              <CardHeader className="border-b border-outline-variant/30 pb-3">
                <CardTitle className="ds-h3 text-primary">
                  Payroll Export Status
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col justify-end gap-4">
                <div>
                  <h4 className="ds-numeric text-[2rem] font-semibold leading-none text-on-surface">{payrollRows.length} Employees</h4>
                  <p className="mt-1.5 text-sm text-on-surface-variant">Consolidated summaries ready for accounting</p>
                </div>
                <Button
                  onClick={() => setActiveTab("payroll")}
                  variant="outline"
                  className="flex w-full items-center justify-center gap-2 !bg-transparent !text-on-surface hover:!bg-surface-container-low"
                >
                  Go to Export Sheets
                  <ArrowRight className="size-4" />
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Core Calculation Engine Visual Flow Diagram */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-on-surface-variant">Core Calculation Engine Flow</h3>
            <div className="grid gap-4 md:grid-cols-4">
              {[
                {
                  step: "01",
                  title: "Punch Sync",
                  desc: "Devices pull & upload biometric punches to database, computing raw workingHours.",
                },
                {
                  step: "02",
                  title: "Day Type Check",
                  desc: "Resolves date against calendar rules (only 1st and 3rd Saturdays are working off-days).",
                },
                {
                  step: "03",
                  title: "Grace Evaluation",
                  desc: "Computes early departures or OT starts strictly after standardHours + graceMinutes.",
                },
                {
                  step: "04",
                  title: "CTC Rate Calculation",
                  desc: "Calculates hourly rate dynamically from annual CTC or falls back to standard base.",
                },
              ].map((flow, i) => (
                <div key={i} className="card-top-accent relative flex flex-col justify-between space-y-3 rounded-[24px] border border-outline-variant/30 bg-surface p-5 shadow-[0_14px_28px_-24px_rgba(15,23,42,0.18)]">
                  <div className="space-y-1">
                    <span className="inline-flex rounded-full bg-[#00cec4]/10 px-2 py-0.5 text-[11px] font-semibold tracking-[0.14em] text-[#008b85]">{flow.step}</span>
                    <h4 className="ds-h3 pt-1 text-primary">{flow.title}</h4>
                    <p className="text-sm leading-6 text-on-surface-variant">{flow.desc}</p>
                  </div>
                  {i < 3 && (
                    <div className="absolute -right-3 top-1/2 z-10 hidden -translate-y-1/2 text-outline-variant md:block">
                      <ArrowRight className="size-5" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* OT Records Tab */}
      {activeTab === "records" && (
        <div className="space-y-4 animate-in fade-in duration-300">
          {/* Controls Bar */}
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-on-surface-variant" />
              <input
                type="text"
                placeholder="Search employee name or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-lg border border-outline-variant bg-surface pl-9 pr-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-[#00cec4]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <SlidersHorizontal className="mr-1 size-4 text-on-surface-variant" />
              {(["ALL", "PENDING", "PENDING_MANAGER", "APPROVED", "REJECTED"] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setStatusFilter(filter)}
                  className={`rounded-full px-3 py-1 text-xs font-bold transition border ${
                    statusFilter === filter
                      ? "border-[#00cec4]/30 bg-[#00cec4]/12 text-[#008b84]"
                      : "bg-surface text-on-surface-variant border-outline-variant hover:border-[#00cec4]/30 hover:text-on-surface"
                  }`}
                >
                  {filter === "PENDING" ? "PENDING (ADMIN)" : filter === "PENDING_MANAGER" ? "PENDING (MANAGER)" : filter}
                </button>
              ))}
              {selectableRecords.length > 0 && (
                <button
                  onClick={() => {
                    const allSelected = selectableRecords.every((r) => !!selectedRecordIds[r.id]);
                    setSelectedRecordIds((prev) => {
                      const copy = { ...prev };
                      selectableRecords.forEach((r) => {
                        copy[r.id] = !allSelected;
                      });
                      return copy;
                    });
                  }}
                  className="rounded-full px-3 py-1 text-xs font-bold transition border bg-[#00cec4]/10 text-[#00cec4] border-[#00cec4]/20 hover:bg-[#00cec4]/20"
                >
                  {allSelectableChecked ? "Deselect All Visible" : "Select All Visible"}
                </button>
              )}
            </div>
          </div>

          {/* Bulk Action Banner */}
          {hasPendingSelections && (
            <div className="flex items-center justify-between gap-4 rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 animate-in slide-in-from-top-2">
              <span className="flex items-center gap-2 text-xs font-semibold text-amber-700">
                <CheckSquare className="size-4" />
                Selected {Object.values(selectedRecordIds).filter(Boolean).length} records for bulk decision
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => handleBulkDecide("APPROVED")}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs px-3 h-8 flex items-center gap-1.5 animate-pulse"
                >
                  <Check className="size-3.5" /> Force Approve Selected
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleBulkDecide("PENDING_MANAGER")}
                  className="bg-blue-500 hover:bg-blue-600 text-white text-xs px-3 h-8 flex items-center gap-1.5"
                >
                  <User className="size-3.5" /> Send to Manager Selected
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleBulkDecide("REJECTED")}
                  variant="outline"
                  className="border-rose-200 text-rose-600 hover:text-rose-700 hover:bg-rose-50/20 text-xs px-3 h-8 flex items-center gap-1.5"
                >
                  <X className="size-3.5" /> Reject Selected
                </Button>
              </div>
            </div>
          )}

          <DataTable className="overflow-hidden border-outline-variant/60 shadow-sm">
            <DataTableHeader>
              <DataTableRow className="hover:bg-transparent">
                <DataTableHead className="w-12">
                  <input
                    type="checkbox"
                    checked={allSelectableChecked}
                    onChange={() => {
                      const allSelected = selectableRecords.every((r) => !!selectedRecordIds[r.id]);
                      setSelectedRecordIds((prev) => {
                        const copy = { ...prev };
                        selectableRecords.forEach((r) => {
                          copy[r.id] = !allSelected;
                        });
                        return copy;
                      });
                    }}
                    className="h-4 w-4 rounded border-outline-variant text-[#00cec4] focus:ring-[#00cec4]"
                    aria-label="Select all visible records"
                  />
                </DataTableHead>
                <DataTableHead>Employee</DataTableHead>
                <DataTableHead>Department</DataTableHead>
                <DataTableHead className="text-right">OT Hours</DataTableHead>
                <DataTableHead className="text-right">Payout</DataTableHead>
                <DataTableHead className="text-right">Comp-Offs</DataTableHead>
                <DataTableHead className="text-right">Pending</DataTableHead>
                <DataTableHead className="w-14 text-right">View</DataTableHead>
              </DataTableRow>
            </DataTableHeader>
            <DataTableBody>
              {Object.keys(groupedRecords).length === 0 ? (
                <DataTableEmpty colSpan={8} message="No matching overtime records found." className="py-16 text-sm font-medium" />
              ) : (
                Object.keys(groupedRecords).map((userId) => {
                  const group = groupedRecords[userId]!;
                  const isExpanded = !!expandedUsers[userId];
                  const pendingRecords = group.records.filter(
                    (r) => r.approvalStatus === "PENDING" || r.approvalStatus === "PENDING_MANAGER"
                  );
                  const allGroupPendingSelected =
                    pendingRecords.length > 0 && pendingRecords.every((r) => !!selectedRecordIds[r.id]);

                  return (
                    <Fragment key={userId}>
                      <DataTableRow
                        className="cursor-pointer border-l-2 border-l-transparent hover:border-l-[#00cec4]/60"
                        onClick={() => toggleUserExpand(userId)}
                      >
                        <DataTableCell className="w-12">
                          {pendingRecords.length > 0 ? (
                            <input
                              type="checkbox"
                              checked={allGroupPendingSelected}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setSelectedRecordIds((prev) => {
                                  const copy = { ...prev };
                                  pendingRecords.forEach((record) => {
                                    copy[record.id] = checked;
                                  });
                                  return copy;
                                });
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="h-4 w-4 rounded border-outline-variant text-[#00cec4] focus:ring-[#00cec4]"
                              aria-label={`Select pending records for ${group.user.name}`}
                            />
                          ) : (
                            <div className="w-4" />
                          )}
                        </DataTableCell>
                        <DataTableCell>
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#00cec4]/12 text-xs font-semibold text-[#008b84]">
                              {getInitials(group.user.name)}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="truncate font-semibold text-on-surface">{group.user.name}</p>
                                {group.user.employeeNumber ? (
                                  <span className="rounded-full bg-surface-container-low px-2 py-0.5 text-[11px] font-medium text-on-surface-variant">
                                    #{group.user.employeeNumber}
                                  </span>
                                ) : null}
                              </div>
                              <p className="truncate text-xs text-on-surface-variant">
                                {group.records.length} record{group.records.length === 1 ? "" : "s"} this month
                              </p>
                            </div>
                          </div>
                        </DataTableCell>
                        <DataTableCell className="text-on-surface-variant">
                          {group.user.department?.name || "No Department"}
                        </DataTableCell>
                        <DataTableCell className="text-right font-semibold text-on-surface">
                          {group.totalOtHours.toFixed(1)} hrs
                        </DataTableCell>
                        <DataTableCell className="text-right font-semibold text-emerald-600">
                          ₹{group.totalOtAmount.toFixed(0)}
                        </DataTableCell>
                        <DataTableCell className="text-right font-semibold text-[#00a89f]">
                          {group.totalCompOffDays.toFixed(1)} d
                        </DataTableCell>
                        <DataTableCell className="text-right">
                          {group.pendingCount > 0 ? (
                            <span className="inline-flex rounded-full border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                              {group.pendingCount} pending
                            </span>
                          ) : (
                            <span className="text-xs text-on-surface-variant">0</span>
                          )}
                        </DataTableCell>
                        <DataTableCell className="text-right">
                          {isExpanded ? (
                            <ChevronDown className="ml-auto size-4 text-on-surface-variant" />
                          ) : (
                            <ChevronRight className="ml-auto size-4 text-on-surface-variant" />
                          )}
                        </DataTableCell>
                      </DataTableRow>

                      {isExpanded ? (
                        <DataTableRow className="hover:bg-transparent">
                          <DataTableCell colSpan={8} className="bg-surface-container-low/40 px-4 py-4">
                            <DataTable className="rounded-xl border-outline-variant/40 bg-surface shadow-none" tableClassName="text-xs">
                              <DataTableHeader className="bg-surface-container-low/70">
                                <DataTableRow className="hover:bg-transparent">
                                  <DataTableHead className="w-12">
                                    <input
                                      type="checkbox"
                                      checked={allGroupPendingSelected}
                                      onChange={(e) => {
                                        const checked = e.target.checked;
                                        setSelectedRecordIds((prev) => {
                                          const copy = { ...prev };
                                          pendingRecords.forEach((record) => {
                                            copy[record.id] = checked;
                                          });
                                          return copy;
                                        });
                                      }}
                                      className="h-4 w-4 rounded border-outline-variant text-[#00cec4] focus:ring-[#00cec4]"
                                      aria-label={`Select detailed records for ${group.user.name}`}
                                    />
                                  </DataTableHead>
                                  <DataTableHead>Date</DataTableHead>
                                  <DataTableHead>Type</DataTableHead>
                                  <DataTableHead>Worked</DataTableHead>
                                  <DataTableHead className="text-right">OT Hours</DataTableHead>
                                  <DataTableHead className="text-right">OT Payout</DataTableHead>
                                  <DataTableHead className="text-right">Comp-Off</DataTableHead>
                                  <DataTableHead className="text-right">Early Leaving</DataTableHead>
                                  <DataTableHead>Status</DataTableHead>
                                  <DataTableHead className="text-right">Actions</DataTableHead>
                                </DataTableRow>
                              </DataTableHeader>
                              <DataTableBody>
                                {group.records.map((rec) => (
                                  <DataTableRow key={rec.id}>
                                    <DataTableCell className="w-12">
                                      {rec.approvalStatus === "PENDING" || rec.approvalStatus === "PENDING_MANAGER" ? (
                                        <input
                                          type="checkbox"
                                          checked={!!selectedRecordIds[rec.id]}
                                          onChange={(e) => handleSelectRecord(rec.id, e.target.checked)}
                                          className="h-4 w-4 rounded border-outline-variant text-[#00cec4] focus:ring-[#00cec4]"
                                          aria-label={`Select record for ${formatOtDate(rec.date)}`}
                                        />
                                      ) : (
                                        <div className="w-4" />
                                      )}
                                    </DataTableCell>
                                    <DataTableCell className="font-medium text-on-surface">
                                      {formatOtDate(rec.date)}
                                    </DataTableCell>
                                    <DataTableCell>
                                      <span className={cn(
                                        "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]",
                                        rec.dayType === "WORKING_DAY"
                                          ? "border-outline-variant bg-surface-container-low text-on-surface-variant"
                                          : rec.dayType === "HOLIDAY"
                                          ? "border-rose-500/20 bg-rose-500/10 text-rose-700"
                                          : "border-sky-500/20 bg-sky-500/10 text-sky-700"
                                      )}>
                                        {rec.dayType.replace("_", " ")}
                                      </span>
                                    </DataTableCell>
                                    <DataTableCell className="text-on-surface-variant">
                                      {rec.hoursWorked.toFixed(1)} hrs
                                    </DataTableCell>
                                    <DataTableCell className="text-right font-semibold text-on-surface">
                                      {rec.otHours.toFixed(2)} hrs
                                    </DataTableCell>
                                    <DataTableCell className="text-right font-semibold text-emerald-600">
                                      ₹{rec.otAmount.toFixed(0)}
                                    </DataTableCell>
                                    <DataTableCell className="text-right font-semibold text-[#00a89f]">
                                      {rec.compOffDays.toFixed(1)} d
                                    </DataTableCell>
                                    <DataTableCell className="text-right font-medium text-amber-700">
                                      {rec.earlyLeavingMins > 0 ? `${rec.earlyLeavingMins} mins` : "—"}
                                    </DataTableCell>
                                    <DataTableCell>
                                      <span className={cn(
                                        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize",
                                        rec.approvalStatus === "APPROVED"
                                          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700"
                                          : rec.approvalStatus === "REJECTED"
                                          ? "border-rose-500/20 bg-rose-500/10 text-rose-700"
                                          : rec.approvalStatus === "PENDING_MANAGER"
                                          ? "border-sky-500/20 bg-sky-500/10 text-sky-700"
                                          : "border-amber-500/20 bg-amber-500/10 text-amber-700"
                                      )}>
                                        {rec.approvalStatus === "PENDING_MANAGER" ? "referred to manager" : rec.approvalStatus.toLowerCase()}
                                      </span>
                                      {rec.rejectionRemarks ? (
                                        <p className="mt-1 text-[11px] italic text-on-surface-variant">{rec.rejectionRemarks}</p>
                                      ) : null}
                                    </DataTableCell>
                                    <DataTableCell className="text-right">
                                      <div className="inline-flex gap-1.5">
                                        <Button
                                          size="sm"
                                          title="Adjust Values"
                                          onClick={() => {
                                            setAdjustingRecord(rec);
                                          setAdjustedMins(Math.round(rec.otHours * 60));
                                          setAdjustedEarlyMins(rec.earlyLeavingMins);
                                          setAdjustedCompOff(rec.compOffDays);
                                        }}
                                        className="h-7 w-7 p-0 bg-transparent border border-outline-variant hover:bg-surface-container-high dark:hover:bg-slate-800 text-on-surface-variant flex items-center justify-center rounded"
                                      >
                                        <Sliders className="size-3.5" />
                                      </Button>
 
                                          {(rec.approvalStatus === "PENDING" || rec.approvalStatus === "PENDING_MANAGER") && (
                                            <>
                                              <Button
                                                size="sm"
                                                title="Force Approve"
                                            onClick={() => handleDecideRecord(rec.id, "APPROVED")}
                                            className="h-7 w-7 p-0 bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center rounded"
                                          >
                                            <Check className="size-3.5" />
                                          </Button>
                                          <Button
                                            size="sm"
                                            title="Send to Manager"
                                            onClick={() => handleDecideRecord(rec.id, "PENDING_MANAGER")}
                                            className="h-7 w-7 p-0 bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center rounded"
                                          >
                                            <User className="size-3.5" />
                                          </Button>
                                          <Button
                                            size="sm"
                                            title="Reject"
                                            onClick={() => {
                                              const remarks = prompt("Reason for rejection:");
                                              if (remarks !== null) handleDecideRecord(rec.id, "REJECTED", remarks);
                                            }}
                                            className="h-7 w-7 p-0 bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center rounded"
                                          >
                                            <X className="size-3.5" />
                                              </Button>
                                            </>
                                          )}
                                      </div>
                                    </DataTableCell>
                                  </DataTableRow>
                                ))}
                              </DataTableBody>
                            </DataTable>
                          </DataTableCell>
                        </DataTableRow>
                      ) : null}
                    </Fragment>
                  );
                })
              )}
            </DataTableBody>
          </DataTable>
        </div>
      )}

      {/* Holidays Tab */}
      {activeTab === "holidays" && (
        <div className="grid gap-6 lg:grid-cols-3 animate-in fade-in duration-300">
          <div className="lg:col-span-2 space-y-4">
            <Card className="border-0 shadow-sm bg-surface">
              <CardHeader className="pb-3 border-b border-outline-variant/60">
                <CardTitle className="text-base font-bold text-on-surface dark:text-slate-200">
                  Holidays Calendar ({new Date().getFullYear()})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {holidays.length === 0 ? (
                  <div className="text-center text-on-surface-variant/60 py-16 text-sm font-semibold">
                    No holidays configured for this year.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-outline-variant bg-surface-container-high/20 dark:bg-slate-800/10 text-left text-xs text-on-surface-variant/60 font-bold uppercase">
                          <th className="p-3.5">Date</th>
                          <th className="p-3.5">Name</th>
                          <th className="p-3.5">Type</th>
                          <th className="p-3.5">Applicability</th>
                          <th className="p-3.5 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/40">
                        {holidays.map((h) => (
                          <tr key={h.id} className="hover:bg-surface-container-high/30 dark:hover:bg-slate-800/10 transition">
                            <td className="p-3.5 font-bold text-on-surface dark:text-slate-200">
                              {new Date(h.date).toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                                weekday: "short",
                              })}
                            </td>
                            <td className="p-3.5 font-medium text-on-surface dark:text-on-surface-variant/40">{h.name}</td>
                            <td className="p-3.5">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border capitalize ${
                                h.holidayType === "NATIONAL"
                                  ? "bg-red-100 text-red-700 border-red-200"
                                  : h.holidayType === "RESTRICTED"
                                  ? "bg-amber-100 text-amber-700 border-amber-200"
                                  : "bg-surface-container-high text-on-surface border-outline-variant"
                              }`}>
                                {h.holidayType.toLowerCase()}
                              </span>
                            </td>
                            <td className="p-3.5 text-on-surface-variant font-semibold">{h.branch?.name || "All Branches"}</td>
                            <td className="p-3.5 text-right">
                              <Button
                                size="sm"
                                onClick={() => handleDeleteHoliday(h.id)}
                                className="h-7 w-7 p-0 bg-transparent border border-rose-200 hover:bg-rose-500/10 text-rose-500 flex items-center justify-center rounded"
                              >
                                <Trash className="size-3.5" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div>
            <Card className="border-0 shadow-sm border-l-4 border-l-sky-500 bg-surface">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold text-on-surface dark:text-slate-200">Add Holiday</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveHoliday} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant/60">Date</label>
                    <input
                      type="date"
                      required
                      value={holidayDate}
                      onChange={(e) => setHolidayDate(e.target.value)}
                      className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant/60">Holiday Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Independence Day"
                      value={holidayName}
                      onChange={(e) => setHolidayName(e.target.value)}
                      className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant/60">Type</label>
                    <select
                      value={holidayType}
                      onChange={(e) => setHolidayType(e.target.value)}
                      className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm"
                    >
                      <option value="NATIONAL">National Holiday</option>
                      <option value="COMPANY">Company Holiday</option>
                      <option value="RESTRICTED">Restricted Holiday</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant/60">Branch Applicability</label>
                    <select
                      value={holidayBranch}
                      onChange={(e) => setHolidayBranch(e.target.value)}
                      className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm"
                    >
                      <option value="">All Branches</option>
                      {adminData?.branches.map((b) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                  <Button type="submit" disabled={isPending} className="w-full bg-sky-500 hover:bg-sky-600 text-white">
                    {isPending ? "Adding..." : "Add Holiday"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* LOP Logger Tab */}
      {activeTab === "lop" && (
        <div className="grid gap-6 lg:grid-cols-3 animate-in fade-in duration-300">
          <div className="lg:col-span-2 space-y-4">
            <Card className="border-0 shadow-sm bg-surface">
              <CardHeader className="pb-3 border-b border-outline-variant/60">
                <CardTitle className="text-base font-bold text-on-surface dark:text-slate-200">
                  Loss of Pay (LOP) Log Sheets
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {lopRecords.length === 0 ? (
                  <div className="text-center text-on-surface-variant/60 py-16 text-sm font-semibold">
                    No LOP records logged for this month.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-outline-variant bg-surface-container-high/20 dark:bg-slate-800/10 text-left text-xs text-on-surface-variant/60 font-bold uppercase">
                          <th className="p-3.5">Employee</th>
                          <th className="p-3.5 text-right">LOP Days</th>
                          <th className="p-3.5">Remarks</th>
                          <th className="p-3.5 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/40">
                        {lopRecords.map((r) => (
                          <tr key={r.id} className="hover:bg-surface-container-high/30 dark:hover:bg-slate-800/10 transition">
                            <td className="p-3.5">
                              <div className="flex items-center gap-2">
                                <span className="p-1 bg-surface-container-high dark:bg-slate-800 text-on-surface-variant rounded shrink-0">
                                  <User className="size-4" />
                                </span>
                                <div>
                                  <span className="font-bold text-on-surface dark:text-slate-200">{r.user.name}</span>
                                  {r.user.employeeNumber && <span className="text-[10px] text-on-surface-variant/60 font-bold ml-1">#{r.user.employeeNumber}</span>}
                                </div>
                              </div>
                            </td>
                            <td className="p-3.5 text-right font-black text-rose-600 dark:text-rose-400">{r.lopDays.toFixed(1)} days</td>
                            <td className="p-3.5 text-xs text-on-surface-variant font-semibold max-w-[200px] truncate">{r.remarks || "—"}</td>
                            <td className="p-3.5 text-right">
                              <Button
                                size="sm"
                                onClick={() => handleDeleteLop(r.id)}
                                className="h-7 w-7 p-0 bg-transparent border border-rose-200 hover:bg-rose-500/10 text-rose-500 inline-flex items-center justify-center rounded"
                              >
                                <Trash className="size-3.5" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div>
            <Card className="border-0 shadow-sm border-l-4 border-l-rose-500 bg-surface">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold text-on-surface dark:text-slate-200">Log LOP Days</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveLop} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant/60">Employee</label>
                    <select
                      required
                      value={lopUser}
                      onChange={(e) => setLopUser(e.target.value)}
                      className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm"
                    >
                      <option value="">Select Employee</option>
                      {adminData?.employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>{emp.name} ({emp.employeeNumber ? `#${emp.employeeNumber}` : "No ID"})</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant/60">LOP Days</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      required
                      placeholder="e.g. 1.0 or 0.5"
                      value={lopDays}
                      onChange={(e) => setLopDays(e.target.value)}
                      className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant/60">Remarks / Reason</label>
                    <textarea
                      value={lopRemarks}
                      onChange={(e) => setLopRemarks(e.target.value)}
                      placeholder="Sick leave without balance, unpaid leave..."
                      rows={3}
                      className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm resize-none"
                    />
                  </div>
                  <Button type="submit" disabled={isPending} className="w-full bg-rose-500 hover:bg-rose-600 text-white">
                    {isPending ? "Logging..." : "Log LOP"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Payroll Summary Tab */}
      {activeTab === "payroll" && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <Card className="border-0 shadow-sm bg-surface">
            <CardHeader className="pb-3 border-b border-outline-variant/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-base font-bold text-on-surface dark:text-slate-200">
                  Consolidated Payroll Summary
                </CardTitle>
                <p className="text-xs text-on-surface-variant/60 font-semibold mt-1">Payroll metrics merging Loss of Pay and approved Overtime payouts</p>
              </div>
              <Button
                onClick={handleExportCsv}
                disabled={payrollRows.length === 0}
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white dark:bg-surface dark:text-slate-900 dark:hover:bg-surface-container-high text-xs px-3 h-9 rounded-lg"
              >
                <Download className="size-4" />
                Export to CSV
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {payrollRows.length === 0 ? (
                <div className="text-center text-on-surface-variant/60 py-20 text-sm font-semibold">
                  No payroll summary records available for this month. Ensure OT records are approved.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-outline-variant bg-surface-container-high/20 dark:bg-slate-800/10 text-left text-xs text-on-surface-variant/60 font-bold uppercase">
                        <th className="p-3.5">Employee ID</th>
                        <th className="p-3.5">Name</th>
                        <th className="p-3.5">Department</th>
                        <th className="p-3.5 text-right">Approved OT Hours</th>
                        <th className="p-3.5 text-right">OT Payout Amount</th>
                        <th className="p-3.5 text-right">Approved Comp-Offs</th>
                        <th className="p-3.5 text-right font-black">Loss of Pay (LOP)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/40">
                      {payrollRows.map((r, i) => (
                        <tr key={i} className="hover:bg-surface-container-high/30 dark:hover:bg-slate-800/10 transition">
                          <td className="p-3.5 font-semibold text-on-surface-variant">#{r.employeeNumber || "N/A"}</td>
                          <td className="p-3.5 font-bold text-on-surface dark:text-slate-100">{r.employeeName}</td>
                          <td className="p-3.5 text-on-surface-variant font-semibold">{r.department || "No Department"}</td>
                          <td className="p-3.5 text-right font-extrabold text-on-surface dark:text-on-surface-variant/40">{r.totalOtHours.toFixed(2)} hrs</td>
                          <td className="p-3.5 text-right font-extrabold text-emerald-600 dark:text-emerald-400">₹{r.totalOtAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                          <td className="p-3.5 text-right font-bold text-[#00cec4]">{r.totalCompOffDays.toFixed(1)} days</td>
                          <td className="p-3.5 text-right font-black text-rose-600 dark:text-rose-400">{r.lopDays.toFixed(1)} days</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === "settings" && (
        <div className="grid gap-6 lg:grid-cols-3 animate-in fade-in duration-300">
          <div className="lg:col-span-2 space-y-4">
            <Card className="relative overflow-hidden border border-outline-variant/60 bg-surface shadow-sm before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-[#00cec4] after:absolute after:inset-y-0 after:right-0 after:w-1 after:bg-[#00cec4]/45">
              <CardHeader className="pb-3 border-b border-outline-variant/60">
                <CardTitle className="text-base font-semibold text-on-surface">
                  Interactive Weekend & Holiday Comp-Off Slabs
                </CardTitle>
                <p className="mt-1 text-sm text-on-surface-variant">
                  Configure compensation slabs for comp-off days granted based on worked hours on weekends and holidays.
                </p>
              </CardHeader>
              <CardContent className="p-0">
                {slabs.length === 0 ? (
                  <div className="py-16 text-center text-sm text-on-surface-variant">
                    No compensation slabs defined. Defaulting to standard settings.
                  </div>
                ) : (
                  <DataTable className="rounded-none border-0 shadow-none">
                    <DataTableHeader>
                      <DataTableRow className="hover:bg-transparent">
                        <DataTableHead>Minimum Worked Hours</DataTableHead>
                        <DataTableHead className="text-right">Comp-Off Days Granted</DataTableHead>
                        <DataTableHead className="text-right">Action</DataTableHead>
                      </DataTableRow>
                    </DataTableHeader>
                    <DataTableBody>
                      {slabs.map((slab, index) => (
                        <DataTableRow key={index}>
                          <DataTableCell className="font-medium text-on-surface">
                            If employee works &gt;= <span className="font-semibold">{slab.minHours} hours</span>
                          </DataTableCell>
                          <DataTableCell className="text-right font-semibold text-[#00a89f]">
                            {slab.compOffDays} days
                          </DataTableCell>
                          <DataTableCell className="text-right">
                            <Button
                              size="sm"
                              onClick={() => handleRemoveSlab(index)}
                              className="h-7 w-7 p-0 bg-transparent border border-rose-200 hover:bg-rose-500/10 text-rose-500 inline-flex items-center justify-center rounded"
                            >
                              <Trash className="size-3.5" />
                            </Button>
                          </DataTableCell>
                        </DataTableRow>
                      ))}
                    </DataTableBody>
                  </DataTable>
                )}
                
                {/* Slab Adder Form */}
                <div className="flex items-center gap-3 border-t border-outline-variant/60 bg-surface-container-low/40 p-4">
                  <div className="flex flex-1 gap-2">
                    <input
                      type="number"
                      placeholder="Min hours worked (e.g. 8)"
                      value={newSlabMinHours}
                      onChange={(e) => setNewSlabMinHours(e.target.value)}
                      className="flex-1 rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant"
                    />
                    <input
                      type="number"
                      step="0.5"
                      placeholder="Comp-off days (e.g. 1.0)"
                      value={newSlabDays}
                      onChange={(e) => setNewSlabDays(e.target.value)}
                      className="flex-1 rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant"
                    />
                  </div>
                  <Button
                    onClick={handleAddSlab}
                    className="flex h-9 items-center gap-1 bg-[#00cec4] px-3 text-sm text-white hover:bg-[#00b2a9]"
                  >
                    <Plus className="size-3.5" /> Add Slab
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card className="relative overflow-hidden border border-outline-variant/60 bg-surface shadow-sm before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-[#00cec4] after:absolute after:inset-y-0 after:right-0 after:w-1 after:bg-[#00cec4]/45">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-on-surface">Global Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveSettings} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold uppercase tracking-[0.14em] text-on-surface-variant">Standard Shift Hours</label>
                    <input
                      type="number"
                      step="0.5"
                      required
                      value={otSettings.standardHours}
                      onChange={(e) => setOtSettings({ ...otSettings, standardHours: parseFloat(e.target.value) || 8.0 })}
                      className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm font-medium text-on-surface"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold uppercase tracking-[0.14em] text-on-surface-variant">OT Hourly Rate Multiplier / Standard Base</label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={otSettings.otRate}
                      onChange={(e) => setOtSettings({ ...otSettings, otRate: parseFloat(e.target.value) || 1.5 })}
                      className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm font-medium text-on-surface"
                    />
                    <p className="text-xs leading-relaxed text-on-surface-variant">
                      If employees have no CTC set in employment contracts, this value is multiplied by ₹100 as fallback rate.
                    </p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold uppercase tracking-[0.14em] text-on-surface-variant">Grace Period (Minutes)</label>
                    <input
                      type="number"
                      required
                      value={otSettings.graceMinutes}
                      onChange={(e) => setOtSettings({ ...otSettings, graceMinutes: parseInt(e.target.value, 10) || 15 })}
                      className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm font-medium text-on-surface"
                    />
                    <p className="text-xs leading-relaxed text-on-surface-variant">
                      Overtime calculation threshold. Overtime minutes start accumulating strictly after standard shift hours + grace limit.
                    </p>
                  </div>
                  <Button type="submit" disabled={isPending} className="w-full bg-[#00cec4] hover:bg-[#00b2a9] text-white">
                    {isPending ? "Saving parameters..." : "Save Config Details"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="relative mt-4 overflow-hidden border border-outline-variant/60 bg-surface shadow-sm before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-[#00cec4] after:absolute after:inset-y-0 after:right-0 after:w-1 after:bg-[#00cec4]/45">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-on-surface">OT & Comp-Off Active Policies</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm leading-relaxed text-on-surface-variant">
                <div className="space-y-1 pb-2 border-b border-outline-variant/40">
                  <h5 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-on-surface">1. Weekend Saturday Rules</h5>
                  <p>Only the 1st and 3rd Saturdays of a calendar month are treated as official working days. The 2nd, 4th, and 5th Saturdays are weekly off-days (holiday/weekend).</p>
                </div>
                <div className="space-y-1 pb-2 border-b border-outline-variant/40">
                  <h5 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-on-surface">2. CTC Overtime Rate Policy</h5>
                  <p>Calculated dynamically: <code>Annual CTC / 12 / (Working Days * Shift Hours)</code>. Falls back to standard multiplier rate (base rate * ₹100) if contracting CTC data is missing.</p>
                </div>
                <div className="space-y-1 pb-2 border-b border-outline-variant/40">
                  <h5 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-on-surface">3. Grace Period Thresholds</h5>
                  <p>Overtime minutes only accumulate once hours worked exceed standard shift hours + grace period minutes. Early departure logs trigger if check-out occurs prior to standard shift boundaries.</p>
                </div>
                <div className="space-y-1 pb-2 border-b border-outline-variant/40">
                  <h5 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-on-surface">4. Weekend / Holiday Comp-Off Slabs</h5>
                  <p>Working on weekly offs or official calendar holidays grants days of Comp-Off according to the configured hours-to-days slabs (e.g. &gt;= 8.0 hours worked grants 1.0 day).</p>
                </div>
                <div className="space-y-1">
                  <h5 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-on-surface">5. Regularization Penalty</h5>
                  <p>If a punch is modified/corrected via Attendance Regularization request approval rather than pure biometric scanning, computed Overtime hours/amounts and Comp-off days are penalised by 75% (only 25% credited).</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Import Punches Tab */}
      {activeTab === "import" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="border-0 shadow-sm bg-surface lg:col-span-2">
              <CardHeader className="pb-3 border-b border-outline-variant/60">
                <CardTitle className="text-base font-bold text-on-surface dark:text-slate-200">
                  Upload CSV Attendance Punch Log
                </CardTitle>
                <p className="text-xs text-on-surface-variant/60 font-semibold mt-1">
                  Upload a raw punch card log in CSV format. Align columns with database variables, match employees, and recalculate OT instantly.
                </p>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* Upload File Input */}
                <div className="border-2 border-dashed border-outline-variant/60 hover:border-[#00cec4]/50 rounded-2xl p-8 text-center transition bg-surface-container-high/20 dark:bg-slate-900/10 cursor-pointer relative">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleCsvFileUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <div className="space-y-2">
                    <div className="mx-auto w-12 h-12 rounded-full bg-surface-container-high dark:bg-slate-800 flex items-center justify-center text-on-surface-variant/60">
                      <Download className="size-6 rotate-180 text-[#00cec4]" />
                    </div>
                    <div className="text-sm font-bold text-on-surface dark:text-slate-200">
                      {csvFileName ? `Selected File: ${csvFileName}` : "Drag & Drop CSV file or click to select"}
                    </div>
                    <p className="text-xs text-on-surface-variant/60">CSV format only. Files should contain employee credentials and clock entries.</p>
                  </div>
                </div>

                {/* Column Mapping Section */}
                {csvHeaders.length > 0 && (
                  <div className="space-y-4 border border-outline-variant/60 rounded-xl p-4 bg-surface">
                    <h4 className="text-sm font-black text-on-surface dark:text-white flex items-center gap-1.5">
                      <Sliders className="size-4 text-[#00cec4]" /> Map CSV Columns to Attendance Variables
                    </h4>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1">
                        <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant/60 flex items-center justify-between">
                          Employee Number / ID
                          <span className="text-[9px] text-[#00cec4] font-black uppercase">(Matches ID)</span>
                        </label>
                        <select
                          value={importMappings.employeeNumber}
                          onChange={(e) => setImportMappings({ ...importMappings, employeeNumber: e.target.value })}
                          className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm"
                        >
                          <option value="">-- Don&apos;t Map / Optional --</option>
                          {csvHeaders.map((h) => <option key={h} value={h}>{h}</option>)}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant/60 flex items-center justify-between">
                          Official Email Address
                          <span className="text-[9px] text-[#00cec4] font-black uppercase">(Matches Email)</span>
                        </label>
                        <select
                          value={importMappings.officialEmail}
                          onChange={(e) => setImportMappings({ ...importMappings, officialEmail: e.target.value })}
                          className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm"
                        >
                          <option value="">-- Don&apos;t Map / Optional --</option>
                          {csvHeaders.map((h) => <option key={h} value={h}>{h}</option>)}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant/60 flex items-center justify-between">
                          Employee Name
                          <span className="text-[9px] text-[#00cec4] font-black uppercase">(Matches Name)</span>
                        </label>
                        <select
                          value={importMappings.employeeName}
                          onChange={(e) => setImportMappings({ ...importMappings, employeeName: e.target.value })}
                          className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm"
                        >
                          <option value="">-- Don&apos;t Map / Optional --</option>
                          {csvHeaders.map((h) => <option key={h} value={h}>{h}</option>)}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant/60 flex items-center justify-between">
                          Attendance Date *
                          <span className="text-[9px] text-rose-500 font-black uppercase">(Required)</span>
                        </label>
                        <select
                          value={importMappings.attendanceDate}
                          onChange={(e) => setImportMappings({ ...importMappings, attendanceDate: e.target.value })}
                          required
                          className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm border-rose-200"
                        >
                          <option value="">-- Select Column --</option>
                          {csvHeaders.map((h) => <option key={h} value={h}>{h}</option>)}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant/60 flex items-center justify-between">
                          Check-in / Clock-in Time
                        </label>
                        <select
                          value={importMappings.checkIn}
                          onChange={(e) => setImportMappings({ ...importMappings, checkIn: e.target.value })}
                          className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm"
                        >
                          <option value="">-- Don&apos;t Map / Optional --</option>
                          {csvHeaders.map((h) => <option key={h} value={h}>{h}</option>)}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant/60 flex items-center justify-between">
                          Check-out / Clock-out Time
                        </label>
                        <select
                          value={importMappings.checkOut}
                          onChange={(e) => setImportMappings({ ...importMappings, checkOut: e.target.value })}
                          className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm"
                        >
                          <option value="">-- Don&apos;t Map / Optional --</option>
                          {csvHeaders.map((h) => <option key={h} value={h}>{h}</option>)}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant/60 flex items-center justify-between">
                          Total Hours Worked
                        </label>
                        <select
                          value={importMappings.totalHours}
                          onChange={(e) => setImportMappings({ ...importMappings, totalHours: e.target.value })}
                          className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm"
                        >
                          <option value="">-- Don&apos;t Map / Auto-calculate --</option>
                          {csvHeaders.map((h) => <option key={h} value={h}>{h}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <Button
                        onClick={() => {
                          if (!importMappings.attendanceDate) {
                            toast.error("Attendance Date column is required");
                            return;
                          }
                          startTransition(async () => {
                            const res = await importAttendanceDataAction(csvRows, importMappings as any);
                            if (!res.ok) {
                              toast.error(res.error || "Import failed");
                              return;
                            }
                            setImportSummary(res.data || null);
                            toast.success(`Import completed: ${res.data?.imported || 0} inserted, ${res.data?.updated || 0} updated`);
                          });
                        }}
                        disabled={isPending}
                        className="bg-[#00cec4] hover:bg-[#00b2a9] text-white flex items-center gap-1.5"
                      >
                        <Check className="size-4" /> Import and Calculate OT
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Import Information and Summary Panel */}
            <div className="space-y-4">
              <Card className="border-0 shadow-sm border-l-4 border-l-[#00cec4] bg-surface">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-bold text-on-surface dark:text-slate-200">
                    Import Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-on-surface-variant dark:text-on-surface-variant/60 space-y-2 leading-relaxed font-semibold">
                  <p>
                    • Employees are matched dynamically using a fallback hierarchy: first by **Employee Number / ID**, then by **Official Email**, and finally by **Exact Name**.
                  </p>
                  <p>
                    • Dates will be parsed and normalized to Asia/Kolkata timezone (IST) midnight boundaries. Supported formats include standard ISO (`YYYY-MM-DD`) and slash formats (`DD-MM-YYYY` or `DD/MM/YYYY`).
                  </p>
                  <p>
                    • Check-in and check-out values support 24-hour time strings (`18:30:00`) or meridiem-tagged time strings (`06:30 PM`).
                  </p>
                  <p>
                    • Processing runs recalculations immediately for all imported records, mapping OT rate details and holiday comp-off credits automatically.
                  </p>
                </CardContent>
              </Card>

              {importSummary && (
                <Card className="border-0 shadow-sm bg-surface animate-in zoom-in-95 duration-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold text-on-surface dark:text-slate-200">
                      Import Statistics Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2 bg-emerald-500/10 rounded-lg">
                        <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">{importSummary.imported}</div>
                        <div className="text-[10px] text-on-surface-variant/60 font-bold">Imported</div>
                      </div>
                      <div className="p-2 bg-blue-500/10 rounded-lg">
                        <div className="text-lg font-black text-blue-600 dark:text-blue-400">{importSummary.updated}</div>
                        <div className="text-[10px] text-on-surface-variant/60 font-bold">Updated</div>
                      </div>
                      <div className="p-2 bg-rose-500/10 rounded-lg">
                        <div className="text-lg font-black text-rose-600 dark:text-rose-400">{importSummary.skipped}</div>
                        <div className="text-[10px] text-on-surface-variant/60 font-bold">Skipped</div>
                      </div>
                    </div>

                    {importSummary.errors.length > 0 && (
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-on-surface-variant/60 tracking-wider">Errors/Logs (Max 50):</label>
                        <div className="max-h-[150px] overflow-y-auto border border-rose-200/50 rounded-lg p-2 bg-rose-500/5 text-[10px] text-rose-600 font-mono space-y-1">
                          {importSummary.errors.map((err, i) => (
                            <div key={i}>{err}</div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Adjustments Modal Overlay */}
      {adjustingRecord && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-surface rounded-2xl border border-outline-variant max-w-md w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-outline-variant/60">
              <h3 className="text-base font-bold text-on-surface dark:text-white flex items-center gap-2">
                <Sliders className="size-5 text-[#00cec4]" />
                Manual Calculation Overrides
              </h3>
              <p className="text-xs text-on-surface-variant/60 font-semibold mt-1">
                For {adjustingRecord.user.name} on {new Date(adjustingRecord.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
              </p>
            </div>
            
            <div className="p-5 space-y-4">
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-on-surface-variant/60">
                  <span>Overtime Minutes</span>
                  <span className="text-on-surface dark:text-white font-black">{adjustedMins} mins ({(adjustedMins / 60).toFixed(2)} hrs)</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="480"
                  step="15"
                  value={adjustedMins}
                  onChange={(e) => setAdjustedMins(parseInt(e.target.value, 10))}
                  className="w-full accent-[#00cec4]"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-on-surface-variant/60">
                  <span>Early Leaving Minutes</span>
                  <span className="text-on-surface dark:text-white font-black">{adjustedEarlyMins} mins</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="240"
                  step="10"
                  value={adjustedEarlyMins}
                  onChange={(e) => setAdjustedEarlyMins(parseInt(e.target.value, 10))}
                  className="w-full accent-amber-500"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-on-surface-variant/60">
                  <span>Comp-Off Days</span>
                  <span className="text-on-surface dark:text-white font-black">{adjustedCompOff.toFixed(1)} days</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="2.0"
                  step="0.5"
                  value={adjustedCompOff}
                  onChange={(e) => setAdjustedCompOff(parseFloat(e.target.value))}
                  className="w-full accent-[#00cec4]"
                />
              </div>
            </div>

            <div className="p-4 bg-surface-container-high dark:bg-slate-900/40 border-t border-outline-variant/60 flex justify-end gap-2.5">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setAdjustingRecord(null)}
                className="text-xs h-9 px-4 border-outline-variant text-on-surface-variant hover:bg-surface-container-high"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveAdjustments}
                disabled={isPending}
                className="bg-[#00cec4] hover:bg-[#00b2a9] text-white text-xs h-9 px-4 flex items-center gap-1.5"
              >
                {isPending ? "Applying..." : "Save Overrides"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
