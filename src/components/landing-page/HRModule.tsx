/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import type { Employee } from '../../types/types';
import { ShieldCheck, UserCheck, AlertCircle, FileSpreadsheet, Group, ArrowUpRight } from 'lucide-react';

interface Props {
  employees: Employee[];
}

export default function HRModule({ employees }: Props) {
  const activeCount = employees.filter((e) => e.status === 'Active').length;
  const onLeaveCount = employees.filter((e) => e.status === 'On Leave').length;
  const departments = Array.from(new Set(employees.map((e) => e.department)));

  return (
    <div id="hr-module-root" className="w-full space-y-8 animate-fadeIn text-neutral-900">
      
      {/* Editorial Overview Header */}
      <div className="border border-neutral-200 bg-white p-8 rounded-lg space-y-4">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-black"></span>
          <span className="font-mono text-[10px] tracking-widest text-neutral-400 uppercase font-semibold">
            PROTOCOL REFERENCE // 02
          </span>
        </div>
        <h2 className="text-3xl font-display font-black text-black tracking-tight">
          HR Workforce Suite
        </h2>
        <p className="text-sm text-neutral-600 leading-relaxed max-w-xl">
          The workforce module serves as the primary system of record for all employee lifecycle milestones. From contract initialization and division routing to active security classification audits, this index maps individual data structures securely.
        </p>
      </div>

      {/* Roster & Headcount Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="border border-neutral-200 bg-white p-6 rounded-lg space-y-2">
          <p className="font-mono text-[9px] text-neutral-400 uppercase tracking-widest font-bold">
            Active Enterprise Headcount
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-display font-black text-black">{activeCount}</span>
            <span className="text-xs text-neutral-500 font-mono">Verified Active</span>
          </div>
          <p className="text-[11px] text-neutral-400">Successfully validated on security gateway</p>
        </div>

        <div className="border border-neutral-200 bg-white p-6 rounded-lg space-y-2">
          <p className="font-mono text-[9px] text-neutral-400 uppercase tracking-widest font-bold">
            Active Organization Divisions
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-display font-black text-black">{departments.length}</span>
            <span className="text-xs text-neutral-500 font-mono">Core Verticals</span>
          </div>
          <p className="text-[11px] text-neutral-400">Divided under strict access controls</p>
        </div>

        <div className="border border-neutral-200 bg-white p-6 rounded-lg space-y-2">
          <p className="font-mono text-[9px] text-neutral-400 uppercase tracking-widest font-bold">
            Temporary Status Leaves
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-display font-black text-black">{onLeaveCount}</span>
            <span className="text-xs text-neutral-500 font-mono">Authorized Leaves</span>
          </div>
          <p className="text-[11px] text-neutral-400">Awaiting status cycle synchronization</p>
        </div>
      </div>

      {/* HR Workforce Database Scheme checklist */}
      <div className="border border-neutral-200 bg-white rounded-lg p-6 space-y-6">
        <div>
          <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-black border-b border-neutral-100 pb-2">
            DEMOGRAPHICS & LIFECYCLE PARALLEL WORKFLOWS
          </h3>
          <p className="text-xs text-neutral-500 mt-1">
            Below is the operational sequence triggered when onboarding personnel or changing status.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-white bg-black h-5 w-5 rounded-full flex items-center justify-center">1</span>
              <p className="text-xs font-bold text-black font-sans">Onboard Validation</p>
            </div>
            <p className="text-[11.5px] text-neutral-500 leading-normal font-sans">
              Registers unique system identity keys, verified corporate emails, and active employment models (Hybrid / On-site).
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-white bg-black h-5 w-5 rounded-full flex items-center justify-center">2</span>
              <p className="text-xs font-bold text-black font-sans">Division Routing</p>
            </div>
            <p className="text-[11.5px] text-neutral-500 leading-normal font-sans">
              Maps and assigns division headers (e.g. Engineering, Sales, executive suite) ensuring structured access control trees.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-white bg-black h-5 w-5 rounded-full flex items-center justify-center">3</span>
              <p className="text-xs font-bold text-black font-sans">Verification Loops</p>
            </div>
            <p className="text-[11.5px] text-neutral-500 leading-normal font-sans">
              Provides constant automated checks ensuring personnel active statuses remain tightly bound with access layers.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-white bg-black h-5 w-5 rounded-full flex items-center justify-center">4</span>
              <p className="text-xs font-bold text-black font-sans">Offboard Encryption</p>
            </div>
            <p className="text-[11.5px] text-neutral-500 leading-normal font-sans">
              Transitions system indices into historic archived states, disabling active authorization tokens with perfect log history.
            </p>
          </div>
        </div>
      </div>

      {/* Roster database preview */}
      <div className="space-y-3">
        <p className="font-mono text-xs font-bold text-neutral-500 tracking-wider">
          ACTIVE PERSONNEL ROSTER INDEX PREVIEW
        </p>

        <div className="border border-neutral-200 bg-white rounded-lg overflow-hidden divide-y divide-neutral-100">
          {employees.map((emp) => (
            <div key={emp.id} className="p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4 hover:bg-[#fafafa] transition duration-200">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-neutral-100 text-black border border-neutral-200 flex items-center justify-center font-display font-black text-sm">
                  {emp.name.split(' ').map((n) => n[0]).join('')}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-black font-sans leading-none">{emp.name}</h4>
                  <p className="text-[11px] text-neutral-400 font-mono mt-1 uppercase">
                    {emp.role} // {emp.department}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <span className="text-[10px] font-mono border border-neutral-200 bg-neutral-50 text-neutral-600 px-2 py-0.5 rounded uppercase font-semibold">
                  {emp.workMode}
                </span>
                
                <span className="text-[10px] font-mono border border-neutral-200 bg-neutral-50 text-neutral-600 px-2 py-0.5 rounded uppercase font-semibold">
                  Joined: {emp.dateJoined}
                </span>

                <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                  emp.status === 'Active'
                    ? 'bg-neutral-100 border border-neutral-300 text-black'
                    : 'bg-red-50 border border-red-200 text-red-700'
                }`}>
                  {emp.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="text-center py-4 border-t border-neutral-200">
        <p className="text-[11px] text-neutral-400 font-mono uppercase tracking-widest">
          SYSTEM REFERENCE CODE // SOC2-HR-MONOLITH
        </p>
      </div>

    </div>
  );
}
