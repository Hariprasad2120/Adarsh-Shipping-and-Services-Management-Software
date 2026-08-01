"use client";

import {
  PeopleControlButton as MnxAction,
  PeopleControlInput as MnxInput,
  PeopleControlTextarea as MnxTextarea,
  PeopleControlTable as MnxTable,
} from "@/modules/people/components/people-controls";

import { NativeSelect } from "@/components/ui/native-select";
import { DateInput } from "@/components/ui/date-input";
import { Fragment, useState, useTransition, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { WorkspaceDialog } from "@/components/layout/workspace-dialog";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableEmpty,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
} from "@/modules/people/components/people-data-table";
import {
  Plus,
  Check,
  X,
  Clock,
  User,
  Calendar,
  AlertCircle,
  IndianRupee,
  Sliders,
  ArrowRight,
  Download,
  Trash,
  RefreshCw,
  Search,
  SlidersHorizontal,
  ChevronRight,
  ChevronDown,
  CheckSquare,
} from "lucide-react";
import {
  decideOtRecordAction,
  bulkDecideOtRecordsAction,
  adjustOtRecordAction,
  saveOtSettingsAction,
  saveWorkingCalendarAction,
  saveShiftAction,
  assignEmployeeShiftAction,
  saveHolidayAction,
  deleteHolidayAction,
  saveLopRecordAction,
  deleteLopRecordAction,
  processMonthOtAction,
  importAttendanceDataAction,
  clearMonthOtRecordsAction,
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

type ShiftOption = {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  expectedWorkingMinutes: number;
  graceBeforeStartMins: number;
  graceAfterEndMins: number;
  minOvertimeMinutes: number;
  workingDays: string;
  breakRules: Array<{ start: string; end: string }> | null;
  isActive: boolean;
  isDefault: boolean;
};

type WorkingCalendarState = {
  id?: string;
  orgId?: string;
  workStart: string;
  workEnd: string;
  graceBeforeStartMins: number;
  graceAfterEndMins: number;
  defaultWorkingMinutes: number;
  minOvertimeMinutes: number;
  workingDays: string;
  breaks: Array<{ start: string; end: string }>;
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
    firstPunchAt: string | null;
    lastPunchAt: string | null;
    totalPunchCount: number;
    workedMinutes: number;
    expectedMinutes: number;
    differenceMinutes: number;
    calculationStatus: string;
    calculationRemarks: string | null;
    calculationDetails?: {
      events?: Array<{
        punchedAt: string;
        source: string;
        eventType: string;
        status?: string | null;
        notes?: string | null;
      }>;
      lateMinutes?: number;
      breakMinutes?: number;
    } | null;
    usedOrgFallback: boolean;
    approvalStatus: string;
    rejectionRemarks: string | null;
    shift?: {
      id: string;
      name: string;
      startTime: string;
      endTime: string;
    } | null;
    user: {
      id: string;
      name: string;
      employeeNumber: number | null;
      department: { name: string } | null;
      employmentRecord?: { ctc: number | null } | null;
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
  workingCalendar: WorkingCalendarState | null;
  shifts: ShiftOption[];
  employees: Array<{
    id: string;
    name: string;
    employeeNumber: number | null;
    department: { name: string } | null;
    employmentRecord?: { ctc: number | null } | null;
    hrmsShiftAssignments?: Array<{
      shift: {
        id: string;
        name: string;
        startTime: string;
        endTime: string;
      };
      startDate: string;
      endDate: string | null;
    }>;
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
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

function toDateOnlyValue(date: Date | string) {
  if (date instanceof Date) {
    return date.toISOString().slice(0, 10);
  }
  return date.slice(0, 10);
}

function formatOtDate(date: Date | string) {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    weekday: "short",
  });
}

function getMinuteSalary(
  ctc: number | null | undefined,
  dateStr: string,
  standardHours: number,
) {
  const annualCtc = ctc || 0;
  if (annualCtc <= 0) return 100 / 60;

  const d = new Date(dateStr);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const daysInMonth = new Date(year, month, 0).getDate();

  const monthlyGross = annualCtc / 12;
  const dailySalary = monthlyGross / daysInMonth;
  const minuteSalary = dailySalary / (standardHours * 60);
  return minuteSalary;
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
  const [activeTab, setActiveTab] = useState<
    | "overview"
    | "records"
    | "holidays"
    | "lop"
    | "payroll"
    | "settings"
    | "import"
  >(canApprove ? "overview" : "records");

  // Transitions
  const [isPending, startTransition] = useTransition();

  // Local state copy for reactive UI updates
  const [otRecords, setOtRecords] = useState(adminData?.otRecords || []);
  const [lopRecords, setLopRecords] = useState(adminData?.lopRecords || []);
  const [holidays, setHolidays] = useState(adminData?.holidays || []);
  const [stats, setStats] = useState(
    adminData?.stats || {
      totalOtHours: 0,
      totalOtAmount: 0,
      totalCompOffDays: 0,
      totalLopDays: 0,
      pendingCount: 0,
    },
  );
  const [otSettings, setOtSettings] = useState(
    adminData?.settings || {
      id: "global",
      orgId: "",
      standardHours: 8.0,
      otRate: 1.5,
      graceMinutes: 15,
      compOffSlabs: [],
    },
  );

  // Month selector
  const [selectedMonth, setSelectedMonth] = useState(monthStr);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "PENDING" | "PENDING_MANAGER" | "APPROVED" | "REJECTED"
  >("ALL");
  const [shiftFilter, setShiftFilter] = useState<"ALL" | string>("ALL");
  const [dateFromFilter, setDateFromFilter] = useState("");
  const [dateToFilter, setDateToFilter] = useState("");
  const [expandedUsers, setExpandedUsers] = useState<Record<string, boolean>>(
    {},
  );
  const [selectedRecordIds, setSelectedRecordIds] = useState<
    Record<string, boolean>
  >({});

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
  const [workingCalendar, setWorkingCalendar] = useState<WorkingCalendarState>(
    adminData?.workingCalendar || {
      workStart: "09:30",
      workEnd: "17:30",
      graceBeforeStartMins: 0,
      graceAfterEndMins: 15,
      defaultWorkingMinutes: 480,
      minOvertimeMinutes: 0,
      workingDays: "1,2,3,4,5,6",
      breaks: [{ start: "13:00", end: "14:00" }],
    },
  );
  const [shifts, setShifts] = useState<ShiftOption[]>(adminData?.shifts || []);
  const [shiftForm, setShiftForm] = useState<ShiftOption>({
    id: "",
    name: "",
    startTime: "09:30",
    endTime: "17:30",
    expectedWorkingMinutes: 480,
    graceBeforeStartMins: 0,
    graceAfterEndMins: 15,
    minOvertimeMinutes: 0,
    workingDays: "1,2,3,4,5,6",
    breakRules: [{ start: "13:00", end: "14:00" }],
    isActive: true,
    isDefault: false,
  });
  const [shiftAssignmentUserId, setShiftAssignmentUserId] = useState("");
  const [shiftAssignmentShiftId, setShiftAssignmentShiftId] = useState("");
  const [shiftAssignmentStartDate, setShiftAssignmentStartDate] = useState(
    new Date().toISOString().slice(0, 10),
  );

  // Adjustment Modal states
  const [adjustingRecord, setAdjustingRecord] = useState<any | null>(null);
  const [adjustedMins, setAdjustedMins] = useState(0);
  const [adjustedEarlyMins, setAdjustedEarlyMins] = useState(0);
  const [adjustedCompOff, setAdjustedCompOff] = useState(0);

  // Legacy client features (normal request)
  const [legacyEntries, setLegacyEntries] =
    useState<LegacyOTEntry[]>(initialEntries);
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
    totalHours: "",
  });
  const [importSummary, setImportSummary] = useState<{
    imported: number;
    updated: number;
    skipped: number;
    errors: string[];
    recalculationDeferred?: boolean;
    touchedMonths?: string[];
  } | null>(null);

  const loadImportedRows = (
    headers: string[],
    rows: Record<string, string>[],
    sourceLabel: string,
  ) => {
    setCsvHeaders(headers);
    setCsvRows(rows);

    const autoMap: Record<string, string> = {
      employeeNumber: "",
      employeeName: "",
      officialEmail: "",
      attendanceDate: "",
      checkIn: "",
      checkOut: "",
      totalHours: "",
    };

    headers.forEach((h) => {
      const clean = h.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (
        clean.includes("empid") ||
        clean.includes("employeeid") ||
        clean.includes("employeeno") ||
        clean.includes("employeenumber")
      ) {
        autoMap.employeeNumber = h;
      } else if (
        (clean.includes("name") || clean.includes("employeename")) &&
        !autoMap.employeeName
      ) {
        autoMap.employeeName = h;
      } else if (clean.includes("email")) {
        autoMap.officialEmail = h;
      } else if (
        clean === "date" ||
        clean.includes("attendancedate") ||
        clean.includes("attendance")
      ) {
        autoMap.attendanceDate = h;
      } else if (
        clean.includes("firstin") ||
        clean.includes("checkin") ||
        clean.includes("clockin") ||
        clean.includes("timein")
      ) {
        autoMap.checkIn = h;
      } else if (
        clean.includes("lastout") ||
        clean.includes("checkout") ||
        clean.includes("clockout") ||
        clean.includes("timeout")
      ) {
        autoMap.checkOut = h;
      } else if (
        clean.includes("totalhours") ||
        clean.includes("hoursworked") ||
        clean.includes("workedhours")
      ) {
        autoMap.totalHours = h;
      }
    });

    setImportMappings(autoMap);
    toast.success(`Loaded ${rows.length} rows from ${sourceLabel}`);
  };

  // Pure JavaScript CSV tokenizer
  const parseCsvText = (text: string): string[][] => {
    const lines: string[][] = [];
    let row: string[] = [];
    let inQuotes = false;
    let currentVal = "";

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
      } else if (char === "," && !inQuotes) {
        row.push(currentVal.trim());
        currentVal = "";
      } else if ((char === "\r" || char === "\n") && !inQuotes) {
        row.push(currentVal.trim());
        if (row.some((val) => val !== "")) {
          lines.push(row);
        }
        row = [];
        currentVal = "";
        if (char === "\r" && nextChar === "\n") {
          i++;
        }
      } else {
        currentVal += char;
      }
    }
    if (currentVal || row.length > 0) {
      row.push(currentVal.trim());
      if (row.some((val) => val !== "")) {
        lines.push(row);
      }
    }
    return lines;
  };

  const parseExcelAttendanceRows = async (file: File) => {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const preferredSheet =
      workbook.SheetNames.find((name) =>
        /early_late report\(hours\)/i.test(name),
      ) || workbook.SheetNames[0];

    if (!preferredSheet) {
      throw new Error("No worksheet found in the uploaded Excel file.");
    }

    const worksheet = workbook.Sheets[preferredSheet];
    const rawRows = XLSX.utils.sheet_to_json<(string | number | null)[]>(
      worksheet,
      {
        header: 1,
        defval: "",
        raw: false,
      },
    );

    const headerRowIndex = rawRows.findIndex((row) => {
      const cols = row.slice(0, 7).map((cell) =>
        String(cell ?? "")
          .trim()
          .toLowerCase(),
      );
      return cols[0] === "employee id" && cols[3] === "date";
    });

    if (headerRowIndex === -1) {
      throw new Error(
        "Could not find the expected A-G attendance header row in the Excel file.",
      );
    }

    const headers = rawRows[headerRowIndex]!.slice(0, 7).map((cell) =>
      String(cell ?? "").trim(),
    );
    const parsedRows = rawRows
      .slice(headerRowIndex + 1)
      .map((row) => row.slice(0, 7).map((cell) => String(cell ?? "").trim()))
      .filter((row) => row.some((cell) => cell !== ""))
      .map((row) => {
        const obj: Record<string, string> = {};
        headers.forEach((header, index) => {
          obj[header] = row[index] || "";
        });
        return obj;
      });

    loadImportedRows(headers, parsedRows, `${file.name} (${preferredSheet})`);
  };

  const overviewCards = [
    {
      label: "OT Hours Approved",
      badge: "Time",
      value: stats.totalOtHours.toFixed(1),
      unit: "hrs",
      helper: "Approved overtime hours captured for the selected month.",
      icon: Clock,
      cardClassName: "border-[var(--mnx-info)]/70",
      badgeClassName:
        "border-[var(--mnx-info)]/80 bg-[var(--mnx-info-bg)]/10 text-[var(--mnx-info)]",
      iconClassName:
        "border-[var(--mnx-info)]/80 bg-[var(--mnx-info-bg)]/10 text-[var(--mnx-info)]",
      glowClassName: "bg-[var(--mnx-surface-gradient)]",
      orbClassName: "bg-[var(--mnx-info-bg)]/20",
    },
    {
      label: "Total OT Payout",
      badge: "Finance",
      value: `₹${stats.totalOtAmount.toLocaleString("en-IN", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`,
      unit: "",
      helper: "Monthly approved overtime payout ready for payroll export.",
      icon: IndianRupee,
      cardClassName: "border-[var(--mnx-success)]/70",
      badgeClassName:
        "border-[var(--mnx-success)]/80 bg-[var(--mnx-success-bg)]/10 text-[var(--mnx-success)]",
      iconClassName:
        "border-[var(--mnx-success)]/80 bg-[var(--mnx-success-bg)]/10 text-[var(--mnx-success)]",
      glowClassName: "bg-[var(--mnx-surface-gradient)]",
      orbClassName: "bg-[var(--mnx-success-bg)]/20",
    },
    {
      label: "Holiday Comp-Offs",
      badge: "Leave",
      value: stats.totalCompOffDays.toFixed(1),
      unit: "days",
      helper: "Comp-off days earned from weekly offs and holiday shifts.",
      icon: Calendar,
      cardClassName: "border-[var(--mnx-warning)]/80",
      badgeClassName:
        "border-[var(--mnx-warning)]/80 bg-[var(--mnx-warning-bg)]/10 text-[var(--mnx-warning)]",
      iconClassName:
        "border-[var(--mnx-warning)]/80 bg-[var(--mnx-warning-bg)]/10 text-[var(--mnx-warning)]",
      glowClassName: "bg-[var(--mnx-surface-gradient)]",
      orbClassName: "bg-[var(--mnx-warning-bg)]/20",
    },
    {
      label: "Loss of Pay Logs",
      badge: "Risk",
      value: stats.totalLopDays.toFixed(1),
      unit: "days",
      helper: "LOP days currently logged into the monthly attendance cycle.",
      icon: AlertCircle,
      cardClassName: "border-[var(--mnx-danger)]/80",
      badgeClassName:
        "border-[var(--mnx-danger)]/80 bg-[var(--mnx-danger-bg)]/10 text-[var(--mnx-danger)]",
      iconClassName:
        "border-[var(--mnx-danger)]/80 bg-[var(--mnx-danger-bg)]/10 text-[var(--mnx-danger)]",
      glowClassName: "bg-[var(--mnx-surface-gradient)]",
      orbClassName: "bg-[var(--mnx-danger-bg)]/20",
    },
  ];

  const handleCsvFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFileName(file.name);
    setImportSummary(null);

    const lowerName = file.name.toLowerCase();
    if (lowerName.endsWith(".xls") || lowerName.endsWith(".xlsx")) {
      void parseExcelAttendanceRows(file).catch((error: unknown) => {
        toast.error(
          error instanceof Error ? error.message : "Failed to read Excel file",
        );
      });
      return;
    }

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
      const dataLines = parsedLines.slice(1);
      const rows = dataLines.map((line) => {
        const obj: Record<string, string> = {};
        headers.forEach((h, index) => {
          obj[h] = line[index] || "";
        });
        return obj;
      });
      loadImportedRows(headers, rows, file.name);
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
      router.refresh();
    });
  };

  const handleClearMonthRecords = () => {
    if (
      !confirm(
        `Are you sure you want to delete all calculated OT records AND imported CSV punches for ${selectedMonth}? This action is irreversible.`,
      )
    ) {
      return;
    }

    startTransition(async () => {
      const res = await clearMonthOtRecordsAction(selectedMonth);
      if (!res.ok) {
        toast.error(res.error || "Failed to clear month records");
        return;
      }
      toast.success(
        `Successfully cleared: ${res.data?.deletedOtCount || 0} OT records and ${res.data?.deletedPunchesCount || 0} imported punches.`,
      );
      router.refresh();
    });
  };

  // Approval decisions
  const handleDecideRecord = (
    recordId: string,
    decision: "APPROVED" | "PENDING_MANAGER" | "REJECTED",
    remarks?: string,
  ) => {
    startTransition(async () => {
      const res = await decideOtRecordAction(recordId, decision, remarks);
      if (!res.ok) {
        toast.error(res.error || "Failed to submit decision");
        return;
      }
      toast.success(`Record updated successfully`);

      // Update local state
      setOtRecords((prev) =>
        prev.map((r) =>
          r.id === recordId
            ? {
                ...r,
                approvalStatus: decision,
                rejectionRemarks: remarks || null,
              }
            : r,
        ),
      );
      // Update stats
      updateStatsLocal();
    });
  };

  // Bulk decisions
  const handleBulkDecide = (
    decision: "APPROVED" | "PENDING_MANAGER" | "REJECTED",
  ) => {
    const ids = Object.keys(selectedRecordIds).filter(
      (id) => selectedRecordIds[id],
    );
    if (ids.length === 0) return;

    startTransition(async () => {
      const res = await bulkDecideOtRecordsAction(ids, decision);
      if (!res.ok) {
        toast.error(res.error || "Failed to execute bulk action");
        return;
      }
      toast.success(
        `Bulk processed ${ids.length} records to ${decision.replace("_", " ").toLowerCase()}`,
      );

      setOtRecords((prev) =>
        prev.map((r) =>
          ids.includes(r.id) ? { ...r, approvalStatus: decision } : r,
        ),
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
        adjustedCompOff,
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
                otAmount: Number(
                  ((adjustedMins / 60) * (r.otRatePerHour || 150)).toFixed(2),
                ),
                earlyLeavingMins: adjustedEarlyMins,
                compOffDays: adjustedCompOff,
                approvalStatus: "APPROVED",
              }
            : r,
        ),
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
    const updated = [...slabs, { minHours, compOffDays }].sort(
      (a, b) => a.minHours - b.minHours,
    );
    setSlabs(updated);
    setNewSlabMinHours("");
    setNewSlabDays("");
  };

  // Remove slab helper
  const handleRemoveSlab = (index: number) => {
    const updated = slabs.filter((_, i) => i !== index);
    setSlabs(updated);
  };

  const handleSaveWorkingCalendar = (e: FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await saveWorkingCalendarAction(workingCalendar);
      if (!res.ok) {
        toast.error(res.error || "Failed to save working hours");
        return;
      }
      toast.success("Organisation working hours updated");
      router.refresh();
    });
  };

  const resetShiftForm = () => {
    setShiftForm({
      id: "",
      name: "",
      startTime: "09:30",
      endTime: "17:30",
      expectedWorkingMinutes: 480,
      graceBeforeStartMins: 0,
      graceAfterEndMins: 15,
      minOvertimeMinutes: 0,
      workingDays: workingCalendar.workingDays,
      breakRules: workingCalendar.breaks,
      isActive: true,
      isDefault: false,
    });
  };

  const handleSaveShift = (e: FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await saveShiftAction({
        ...shiftForm,
        id: shiftForm.id || undefined,
        breakRules: shiftForm.breakRules || [],
      });
      if (!res.ok) {
        toast.error(res.error || "Failed to save shift");
        return;
      }
      toast.success(shiftForm.id ? "Shift updated" : "Shift created");
      resetShiftForm();
      router.refresh();
    });
  };

  const handleAssignShift = (e: FormEvent) => {
    e.preventDefault();
    if (
      !shiftAssignmentUserId ||
      !shiftAssignmentShiftId ||
      !shiftAssignmentStartDate
    ) {
      toast.error("Employee, shift, and start date are required");
      return;
    }

    startTransition(async () => {
      const res = await assignEmployeeShiftAction({
        userId: shiftAssignmentUserId,
        shiftId: shiftAssignmentShiftId,
        startDate: shiftAssignmentStartDate,
      });
      if (!res.ok) {
        toast.error(res.error || "Failed to assign shift");
        return;
      }
      toast.success("Shift assignment updated");
      router.refresh();
    });
  };

  // Dynamic Payroll Row Compilation
  const payrollRows = adminData
    ? adminData.employees
        .map((emp) => {
          const empOt = otRecords.filter(
            (r) => r.userId === emp.id && r.approvalStatus === "APPROVED",
          );
          const totalOtHours = empOt.reduce((sum, r) => sum + r.otHours, 0);
          const totalOtAmount = empOt.reduce((sum, r) => sum + r.otAmount, 0);
          const totalCompOffDays = empOt.reduce(
            (sum, r) => sum + r.compOffDays,
            0,
          );

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
        })
        .filter(
          (r) => r.totalOtHours > 0 || r.totalCompOffDays > 0 || r.lopDays > 0,
        )
    : [];

  const handleExportCsv = () => {
    const headers = [
      "Employee ID",
      "Employee Name",
      "Department",
      "Approved OT Hours",
      "Approved OT Amount (INR)",
      "Approved Comp-Off Days",
      "LOP Days",
    ];
    const rows = payrollRows.map((r) => [
      r.employeeNumber || "N/A",
      r.employeeName,
      r.department || "N/A",
      r.totalOtHours.toFixed(2),
      r.totalOtAmount.toFixed(2),
      r.totalCompOffDays.toFixed(1),
      r.lopDays.toFixed(1),
    ]);

    const csvContent = [headers, ...rows]
      .map((row) =>
        row.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(","),
      )
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `Adarsh_Payroll_OT_Summary_${selectedMonth}.csv`,
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Group daily OT records by employee for display in the cockpit records tab
  const filteredRecords = otRecords.filter((rec) => {
    const matchesSearch =
      rec.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(rec.user.employeeNumber || "").includes(searchTerm);
    const matchesStatus =
      statusFilter === "ALL" || rec.approvalStatus === statusFilter;
    const matchesShift =
      shiftFilter === "ALL" ||
      rec.shift?.id === shiftFilter ||
      (shiftFilter === "__ORG_FALLBACK__" && rec.usedOrgFallback);
    const dateValue = toDateOnlyValue(rec.date);
    const matchesDateFrom = !dateFromFilter || dateValue >= dateFromFilter;
    const matchesDateTo = !dateToFilter || dateValue <= dateToFilter;
    return (
      matchesSearch &&
      matchesStatus &&
      matchesShift &&
      matchesDateFrom &&
      matchesDateTo
    );
  });

  const selectableRecords = filteredRecords.filter(
    (r) =>
      r.approvalStatus === "PENDING" || r.approvalStatus === "PENDING_MANAGER",
  );
  const allSelectableChecked =
    selectableRecords.length > 0 &&
    selectableRecords.every((r) => !!selectedRecordIds[r.id]);

  const toggleUserExpand = (recordId: string) => {
    setExpandedUsers((prev) => ({ ...prev, [recordId]: !prev[recordId] }));
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
          <Card className="border-0 shadow-sm bg-mono-card">
            <CardHeader className="pb-3 border-b border-mono-border/60">
              <CardTitle className="text-base font-bold text-mono-text text-[var(--mnx-muted)]">
                My Overtime Requests
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {legacyEntries.length === 0 ? (
                <div className="text-center text-mono-muted/60/80 py-16 text-sm font-medium">
                  No overtime entries requested yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <MnxTable className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-mono-border bg-mono-soft/40 dark:bg-mono-soft/50 text-left">
                        <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-mono-muted/60">
                          Date
                        </th>
                        <th className="px-4 text-xs font-bold uppercase tracking-wider text-mono-muted/60">
                          Requested Hours
                        </th>
                        <th className="px-4 text-xs font-bold uppercase tracking-wider text-mono-muted/60">
                          Status
                        </th>
                        <th className="px-4 text-xs font-bold uppercase tracking-wider text-mono-muted/60">
                          Notes
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/40">
                      {legacyEntries.map((entry) => (
                        <tr
                          key={entry.id}
                          className="hover:bg-mono-soft/20 hover:bg-[var(--mnx-soft)]/10 transition"
                        >
                          <td className="py-3.5 px-4 font-semibold text-mono-text dark:text-mono-muted/40">
                            {new Date(entry.date).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </td>
                          <td className="px-4 text-mono-muted dark:text-mono-muted/60 font-bold">
                            {entry.hours} hrs
                          </td>
                          <td className="px-4">
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold border capitalize ${
                                entry.status === "approved"
                                  ? "bg-[var(--mnx-success-bg)] text-[var(--mnx-success)] bg-[var(--mnx-success-bg)]/40 text-[var(--mnx-success)] border-[var(--mnx-success)]"
                                  : entry.status === "rejected"
                                    ? "bg-[var(--mnx-danger-bg)] text-[var(--mnx-danger)] bg-[var(--mnx-danger-bg)]/40 text-[var(--mnx-danger)] border-[var(--mnx-danger)]"
                                    : "bg-[var(--mnx-warning-bg)] text-[var(--mnx-warning)] bg-[var(--mnx-warning-bg)]/40 text-[var(--mnx-warning)] border-[var(--mnx-warning)]"
                              }`}
                            >
                              {entry.status}
                            </span>
                          </td>
                          <td className="px-4 text-xs text-mono-muted/60 font-semibold max-w-[200px] truncate">
                            {entry.notes || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </MnxTable>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="border-0 shadow-sm border-l-4 border-l-[var(--mnx-accent)] bg-mono-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold text-mono-text text-[var(--mnx-muted)]">
                Submit OT Request
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={async (e) => {
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
                }}
                className="space-y-4"
              >
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-mono-muted/60">
                    Date
                  </label>
                  <DateInput
                    required
                    value={reqDate}
                    onChange={(e) => setReqDate(e.target.value)}
                    className="w-full rounded-lg border border-mono-border bg-mono-card px-3 py-2 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-mono-muted/60">
                    Hours
                  </label>
                  <MnxInput
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="16"
                    required
                    value={reqHours}
                    onChange={(e) => setReqHours(e.target.value)}
                    placeholder="e.g. 2.0"
                    className="w-full rounded-lg border border-mono-border bg-mono-card px-3 py-2 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-mono-muted/60">
                    Work Description
                  </label>
                  <MnxTextarea
                    value={reqNotes}
                    onChange={(e) => setReqNotes(e.target.value)}
                    placeholder="Provide details about what you worked on..."
                    rows={4}
                    className="w-full rounded-lg border border-mono-border bg-mono-card px-3 py-2 text-sm resize-none"
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-mono-border/60 pb-2">
        <div className="flex flex-wrap gap-1">
          {(
            [
              "overview",
              "records",
              "holidays",
              "lop",
              "payroll",
              "settings",
              "import",
            ] as const
          ).map((tab) => (
            <MnxAction
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-xl px-4 py-2 text-sm font-medium capitalize transition ${
                activeTab === tab
                  ? "bg-[var(--mnx-accent)]/14 text-[var(--mnx-accent-text)] shadow-ambient"
                  : "text-mono-muted hover:bg-mono-soft hover:text-mono-text"
              }`}
            >
              {tab === "lop"
                ? "Loss of Pay (LOP)"
                : tab === "records"
                  ? "OT Records"
                  : tab === "import"
                    ? "Import Punches"
                    : tab}
            </MnxAction>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <label className="shrink-0 text-xs font-semibold uppercase tracking-[0.14em] text-mono-muted">
            Month
          </label>
          <MnxInput
            type="month"
            value={selectedMonth}
            onChange={(e) => handleMonthChange(e.target.value)}
            className="rounded-xl border border-mono-border bg-mono-card px-3 py-1.5 text-sm font-medium text-mono-text focus:outline-none focus:border-[var(--mnx-accent)]"
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
                    "mnx-content-wide group relative overflow-hidden border bg-mono-card p-0 shadow-ambient",
                    item.cardClassName,
                  )}
                >
                  <div className={cn("absolute inset-0", item.glowClassName)} />
                  <div
                    className={cn(
                      "absolute -right-10 -top-10 h-28 w-28 rounded-full blur-2xl transition duration-300 group-hover:scale-110",
                      item.orbClassName,
                    )}
                  />

                  <CardContent className="relative flex min-h-[190px] flex-col justify-between p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-3">
                        <span
                          className={cn(
                            "inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]",
                            item.badgeClassName,
                          )}
                        >
                          {item.badge}
                        </span>
                        <p className="max-w-[18ch] text-xs font-semibold uppercase tracking-[0.18em] text-mono-muted">
                          {item.label}
                        </p>
                      </div>

                      <span
                        className={cn(
                          "inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-[var(--mn-radius-panel)] border transition duration-300 group-hover:scale-105",
                          item.iconClassName,
                        )}
                      >
                        <Icon className="size-7" />
                      </span>
                    </div>

                    <div>
                      <div className="flex flex-wrap items-end gap-2">
                        <h3 className="mnx-numeric text-[2.35rem] font-semibold leading-none tracking-[-0.05em] text-mono-text">
                          {item.value}
                        </h3>
                        {item.unit ? (
                          <span className="pb-1 text-sm font-semibold uppercase tracking-[0.14em] text-mono-muted">
                            {item.unit}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-3 max-w-[28ch] text-sm leading-5 text-mono-muted">
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
            <Card className="mnx-panel mnx-accent-edge mnx-content-wide border border-mono-border/40 bg-mono-card shadow-sm lg:col-span-2">
              <CardHeader className="border-b border-mono-border/30 pb-3">
                <CardTitle className="mnx-title-3 text-mono-accent">
                  Recalculate Batch Engine
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm leading-6 text-mono-muted">
                  Punches imported from biometric devices are processed
                  automatically in real-time. If you change global parameters
                  (shift timings, grace bounds, or comp-off brackets), you can
                  recompute the entire month&apos;s variables for active
                  employees here.
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    onClick={handleProcessMonth}
                    disabled={isPending}
                    className="flex items-center gap-2 bg-[var(--mnx-accent)] hover:bg-[var(--mnx-accent)] text-[var(--mnx-text)]"
                  >
                    <RefreshCw
                      className={`size-4 ${isPending ? "animate-spin" : ""}`}
                    />
                    {isPending
                      ? "Calculating..."
                      : "Recompute Month OT Records"}
                  </Button>
                  <Button
                    onClick={handleClearMonthRecords}
                    disabled={isPending}
                    variant="outline"
                    className="flex items-center gap-2 !border-[var(--mnx-danger)] !bg-transparent !text-[var(--mnx-danger)] hover:!bg-[var(--mnx-danger-bg)] hover:!text-[var(--mnx-danger)]"
                  >
                    <Trash className="size-4" />
                    Clear Month OT & Punches
                  </Button>
                  {stats.pendingCount > 0 && (
                    <span className="flex items-center gap-1 text-xs font-semibold text-[var(--mnx-warning)]">
                      <AlertCircle className="size-3.5" />
                      {stats.pendingCount} records require manager decision.
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="mnx-panel mnx-accent-edge mnx-content-wide border border-mono-border/40 bg-mono-card shadow-sm">
              <CardHeader className="border-b border-mono-border/30 pb-3">
                <CardTitle className="mnx-title-3 text-mono-accent">
                  Payroll Export Status
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col justify-end gap-4">
                <div>
                  <h4 className="mnx-numeric text-[2rem] font-semibold leading-none text-mono-text">
                    {payrollRows.length} Employees
                  </h4>
                  <p className="mt-1.5 text-sm text-mono-muted">
                    Consolidated summaries ready for accounting
                  </p>
                </div>
                <Button
                  onClick={() => setActiveTab("payroll")}
                  variant="outline"
                  className="flex w-full items-center justify-center gap-2 !bg-transparent !text-mono-text hover:!bg-mono-soft"
                >
                  Go to Export Sheets
                  <ArrowRight className="size-4" />
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Core Calculation Engine Visual Flow Diagram */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-mono-muted">
              Core Calculation Engine Flow
            </h3>
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
                <div
                  key={i}
                  className="mnx-panel mnx-accent-edge relative flex flex-col justify-between space-y-3 rounded-[var(--mn-radius-panel)] border border-mono-border/30 bg-mono-card p-5 shadow-ambient"
                >
                  <div className="space-y-1">
                    <span className="inline-flex rounded-full bg-[var(--mnx-accent)]/10 px-2 py-0.5 text-[11px] font-semibold tracking-[0.14em] text-[var(--mnx-accent-text)]">
                      {flow.step}
                    </span>
                    <h4 className="mnx-title-3 pt-1 text-mono-accent">
                      {flow.title}
                    </h4>
                    <p className="text-sm leading-6 text-mono-muted">
                      {flow.desc}
                    </p>
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
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="relative sm:col-span-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-mono-muted" />
                <MnxInput
                  type="text"
                  placeholder="Search employee name or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-lg border border-mono-border bg-mono-card pl-9 pr-3 py-2 text-sm text-mono-text placeholder:text-mono-muted focus:outline-none focus:border-[var(--mnx-accent)]"
                />
              </div>
              <NativeSelect
                value={shiftFilter}
                onChange={(e) => setShiftFilter(e.target.value)}
                className="rounded-lg border border-mono-border bg-mono-card px-3 py-2 text-sm text-mono-text"
              >
                <option value="ALL">All shifts</option>
                <option value="__ORG_FALLBACK__">Org fallback</option>
                {shifts.map((shift) => (
                  <option key={shift.id} value={shift.id}>
                    {shift.name}
                  </option>
                ))}
              </NativeSelect>
              <DateInput
                value={dateFromFilter}
                onChange={(e) => setDateFromFilter(e.target.value)}
                className="rounded-lg border border-mono-border bg-mono-card px-3 py-2 text-sm text-mono-text"
              />
              <DateInput
                value={dateToFilter}
                onChange={(e) => setDateToFilter(e.target.value)}
                className="rounded-lg border border-mono-border bg-mono-card px-3 py-2 text-sm text-mono-text"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <SlidersHorizontal className="mr-1 size-4 text-mono-muted" />
              {(
                [
                  "ALL",
                  "PENDING",
                  "PENDING_MANAGER",
                  "APPROVED",
                  "REJECTED",
                ] as const
              ).map((filter) => (
                <MnxAction
                  key={filter}
                  onClick={() => setStatusFilter(filter)}
                  className={`rounded-full px-3 py-1 text-xs font-bold transition border ${
                    statusFilter === filter
                      ? "border-[var(--mnx-accent)]/30 bg-[var(--mnx-accent)]/12 text-[var(--mnx-accent-text)]"
                      : "bg-mono-card text-mono-muted border-mono-border hover:border-[var(--mnx-accent)]/30 hover:text-mono-text"
                  }`}
                >
                  {filter === "PENDING"
                    ? "PENDING (ADMIN)"
                    : filter === "PENDING_MANAGER"
                      ? "PENDING (MANAGER)"
                      : filter}
                </MnxAction>
              ))}
              {selectableRecords.length > 0 && (
                <MnxAction
                  onClick={() => {
                    const allSelected = selectableRecords.every(
                      (r) => !!selectedRecordIds[r.id],
                    );
                    setSelectedRecordIds((prev) => {
                      const copy = { ...prev };
                      selectableRecords.forEach((r) => {
                        copy[r.id] = !allSelected;
                      });
                      return copy;
                    });
                  }}
                  className="rounded-full px-3 py-1 text-xs font-bold transition border bg-[var(--mnx-accent)]/10 text-[var(--mnx-accent)] border-[var(--mnx-accent)]/20 hover:bg-[var(--mnx-accent)]/20"
                >
                  {allSelectableChecked
                    ? "Deselect All Visible"
                    : "Select All Visible"}
                </MnxAction>
              )}
            </div>
          </div>

          {/* Bulk Action Banner */}
          {hasPendingSelections && (
            <div className="flex items-center justify-between gap-4 rounded-xl border border-[var(--mnx-warning)]/25 bg-[var(--mnx-warning-bg)]/10 p-3 animate-in slide-in-from-top-2">
              <span className="flex items-center gap-2 text-xs font-semibold text-[var(--mnx-warning)]">
                <CheckSquare className="size-4" />
                Selected{" "}
                {Object.values(selectedRecordIds).filter(Boolean).length}{" "}
                records for bulk decision
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => handleBulkDecide("APPROVED")}
                  className="bg-[var(--mnx-success-bg)] hover:bg-[var(--mnx-success-bg)] text-[var(--mnx-text)] text-xs px-3 h-8 flex items-center gap-1.5 animate-pulse"
                >
                  <Check className="size-3.5" /> Force Approve Selected
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleBulkDecide("PENDING_MANAGER")}
                  className="bg-[var(--mnx-info-bg)] hover:bg-[var(--mnx-info-bg)] text-[var(--mnx-text)] text-xs px-3 h-8 flex items-center gap-1.5"
                >
                  <User className="size-3.5" /> Send to Manager Selected
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleBulkDecide("REJECTED")}
                  variant="outline"
                  className="border-[var(--mnx-danger)] text-[var(--mnx-danger)] hover:text-[var(--mnx-danger)] hover:bg-[var(--mnx-danger-bg)]/20 text-xs px-3 h-8 flex items-center gap-1.5"
                >
                  <X className="size-3.5" /> Reject Selected
                </Button>
              </div>
            </div>
          )}

          <DataTable className="overflow-hidden border-mono-border/60 shadow-sm">
            <DataTableHeader>
              <DataTableRow className="hover:bg-transparent">
                <DataTableHead className="w-12">
                  <MnxInput
                    type="checkbox"
                    checked={allSelectableChecked}
                    onChange={() => {
                      const allSelected = selectableRecords.every(
                        (r) => !!selectedRecordIds[r.id],
                      );
                      setSelectedRecordIds((prev) => {
                        const copy = { ...prev };
                        selectableRecords.forEach((r) => {
                          copy[r.id] = !allSelected;
                        });
                        return copy;
                      });
                    }}
                    className="h-4 w-4 rounded border-mono-border text-[var(--mnx-accent)] focus:ring-[var(--mnx-accent)]"
                    aria-label="Select all visible records"
                  />
                </DataTableHead>
                <DataTableHead>Employee / Date</DataTableHead>
                <DataTableHead>Shift Used</DataTableHead>
                <DataTableHead>First / Last Punch</DataTableHead>
                <DataTableHead className="text-right">Worked</DataTableHead>
                <DataTableHead className="text-right">Expected</DataTableHead>
                <DataTableHead className="text-right">OT</DataTableHead>
                <DataTableHead>Status</DataTableHead>
                <DataTableHead className="w-14 text-right">View</DataTableHead>
              </DataTableRow>
            </DataTableHeader>
            <DataTableBody>
              {filteredRecords.length === 0 ? (
                <DataTableEmpty
                  colSpan={9}
                  message="No matching overtime records found."
                  className="py-16 text-sm font-medium"
                />
              ) : (
                filteredRecords.map((rec) => {
                  const isExpanded = !!expandedUsers[rec.id];
                  const canSelect =
                    rec.approvalStatus === "PENDING" ||
                    rec.approvalStatus === "PENDING_MANAGER";
                  const timelineEvents = rec.calculationDetails?.events || [];

                  return (
                    <Fragment key={rec.id}>
                      <DataTableRow
                        className="cursor-pointer border-l-2 border-l-transparent hover:border-l-[var(--mnx-accent)]/60"
                        onClick={() => toggleUserExpand(rec.id)}
                      >
                        <DataTableCell className="w-12">
                          {canSelect ? (
                            <MnxInput
                              type="checkbox"
                              checked={!!selectedRecordIds[rec.id]}
                              onChange={(e) =>
                                handleSelectRecord(rec.id, e.target.checked)
                              }
                              onClick={(e) => e.stopPropagation()}
                              className="h-4 w-4 rounded border-mono-border text-[var(--mnx-accent)] focus:ring-[var(--mnx-accent)]"
                              aria-label={`Select ${rec.user.name} ${formatOtDate(rec.date)}`}
                            />
                          ) : (
                            <div className="w-4" />
                          )}
                        </DataTableCell>
                        <DataTableCell>
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--mnx-accent)]/12 text-xs font-semibold text-[var(--mnx-accent-text)]">
                              {getInitials(rec.user.name)}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="truncate font-semibold text-mono-text">
                                  {rec.user.name}
                                </p>
                                {rec.user.employeeNumber ? (
                                  <span className="rounded-full bg-mono-soft px-2 py-0.5 text-[11px] font-medium text-mono-muted">
                                    #{rec.user.employeeNumber}
                                  </span>
                                ) : null}
                              </div>
                              <p className="truncate text-xs text-mono-muted">
                                {formatOtDate(rec.date)} •{" "}
                                {rec.user.department?.name || "No Department"}
                              </p>
                            </div>
                          </div>
                        </DataTableCell>
                        <DataTableCell className="text-mono-muted">
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-mono-text">
                              {rec.shift?.name || "Organisation Working Hours"}
                            </p>
                            <p className="text-xs">
                              {rec.shift
                                ? `${rec.shift.startTime} - ${rec.shift.endTime}`
                                : `${workingCalendar.workStart} - ${workingCalendar.workEnd}`}
                            </p>
                          </div>
                        </DataTableCell>
                        <DataTableCell className="text-mono-muted">
                          <div className="space-y-1 text-xs">
                            <div>
                              In:{" "}
                              <span className="mnx-numeric text-mono-text">
                                {rec.firstPunchAt
                                  ? new Date(
                                      rec.firstPunchAt,
                                    ).toLocaleTimeString("en-IN", {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })
                                  : "—"}
                              </span>
                            </div>
                            <div>
                              Out:{" "}
                              <span className="mnx-numeric text-mono-text">
                                {rec.lastPunchAt
                                  ? new Date(
                                      rec.lastPunchAt,
                                    ).toLocaleTimeString("en-IN", {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })
                                  : "—"}
                              </span>
                            </div>
                          </div>
                        </DataTableCell>
                        <DataTableCell className="text-right">
                          <div className="mnx-numeric font-medium text-mono-text">
                            {(rec.workedMinutes / 60).toFixed(2)}h
                          </div>
                          <div className="text-xs text-mono-muted">
                            {rec.totalPunchCount} punches
                          </div>
                        </DataTableCell>
                        <DataTableCell className="text-right">
                          <div className="mnx-numeric font-medium text-mono-text">
                            {(rec.expectedMinutes / 60).toFixed(2)}h
                          </div>
                          <div className="text-xs text-mono-muted">
                            {rec.usedOrgFallback
                              ? "Org fallback"
                              : "Assigned shift"}
                          </div>
                        </DataTableCell>
                        <DataTableCell className="text-right">
                          <div className="mnx-numeric font-semibold text-mono-text">
                            {rec.otHours.toFixed(2)}h
                          </div>
                          <div className="text-xs text-[var(--mnx-success)]">
                            ₹{rec.otAmount.toFixed(0)}
                          </div>
                        </DataTableCell>
                        <DataTableCell>
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]",
                              rec.calculationStatus === "VALID"
                                ? "border-[var(--mnx-success)]/20 bg-[var(--mnx-success-bg)]/10 text-[var(--mnx-success)]"
                                : rec.calculationStatus === "NO_OVERTIME"
                                  ? "border-mono-border bg-mono-soft text-mono-muted"
                                  : "border-[var(--mnx-warning)]/20 bg-[var(--mnx-warning-bg)]/10 text-[var(--mnx-warning)]",
                            )}
                          >
                            {rec.calculationStatus.replace(/_/g, " ")}
                          </span>
                        </DataTableCell>
                        <DataTableCell className="text-right">
                          {isExpanded ? (
                            <ChevronDown className="ml-auto size-4 text-mono-muted" />
                          ) : (
                            <ChevronRight className="ml-auto size-4 text-mono-muted" />
                          )}
                        </DataTableCell>
                      </DataTableRow>

                      {isExpanded ? (
                        <DataTableRow className="hover:bg-transparent">
                          <DataTableCell
                            colSpan={9}
                            className="bg-mono-soft/40 px-4 py-4"
                          >
                            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
                              <div className="space-y-3 rounded-xl border border-mono-border/50 bg-mono-card p-4">
                                <h4 className="mnx-title-3 text-mono-accent">
                                  Calculation Summary
                                </h4>
                                <div className="grid gap-3 sm:grid-cols-2">
                                  <div className="rounded-xl bg-mono-soft p-3">
                                    <div className="mnx-dashboard-spec-label">
                                      Difference From Expected
                                    </div>
                                    <div className="mnx-numeric mt-1 text-lg text-mono-text">
                                      {(rec.differenceMinutes / 60).toFixed(2)}h
                                    </div>
                                  </div>
                                  <div className="rounded-xl bg-mono-soft p-3">
                                    <div className="mnx-dashboard-spec-label">
                                      Early / Late Flags
                                    </div>
                                    <div className="mt-1 text-sm text-mono-text">
                                      {rec.earlyLeavingMins > 0
                                        ? `${rec.earlyLeavingMins} mins early out`
                                        : "No early departure"}
                                    </div>
                                  </div>
                                </div>
                                <div className="rounded-xl border border-mono-border/50 bg-mono-soft p-3 text-sm text-mono-muted">
                                  <p>
                                    <span className="mnx-dashboard-spec-label">
                                      Remarks
                                    </span>
                                  </p>
                                  <p className="mt-1 text-mono-text">
                                    {rec.calculationRemarks ||
                                      "No calculation remarks."}
                                  </p>
                                </div>
                              </div>

                              <div className="space-y-3 rounded-xl border border-mono-border/50 bg-mono-card p-4">
                                <h4 className="mnx-title-3 text-mono-accent">
                                  All Punch Records
                                </h4>
                                {timelineEvents.length === 0 ? (
                                  <div className="rounded-xl border border-mono-border/50 bg-mono-soft p-4 text-sm text-mono-muted">
                                    No raw punch timeline is available for this
                                    record.
                                  </div>
                                ) : (
                                  <div className="space-y-2">
                                    {timelineEvents.map((event, index) => (
                                      <div
                                        key={`${event.punchedAt}-${index}`}
                                        className="mnx-panel mnx-accent-edge rounded-xl border border-mono-border/40 bg-mono-soft/60 p-3"
                                      >
                                        <div className="flex items-center justify-between gap-3">
                                          <div>
                                            <p className="text-sm font-medium text-mono-text">
                                              {event.eventType.replace(
                                                /_/g,
                                                " ",
                                              )}
                                            </p>
                                            <p className="text-xs text-mono-muted">
                                              {event.source.toUpperCase()}
                                            </p>
                                          </div>
                                          <div className="text-right">
                                            <p className="mnx-numeric text-sm text-mono-text">
                                              {new Date(
                                                event.punchedAt,
                                              ).toLocaleTimeString("en-IN", {
                                                hour: "2-digit",
                                                minute: "2-digit",
                                                second: "2-digit",
                                              })}
                                            </p>
                                            <p className="text-xs text-mono-muted">
                                              {event.status || "VALID"}
                                            </p>
                                          </div>
                                        </div>
                                        {event.notes ? (
                                          <p className="mt-2 text-xs text-mono-muted">
                                            {event.notes}
                                          </p>
                                        ) : null}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-mono-border/50 bg-mono-card px-4 py-3">
                              <div className="flex flex-wrap items-center gap-3 text-xs text-mono-muted">
                                <span className="rounded-full bg-mono-soft px-2 py-1">
                                  Punches:{" "}
                                  <span className="mnx-numeric text-mono-text">
                                    {rec.totalPunchCount}
                                  </span>
                                </span>
                                <span className="rounded-full bg-mono-soft px-2 py-1">
                                  Comp-Off:{" "}
                                  <span className="mnx-numeric text-mono-text">
                                    {rec.compOffDays.toFixed(1)}
                                  </span>
                                </span>
                                <span className="rounded-full bg-mono-soft px-2 py-1">
                                  Approval:{" "}
                                  <span className="text-mono-text">
                                    {rec.approvalStatus}
                                  </span>
                                </span>
                              </div>
                              <div className="inline-flex gap-1.5">
                                <Button
                                  size="sm"
                                  title="Adjust Values"
                                  onClick={() => {
                                    setAdjustingRecord(rec);
                                    setAdjustedMins(
                                      Math.round(rec.otHours * 60),
                                    );
                                    setAdjustedEarlyMins(rec.earlyLeavingMins);
                                    setAdjustedCompOff(rec.compOffDays);
                                  }}
                                  className="h-8 w-8 p-0 bg-transparent border border-mono-border hover:bg-mono-soft text-mono-muted flex items-center justify-center rounded"
                                >
                                  <Sliders className="size-3.5" />
                                </Button>
                                {(rec.approvalStatus === "PENDING" ||
                                  rec.approvalStatus === "PENDING_MANAGER") && (
                                  <>
                                    <Button
                                      size="sm"
                                      title="Force Approve"
                                      onClick={() =>
                                        handleDecideRecord(rec.id, "APPROVED")
                                      }
                                      className="h-8 w-8 p-0 bg-[var(--mnx-success-bg)] hover:bg-[var(--mnx-success-bg)] text-[var(--mnx-text)] flex items-center justify-center rounded"
                                    >
                                      <Check className="size-3.5" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      title="Send to Manager"
                                      onClick={() =>
                                        handleDecideRecord(
                                          rec.id,
                                          "PENDING_MANAGER",
                                        )
                                      }
                                      className="h-8 w-8 p-0 bg-[var(--mnx-info-bg)] hover:bg-[var(--mnx-info-bg)] text-[var(--mnx-text)] flex items-center justify-center rounded"
                                    >
                                      <User className="size-3.5" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      title="Reject"
                                      onClick={() => {
                                        const remarks = prompt(
                                          "Reason for rejection:",
                                        );
                                        if (remarks !== null)
                                          handleDecideRecord(
                                            rec.id,
                                            "REJECTED",
                                            remarks,
                                          );
                                      }}
                                      className="h-8 w-8 p-0 bg-[var(--mnx-danger-bg)] hover:bg-[var(--mnx-danger-bg)] text-[var(--mnx-text)] flex items-center justify-center rounded"
                                    >
                                      <X className="size-3.5" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>
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
            <Card className="border-0 shadow-sm bg-mono-card">
              <CardHeader className="pb-3 border-b border-mono-border/60">
                <CardTitle className="text-base font-bold text-mono-text text-[var(--mnx-muted)]">
                  Holidays Calendar ({new Date().getFullYear()})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {holidays.length === 0 ? (
                  <div className="text-center text-mono-muted/60 py-16 text-sm font-semibold">
                    No holidays configured for this year.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <MnxTable className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-mono-border bg-mono-soft/20 bg-[var(--mnx-soft)]/10 text-left text-xs text-mono-muted/60 font-bold uppercase">
                          <th className="p-3.5">Date</th>
                          <th className="p-3.5">Name</th>
                          <th className="p-3.5">Type</th>
                          <th className="p-3.5">Applicability</th>
                          <th className="p-3.5 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/40">
                        {holidays.map((h) => (
                          <tr
                            key={h.id}
                            className="hover:bg-mono-soft/30 hover:bg-[var(--mnx-soft)]/10 transition"
                          >
                            <td className="p-3.5 font-bold text-mono-text text-[var(--mnx-muted)]">
                              {new Date(h.date).toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                                weekday: "short",
                              })}
                            </td>
                            <td className="p-3.5 font-medium text-mono-text dark:text-mono-muted/40">
                              {h.name}
                            </td>
                            <td className="p-3.5">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[9px] font-bold border capitalize ${
                                  h.holidayType === "NATIONAL"
                                    ? "bg-[var(--mnx-danger-bg)] text-[var(--mnx-danger)] border-[var(--mnx-danger)]"
                                    : h.holidayType === "RESTRICTED"
                                      ? "bg-[var(--mnx-warning-bg)] text-[var(--mnx-warning)] border-[var(--mnx-warning)]"
                                      : "bg-mono-soft text-mono-text border-mono-border"
                                }`}
                              >
                                {h.holidayType.toLowerCase()}
                              </span>
                            </td>
                            <td className="p-3.5 text-mono-muted font-semibold">
                              {h.branch?.name || "All Branches"}
                            </td>
                            <td className="p-3.5 text-right">
                              <Button
                                size="sm"
                                onClick={() => handleDeleteHoliday(h.id)}
                                className="h-7 w-7 p-0 bg-transparent border border-[var(--mnx-danger)] hover:bg-[var(--mnx-danger-bg)]/10 text-[var(--mnx-danger)] flex items-center justify-center rounded"
                              >
                                <Trash className="size-3.5" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </MnxTable>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div>
            <Card className="border-0 shadow-sm border-l-4 border-l-[var(--mnx-info)] bg-mono-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold text-mono-text text-[var(--mnx-muted)]">
                  Add Holiday
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveHoliday} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-mono-muted/60">
                      Date
                    </label>
                    <DateInput
                      required
                      value={holidayDate}
                      onChange={(e) => setHolidayDate(e.target.value)}
                      className="w-full rounded-lg border border-mono-border bg-mono-card px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-mono-muted/60">
                      Holiday Name
                    </label>
                    <MnxInput
                      type="text"
                      required
                      placeholder="e.g. Independence Day"
                      value={holidayName}
                      onChange={(e) => setHolidayName(e.target.value)}
                      className="w-full rounded-lg border border-mono-border bg-mono-card px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-mono-muted/60">
                      Type
                    </label>
                    <NativeSelect
                      value={holidayType}
                      onChange={(e) => setHolidayType(e.target.value)}
                      className="w-full rounded-lg border border-mono-border bg-mono-card px-3 py-2 text-sm"
                    >
                      <option value="NATIONAL">National Holiday</option>
                      <option value="COMPANY">Company Holiday</option>
                      <option value="RESTRICTED">Restricted Holiday</option>
                    </NativeSelect>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-mono-muted/60">
                      Branch Applicability
                    </label>
                    <NativeSelect
                      value={holidayBranch}
                      onChange={(e) => setHolidayBranch(e.target.value)}
                      className="w-full rounded-lg border border-mono-border bg-mono-card px-3 py-2 text-sm"
                    >
                      <option value="">All Branches</option>
                      {adminData?.branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </NativeSelect>
                  </div>
                  <Button
                    type="submit"
                    disabled={isPending}
                    className="w-full bg-[var(--mnx-info-bg)] hover:bg-[var(--mnx-info-bg)] text-[var(--mnx-text)]"
                  >
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
            <Card className="border-0 shadow-sm bg-mono-card">
              <CardHeader className="pb-3 border-b border-mono-border/60">
                <CardTitle className="text-base font-bold text-mono-text text-[var(--mnx-muted)]">
                  Loss of Pay (LOP) Log Sheets
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {lopRecords.length === 0 ? (
                  <div className="text-center text-mono-muted/60 py-16 text-sm font-semibold">
                    No LOP records logged for this month.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <MnxTable className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-mono-border bg-mono-soft/20 bg-[var(--mnx-soft)]/10 text-left text-xs text-mono-muted/60 font-bold uppercase">
                          <th className="p-3.5">Employee</th>
                          <th className="p-3.5 text-right">LOP Days</th>
                          <th className="p-3.5">Remarks</th>
                          <th className="p-3.5 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/40">
                        {lopRecords.map((r) => (
                          <tr
                            key={r.id}
                            className="hover:bg-mono-soft/30 hover:bg-[var(--mnx-soft)]/10 transition"
                          >
                            <td className="p-3.5">
                              <div className="flex items-center gap-2">
                                <span className="p-1 bg-mono-soft bg-[var(--mnx-soft)] text-mono-muted rounded shrink-0">
                                  <User className="size-4" />
                                </span>
                                <div>
                                  <span className="font-bold text-mono-text text-[var(--mnx-muted)]">
                                    {r.user.name}
                                  </span>
                                  {r.user.employeeNumber && (
                                    <span className="text-[10px] text-mono-muted/60 font-bold ml-1">
                                      #{r.user.employeeNumber}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="p-3.5 text-right font-black text-[var(--mnx-danger)] text-[var(--mnx-danger)]">
                              {r.lopDays.toFixed(1)} days
                            </td>
                            <td className="p-3.5 text-xs text-mono-muted font-semibold max-w-[200px] truncate">
                              {r.remarks || "—"}
                            </td>
                            <td className="p-3.5 text-right">
                              <Button
                                size="sm"
                                onClick={() => handleDeleteLop(r.id)}
                                className="h-7 w-7 p-0 bg-transparent border border-[var(--mnx-danger)] hover:bg-[var(--mnx-danger-bg)]/10 text-[var(--mnx-danger)] inline-flex items-center justify-center rounded"
                              >
                                <Trash className="size-3.5" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </MnxTable>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div>
            <Card className="border-0 shadow-sm border-l-4 border-l-[var(--mnx-danger)] bg-mono-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold text-mono-text text-[var(--mnx-muted)]">
                  Log LOP Days
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveLop} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-mono-muted/60">
                      Employee
                    </label>
                    <NativeSelect
                      required
                      value={lopUser}
                      onChange={(e) => setLopUser(e.target.value)}
                      className="w-full rounded-lg border border-mono-border bg-mono-card px-3 py-2 text-sm"
                    >
                      <option value="">Select Employee</option>
                      {adminData?.employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name} (
                          {emp.employeeNumber
                            ? `#${emp.employeeNumber}`
                            : "No ID"}
                          )
                        </option>
                      ))}
                    </NativeSelect>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-mono-muted/60">
                      LOP Days
                    </label>
                    <MnxInput
                      type="number"
                      step="0.5"
                      min="0.5"
                      required
                      placeholder="e.g. 1.0 or 0.5"
                      value={lopDays}
                      onChange={(e) => setLopDays(e.target.value)}
                      className="w-full rounded-lg border border-mono-border bg-mono-card px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-mono-muted/60">
                      Remarks / Reason
                    </label>
                    <MnxTextarea
                      value={lopRemarks}
                      onChange={(e) => setLopRemarks(e.target.value)}
                      placeholder="Sick leave without balance, unpaid leave..."
                      rows={3}
                      className="w-full rounded-lg border border-mono-border bg-mono-card px-3 py-2 text-sm resize-none"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={isPending}
                    className="w-full bg-[var(--mnx-danger-bg)] hover:bg-[var(--mnx-danger-bg)] text-[var(--mnx-text)]"
                  >
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
          <Card className="border-0 shadow-sm bg-mono-card">
            <CardHeader className="pb-3 border-b border-mono-border/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-base font-bold text-mono-text text-[var(--mnx-muted)]">
                  Consolidated Payroll Summary
                </CardTitle>
                <p className="text-xs text-mono-muted/60 font-semibold mt-1">
                  Payroll metrics merging Loss of Pay and approved Overtime
                  payouts
                </p>
              </div>
              <Button
                onClick={handleExportCsv}
                disabled={payrollRows.length === 0}
                className="flex items-center gap-2 bg-[var(--mnx-soft)] hover:bg-[var(--mnx-soft)] text-[var(--mnx-text)] dark:bg-mono-card text-[var(--mnx-text)] dark:hover:bg-mono-soft text-xs px-3 h-9 rounded-lg"
              >
                <Download className="size-4" />
                Export to CSV
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {payrollRows.length === 0 ? (
                <div className="text-center text-mono-muted/60 py-20 text-sm font-semibold">
                  No payroll summary records available for this month. Ensure OT
                  records are approved.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <MnxTable className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-mono-border bg-mono-soft/20 bg-[var(--mnx-soft)]/10 text-left text-xs text-mono-muted/60 font-bold uppercase">
                        <th className="p-3.5">Employee ID</th>
                        <th className="p-3.5">Name</th>
                        <th className="p-3.5">Department</th>
                        <th className="p-3.5 text-right">Approved OT Hours</th>
                        <th className="p-3.5 text-right">OT Payout Amount</th>
                        <th className="p-3.5 text-right">Approved Comp-Offs</th>
                        <th className="p-3.5 text-right font-black">
                          Loss of Pay (LOP)
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/40">
                      {payrollRows.map((r, i) => (
                        <tr
                          key={i}
                          className="hover:bg-mono-soft/30 hover:bg-[var(--mnx-soft)]/10 transition"
                        >
                          <td className="p-3.5 font-semibold text-mono-muted">
                            #{r.employeeNumber || "N/A"}
                          </td>
                          <td className="p-3.5 font-bold text-mono-text text-[var(--mnx-muted)]">
                            {r.employeeName}
                          </td>
                          <td className="p-3.5 text-mono-muted font-semibold">
                            {r.department || "No Department"}
                          </td>
                          <td className="p-3.5 text-right font-extrabold text-mono-text dark:text-mono-muted/40">
                            {r.totalOtHours.toFixed(2)} hrs
                          </td>
                          <td className="p-3.5 text-right font-extrabold text-[var(--mnx-success)] text-[var(--mnx-success)]">
                            ₹
                            {r.totalOtAmount.toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                            })}
                          </td>
                          <td className="p-3.5 text-right font-bold text-[var(--mnx-accent)]">
                            {r.totalCompOffDays.toFixed(1)} days
                          </td>
                          <td className="p-3.5 text-right font-black text-[var(--mnx-danger)] text-[var(--mnx-danger)]">
                            {r.lopDays.toFixed(1)} days
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </MnxTable>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === "settings" && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] animate-in fade-in duration-300">
          <div className="space-y-4">
            <Card className="relative overflow-hidden border border-mono-border/60 bg-mono-card shadow-sm before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-[var(--mnx-accent)]">
              <CardHeader className="pb-3 border-b border-mono-border/60">
                <CardTitle className="text-base font-semibold text-mono-text">
                  Organisation Working Hours
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={handleSaveWorkingCalendar}
                  className="grid gap-4 sm:grid-cols-2"
                >
                  <div className="space-y-1">
                    <label className="mnx-dashboard-spec-label">
                      Working Start
                    </label>
                    <MnxInput
                      type="time"
                      value={workingCalendar.workStart}
                      onChange={(e) =>
                        setWorkingCalendar({
                          ...workingCalendar,
                          workStart: e.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-mono-border bg-mono-card px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="mnx-dashboard-spec-label">
                      Working End
                    </label>
                    <MnxInput
                      type="time"
                      value={workingCalendar.workEnd}
                      onChange={(e) =>
                        setWorkingCalendar({
                          ...workingCalendar,
                          workEnd: e.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-mono-border bg-mono-card px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="mnx-dashboard-spec-label">
                      Grace Before Start
                    </label>
                    <MnxInput
                      type="number"
                      value={workingCalendar.graceBeforeStartMins}
                      onChange={(e) =>
                        setWorkingCalendar({
                          ...workingCalendar,
                          graceBeforeStartMins:
                            parseInt(e.target.value, 10) || 0,
                        })
                      }
                      className="w-full rounded-lg border border-mono-border bg-mono-card px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="mnx-dashboard-spec-label">
                      Grace After End
                    </label>
                    <MnxInput
                      type="number"
                      value={workingCalendar.graceAfterEndMins}
                      onChange={(e) =>
                        setWorkingCalendar({
                          ...workingCalendar,
                          graceAfterEndMins: parseInt(e.target.value, 10) || 0,
                        })
                      }
                      className="w-full rounded-lg border border-mono-border bg-mono-card px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="mnx-dashboard-spec-label">
                      Default Working Minutes
                    </label>
                    <MnxInput
                      type="number"
                      value={workingCalendar.defaultWorkingMinutes}
                      onChange={(e) =>
                        setWorkingCalendar({
                          ...workingCalendar,
                          defaultWorkingMinutes:
                            parseInt(e.target.value, 10) || 480,
                        })
                      }
                      className="w-full rounded-lg border border-mono-border bg-mono-card px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="mnx-dashboard-spec-label">
                      Minimum OT Minutes
                    </label>
                    <MnxInput
                      type="number"
                      value={workingCalendar.minOvertimeMinutes}
                      onChange={(e) =>
                        setWorkingCalendar({
                          ...workingCalendar,
                          minOvertimeMinutes: parseInt(e.target.value, 10) || 0,
                        })
                      }
                      className="w-full rounded-lg border border-mono-border bg-mono-card px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <label className="mnx-dashboard-spec-label">
                      Weekly Working Days
                    </label>
                    <MnxInput
                      type="text"
                      value={workingCalendar.workingDays}
                      onChange={(e) =>
                        setWorkingCalendar({
                          ...workingCalendar,
                          workingDays: e.target.value,
                        })
                      }
                      placeholder="1,2,3,4,5,6"
                      className="w-full rounded-lg border border-mono-border bg-mono-card px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <label className="mnx-dashboard-spec-label">
                      Default Break Window
                    </label>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <MnxInput
                        type="time"
                        value={workingCalendar.breaks[0]?.start || ""}
                        onChange={(e) =>
                          setWorkingCalendar({
                            ...workingCalendar,
                            breaks: [
                              {
                                start: e.target.value,
                                end: workingCalendar.breaks[0]?.end || "14:00",
                              },
                            ],
                          })
                        }
                        className="w-full rounded-lg border border-mono-border bg-mono-card px-3 py-2 text-sm"
                      />
                      <MnxInput
                        type="time"
                        value={workingCalendar.breaks[0]?.end || ""}
                        onChange={(e) =>
                          setWorkingCalendar({
                            ...workingCalendar,
                            breaks: [
                              {
                                start:
                                  workingCalendar.breaks[0]?.start || "13:00",
                                end: e.target.value,
                              },
                            ],
                          })
                        }
                        className="w-full rounded-lg border border-mono-border bg-mono-card px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <Button
                      type="submit"
                      disabled={isPending}
                      className="w-full bg-[var(--mnx-accent)] hover:bg-[var(--mnx-accent)] text-[var(--mnx-text)]"
                    >
                      {isPending
                        ? "Saving working hours..."
                        : "Save Organisation Hours"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden border border-mono-border/60 bg-mono-card shadow-sm before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-[var(--mnx-accent)]">
              <CardHeader className="pb-3 border-b border-mono-border/60">
                <CardTitle className="text-base font-semibold text-mono-text">
                  Shift Management
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <form
                  onSubmit={handleSaveShift}
                  className="grid gap-4 sm:grid-cols-2"
                >
                  <div className="space-y-1 sm:col-span-2">
                    <label className="mnx-dashboard-spec-label">
                      Shift Name
                    </label>
                    <MnxInput
                      type="text"
                      value={shiftForm.name}
                      onChange={(e) =>
                        setShiftForm({ ...shiftForm, name: e.target.value })
                      }
                      className="w-full rounded-lg border border-mono-border bg-mono-card px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="mnx-dashboard-spec-label">
                      Start Time
                    </label>
                    <MnxInput
                      type="time"
                      value={shiftForm.startTime}
                      onChange={(e) =>
                        setShiftForm({
                          ...shiftForm,
                          startTime: e.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-mono-border bg-mono-card px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="mnx-dashboard-spec-label">End Time</label>
                    <MnxInput
                      type="time"
                      value={shiftForm.endTime}
                      onChange={(e) =>
                        setShiftForm({ ...shiftForm, endTime: e.target.value })
                      }
                      className="w-full rounded-lg border border-mono-border bg-mono-card px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="mnx-dashboard-spec-label">
                      Expected Minutes
                    </label>
                    <MnxInput
                      type="number"
                      value={shiftForm.expectedWorkingMinutes}
                      onChange={(e) =>
                        setShiftForm({
                          ...shiftForm,
                          expectedWorkingMinutes:
                            parseInt(e.target.value, 10) || 480,
                        })
                      }
                      className="w-full rounded-lg border border-mono-border bg-mono-card px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="mnx-dashboard-spec-label">
                      Minimum OT Minutes
                    </label>
                    <MnxInput
                      type="number"
                      value={shiftForm.minOvertimeMinutes}
                      onChange={(e) =>
                        setShiftForm({
                          ...shiftForm,
                          minOvertimeMinutes: parseInt(e.target.value, 10) || 0,
                        })
                      }
                      className="w-full rounded-lg border border-mono-border bg-mono-card px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="mnx-dashboard-spec-label">
                      Grace Before Start
                    </label>
                    <MnxInput
                      type="number"
                      value={shiftForm.graceBeforeStartMins}
                      onChange={(e) =>
                        setShiftForm({
                          ...shiftForm,
                          graceBeforeStartMins:
                            parseInt(e.target.value, 10) || 0,
                        })
                      }
                      className="w-full rounded-lg border border-mono-border bg-mono-card px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="mnx-dashboard-spec-label">
                      Grace After End
                    </label>
                    <MnxInput
                      type="number"
                      value={shiftForm.graceAfterEndMins}
                      onChange={(e) =>
                        setShiftForm({
                          ...shiftForm,
                          graceAfterEndMins: parseInt(e.target.value, 10) || 0,
                        })
                      }
                      className="w-full rounded-lg border border-mono-border bg-mono-card px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <label className="mnx-dashboard-spec-label">
                      Working Days
                    </label>
                    <MnxInput
                      type="text"
                      value={shiftForm.workingDays}
                      onChange={(e) =>
                        setShiftForm({
                          ...shiftForm,
                          workingDays: e.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-mono-border bg-mono-card px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="sm:col-span-2 flex items-center gap-5">
                    <label className="flex items-center gap-2 text-sm text-mono-text">
                      <MnxInput
                        type="checkbox"
                        checked={shiftForm.isActive}
                        onChange={(e) =>
                          setShiftForm({
                            ...shiftForm,
                            isActive: e.target.checked,
                          })
                        }
                      />
                      Active
                    </label>
                    <label className="flex items-center gap-2 text-sm text-mono-text">
                      <MnxInput
                        type="checkbox"
                        checked={shiftForm.isDefault}
                        onChange={(e) =>
                          setShiftForm({
                            ...shiftForm,
                            isDefault: e.target.checked,
                          })
                        }
                      />
                      Default shift
                    </label>
                  </div>
                  <div className="sm:col-span-2 flex gap-3">
                    <Button
                      type="submit"
                      disabled={isPending}
                      className="bg-[var(--mnx-accent)] hover:bg-[var(--mnx-accent)] text-[var(--mnx-text)]"
                    >
                      {shiftForm.id ? "Update Shift" : "Create Shift"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={resetShiftForm}
                    >
                      Reset
                    </Button>
                  </div>
                </form>

                <div className="overflow-hidden rounded-xl border border-mono-border bg-mono-card">
                  <div className="overflow-x-auto">
                    <MnxTable className="mnx-workspace-table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Window</th>
                          <th>Expected</th>
                          <th>Status</th>
                          <th>Default</th>
                        </tr>
                      </thead>
                      <tbody>
                        {shifts.map((shift) => (
                          <tr
                            key={shift.id}
                            className="mnx-row-link"
                            onClick={() =>
                              setShiftForm({
                                ...shift,
                                breakRules: shift.breakRules || [],
                              })
                            }
                          >
                            <td className="font-medium">{shift.name}</td>
                            <td className="mnx-numeric">
                              {shift.startTime} - {shift.endTime}
                            </td>
                            <td className="mnx-numeric">
                              {shift.expectedWorkingMinutes} mins
                            </td>
                            <td>{shift.isActive ? "ACTIVE" : "INACTIVE"}</td>
                            <td>{shift.isDefault ? "YES" : "NO"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </MnxTable>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden border border-mono-border/60 bg-mono-card shadow-sm before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-[var(--mnx-accent)]">
              <CardHeader className="pb-3 border-b border-mono-border/60">
                <CardTitle className="text-base font-semibold text-mono-text">
                  Employee Shift Assignment
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={handleAssignShift}
                  className="grid gap-4 sm:grid-cols-3"
                >
                  <NativeSelect
                    value={shiftAssignmentUserId}
                    onChange={(e) => setShiftAssignmentUserId(e.target.value)}
                    className="rounded-lg border border-mono-border bg-mono-card px-3 py-2 text-sm"
                  >
                    <option value="">Select employee</option>
                    {adminData?.employees.map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.name}
                      </option>
                    ))}
                  </NativeSelect>
                  <NativeSelect
                    value={shiftAssignmentShiftId}
                    onChange={(e) => setShiftAssignmentShiftId(e.target.value)}
                    className="rounded-lg border border-mono-border bg-mono-card px-3 py-2 text-sm"
                  >
                    <option value="">Select shift</option>
                    {shifts
                      .filter((shift) => shift.isActive)
                      .map((shift) => (
                        <option key={shift.id} value={shift.id}>
                          {shift.name}
                        </option>
                      ))}
                  </NativeSelect>
                  <DateInput
                    value={shiftAssignmentStartDate}
                    onChange={(e) =>
                      setShiftAssignmentStartDate(e.target.value)
                    }
                    className="rounded-lg border border-mono-border bg-mono-card px-3 py-2 text-sm"
                  />
                  <div className="sm:col-span-3">
                    <Button
                      type="submit"
                      disabled={isPending}
                      className="bg-[var(--mnx-accent)] hover:bg-[var(--mnx-accent)] text-[var(--mnx-text)]"
                    >
                      Save Shift Assignment
                    </Button>
                  </div>
                </form>

                <div className="mt-4 overflow-hidden rounded-xl border border-mono-border bg-mono-card">
                  <div className="overflow-x-auto">
                    <MnxTable className="mnx-workspace-table">
                      <thead>
                        <tr>
                          <th>Employee</th>
                          <th>Current Shift</th>
                          <th>Effective From</th>
                        </tr>
                      </thead>
                      <tbody>
                        {adminData?.employees.map((employee) => {
                          const assignment = employee.hrmsShiftAssignments?.[0];
                          return (
                            <tr key={employee.id}>
                              <td className="font-medium">{employee.name}</td>
                              <td>
                                {assignment?.shift.name ||
                                  "Organisation Working Hours"}
                              </td>
                              <td className="mnx-numeric">
                                {assignment?.startDate
                                  ? new Date(
                                      assignment.startDate,
                                    ).toLocaleDateString("en-IN")
                                  : "—"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </MnxTable>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card className="relative overflow-hidden border border-mono-border/60 bg-mono-card shadow-sm before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-[var(--mnx-accent)]">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-mono-text">
                  OT Rate & Comp-Off Rules
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveSettings} className="space-y-4">
                  <div className="space-y-1">
                    <label className="mnx-dashboard-spec-label">
                      Standard Shift Hours
                    </label>
                    <MnxInput
                      type="number"
                      step="0.5"
                      required
                      value={otSettings.standardHours}
                      onChange={(e) =>
                        setOtSettings({
                          ...otSettings,
                          standardHours: parseFloat(e.target.value) || 8.0,
                        })
                      }
                      className="w-full rounded-lg border border-mono-border bg-mono-card px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="mnx-dashboard-spec-label">
                      OT Multiplier
                    </label>
                    <MnxInput
                      type="number"
                      step="0.1"
                      required
                      value={otSettings.otRate}
                      onChange={(e) =>
                        setOtSettings({
                          ...otSettings,
                          otRate: parseFloat(e.target.value) || 1.5,
                        })
                      }
                      className="w-full rounded-lg border border-mono-border bg-mono-card px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="mnx-dashboard-spec-label">
                      Legacy Grace Minutes
                    </label>
                    <MnxInput
                      type="number"
                      required
                      value={otSettings.graceMinutes}
                      onChange={(e) =>
                        setOtSettings({
                          ...otSettings,
                          graceMinutes: parseInt(e.target.value, 10) || 15,
                        })
                      }
                      className="w-full rounded-lg border border-mono-border bg-mono-card px-3 py-2 text-sm"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={isPending}
                    className="w-full bg-[var(--mnx-accent)] hover:bg-[var(--mnx-accent)] text-[var(--mnx-text)]"
                  >
                    {isPending ? "Saving..." : "Save OT Rate Rules"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden border border-mono-border/60 bg-mono-card shadow-sm before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-[var(--mnx-accent)]">
              <CardHeader className="pb-3 border-b border-mono-border/60">
                <CardTitle className="text-base font-semibold text-mono-text">
                  Comp-Off Slabs
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {slabs.length === 0 ? (
                  <div className="py-16 text-center text-sm text-mono-muted">
                    No compensation slabs defined.
                  </div>
                ) : (
                  <DataTable className="rounded-none border-0 shadow-none">
                    <DataTableHeader>
                      <DataTableRow className="hover:bg-transparent">
                        <DataTableHead>Minimum Worked Hours</DataTableHead>
                        <DataTableHead className="text-right">
                          Comp-Off Days
                        </DataTableHead>
                        <DataTableHead className="text-right">
                          Action
                        </DataTableHead>
                      </DataTableRow>
                    </DataTableHeader>
                    <DataTableBody>
                      {slabs.map((slab, index) => (
                        <DataTableRow key={index}>
                          <DataTableCell>
                            If employee works &gt;={" "}
                            <span className="font-semibold">
                              {slab.minHours} hours
                            </span>
                          </DataTableCell>
                          <DataTableCell className="text-right font-semibold text-[var(--mnx-accent)]">
                            {slab.compOffDays} days
                          </DataTableCell>
                          <DataTableCell className="text-right">
                            <Button
                              size="sm"
                              onClick={() => handleRemoveSlab(index)}
                              className="h-7 w-7 p-0 bg-transparent border border-[var(--mnx-danger)] hover:bg-[var(--mnx-danger-bg)]/10 text-[var(--mnx-danger)] inline-flex items-center justify-center rounded"
                            >
                              <Trash className="size-3.5" />
                            </Button>
                          </DataTableCell>
                        </DataTableRow>
                      ))}
                    </DataTableBody>
                  </DataTable>
                )}
                <div className="flex items-center gap-3 border-t border-mono-border/60 bg-mono-soft/40 p-4">
                  <div className="flex flex-1 gap-2">
                    <MnxInput
                      type="number"
                      placeholder="Min hours worked"
                      value={newSlabMinHours}
                      onChange={(e) => setNewSlabMinHours(e.target.value)}
                      className="flex-1 rounded-lg border border-mono-border bg-mono-card px-3 py-2 text-sm text-mono-text placeholder:text-mono-muted"
                    />
                    <MnxInput
                      type="number"
                      step="0.5"
                      placeholder="Comp-off days"
                      value={newSlabDays}
                      onChange={(e) => setNewSlabDays(e.target.value)}
                      className="flex-1 rounded-lg border border-mono-border bg-mono-card px-3 py-2 text-sm text-mono-text placeholder:text-mono-muted"
                    />
                  </div>
                  <Button
                    onClick={handleAddSlab}
                    className="flex h-9 items-center gap-1 bg-[var(--mnx-accent)] px-3 text-sm text-[var(--mnx-text)] hover:bg-[var(--mnx-accent)]"
                  >
                    <Plus className="size-3.5" /> Add
                  </Button>
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
            <Card className="border-0 shadow-sm bg-mono-card lg:col-span-2">
              <CardHeader className="pb-3 border-b border-mono-border/60">
                <CardTitle className="text-base font-bold text-mono-text text-[var(--mnx-muted)]">
                  Upload Attendance Punch Log
                </CardTitle>
                <p className="text-xs text-mono-muted/60 font-semibold mt-1">
                  Upload a raw punch card log in CSV, XLS, or XLSX format. For
                  your Early/Late workbook, columns A-G are imported and the
                  remaining columns are ignored.
                </p>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* Upload File Input */}
                <div className="border-2 border-dashed border-mono-border/60 hover:border-[var(--mnx-accent)]/50 rounded-2xl p-8 text-center transition bg-mono-soft/20 bg-[var(--mnx-soft)]/10 cursor-pointer relative">
                  <MnxInput
                    type="file"
                    accept=".csv,.xls,.xlsx"
                    onChange={handleCsvFileUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <div className="space-y-2">
                    <div className="mx-auto w-12 h-12 rounded-full bg-mono-soft bg-[var(--mnx-soft)] flex items-center justify-center text-mono-muted/60">
                      <Download className="size-6 rotate-180 text-[var(--mnx-accent)]" />
                    </div>
                    <div className="text-sm font-bold text-mono-text text-[var(--mnx-muted)]">
                      {csvFileName
                        ? `Selected File: ${csvFileName}`
                        : "Drag & Drop CSV/Excel file or click to select"}
                    </div>
                    <p className="text-xs text-mono-muted/60">
                      Supports `.csv`, `.xls`, and `.xlsx`. Early/Late Excel
                      imports use only columns A-G.
                    </p>
                  </div>
                </div>

                {/* Column Mapping Section */}
                {csvHeaders.length > 0 && (
                  <div className="space-y-4 border border-mono-border/60 rounded-xl p-4 bg-mono-card">
                    <h4 className="text-sm font-black text-mono-text text-[var(--mnx-text)] flex items-center gap-1.5">
                      <Sliders className="size-4 text-[var(--mnx-accent)]" />{" "}
                      Map Imported Columns to Attendance Variables
                    </h4>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1">
                        <label className="text-xs font-bold uppercase tracking-wider text-mono-muted/60 flex items-center justify-between">
                          Employee Number / ID
                          <span className="text-[9px] text-[var(--mnx-accent)] font-black uppercase">
                            (Matches ID)
                          </span>
                        </label>
                        <NativeSelect
                          value={importMappings.employeeNumber}
                          onChange={(e) =>
                            setImportMappings({
                              ...importMappings,
                              employeeNumber: e.target.value,
                            })
                          }
                          className="w-full rounded-lg border border-mono-border bg-mono-card px-3 py-2 text-sm"
                        >
                          <option value="">
                            -- Don&apos;t Map / Optional --
                          </option>
                          {csvHeaders.map((h) => (
                            <option key={h} value={h}>
                              {h}
                            </option>
                          ))}
                        </NativeSelect>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold uppercase tracking-wider text-mono-muted/60 flex items-center justify-between">
                          Official Email Address
                          <span className="text-[9px] text-[var(--mnx-accent)] font-black uppercase">
                            (Matches Email)
                          </span>
                        </label>
                        <NativeSelect
                          value={importMappings.officialEmail}
                          onChange={(e) =>
                            setImportMappings({
                              ...importMappings,
                              officialEmail: e.target.value,
                            })
                          }
                          className="w-full rounded-lg border border-mono-border bg-mono-card px-3 py-2 text-sm"
                        >
                          <option value="">
                            -- Don&apos;t Map / Optional --
                          </option>
                          {csvHeaders.map((h) => (
                            <option key={h} value={h}>
                              {h}
                            </option>
                          ))}
                        </NativeSelect>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold uppercase tracking-wider text-mono-muted/60 flex items-center justify-between">
                          Employee Name
                          <span className="text-[9px] text-[var(--mnx-accent)] font-black uppercase">
                            (Matches Name)
                          </span>
                        </label>
                        <NativeSelect
                          value={importMappings.employeeName}
                          onChange={(e) =>
                            setImportMappings({
                              ...importMappings,
                              employeeName: e.target.value,
                            })
                          }
                          className="w-full rounded-lg border border-mono-border bg-mono-card px-3 py-2 text-sm"
                        >
                          <option value="">
                            -- Don&apos;t Map / Optional --
                          </option>
                          {csvHeaders.map((h) => (
                            <option key={h} value={h}>
                              {h}
                            </option>
                          ))}
                        </NativeSelect>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold uppercase tracking-wider text-mono-muted/60 flex items-center justify-between">
                          Attendance Date *
                          <span className="text-[9px] text-[var(--mnx-danger)] font-black uppercase">
                            (Required)
                          </span>
                        </label>
                        <NativeSelect
                          value={importMappings.attendanceDate}
                          onChange={(e) =>
                            setImportMappings({
                              ...importMappings,
                              attendanceDate: e.target.value,
                            })
                          }
                          required
                          className="w-full rounded-lg border border-mono-border bg-mono-card px-3 py-2 text-sm border-[var(--mnx-danger)]"
                        >
                          <option value="">-- Select Column --</option>
                          {csvHeaders.map((h) => (
                            <option key={h} value={h}>
                              {h}
                            </option>
                          ))}
                        </NativeSelect>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold uppercase tracking-wider text-mono-muted/60 flex items-center justify-between">
                          Check-in / Clock-in Time
                        </label>
                        <NativeSelect
                          value={importMappings.checkIn}
                          onChange={(e) =>
                            setImportMappings({
                              ...importMappings,
                              checkIn: e.target.value,
                            })
                          }
                          className="w-full rounded-lg border border-mono-border bg-mono-card px-3 py-2 text-sm"
                        >
                          <option value="">
                            -- Don&apos;t Map / Optional --
                          </option>
                          {csvHeaders.map((h) => (
                            <option key={h} value={h}>
                              {h}
                            </option>
                          ))}
                        </NativeSelect>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold uppercase tracking-wider text-mono-muted/60 flex items-center justify-between">
                          Check-out / Clock-out Time
                        </label>
                        <NativeSelect
                          value={importMappings.checkOut}
                          onChange={(e) =>
                            setImportMappings({
                              ...importMappings,
                              checkOut: e.target.value,
                            })
                          }
                          className="w-full rounded-lg border border-mono-border bg-mono-card px-3 py-2 text-sm"
                        >
                          <option value="">
                            -- Don&apos;t Map / Optional --
                          </option>
                          {csvHeaders.map((h) => (
                            <option key={h} value={h}>
                              {h}
                            </option>
                          ))}
                        </NativeSelect>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold uppercase tracking-wider text-mono-muted/60 flex items-center justify-between">
                          Total Hours Worked
                        </label>
                        <NativeSelect
                          value={importMappings.totalHours}
                          onChange={(e) =>
                            setImportMappings({
                              ...importMappings,
                              totalHours: e.target.value,
                            })
                          }
                          className="w-full rounded-lg border border-mono-border bg-mono-card px-3 py-2 text-sm"
                        >
                          <option value="">
                            -- Don&apos;t Map / Auto-calculate --
                          </option>
                          {csvHeaders.map((h) => (
                            <option key={h} value={h}>
                              {h}
                            </option>
                          ))}
                        </NativeSelect>
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
                            const res = await importAttendanceDataAction(
                              csvRows,
                              importMappings as any,
                            );
                            if (!res.ok) {
                              toast.error(res.error || "Import failed");
                              return;
                            }
                            setImportSummary(res.data || null);
                            if (res.data?.recalculationDeferred) {
                              toast.success(
                                `Import completed: ${res.data?.imported || 0} inserted, ${res.data?.updated || 0} updated. Run Recompute Month OT Records next.`,
                              );
                              return;
                            }
                            toast.success(
                              `Import completed: ${res.data?.imported || 0} inserted, ${res.data?.updated || 0} updated`,
                            );
                          });
                        }}
                        disabled={isPending}
                        className="bg-[var(--mnx-accent)] hover:bg-[var(--mnx-accent)] text-[var(--mnx-text)] flex items-center gap-1.5"
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
              <Card className="border-0 shadow-sm border-l-4 border-l-[var(--mnx-accent)] bg-mono-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-bold text-mono-text text-[var(--mnx-muted)]">
                    Import Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-mono-muted dark:text-mono-muted/60 space-y-2 leading-relaxed font-semibold">
                  <p>
                    • Employees are matched dynamically using a fallback
                    hierarchy: first by **Employee Number / ID**, then by
                    **Official Email**, and finally by **Exact Name**.
                  </p>
                  <p>
                    • Dates will be parsed and normalized to Asia/Kolkata
                    timezone (IST) midnight boundaries. Supported formats
                    include standard ISO (`YYYY-MM-DD`) and slash formats
                    (`DD-MM-YYYY` or `DD/MM/YYYY`).
                  </p>
                  <p>
                    • Early/Late Excel uploads automatically read the worksheet
                    header row after the report date range and import only
                    columns `A-G`: Employee Id, Employee Name, Email ID, Date,
                    First In, Last Out, and Total Hours.
                  </p>
                  <p>
                    • Check-in and check-out values support 24-hour time strings
                    (`18:30:00`) or meridiem-tagged time strings (`06:30 PM`).
                  </p>
                  <p>
                    • Smaller imports recalculate OT inline. Large imports
                    return the punch import summary first and let you run{" "}
                    <span className="mnx-numeric">
                      Recompute Month OT Records
                    </span>{" "}
                    separately for a faster and more reliable result.
                  </p>
                </CardContent>
              </Card>

              {importSummary && (
                <Card className="border-0 shadow-sm bg-mono-card animate-in zoom-in-95 duration-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold text-mono-text text-[var(--mnx-muted)]">
                      Import Statistics Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2 bg-[var(--mnx-success-bg)]/10 rounded-lg">
                        <div className="text-lg font-black text-[var(--mnx-success)] text-[var(--mnx-success)]">
                          {importSummary.imported}
                        </div>
                        <div className="text-[10px] text-mono-muted/60 font-bold">
                          Imported
                        </div>
                      </div>
                      <div className="p-2 bg-[var(--mnx-info-bg)]/10 rounded-lg">
                        <div className="text-lg font-black text-[var(--mnx-info)] text-[var(--mnx-info)]">
                          {importSummary.updated}
                        </div>
                        <div className="text-[10px] text-mono-muted/60 font-bold">
                          Updated
                        </div>
                      </div>
                      <div className="p-2 bg-[var(--mnx-danger-bg)]/10 rounded-lg">
                        <div className="text-lg font-black text-[var(--mnx-danger)] text-[var(--mnx-danger)]">
                          {importSummary.skipped}
                        </div>
                        <div className="text-[10px] text-mono-muted/60 font-bold">
                          Skipped
                        </div>
                      </div>
                    </div>

                    {importSummary.recalculationDeferred ? (
                      <div className="rounded-xl border border-[var(--mnx-warning)]/35 bg-[var(--mnx-warning)]/10 p-3 text-xs font-semibold text-[var(--mnx-warning)]">
                        Large file import completed without inline OT
                        recalculation to avoid the page hanging. Use{" "}
                        <span className="mnx-numeric">
                          Recompute Month OT Records
                        </span>{" "}
                        for{" "}
                        {importSummary.touchedMonths?.join(", ") ||
                          selectedMonth}
                        .
                      </div>
                    ) : null}

                    {importSummary.errors.length > 0 && (
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-mono-muted/60 tracking-wider">
                          Errors/Logs (Max 50):
                        </label>
                        <div className="max-h-[150px] overflow-y-auto border border-[var(--mnx-danger)]/50 rounded-lg p-2 bg-[var(--mnx-danger-bg)]/5 text-[10px] text-[var(--mnx-danger)] font-mono space-y-1">
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

      {adjustingRecord && (
        <WorkspaceDialog
          open
          onClose={() => setAdjustingRecord(null)}
          eyebrow="Overtime calculation"
          title="Manual calculation overrides"
          description={`For ${adjustingRecord.user.name} on ${new Date(
            adjustingRecord.date,
          ).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}`}
          className="mnx-people-dialog-compact"
          footer={
            <div className="mnx-panel-actions">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setAdjustingRecord(null)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveAdjustments}
                disabled={isPending}
              >
                {isPending ? "Applying..." : "Save overrides"}
              </Button>
            </div>
          }
        >
          <div className="p-5 space-y-4">
            {/* Rate Review Sub-box */}
            {(() => {
              const ctc = adjustingRecord.user?.employmentRecord?.ctc || 0;
              const standardHours = otSettings.standardHours || 8.0;
              const minSalary = getMinuteSalary(
                ctc,
                adjustingRecord.date,
                standardHours,
              );
              const daysInMonth = new Date(
                new Date(adjustingRecord.date).getFullYear(),
                new Date(adjustingRecord.date).getMonth() + 1,
                0,
              ).getDate();
              const monthlyGross = ctc ? ctc / 12 : 0;
              return (
                <div className="rounded-xl border border-mono-border bg-mono-soft/50 px-3 py-2 text-[11px] leading-relaxed select-none">
                  <span className="font-semibold text-mono-text">
                    Rate Review:
                  </span>
                  <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1 text-mono-muted font-medium">
                    <div>
                      Gross Salary:{" "}
                      <span className="font-semibold font-mono text-mono-text">
                        {ctc
                          ? `₹${monthlyGross.toLocaleString("en-IN", { minimumFractionDigits: 2 })}/mo`
                          : "N/A"}
                      </span>
                    </div>
                    <div>
                      Days in Month:{" "}
                      <span className="font-semibold font-mono text-mono-text">
                        {daysInMonth}
                      </span>
                    </div>
                    <div>
                      Minute Salary:{" "}
                      <span className="font-semibold font-mono text-[var(--mnx-success)]">
                        ₹{minSalary.toFixed(4)}/min
                      </span>
                    </div>
                    <div>
                      OT Multiplier:{" "}
                      <span className="font-semibold font-mono text-mono-text">
                        {otSettings.otRate}x
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-mono-muted/60">
                <span>Overtime Minutes</span>
                <span className="text-mono-text text-[var(--mnx-text)] font-black">
                  {adjustedMins} mins ({(adjustedMins / 60).toFixed(2)} hrs)
                </span>
              </div>
              <MnxInput
                type="range"
                min="0"
                max="480"
                step="15"
                value={adjustedMins}
                onChange={(e) => setAdjustedMins(parseInt(e.target.value, 10))}
                className="w-full accent-[var(--mnx-accent)]"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-mono-muted/60">
                <span>Early Leaving Minutes</span>
                <span className="text-mono-text text-[var(--mnx-text)] font-black">
                  {adjustedEarlyMins} mins
                </span>
              </div>
              <MnxInput
                type="range"
                min="0"
                max="240"
                step="10"
                value={adjustedEarlyMins}
                onChange={(e) =>
                  setAdjustedEarlyMins(parseInt(e.target.value, 10))
                }
                className="w-full accent-[var(--mnx-warning)]"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-mono-muted/60">
                <span>Comp-Off Days</span>
                <span className="text-mono-text text-[var(--mnx-text)] font-black">
                  {adjustedCompOff.toFixed(1)} days
                </span>
              </div>
              <MnxInput
                type="range"
                min="0"
                max="2.0"
                step="0.5"
                value={adjustedCompOff}
                onChange={(e) => setAdjustedCompOff(parseFloat(e.target.value))}
                className="w-full accent-[var(--mnx-accent)]"
              />
            </div>
          </div>
        </WorkspaceDialog>
      )}
    </div>
  );
}
