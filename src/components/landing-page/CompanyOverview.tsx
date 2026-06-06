/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import type { Appraisal, Employee, AttendanceRecord, CRMLead } from '../../types/types';
import { Terminal, Landmark, Clock, Award, Users, ShieldAlert, ArrowUpRight } from 'lucide-react';

interface Props {
  employees: Employee[];
  appraisals: Appraisal[];
  attendance: AttendanceRecord[];
  leads: CRMLead[];
  onSelectModule: (moduleName: 'appraisals' | 'hr' | 'attendance' | 'crm') => void;
}

export default function CompanyOverview({
  employees,
  appraisals,
  attendance,
  leads,
  onSelectModule,
}: Props) {
  // Aggregate stats
  const activePersonnel = employees.filter((e) => e.status === 'Active').length;
  const inReviewAppraisals = appraisals.filter((a) => a.status === 'Under Review').length;
  const activeCheckins = attendance.filter((att) => !att.clockOut).length;
  const totalPipeline = leads.reduce((sum, lead) => sum + lead.value, 0);

  const modules = [
    {
      id: 'appraisals' as const,
      title: 'Appraisal Engine',
      subtitle: 'Manage personnel performance auditing, strategic goals alignment, and review loops.',
      stat: `${inReviewAppraisals} Pending Reviews`,
      icon: Award,
      badge: 'MONOLITH // 01',
    },
    {
      id: 'hr' as const,
      title: 'HR Workforce Suite',
      subtitle: 'Oversee corporate roster databases, organizational divisions, and employee state records.',
      stat: `${activePersonnel} Active Personnel`,
      icon: Users,
      badge: 'MONOLITH // 02',
    },
    {
      id: 'attendance' as const,
      title: 'Attendance Tracker',
      subtitle: 'Biometric timesheets, remote workstation timers, and live scheduling matrices.',
      stat: `${activeCheckins} Active Sign-ins`,
      icon: Clock,
      badge: 'MONOLITH // 03',
    },
    {
      id: 'crm' as const,
      title: 'CRM Sales Pipeline',
      subtitle: 'Forecast annual transaction velocity, deal confidence ranges, and enterprise valuations.',
      stat: `$${totalPipeline.toLocaleString('en-IN')} Active Funnel`,
      icon: Landmark,
      badge: 'MONOLITH // 04',
    },
  ];

  return (
    <div id="company-overview-root" className="w-full space-y-12 animate-fadeIn text-neutral-900">
      
      {/* Editorial Header Section */}
      <div className="space-y-6 max-w-2xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-neutral-100 border border-neutral-200 rounded-full">
          <Terminal className="h-3.5 w-3.5 text-black" />
          <span className="font-mono text-[9px] text-neutral-600 uppercase tracking-widest font-semibold">
            STATUS SYSTEM // CONSOLE READY
          </span>
        </div>

        <h1 className="text-4xl md:text-5xl font-display font-black text-black tracking-tight leading-[1.1]">
          The Decentralized Operating System for <span className="underline decoration-black decoration-wavy underline-offset-4 font-extrabold">Enterprise Core</span>.
        </h1>

        <p className="text-sm md:text-md text-neutral-500 font-sans leading-relaxed max-w-xl">
          A high-fidelity framework built for extreme clarity. Click any functional domain below to review a complete, beautifully organized overview of operational metrics, compliance reports, and interface blueprints.
        </p>
      </div>

      {/* Main High-Fidelity Conceptual Graphic Container (White background, black borders) */}
      <div className="w-full relative border border-neutral-300 bg-white p-2 shadow-sm rounded-lg overflow-hidden group">
        <div className="font-mono text-[9px] text-neutral-400 absolute top-4 left-4 z-10 bg-white/90 px-2 py-0.5 border border-neutral-200 uppercase tracking-widest font-semibold rounded">
          PREVIEW MODEL // LIVE LAYOUT STATUS
        </div>
        <img
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuDrNFUXSoMaB8SKd5AlM_VWQOnrFfZdV1WA4YCafu9fyn8UX7X_OIqzr76maJsthtgZk_Aply-WmddLsi3i_LqRzoZAINwtSUu_LoJf7apdXaMtS7uA8e2OJeUX67PshzAHADr1jged5AUQ_BrGoQpj3AglAeOrLc5h8bC_XlXimLYeEAnVoaEuAdjSAwpuXtqkNEh5h91dlSNoi8bHQelnZId5Vd4VF2hSFvSYzcashnR_Ak_DPBGzC5_vn7WVp-kmYAMvHIVNx8Y"
          alt="Monolith Dashboard main monitor terminal"
          className="w-full h-auto object-cover aspect-[2.39/1] opacity-90 group-hover:opacity-100 transition duration-500"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-white/40 via-transparent to-transparent"></div>
      </div>

      {/* Grid of Interactive Explainer Modules */}
      <div className="space-y-6">
        <div className="border-b border-neutral-200 pb-2">
          <p className="font-mono text-xs font-bold tracking-widest text-black uppercase">
            CHOOSE OPERATIONAL DOMAIN TO BROWSE WORKFLOWS
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {modules.map((m) => {
            const Icon = m.icon;
            return (
              <button
                key={m.id}
                onClick={() => onSelectModule(m.id)}
                className="group text-left border border-neutral-200 bg-white hover:border-black p-6 rounded-lg transition-all duration-300 flex flex-col justify-between space-y-6 shadow-sm hover:shadow-md hover:translate-y-[-2px] cursor-pointer"
              >
                <div className="flex justify-between items-start w-full">
                  <div className="p-3 bg-neutral-50 border border-neutral-200 group-hover:bg-black group-hover:border-black group-hover:text-white rounded transition-colors duration-300">
                    <Icon className="h-5 w-5 text-neutral-600 group-hover:text-white transition-colors" />
                  </div>
                  <span className="font-mono text-[9px] text-neutral-400 font-bold tracking-wider group-hover:text-black transition-colors">
                    {m.badge}
                  </span>
                </div>

                <div className="space-y-2">
                  <h3 className="font-display font-black text-lg text-black tracking-tight group-hover:underline decoration-black decoration-2">
                    {m.title}
                  </h3>
                  <p className="text-xs text-neutral-500 leading-relaxed font-sans">{m.subtitle}</p>
                </div>

                <div className="pt-4 border-t border-neutral-100 flex justify-between items-center w-full">
                  <span className="font-mono text-[10px] text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                    {m.stat}
                  </span>
                  
                  <span className="text-xs font-mono text-black font-bold flex items-center gap-1 group-hover:translate-x-1 duration-200 transition-transform">
                    Explore Overview <ArrowUpRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Clean compliance ribbon */}
      <div className="border border-neutral-200 bg-neutral-50 p-6 rounded-lg flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-neutral-100 border border-neutral-200 text-black rounded">
            <ShieldAlert className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-black font-sans">Active Compliance & Audit Ready</p>
            <p className="text-3xs text-neutral-500 font-mono">SOC2 COMPLIANT MODULES FOR ALL ENTERPRISE DEPLOYMENTS</p>
          </div>
        </div>
        <span className="text-[10px] bg-white border border-neutral-200 text-neutral-700 font-mono px-3 py-1 rounded font-bold uppercase tracking-wider">
          System integrity verified
        </span>
      </div>
    </div>
  );
}
