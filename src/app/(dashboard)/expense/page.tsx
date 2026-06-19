import React from "react";
import Link from "next/link";
import { ShieldAlert, Receipt, FileText, BarChart3, Settings, Calendar, Sparkles, CheckCircle2, ChevronRight } from "lucide-react";

export default function ExpenseUnderdevelopmentPage() {
  const plannedFeatures = [
    {
      title: "OCR Receipt Processing",
      description: "Auto-scan and digitize invoice parameters (merchant, dates, amounts, taxes) from image attachments using high-accuracy OCR scripts.",
      icon: Receipt,
      state: "In Progress"
    },
    {
      title: "Multi-Level Approvals Queue",
      description: "Map approval limits directly to HRMS reporting designation managers (TL -> Manager -> Finance Director).",
      icon: CheckCircle2,
      state: "Planned"
    },
    {
      title: "Budget Threshold Alerts",
      description: "Set department caps. Triggers warning highlights when claims exceed allowance bounds.",
      icon: ShieldAlert,
      state: "Planned"
    },
    {
      title: "Ledger Journal Auto-Postings",
      description: "Approved expenses post balanced debit/credit transaction records directly to Accounting Chart of Accounts.",
      icon: BarChart3,
      state: "Planned"
    }
  ];

  return (
    <div className="py-8 px-4 max-w-[1200px] mx-auto space-y-12 animate-in fade-in duration-200">
      
      {/* Hero Banner: Module Status */}
      <div className="bg-gradient-to-br from-orange-950/20 to-slate-900/10 border border-orange-500/35 rounded-2xl p-8 sm:p-12 text-center space-y-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(251,146,60,0.012)_1px,transparent_1px),linear-gradient(90deg,rgba(251,146,60,0.012)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>
        
        <div className="max-w-2xl mx-auto space-y-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/25 text-orange-400 text-[10px] font-mono font-bold tracking-widest uppercase">
            <Sparkles size={12} className="animate-pulse" />
            Module Under Development
          </span>
          <h2 className="ds-h1 text-white text-3xl sm:text-4xl leading-tight uppercase">
            Expense Management System
          </h2>
          <p className="text-[var(--color-on-surface-variant)] text-xs leading-relaxed max-w-lg mx-auto">
            Our teams are active in compiling the Core Expense engine, linking biometrics travel sheets, OCR scanners, and accounts balances ledger integration.
          </p>
        </div>

        {/* Development Progress Track */}
        <div className="max-w-md mx-auto space-y-2">
          <div className="flex justify-between items-center text-[10px] font-mono text-[var(--color-on-surface-variant)] uppercase tracking-wider font-bold">
            <span>Core Development Progress</span>
            <span className="text-orange-400">80% Completed</span>
          </div>
          <div className="w-full bg-[#0a0d12] h-4 rounded-full overflow-hidden border border-[#1c212a] p-0.5">
            <div className="h-full rounded-full bg-gradient-to-r from-orange-500/30 to-orange-400 w-[80%] shadow-[0_0_8px_rgba(251,146,60,0.3)]" />
          </div>
        </div>

        <div className="flex justify-center pt-2">
          <Link
            href="/product-catalogue"
            className="border border-orange-500/40 hover:border-orange-500 text-orange-400 px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider font-bold transition-all hover:bg-orange-500/5 cursor-pointer flex items-center gap-2"
          >
            Review Catalogue Roadmap
            <ChevronRight size={14} />
          </Link>
        </div>
      </div>

      {/* Planned Feature Blueprint Grid */}
      <div className="space-y-6">
        <div>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block font-mono">
            EXPENSE MODULE ROADMAP
          </span>
          <h3 className="text-white font-bold text-sm uppercase tracking-wider font-display mt-0.5">
            Planned Features & Integration Blueprint
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {plannedFeatures.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <div key={idx} className="card-left-accent-orange bg-[var(--color-surface)] border border-[var(--color-outline-variant)] rounded-xl p-5 relative flex gap-4 items-start hover:border-orange-500/35 transition-all">
                <div className="h-10 w-10 bg-orange-500/10 text-orange-400 rounded-xl flex items-center justify-center shrink-0 border border-orange-500/15">
                  <Icon size={18} />
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center gap-4">
                    <h4 className="text-white font-bold text-xs uppercase tracking-wide">
                      {feat.title}
                    </h4>
                    <span className={`text-[8px] font-mono font-bold tracking-widest uppercase px-1.5 py-0.5 rounded border ${
                      feat.state === "In Progress"
                        ? "bg-orange-950 text-orange-400 border-orange-500/25"
                        : "bg-slate-900 text-slate-400 border-slate-700/30"
                    }`}>
                      {feat.state}
                    </span>
                  </div>
                  <p className="text-[var(--color-on-surface-variant)] text-xs leading-relaxed">
                    {feat.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
