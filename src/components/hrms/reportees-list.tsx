"use client";

import React from "react";
import { Phone, CheckCircle, Clock, XCircle, AlertCircle } from "lucide-react";

interface Reportee {
  id: string;
  name: string;
  email: string;
  employeeNo: string;
  designation: string;
  location: string;
  photo: string | null;
  punchStatus: "YET_TO_CHECK_IN" | "CHECKED_IN" | "ON_BREAK" | "CHECKED_OUT";
  shift: {
    name: string;
    startTime: string;
    endTime: string;
  } | null;
}

interface ReporteesListProps {
  reportees: Reportee[];
  isAttendanceView?: boolean;
}

export function ReporteesList({ reportees, isAttendanceView = false }: ReporteesListProps) {
  // Usually checks in maps based on employee shift or hardcoded defaults matching Doc1.pdf
  const getChecksInText = (empNo: string) => {
    if (empNo === "156") return "Usually checks in by 03:30 PM";
    if (empNo === "160") return "Usually checks in by 09:30 AM";
    if (empNo === "191") return "Usually checks in by 09:30 AM";
    return "Usually checks in by 09:30 AM";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "CHECKED_IN":
        return "text-emerald-600";
      case "ON_BREAK":
        return "text-amber-500";
      case "CHECKED_OUT":
        return "text-slate-500";
      default:
        return "text-rose-500"; // Yet to check-in
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "CHECKED_IN":
        return "Checked-in";
      case "ON_BREAK":
        return "On Break";
      case "CHECKED_OUT":
        return "Checked-out";
      default:
        return "Yet to check-in";
    }
  };

  return (
    <div className="space-y-4">
      {/* Search Header for Reportees space */}
      <div className="flex justify-between items-center bg-white p-4 border border-slate-200 rounded-xl">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">116 - PURUSHOTHAMAN V</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs font-bold text-[#00c4b6] bg-[#00c4b6]/10 px-3 py-1 rounded-full">
            Direct {reportees.length}
          </span>
          <span className="text-xs font-semibold text-slate-400">
            All {reportees.length}
          </span>
        </div>
      </div>

      {/* Grid of Reportee Cards */}
      {reportees.length === 0 ? (
        <div className="text-center p-12 bg-white border border-slate-200 rounded-2xl text-slate-400 text-xs font-medium">
          No reportees found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reportees.map((emp) => (
            <div
              key={emp.id}
              className="bg-white border border-slate-200 hover:border-[#00c4b6] rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              {/* Top Section */}
              <div className="flex items-start gap-4">
                <div className="size-12 rounded-full bg-[#00c4b6]/10 flex items-center justify-center text-[#00c4b6] font-bold text-sm shrink-0 border border-[#00c4b6]/20">
                  {emp.photo ? (
                    <img src={emp.photo} alt={emp.name} className="size-full rounded-full object-cover" />
                  ) : (
                    emp.name.charAt(0)
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <h4 className="text-xs font-bold text-slate-800 truncate">
                      {emp.employeeNo} - {emp.name}
                    </h4>
                    <button
                      type="button"
                      onClick={() => navigator.clipboard.writeText(emp.email)}
                      className="p-1 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                      title="Contact"
                    >
                      <Phone className="size-3.5" />
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500 font-semibold truncate">
                    {emp.designation}
                  </p>
                  <p className="text-[9.5px] text-slate-400 font-medium truncate">
                    {emp.location}
                  </p>
                  
                  {/* Punch Status */}
                  <span className={`text-[10px] font-bold block mt-2 ${getStatusColor(emp.punchStatus)}`}>
                    {getStatusLabel(emp.punchStatus)}
                  </span>
                </div>
              </div>

              {/* Attendance-Specific Shift Info */}
              {isAttendanceView && (
                <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col gap-1 text-[10.5px]">
                  {/* Small icon and shift notes */}
                  <div className="flex items-center gap-1.5 text-slate-500 font-semibold">
                    <Clock className="size-3 text-[#00c4b6]" />
                    <span>{getChecksInText(emp.employeeNo)}</span>
                  </div>
                  {emp.shift && (
                    <p className="text-slate-400 font-bold pl-4.5 mt-0.5">
                      {emp.shift.name} - {emp.shift.startTime} AM - {emp.shift.endTime} PM
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
