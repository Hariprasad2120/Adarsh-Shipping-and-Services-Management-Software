"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as LucideIcons from "lucide-react";
import {
  productOverview,
  problems,
  solutions,
  modules,
  detailedWorkflowStages,
  moduleInteractions,
  benefits,
  ctaContent
} from "@/lib/catalogue-data";

export default function ProductCataloguePage() {
  const router = useRouter();
  const [activeModuleTab, setActiveModuleTab] = useState<string>("ams");
  const [activeStageId, setActiveStageId] = useState<string>("due_notified");
  const [viewMode, setViewMode] = useState<"timeline" | "blueprint">("timeline");

  const activeModule = modules.find((m) => m.id === activeModuleTab) || modules[0]!;

  // Dynamic Icon Resolver mapping string descriptors to Lucide icon components
  const renderIcon = (iconName: string, size = 20, className = "") => {
    const IconComponent = (LucideIcons as any)[iconName];
    if (!IconComponent) return <LucideIcons.Layers size={size} className={className} />;
    return <IconComponent size={size} className={className} />;
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  // Filter stages based on selected module
  const currentStages = detailedWorkflowStages.filter((s) => s.moduleId === activeModuleTab);
  
  // Find selected active stage details
  const activeStage = detailedWorkflowStages.find((s) => s.stageId === activeStageId && s.moduleId === activeModuleTab) 
    || currentStages[0] 
    || detailedWorkflowStages[0]!;

  return (
    <div className="space-y-16 animate-in fade-in duration-200">
      
      {/* 3D Animations & Print Styling Injections */}
      <style dangerouslySetInnerHTML={{ __html: `
        .pulse-logo-core {
          animation: pulseLogoGlow 3s infinite ease-in-out;
        }
        @keyframes pulseLogoGlow {
          0%, 100% {
            filter: drop-shadow(0 0 10px rgba(0, 206, 196, 0.45));
            transform: scale(1);
          }
          50% {
            filter: drop-shadow(0 0 25px rgba(0, 206, 196, 0.8));
            transform: scale(1.04);
          }
        }
        .orbit-spin-clockwise {
          animation: orbitClockwise 25s infinite linear;
        }
        .orbit-spin-counter {
          animation: orbitCounter 35s infinite linear;
        }
        @keyframes orbitClockwise {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes orbitCounter {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        .glow-timeline-bar {
          box-shadow: 0 0 8px rgba(0, 206, 196, 0.45), inset 0 0 4px rgba(0, 206, 196, 0.2);
        }
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background: #ffffff !important;
            color: #191c1e !important;
          }
          .print-break {
            page-break-after: always !important;
            break-after: page !important;
          }
          .print-card {
            border: 1px solid #bfc8c6 !important;
            background: #ffffff !important;
            box-shadow: none !important;
            color: #191c1e !important;
          }
          .print-text-dark {
            color: #191c1e !important;
          }
          .print-text-muted {
            color: #404947 !important;
          }
        }
      `}} />

      {/* Control bar for Printing & Actions */}
      <div className="no-print flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[var(--color-surface)] border border-[var(--color-outline-variant)] rounded-xl p-4 shadow-sm">
        <div>
          <h1 className="text-lg font-bold text-[var(--color-on-surface)] flex items-center gap-2 font-display uppercase tracking-wider">
            <LucideIcons.BookOpen size={20} className="text-[#00cec4]" />
            Enterprise System Catalogue & Technical Manual
          </h1>
          <p className="text-[var(--color-on-surface-variant)] text-xs mt-0.5">
            Detailed operational walkthroughs, TypeScript signatures, system mutations, and security controls.
          </p>
        </div>
        <button
          onClick={handlePrint}
          className="bg-[#00cec4] text-white hover:bg-[#00b8af] hover:shadow-[0_0_0_3px_rgba(0,206,196,0.25)] px-4 py-2 rounded-xl text-xs uppercase tracking-widest font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap"
        >
          <LucideIcons.Printer size={14} />
          Export Technical Brochure
        </button>
      </div>

      {/* ─── SECTION 1: HERO & CORE ENGINE VISUALIZER ─── */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center pt-4">
        <div className="lg:col-span-7 space-y-6">
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-[#00cec4] uppercase tracking-widest block font-sans">
              SYSTEM ARCHITECTURE MANUAL
            </span>
            <h2 className="ds-h1 text-white text-4xl sm:text-5xl leading-tight">
              {productOverview.name}
            </h2>
            <p className="text-orange-400 font-bold text-sm tracking-wider uppercase">
              {productOverview.tagline}
            </p>
          </div>
          <p className="text-[var(--color-on-surface-variant)] text-sm leading-relaxed max-w-2xl">
            {productOverview.description}
          </p>
          <div className="p-4 border-l-4 border-[#00cec4] bg-[var(--color-surface-container-low)] text-xs text-[var(--color-on-surface)] rounded-r-xl">
            <span className="font-bold block text-[#00cec4] uppercase tracking-wider mb-1">Coded Business Outcome</span>
            {productOverview.keyBusinessValue}
          </div>
          <div className="flex flex-wrap gap-4 no-print">
            <a
              href="#interactive-timelines"
              className="bg-[#00cec4] text-white hover:bg-[#00b8af] hover:shadow-[0_0_0_3px_rgba(0,206,196,0.25)] px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider font-bold transition-all cursor-pointer"
            >
              Interactive Timeline
            </a>
            <a
              href="#system-benefits"
              className="border border-[#00cec4]/40 hover:border-[#00cec4] text-[#00cec4] px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider font-bold transition-all hover:bg-[#00cec4]/5 cursor-pointer"
            >
              View System ROI
            </a>
          </div>
        </div>

        {/* 3D Orbiting Engine Visualizer */}
        <div className="lg:col-span-5 flex justify-center items-center py-6 relative">
          <div className="relative w-72 h-72 flex items-center justify-center">
            {/* Center Core Node */}
            <div className="absolute w-24 h-24 rounded-full bg-slate-900 border-2 border-[#00cec4] flex flex-col items-center justify-center pulse-logo-core z-10 shadow-[0_0_30px_rgba(0,206,196,0.25)]">
              <LucideIcons.Layers size={32} className="text-[#00cec4] mb-1" />
              <span className="text-[8px] font-bold text-white tracking-widest uppercase">MONOLITH</span>
            </div>

            {/* Inner Ring (Clockwise) */}
            <div className="absolute w-48 h-48 border border-[#00cec4]/15 rounded-full orbit-spin-clockwise flex items-center justify-between">
              <div className="w-8 h-8 rounded-full bg-slate-950 border border-[#00cec4]/40 flex items-center justify-center text-[#00cec4] -ml-4 shadow-sm" title="HRMS">
                <LucideIcons.Users size={14} />
              </div>
              <div className="w-8 h-8 rounded-full bg-slate-950 border border-[#00cec4]/40 flex items-center justify-center text-[#00cec4] -mr-4 shadow-sm" title="CRM">
                <LucideIcons.Sparkles size={14} />
              </div>
            </div>

            {/* Outer Ring (Counter Clockwise) */}
            <div className="absolute w-72 h-72 border border-purple-500/10 rounded-full orbit-spin-counter flex items-center justify-around">
              <div className="w-8 h-8 rounded-full bg-slate-950 border border-purple-500/30 flex items-center justify-center text-purple-400 -mt-4 shadow-sm" title="Attendance">
                <LucideIcons.Clock size={14} />
              </div>
              <div className="w-8 h-8 rounded-full bg-slate-950 border border-purple-500/30 flex items-center justify-center text-purple-400 -mb-4 shadow-sm" title="AMS Assets">
                <LucideIcons.HardDrive size={14} />
              </div>
              <div className="w-8 h-8 rounded-full bg-slate-950 border border-purple-500/30 flex items-center justify-center text-purple-400 ml-16 shadow-sm" title="Accounting">
                <LucideIcons.Shield size={14} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Hero Highlight Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {productOverview.highlightCards.map((card, i) => (
          <div key={i} className="card-left-accent p-5 bg-[var(--color-surface)] border border-[var(--color-outline-variant)] rounded-xl relative overflow-hidden print-card">
            <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-1.5">{card.title}</h4>
            <p className="text-[var(--color-on-surface-variant)] text-xs leading-relaxed">{card.description}</p>
          </div>
        ))}
      </div>

      <hr className="border-[var(--color-outline-variant)] opacity-40" />

      {/* ─── SECTION 2: PROBLEM VS. SOLUTION ─── */}
      <section className="space-y-8 print-break">
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-[#fb923c] uppercase tracking-widest block font-sans">CONVERSION METRIC AUDIT</span>
          <h2 className="ds-h2 text-white">System Inefficiencies vs. Coded Platform Solutions</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Market Problems */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-orange-400 uppercase tracking-wider flex items-center gap-2">
              <LucideIcons.ShieldAlert size={16} />
              Operational Silos (Data Friction & Leakage)
            </h3>
            <div className="space-y-4">
              {problems.map((problem) => (
                <div key={problem.id} className="card-top-accent-orange p-5 bg-[var(--color-surface)] border border-[var(--color-outline-variant)] rounded-xl print-card relative">
                  <div className="flex justify-between items-start mb-2 gap-4">
                    <h4 className="text-white font-bold text-xs uppercase tracking-wide">{problem.title}</h4>
                    <span className="text-[10px] font-bold font-mono ds-numeric px-2 py-0.5 rounded bg-orange-950 text-orange-400 border border-orange-400/20 whitespace-nowrap">
                      {problem.metric}
                    </span>
                  </div>
                  <p className="text-[var(--color-on-surface-variant)] text-xs leading-relaxed">{problem.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Core Solutions */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-[#00cec4] uppercase tracking-wider flex items-center gap-2">
              <LucideIcons.Zap size={16} />
              Monolith Architecture Resolutions
            </h3>
            <div className="space-y-4">
              {solutions.map((sol) => (
                <div key={sol.id} className="card-left-accent p-5 bg-[var(--color-surface)] border border-[var(--color-outline-variant)] rounded-xl print-card relative h-fit">
                  <h4 className="text-[#00cec4] font-bold text-xs uppercase tracking-wide mb-2">{sol.title}</h4>
                  <p className="text-[var(--color-on-surface-variant)] text-xs leading-relaxed">{sol.description}</p>
                </div>
              ))}

              <div className="p-6 bg-gradient-to-br from-cyan-950/20 to-blue-950/20 border border-[#00cec4]/35 rounded-xl space-y-4">
                <h4 className="text-white font-bold text-sm uppercase tracking-wider">Ecosystem Synchronization</h4>
                <p className="text-gray-300 text-xs leading-relaxed">
                  Instead of writing code wrappers and polling external software webhooks, Monolith Engine uses a single transactional database schema. Changes in employee CTC are processed immediately by biometric attendance registers; CRM invoice releases update ledger records dynamically.
                </p>
                <div className="text-[10px] font-bold text-[#00cec4] tracking-widest uppercase">
                  ZERO DELAYED SYNC LOGS // ONE SOURCE OF TRUTH
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <hr className="border-[var(--color-outline-variant)] opacity-40" />

      {/* ─── SECTION 3: SPLIT-PANE WORKFLOW TIMELINES ─── */}
      <section className="space-y-6 print-break" id="interactive-timelines">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-[#00cec4] uppercase tracking-widest block font-sans">
              SYSTEM FLOW METALLURGY
            </span>
            <h2 className="ds-h2 text-white">Interactive Modules & Technical Logs Visualizer</h2>
          </div>

          {/* Toggle View Mode: Timeline vs Blueprint Manual */}
          <div className="no-print flex items-center bg-[var(--color-surface-container-low)] border border-[var(--color-outline-variant)]/60 rounded-xl p-1 gap-1">
            <button
              onClick={() => setViewMode("timeline")}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                viewMode === "timeline"
                  ? "bg-[#00cec4] text-slate-950 shadow-sm font-bold"
                  : "text-[var(--color-on-surface-variant)] hover:text-white hover:bg-[#00cec4]/10"
              }`}
            >
              Operations Timeline
            </button>
            <button
              onClick={() => setViewMode("blueprint")}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                viewMode === "blueprint"
                  ? "bg-[#00cec4] text-slate-950 shadow-sm font-bold"
                  : "text-[var(--color-on-surface-variant)] hover:text-white hover:bg-[#00cec4]/10"
              }`}
            >
              System Blueprint Manual
            </button>
          </div>
        </div>

        {/* Dynamic Split-Pane Dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Pane 1 (Left): Module Tab Nav Menu */}
          <div className="lg:col-span-3 space-y-2 no-print">
            <span className="text-[9px] font-bold text-[var(--color-on-surface-variant)] uppercase tracking-wider block px-2">
              Select Module Subsystem
            </span>
            {modules.map((m) => (
              <button
                key={m.id}
                onClick={() => {
                  setActiveModuleTab(m.id);
                  const firstStage = detailedWorkflowStages.find((s) => s.moduleId === m.id);
                  if (firstStage) {
                    setActiveStageId(firstStage.stageId);
                  }
                }}
                className={`w-full text-left px-4 py-3 rounded-xl transition-all flex items-center justify-between border cursor-pointer ${
                  activeModuleTab === m.id
                    ? "bg-[#00cec4]/15 border-[#00cec4] text-[#00cec4] shadow-sm font-bold"
                    : "bg-[var(--color-surface)] border-[var(--color-outline-variant)]/60 text-[var(--color-on-surface-variant)] hover:text-white hover:border-[#00cec4]/40"
                }`}
              >
                <div className="flex items-center gap-2.5 text-xs uppercase tracking-wide">
                  {renderIcon(m.iconName, 14)}
                  <span>{m.name.replace(" MODULE", "").replace(" SYSTEM", "")}</span>
                </div>
                <LucideIcons.ChevronRight size={12} className={activeModuleTab === m.id ? "text-[#00cec4]" : "text-slate-600"} />
              </button>
            ))}
          </div>

          {/* Conditional rendering for Pane 2 & 3 based on viewMode */}
          {viewMode === "timeline" ? (
            <>
              {/* Pane 2 (Middle): Calendar-Style Timeline Logs Rows (Matching Capture format) */}
              <div className="lg:col-span-5 space-y-3 bg-[var(--color-surface)] border border-[var(--color-outline-variant)] rounded-xl p-4 print-card">
                <div className="flex justify-between items-center border-b border-[var(--color-outline-variant)] pb-3 mb-2">
                  <span className="text-[10px] font-bold text-white uppercase tracking-wider">
                    Module Operational Stages
                  </span>
                  <span className="text-[9px] text-[#00cec4] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#00cec4]/10">
                    {currentStages.length} Stages
                  </span>
                </div>

                <div className="space-y-2 max-h-[580px] overflow-y-auto pr-1">
                  {currentStages.map((stage) => {
                    const isActive = activeStageId === stage.stageId;
                    return (
                      <div
                        key={stage.stageId}
                        onClick={() => setActiveStageId(stage.stageId)}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col gap-2 relative overflow-hidden ${
                          isActive
                            ? "bg-[#161f28]/45 border-[#00cec4] shadow-[0_0_12px_rgba(0,206,196,0.15)]"
                            : "bg-[var(--color-surface-container-low)] border-[var(--color-outline-variant)]/50 hover:border-[#00cec4]/35"
                        }`}
                      >
                        {/* Stage Header Info */}
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-[8px] font-bold tracking-widest uppercase font-mono ${
                              isActive ? "bg-[#00cec4] text-slate-950" : "bg-[#1c212a] text-slate-400"
                            }`}>
                              {stage.durationLabel}
                            </span>
                            <h4 className="text-white font-bold text-[10px] uppercase tracking-wide">
                              {stage.stageName.replace(/_/g, " ")}
                            </h4>
                          </div>
                          {renderIcon(stage.iconName, 12, isActive ? "text-[#00cec4]" : "text-slate-500")}
                        </div>

                        {/* Progress Bar Timeline mapping check-in visual style */}
                        <div className="w-full bg-[#0a0d12] h-3.5 rounded-full overflow-hidden border border-[#1c212a] relative">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ease-out glow-timeline-bar ${stage.barWidth} ${
                              isActive
                                ? "bg-gradient-to-r from-[#00cec4]/30 to-[#00cec4]"
                                : "bg-slate-800"
                            }`}
                          />
                        </div>

                        <div className="flex justify-between items-center text-[9px] text-[var(--color-on-surface-variant)] font-mono">
                          <span>{stage.backendFunctions.length} Coded Functions</span>
                          <span className="truncate max-w-[150px]">{stage.summary}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Pane 3 (Right): Slide-Out Detailed Technical Drawer */}
              <div className="lg:col-span-4 bg-[var(--color-surface-container-low)] border border-[var(--color-outline-variant)] rounded-xl p-5 space-y-6 print-card h-fit">
                {/* Header info */}
                <div className="border-b border-[var(--color-outline-variant)] pb-4 space-y-2">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest font-mono">
                        TECHNICAL SPECIFICATION SHEET
                      </span>
                      <h3 className="text-sm font-bold text-[#00cec4] uppercase tracking-wider font-display mt-0.5">
                        {activeStage.stageName.replace(/_/g, " ")}
                      </h3>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-400/25 text-[8px] font-mono font-bold tracking-widest uppercase">
                      {activeStage.durationLabel}
                    </span>
                  </div>
                  <p className="text-[var(--color-on-surface-variant)] text-xs leading-relaxed">
                    {activeStage.description}
                  </p>
                </div>

                {/* Coded Backend Functions Deep Dive */}
                <div className="space-y-4">
                  <h4 className="text-white font-bold text-[10px] uppercase tracking-widest flex items-center gap-1.5 border-b border-[var(--color-outline-variant)] pb-1.5">
                    <LucideIcons.Code size={12} className="text-[#00cec4]" />
                    Coded Backend Logic & Functions
                  </h4>
                  <div className="space-y-4">
                    {activeStage.backendFunctions.map((fn, idx) => (
                      <div key={idx} className="space-y-1.5 p-3 rounded-lg bg-slate-950 border border-[#1c212a]">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold text-white font-mono">{fn.name}</span>
                          <span className="text-[7px] font-bold uppercase tracking-wider text-[#00cec4] bg-[#00cec4]/10 px-1.5 py-0.5 rounded font-mono">
                            TypeScript
                          </span>
                        </div>
                        <code className="block text-[9px] text-cyan-400 font-mono ds-numeric p-1.5 bg-[#070b10] rounded border border-cyan-500/10 overflow-x-auto whitespace-pre-wrap break-all leading-normal">
                          {fn.signature}
                        </code>
                        <p className="text-[9px] text-[var(--color-on-surface-variant)] leading-relaxed">
                          {fn.description}
                        </p>
                        <div className="pt-1.5 flex flex-wrap gap-1">
                          {fn.mutations.map((mut, mIdx) => (
                            <span key={mIdx} className="text-[7px] font-mono text-purple-400 border border-purple-500/20 bg-purple-950/20 px-1.5 py-0.5 rounded font-mono">
                              {mut}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* RBAC Governance Mappings */}
                <div className="space-y-3">
                  <h4 className="text-white font-bold text-[10px] uppercase tracking-widest flex items-center gap-1.5 border-b border-[var(--color-outline-variant)] pb-1.5">
                    <LucideIcons.Shield size={12} className="text-orange-400" />
                    RBAC Access Governance
                  </h4>
                  <div className="space-y-2">
                    {activeStage.userActions.map((act, idx) => (
                      <div key={idx} className="text-[10px] space-y-1">
                        <div className="flex justify-between items-center font-semibold">
                          <span className="text-white">{act.role}</span>
                          <span className="text-[8px] font-mono text-orange-400 border border-orange-500/20 bg-orange-950/20 px-1.5 py-0.5 rounded">
                            {act.permission}
                          </span>
                        </div>
                        <p className="text-[var(--color-on-surface-variant)] text-[9px] leading-relaxed">
                          {act.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Stage Integrations */}
                <div className="space-y-2.5">
                  <h4 className="text-white font-bold text-[10px] uppercase tracking-widest flex items-center gap-1.5 border-b border-[var(--color-outline-variant)] pb-1.5">
                    <LucideIcons.GitMerge size={12} className="text-[#00cec4]" />
                    Ecosystem Integration Mappings
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {activeStage.integrations.map((item, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded border border-[#00cec4]/20 bg-[#00cec4]/5 text-[#00cec4] text-[8px] uppercase tracking-wider font-semibold">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* System Blueprint Manual view (detailed start-to-end guide) */
            <div className="lg:col-span-9 space-y-8 animate-in fade-in duration-300">
              
              {/* Summary & Explanation Card */}
              <div className="card-left-accent p-6 bg-[var(--color-surface)] border border-[var(--color-outline-variant)] rounded-xl print-card relative">
                <span className="text-[8px] font-bold text-[#00cec4] uppercase tracking-widest block font-mono mb-1">
                  MODULE SYSTEM BLUEPRINT
                </span>
                <h3 className="text-white font-bold text-lg uppercase tracking-wide mb-3">
                  {activeModule.name}
                </h3>
                <p className="text-[#00cec4] font-semibold text-xs mb-4">
                  {activeModule.lifecycleGuide.summary}
                </p>
                <div className="text-[var(--color-on-surface-variant)] text-xs leading-relaxed space-y-4">
                  {activeModule.lifecycleGuide.fullProcessExplanation.split('\n\n').map((para, pIdx) => (
                    <p key={pIdx}>{para}</p>
                  ))}
                </div>
              </div>

              {/* Start-to-End Steps Flow */}
              <div className="space-y-4">
                <span className="text-[8px] font-bold text-orange-400 uppercase tracking-widest block font-mono">
                  START-TO-END LIFECYCLE STEPS
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeModule.lifecycleGuide.steps.map((step, idx) => (
                    <div key={idx} className="bg-[var(--color-surface)] border border-[var(--color-outline-variant)] rounded-xl p-4 flex gap-4 items-start hover:border-[#00cec4]/35 transition-all print-card">
                      <span className="w-6 h-6 rounded-full bg-[#00cec4]/15 border border-[#00cec4] text-[#00cec4] flex items-center justify-center text-xs font-bold font-mono shrink-0">
                        {idx + 1}
                      </span>
                      <div className="space-y-1">
                        <h4 className="text-white font-bold text-xs uppercase tracking-wide">
                          {step.title}
                        </h4>
                        <p className="text-[var(--color-on-surface-variant)] text-xs leading-relaxed">
                          {step.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mapped System Functions Deep-Dive */}
              <div className="space-y-4">
                <span className="text-[8px] font-bold text-[#00cec4] uppercase tracking-widest block font-mono">
                  CORE BACKEND LOGIC & DATA OPERATIONS
                </span>
                <div className="space-y-4">
                  {activeModule.lifecycleGuide.functions.map((fn, idx) => (
                    <div key={idx} className="p-5 bg-slate-950 border border-[#1c212a] rounded-xl space-y-3 print-card">
                      <div className="flex justify-between items-center border-b border-[#1c212a] pb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white font-mono">{fn.name}</span>
                          <span className="text-[8px] font-bold uppercase tracking-wider text-[#00cec4] bg-[#00cec4]/10 px-1.5 py-0.5 rounded font-mono">
                            TypeScript Signature
                          </span>
                        </div>
                      </div>
                      
                      <code className="block text-[10px] text-cyan-400 font-mono ds-numeric p-2.5 bg-[#070b10] rounded border border-cyan-500/10 overflow-x-auto whitespace-pre-wrap break-all leading-normal">
                        {fn.signature}
                      </code>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                        <div className="space-y-1">
                          <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest font-mono font-sans">Behavior</span>
                          <p className="text-[9px] text-[var(--color-on-surface-variant)] leading-relaxed">
                            {fn.behavior}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest font-mono font-sans">Usage Context</span>
                          <p className="text-[9px] text-[var(--color-on-surface-variant)] leading-relaxed">
                            {fn.usage}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-[#1c212a]/50">
                        <span className="text-[8px] font-bold text-purple-400 uppercase tracking-widest block font-mono">DB Mutations</span>
                        <div className="flex flex-wrap gap-1.5">
                          {fn.mutations.map((mut, mIdx) => (
                            <span key={mIdx} className="text-[8px] font-mono text-purple-300 border border-purple-500/20 bg-purple-950/20 px-2 py-0.5 rounded">
                              {mut}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

        </div>
      </section>

      <hr className="border-[var(--color-outline-variant)] opacity-40" />

      {/* ─── SECTION 4: UNIFIED PLATFORM INTERACTION MAP ─── */}
      <section className="space-y-6 print-break">
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-[#00cec4] uppercase tracking-widest block font-sans">CROSS-MODULE CONNECTIVITY</span>
          <h2 className="ds-h2 text-white">Platform Subsystems Data Interactions</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {moduleInteractions.map((item, i) => (
            <div key={i} className="p-5 bg-[var(--color-surface)] border border-[var(--color-outline-variant)] rounded-xl relative print-card">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider mb-2.5">
                <span className="text-[#00cec4]">{item.fromModule}</span>
                <LucideIcons.GitCommit size={12} className="text-slate-500" />
                <span className="text-purple-400">{item.toModule}</span>
              </div>
              <p className="text-[var(--color-on-surface-variant)] text-xs leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      <hr className="border-[var(--color-outline-variant)] opacity-40" />

      {/* ─── SECTION 5: CLIENT BENEFITS & OUTCOMES ─── */}
      <section className="space-y-8 print-break" id="system-benefits">
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-[#00cec4] uppercase tracking-widest block font-sans">ECONOMIC OUTCOMES</span>
          <h2 className="ds-h2 text-white">Tangible Client Operating Benefits & ROI</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {benefits.map((b, i) => (
            <div key={i} className="card-left-accent p-6 bg-[var(--color-surface)] border border-[var(--color-outline-variant)] rounded-xl print-card relative flex flex-col justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-white font-bold text-sm uppercase tracking-wide">{b.title}</h3>
                <p className="text-[var(--color-on-surface-variant)] text-xs leading-relaxed">{b.description}</p>
              </div>
              <div className="text-[10px] font-bold font-mono ds-numeric px-3 py-1 rounded-lg bg-cyan-950/40 text-[#00cec4] border border-[#00cec4]/20 w-fit">
                {b.highlight}
              </div>
            </div>
          ))}
        </div>
      </section>

      <hr className="border-[var(--color-outline-variant)] opacity-40" />

      {/* ─── SECTION 6: EXECUTIVE CLOSING CTA ─── */}
      <section className="no-print bg-gradient-to-br from-cyan-950/20 to-blue-950/15 border border-[#00cec4]/40 rounded-2xl p-8 sm:p-12 text-center space-y-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.015)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none"></div>
        <div className="max-w-3xl mx-auto space-y-4">
          <h2 className="ds-h2 text-white text-3xl leading-tight">
            {ctaContent.title}
          </h2>
          <p className="text-gray-300 text-xs leading-relaxed max-w-xl mx-auto">
            {ctaContent.text}
          </p>
        </div>
        
        <div className="flex flex-wrap gap-4 justify-center pt-2">
          <button
            onClick={() => router.push("/crm/leads/new")}
            className="bg-[#00cec4] text-white hover:bg-[#00b8af] hover:shadow-[0_0_0_3px_rgba(0,206,196,0.25)] px-6 py-3 rounded-xl text-xs uppercase tracking-wider font-bold transition-all cursor-pointer"
          >
            {ctaContent.primaryCta}
          </button>
          <a
            href="mailto:solutions@monolithengine.internal"
            className="border border-[#00cec4]/40 hover:border-[#00cec4] text-[#00cec4] px-6 py-3 rounded-xl text-xs uppercase tracking-wider font-bold transition-all hover:bg-[#00cec4]/5 cursor-pointer flex items-center justify-center"
          >
            {ctaContent.secondaryCta}
          </a>
        </div>
        
        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pt-4">
          One Engine. Total Control. Built for Growth.
        </div>
      </section>

    </div>
  );
}
