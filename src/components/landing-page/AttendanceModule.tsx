/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import type { AttendanceRecord, Employee } from '../../types/types';
import { MapPin, Clock, Radio, ShieldCheck, Activity, Milestone } from 'lucide-react';

interface Props {
  attendanceRecords: AttendanceRecord[];
  employees: Employee[];
}

export default function AttendanceModule({
  attendanceRecords,
  employees,
}: Props) {
  const loggedTodayCount = attendanceRecords.length;
  const activeCount = attendanceRecords.filter((rec) => !rec.clockOut).length;
  const lateCount = attendanceRecords.filter((rec) => rec.status === 'Late').length;

  return (
    <div id="attendance-module-root" className="w-full space-y-8 animate-fadeIn text-neutral-900">

      {/* Editorial Overview Header */}
      <div className="border border-neutral-200 bg-white p-8 rounded-lg space-y-4">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-black"></span>
          <span className="font-mono text-[10px] tracking-widest text-neutral-400 uppercase font-semibold">
            PROTOCOL REFERENCE // 03
          </span>
        </div>
        <h2 className="ds-h2 text-black md:text-[1.75rem]">
          Attendance Matrix & Shift Timing
        </h2>
        <p className="text-sm text-neutral-600 leading-relaxed max-w-xl">
          The attendance console manages real-time shifts, geofenced parameters, and biometric checkpoint verification. By logging cryptographic session timing, this system keeps timesheets perfect, audit-ready, and fully verified.
        </p>
      </div>

      {/* Real-Time Operational Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="border border-neutral-200 bg-white p-6 rounded-lg space-y-2">
          <p className="font-mono text-[9px] text-neutral-400 uppercase tracking-widest font-bold">
            Live Active Sign-ins
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-display font-black text-black">{activeCount}</span>
            <span className="text-xs text-neutral-500 font-mono">Verified Active</span>
          </div>
          <p className="text-[11px] text-neutral-400 font-sans">Active active timing counters on client nodes</p>
        </div>

        <div className="border border-neutral-200 bg-white p-6 rounded-lg space-y-2">
          <p className="font-mono text-[9px] text-neutral-400 uppercase tracking-widest font-bold">
            Logged Today
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-display font-black text-black">{loggedTodayCount}</span>
            <span className="text-xs text-neutral-500 font-mono">Signed Shifts</span>
          </div>
          <p className="text-[11px] text-neutral-400 font-sans">Unique session keys written to DB</p>
        </div>

        <div className="border border-neutral-200 bg-white p-6 rounded-lg space-y-2">
          <p className="font-mono text-[9px] text-neutral-400 uppercase tracking-widest font-bold">
            Late Flags Registered
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-display font-black text-black">{lateCount}</span>
            <span className="text-xs text-neutral-500 font-mono">Policy Adjusts</span>
          </div>
          <p className="text-[11px] text-neutral-400 font-sans">Automatic shift threshold adjustments</p>
        </div>
      </div>

      {/* Geofence & Checkpoint Walkthrough */}
      <div className="border border-neutral-200 bg-white rounded-lg p-6 space-y-6">
        <div>
          <h3 className="ds-h3 border-b border-neutral-100 pb-2 text-black">
            BIOMETRIC & LOCATION VALIDATION WORKFLOW
          </h3>
          <p className="text-xs text-neutral-500 mt-1">
            Understanding geofenced check-in rules and terminal validations when personnel connect.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-white bg-black h-5 w-5 rounded-full flex items-center justify-center">1</span>
              <p className="text-xs font-bold text-black font-sans">Check-In Handshake</p>
            </div>
            <p className="text-[11.5px] text-neutral-500 leading-normal font-sans">
              Personnel authenticate via active browser security agents. Credentials and client session structures are validated.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-white bg-black h-5 w-5 rounded-full flex items-center justify-center">2</span>
              <p className="text-xs font-bold text-black font-sans">Geofence Audit</p>
            </div>
            <p className="text-[11.5px] text-neutral-500 leading-normal font-sans">
              The engine matches device location metadata with authorized geofenced zones (e.g., On-site headquarters or Remote IP ranges).
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-white bg-black h-5 w-5 rounded-full flex items-center justify-center">3</span>
              <p className="text-xs font-bold text-black font-sans">Policy Compliance</p>
            </div>
            <p className="text-[11.5px] text-neutral-500 leading-normal font-sans">
              System assesses actual sign-in relative to shifts (e.g. 0900 HR). Flag sets (Late) if past thresholds.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-white bg-black h-5 w-5 rounded-full flex items-center justify-center">4</span>
              <p className="text-xs font-bold text-black font-sans">Immutability Write</p>
            </div>
            <p className="text-[11.5px] text-neutral-500 leading-normal font-sans">
              Timing metrics are bundled, hashed, and written under cryptographic headers to eliminate tampering.
            </p>
          </div>
        </div>
      </div>

      {/* Roster Live Activity Stream Preview */}
      <div className="space-y-3">
        <p className="font-mono text-xs font-bold text-neutral-500 tracking-wider">
          LIVE SHIFT TIMEPENDING LOGS PREVIEW
        </p>

        <div className="border border-neutral-200 bg-white rounded-lg overflow-hidden divide-y divide-neutral-100">
          {attendanceRecords.map((rec) => (
            <div key={rec.id} className="p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4 hover:bg-[#fafafa] transition duration-200">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-black"></span>
                  <p className="text-sm font-bold text-black font-sans leading-none">{rec.employeeName}</p>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-neutral-500 font-mono uppercase">
                  <span>{rec.workMode}</span>
                  <span>•</span>
                  <span>CLOCK IN: {rec.clockIn}</span>
                  <span>•</span>
                  <span>CLOCK OUT: {rec.clockOut || 'ACTIVE'}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-[10px] bg-neutral-100 border border-neutral-200 text-neutral-700 font-mono px-2 py-0.5 rounded uppercase font-semibold">
                  {rec.date}
                </span>

                <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase tracking-wider border ${rec.status === 'On Time'
                    ? 'border-neutral-200 bg-neutral-100 text-black'
                    : 'border-red-200 bg-red-50 text-red-700'
                  }`}>
                  {rec.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="text-center py-4 border-t border-neutral-200">
        <p className="text-[11px] text-neutral-400 font-mono uppercase tracking-widest">
          SYSTEM REFERENCE CODE // SOC2-ATT-MONOLITH
        </p>
      </div>

    </div>
  );
}
