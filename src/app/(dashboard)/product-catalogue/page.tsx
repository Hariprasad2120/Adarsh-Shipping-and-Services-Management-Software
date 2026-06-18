"use client";

import React, { useState } from "react";
import { 
  Printer, 
  BookOpen, 
  Clock, 
  Shield, 
  Award, 
  Users, 
  HardDrive, 
  Bell, 
  Sparkles, 
  CheckCircle2, 
  Info, 
  ArrowRight,
  Database
} from "lucide-react";

export default function ProductCataloguePage() {
  const [activeWorkflowStep, setActiveWorkflowStep] = useState<number>(2);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  
  // Custom states for 3D Tilt Effect
  const [tiltAppraisal, setTiltAppraisal] = useState({ x: 0, y: 0 });
  const [tiltOt, setTiltOt] = useState({ x: 0, y: 0 });

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const handleTilt = (e: React.MouseEvent<HTMLDivElement>, card: "appraisal" | "ot") => {
    const el = e.currentTarget;
    const box = el.getBoundingClientRect();
    const x = e.clientX - box.left - box.width / 2;
    const y = e.clientY - box.top - box.height / 2;
    // Calculate rotation degree (max 12deg)
    const factorX = (y / (box.height / 2)) * 12;
    const factorY = -(x / (box.width / 2)) * 12;
    if (card === "appraisal") {
      setTiltAppraisal({ x: factorX, y: factorY });
    } else {
      setTiltOt({ x: factorX, y: factorY });
    }
  };

  const resetTilt = (card: "appraisal" | "ot") => {
    if (card === "appraisal") {
      setTiltAppraisal({ x: 0, y: 0 });
    } else {
      setTiltOt({ x: 0, y: 0 });
    }
  };

  const workflowSteps = [
    {
      id: 0,
      title: "Organization Setup",
      subtitle: "Multi-branch Directory Mapping",
      icon: Users,
      description: "Admins define the corporate blueprint including legal branch directories, hierarchical departments, and designations. Configures granular permissions via role-based access control (RBAC).",
      features: ["Dynamic Branch creation", "Departmental trees", "RBAC Permission matrices", "Session audits"],
      codedStatus: "Implemented & Active in Org Service"
    },
    {
      id: 1,
      title: "Employee Directory & CTC",
      subtitle: "Onboarding & HR Governance",
      icon: Database,
      description: "Integrates complete employee profiles, document upload drives, Emergency registers, dynamic CTC salary structures, and salary revision tracking panels.",
      features: ["Onboarding document checklists", "Salary structure setup", "Revision history lists", "Document drive"],
      codedStatus: "Active in HRMS Module Core"
    },
    {
      id: 2,
      title: "Biometric & Dynamic OT",
      subtitle: "eSSL Real-Time Recalculations",
      icon: Clock,
      description: "Connects biometric hardware logs to a customized calendar-day-based overtime engine. Employs automated 8-hour shift clocking rules, late-entry checkout shifts, checkout fallbacks for open punch cards, and exact CTC-based minute rates.",
      features: ["Compulsory 8-hour shifts", "Last Out punch fallback tracking", "CTC calendar-days rate calculator", "15-minute grace period"],
      codedStatus: "Fully Optimised OT & Sync Engine"
    },
    {
      id: 3,
      title: "CRM Leads & Pipelines",
      subtitle: "Deals & Revenue Opportunities",
      icon: Sparkles,
      description: "Operates customer portfolios, qualifies incoming leads, records deal stage transitions on interactive pipelines, schedules client follow-up reminders, and generates sales invoice bills.",
      features: ["Deals pipeline Kanban board", "Client interaction archives", "Automatic event alerts", "Sales invoice sheets"],
      codedStatus: "Active in CRM Module"
    },
    {
      id: 4,
      title: "Asset Allocation & AMS",
      subtitle: "Physical Inventory Control",
      icon: HardDrive,
      description: "Creates fixed asset registers (e.g. laptops, vehicles). Manages asset assignments linked directly to employee profiles, handles check-in condition reports, records service maintenance, and calculates monthly straight-line depreciation.",
      features: ["Central asset register", "Handover logs with condition checks", "Service records database", "Depreciation calculator"],
      codedStatus: "Active in AMS Module"
    },
    {
      id: 5,
      title: "Performance Appraisals",
      subtitle: "Structured Cycle Evaluation",
      icon: Award,
      description: "Runs corporate evaluation cycles. Employees submit self-assessments, while managers and peers complete designated review forms. Includes dynamic reviewer availability checks and completion progress meters.",
      features: ["Self-evaluation questionnaires", "Reviewer routing configuration", "Appraisal cycle timers", "Active dashboard metrics"],
      codedStatus: "Active in Performance Module"
    },
    {
      id: 6,
      title: "Double-Entry Ledger",
      subtitle: "Accounting & Invoicing (Future)",
      icon: Shield,
      description: "Feeds operational events (sales won, monthly payroll runs, asset depreciation updates) directly into a standardized double-entry Chart of Accounts, generating Trial Balances, Cash Flows, and P&L sheets.",
      features: ["Dynamic Chart of Accounts", "Automated general ledger postings", "Payroll-to-journal posts", "Trial Balance sheets"],
      codedStatus: "Phase 3 Pipeline Architecture"
    }
  ];

  return (
    <div className="py-6 min-h-screen bg-slate-950/20">
      {/* Dynamic Style injection for 3D elements, print styling and interactive animations */}
      <style dangerouslySetInnerHTML={{ __html: `
        .brochure-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 28px;
        }

        .brochure-page {
          width: 210mm;
          height: 297mm;
          background: radial-gradient(circle at 50% 0%, #111827 0%, #0b0f19 100%);
          position: relative;
          box-sizing: border-box;
          padding: 22mm 18mm;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          overflow: hidden;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6);
          border-radius: 16px;
        }

        .glass-card {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-radius: 12px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .glass-card:hover {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(6, 182, 212, 0.25);
        }

        /* 3D Scene Configurations */
        .scene-3d {
          perspective: 1000px;
        }

        .preserve-3d {
          transform-style: preserve-3d;
        }

        .cube-3d-live {
          transform-style: preserve-3d;
          animation: spinCubeLive 16s infinite linear;
        }

        @keyframes spinCubeLive {
          0% { transform: rotateX(0deg) rotateY(0deg) rotateZ(0deg); }
          100% { transform: rotateX(360deg) rotateY(360deg) rotateZ(360deg); }
        }

        .cube-face {
          position: absolute;
          width: 120px;
          height: 120px;
          background: rgba(6, 182, 212, 0.08);
          border: 1.5px solid rgba(0, 206, 196, 0.6);
          backdrop-filter: blur(8px);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: #fff;
          border-radius: 12px;
          box-shadow: inset 0 0 15px rgba(6, 182, 212, 0.2), 0 0 25px rgba(6, 182, 212, 0.15);
        }

        .cube-face-front  { transform: translateZ(60px); }
        .cube-face-back   { transform: rotateY(180deg) translateZ(60px); }
        .cube-face-left   { transform: rotateY(-90deg) translateZ(60px); }
        .cube-face-right  { transform: rotateY(90deg) translateZ(60px); }
        .cube-face-top    { transform: rotateX(90deg) translateZ(60px); }
        .cube-face-bottom { transform: rotateX(-90deg) translateZ(60px); }

        /* SVG Line drawing active effects */
        .animated-dash-line {
          stroke-dasharray: 8, 8;
          animation: flowDash 30s linear infinite;
        }

        @keyframes flowDash {
          to {
            stroke-dashoffset: -1000;
          }
        }

        /* Pulsing workflow elements */
        .pulse-node {
          animation: pulseNodeGlow 2s infinite ease-in-out;
        }

        @keyframes pulseNodeGlow {
          0%, 100% {
            filter: drop-shadow(0 0 3px rgba(6, 182, 212, 0.5));
            r: 5;
          }
          50% {
            filter: drop-shadow(0 0 8px rgba(6, 182, 212, 0.9));
            r: 7.5;
          }
        }

        /* Floating effect for icons */
        @keyframes subtleFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }

        .float-subtle {
          animation: subtleFloat 4s ease-in-out infinite;
        }

        @media print {
          body {
            background: none !important;
            color: #000000 !important;
          }
          .no-print {
            display: none !important;
          }
          .brochure-container {
            gap: 0 !important;
            padding: 0 !important;
          }
          .brochure-page {
            margin: 0 !important;
            box-shadow: none !important;
            page-break-after: always !important;
            width: 210mm !important;
            height: 297mm !important;
            border-radius: 0 !important;
            background: radial-gradient(circle at 50% 0%, #111827 0%, #0b0f19 100%) !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}} />

      {/* Control bar */}
      <div className="no-print max-w-[210mm] mx-auto mb-6 px-4 flex justify-between items-center bg-surface border border-outline-variant/30 rounded-xl p-4 shadow-sm">
        <div>
          <h1 className="text-lg font-bold text-on-surface flex items-center gap-2">
            <BookOpen size={20} className="text-[#00cec4]" />
            Product Catalogue
          </h1>
          <p className="text-on-surface-variant text-xs mt-0.5">
            ✨ Interactive 3D Experience & Real-Time Engine Visualizer
          </p>
        </div>
        <button
          onClick={handlePrint}
          className="bg-[#00cec4] text-white hover:bg-[#00b8af] hover:shadow-[0_0_0_3px_rgba(0,206,196,0.25)] px-4 py-2 rounded-xl text-sm uppercase tracking-wide transition-all font-semibold flex items-center gap-2 cursor-pointer"
        >
          <Printer size={16} />
          Export to PDF / Print
        </button>
      </div>

      <div className="brochure-container">
        {/* PAGE 1: COVER PAGE WITH SPINNING 3D CUBE */}
        <section className="brochure-page" id="page-1">
          <div className="flex justify-between items-center border-b border-gray-800/60 pb-4">
            <span className="text-cyan-400 tracking-[0.2em] font-bold text-xs uppercase font-display">Enterprise Strategy Brief</span>
            <span className="text-gray-500 text-xs">Confidential // Investor Deck</span>
          </div>
          
          <div className="my-auto flex flex-col items-center text-center relative py-8">
            {/* Grid background */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.02)_1px,transparent_1px)] bg-[size:25px_25px] rounded-2xl transform -skew-y-6 scale-110 pointer-events-none"></div>

            {/* Glowing 3D Live Orbiting Cube Simulation */}
            <div className="relative w-52 h-52 mb-8 flex items-center justify-center scene-3d">
              <div className="absolute inset-0 bg-cyan-500/15 rounded-full blur-3xl"></div>
              
              {/* Spin Live 3D Cube */}
              <div className="w-32 h-32 relative preserve-3d cube-3d-live">
                <div className="cube-face cube-face-front">
                  <Users size={22} className="text-[#00cec4] mb-1" />
                  <span className="text-[10px] font-bold tracking-wider uppercase">HRMS</span>
                </div>
                <div className="cube-face cube-face-back">
                  <Sparkles size={22} className="text-[#fb923c] mb-1" />
                  <span className="text-[10px] font-bold tracking-wider uppercase">CRM</span>
                </div>
                <div className="cube-face cube-face-left">
                  <Clock size={22} className="text-[#fbbf24] mb-1" />
                  <span className="text-[10px] font-bold tracking-wider uppercase">PUNCH</span>
                </div>
                <div className="cube-face cube-face-right">
                  <HardDrive size={22} className="text-[#c084fc] mb-1" />
                  <span className="text-[10px] font-bold tracking-wider uppercase">AMS</span>
                </div>
                <div className="cube-face cube-face-top">
                  <Shield size={22} className="text-[#22c55e] mb-1" />
                  <span className="text-[10px] font-bold tracking-wider uppercase">FINANCE</span>
                </div>
                <div className="cube-face cube-face-bottom">
                  <Award size={22} className="text-[#f472b6] mb-1" />
                  <span className="text-[10px] font-bold tracking-wider uppercase">REVIEW</span>
                </div>
              </div>
            </div>

            <h1 className="text-5xl font-extrabold tracking-tight text-white mb-3 font-display">
              MONOLITH <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500">ENGINE</span>
            </h1>
            <p className="text-orange-400 tracking-wider font-semibold text-xs uppercase mb-6">One Engine. Total Control.</p>
            <h2 className="text-xl font-light text-gray-300 max-w-xl mx-auto leading-relaxed">
              An enterprise-grade operating ecosystem built directly for high-growth operations.
            </h2>
            
            <div className="mt-8 max-w-lg glass-card p-4 text-xs text-gray-400 leading-relaxed border-l-4 border-[#00cec4] text-left">
              Consolidating HRMS directory lists, biometric punch logs, overtime rating multipliers, fixed asset directories, appraisals routing, and CRM sales funnels into one robust relational database network.
            </div>
          </div>

          <div className="flex justify-between items-center text-xs text-gray-500 border-t border-gray-800/60 pt-4">
            <span>© 2026 Monolith Engine Inc.</span>
            <span className="font-bold text-gray-400">01</span>
          </div>
        </section>

        {/* PAGE 2: THE BUSINESS PROBLEM */}
        <section className="brochure-page" id="page-2">
          <div className="flex justify-between items-center border-b border-gray-800/60 pb-4">
            <span className="text-orange-400 tracking-[0.2em] font-bold text-xs uppercase">Market Conflict</span>
            <span className="text-gray-500 text-xs">Section 01 // Problem Space</span>
          </div>

          <div className="my-auto space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Businesses Are Growing Faster Than Their Systems</h2>
              <p className="text-gray-400 text-xs leading-relaxed">
                Operations-heavy mid-market enterprises inevitably suffer from disconnected workflows. Critical records get lost in spreadsheets, email chains, and manual registers, leaking corporate margin.
              </p>
            </div>

            {/* Problem Matrix Chart Representation */}
            <div className="glass-card p-5">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Operational Friction Levels <span className="text-gray-600 text-[9px]">(June 2026 Audit)</span></p>
              <div className="space-y-3.5 text-[11px]">
                <div>
                  <div className="flex justify-between mb-1 text-gray-300"><span>Disconnected Tools (Excel/WhatsApp Approvals)</span> <span className="text-orange-400 font-bold">88% Friction</span></div>
                  <div className="w-full bg-gray-900 h-1.5 rounded-full overflow-hidden"><div className="bg-orange-500 h-full w-[88%]"></div></div>
                </div>
                <div>
                  <div className="flex justify-between mb-1 text-gray-300"><span>Manual HR Processing & Biometric Sync Gaps</span> <span className="text-orange-400 font-bold">72% Data Loss</span></div>
                  <div className="w-full bg-gray-900 h-1.5 rounded-full overflow-hidden"><div className="bg-orange-400 h-full w-[72%]"></div></div>
                </div>
                <div>
                  <div className="flex justify-between mb-1 text-gray-300"><span>Leaked CRM Pipelines & Untracked Leads</span> <span className="text-orange-500 font-bold">61% Revenue Slip</span></div>
                  <div className="w-full bg-gray-900 h-1.5 rounded-full overflow-hidden"><div className="bg-orange-600 h-full w-[61%]"></div></div>
                </div>
                <div>
                  <div className="flex justify-between mb-1 text-gray-300"><span>Untracked Depreciation & Asset Leaks</span> <span className="text-orange-400 font-bold">45% Asset Attrition</span></div>
                  <div className="w-full bg-gray-900 h-1.5 rounded-full overflow-hidden"><div className="bg-orange-500 h-full w-[45%]"></div></div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-[11px]">
              <div className="glass-card p-3.5 border-t-2 border-orange-500/40">
                <h4 className="font-bold text-white mb-1">Information Silos</h4>
                <p className="text-gray-400">Data locked inside disconnected apps, hiding critical visibility.</p>
              </div>
              <div className="glass-card p-3.5 border-t-2 border-orange-500/40">
                <h4 className="font-bold text-white mb-1">Process Lag</h4>
                <p className="text-gray-400">Manual verification loops stall operational execution.</p>
              </div>
              <div className="glass-card p-3.5 border-t-2 border-orange-500/40">
                <h4 className="font-bold text-white mb-1">Scale Constraints</h4>
                <p className="text-gray-400">Rigid systems block customization across multiple branches.</p>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center text-xs text-gray-500 border-t border-gray-800/60 pt-4">
            <span>Monolith Engine Platform Strategy</span>
            <span className="font-bold text-gray-400">02</span>
          </div>
        </section>

        {/* PAGE 3: THE MONOLITH ENGINE SOLUTION & LIVE INTERACTIVE WORKFLOW CHART */}
        <section className="brochure-page" id="page-3">
          <div className="flex justify-between items-center border-b border-gray-800/60 pb-4">
            <span className="text-cyan-400 tracking-[0.2em] font-bold text-xs uppercase font-display">Active Platform</span>
            <span className="text-gray-500 text-xs">Section 02 // Interactive Workflow</span>
          </div>

          <div className="my-auto space-y-5">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1.5">Live Interactive Engine Architecture</h2>
              <p className="text-gray-400 text-xs leading-relaxed">
                Click on the circular numbers below the flowchart to visually route data packets and view the actual functional processes coded inside the engine.
              </p>
            </div>

            {/* LIVE DYNAMIC SVG FLOWCHART */}
            <div className="glass-card p-4 bg-slate-950/60 relative">
              {/* SVG Flowchart */}
              <svg viewBox="0 0 320 80" className="w-full h-auto overflow-visible select-none">
                {/* Connecting lines */}
                <path d="M 30,40 L 75,40" fill="none" stroke={activeWorkflowStep >= 1 ? "#00cec4" : "#1e293b"} strokeWidth="1.5" className={activeWorkflowStep >= 1 ? "animated-dash-line" : ""} />
                <path d="M 75,40 L 120,40" fill="none" stroke={activeWorkflowStep >= 2 ? "#00cec4" : "#1e293b"} strokeWidth="1.5" className={activeWorkflowStep >= 2 ? "animated-dash-line" : ""} />
                <path d="M 120,40 L 165,40" fill="none" stroke={activeWorkflowStep >= 3 ? "#00cec4" : "#1e293b"} strokeWidth="1.5" className={activeWorkflowStep >= 3 ? "animated-dash-line" : ""} />
                <path d="M 165,40 L 210,40" fill="none" stroke={activeWorkflowStep >= 4 ? "#00cec4" : "#1e293b"} strokeWidth="1.5" className={activeWorkflowStep >= 4 ? "animated-dash-line" : ""} />
                <path d="M 210,40 L 255,40" fill="none" stroke={activeWorkflowStep >= 5 ? "#00cec4" : "#1e293b"} strokeWidth="1.5" className={activeWorkflowStep >= 5 ? "animated-dash-line" : ""} />
                <path d="M 255,40 L 290,40" fill="none" stroke={activeWorkflowStep >= 6 ? "#00cec4" : "#1e293b"} strokeWidth="1.5" className={activeWorkflowStep >= 6 ? "animated-dash-line" : ""} />

                {/* Nodes */}
                {/* Step 1: Org */}
                <circle cx="30" cy="40" r="6" className={activeWorkflowStep === 0 ? "pulse-node" : ""} fill={activeWorkflowStep >= 0 ? "#00cec4" : "#1e293b"} />
                <text x="30" y="55" fontSize="6" fill="#94a3b8" textAnchor="middle" fontWeight="bold">ORG</text>
                
                {/* Step 2: Employee */}
                <circle cx="75" cy="40" r="6" className={activeWorkflowStep === 1 ? "pulse-node" : ""} fill={activeWorkflowStep >= 1 ? "#00cec4" : "#1e293b"} />
                <text x="75" y="55" fontSize="6" fill="#94a3b8" textAnchor="middle" fontWeight="bold">HRMS</text>
                
                {/* Step 3: Biometric / OT */}
                <circle cx="120" cy="40" r="6" className={activeWorkflowStep === 2 ? "pulse-node" : ""} fill={activeWorkflowStep >= 2 ? "#00cec4" : "#1e293b"} />
                <text x="120" y="55" fontSize="6" fill="#94a3b8" textAnchor="middle" fontWeight="bold">PUNCH/OT</text>
                
                {/* Step 4: CRM */}
                <circle cx="165" cy="40" r="6" className={activeWorkflowStep === 3 ? "pulse-node" : ""} fill={activeWorkflowStep >= 3 ? "#00cec4" : "#1e293b"} />
                <text x="165" y="55" fontSize="6" fill="#94a3b8" textAnchor="middle" fontWeight="bold">CRM</text>
                
                {/* Step 5: AMS */}
                <circle cx="210" cy="40" r="6" className={activeWorkflowStep === 4 ? "pulse-node" : ""} fill={activeWorkflowStep >= 4 ? "#00cec4" : "#1e293b"} />
                <text x="210" y="55" fontSize="6" fill="#94a3b8" textAnchor="middle" fontWeight="bold">AMS</text>
                
                {/* Step 6: Appraisal */}
                <circle cx="255" cy="40" r="6" className={activeWorkflowStep === 5 ? "pulse-node" : ""} fill={activeWorkflowStep >= 5 ? "#00cec4" : "#1e293b"} />
                <text x="255" y="55" fontSize="6" fill="#94a3b8" textAnchor="middle" fontWeight="bold">REVIEW</text>
                
                {/* Step 7: Ledger */}
                <circle cx="290" cy="40" r="6" className={activeWorkflowStep === 6 ? "pulse-node" : ""} fill={activeWorkflowStep >= 6 ? "#00cec4" : "#1e293b"} />
                <text x="290" y="55" fontSize="6" fill="#94a3b8" textAnchor="middle" fontWeight="bold">LEDGER</text>
              </svg>

              {/* Selector buttons inside dashboard catalog */}
              <div className="flex justify-between mt-2 max-w-[90%] mx-auto no-print">
                {workflowSteps.map((step) => {
                  const Icon = step.icon;
                  const isActive = activeWorkflowStep === step.id;
                  return (
                    <button
                      key={step.id}
                      onClick={() => setActiveWorkflowStep(step.id)}
                      className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                        isActive 
                          ? "bg-[#00cec4] text-slate-950 shadow-[0_0_12px_rgba(0,206,196,0.6)] scale-110" 
                          : "bg-slate-900 border border-gray-800 text-gray-400 hover:text-[#00cec4] hover:border-[#00cec4]/35"
                      }`}
                      title={step.title}
                    >
                      <Icon size={12} />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* DYNAMIC INFORMATION CARD DISPATCHER */}
            <div className="glass-card p-4 min-h-[160px] border-l-4 border-[#00cec4] bg-slate-900/40">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className="text-[9px] uppercase tracking-widest text-[#00cec4] font-bold">
                    {workflowSteps[activeWorkflowStep].subtitle}
                  </span>
                  <h3 className="text-base font-bold text-white uppercase mt-0.5">
                    {workflowSteps[activeWorkflowStep].title}
                  </h3>
                </div>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-400/25 uppercase">
                  {workflowSteps[activeWorkflowStep].codedStatus}
                </span>
              </div>
              <p className="text-gray-400 text-xs leading-relaxed mb-3">
                {workflowSteps[activeWorkflowStep].description}
              </p>
              
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                {workflowSteps[activeWorkflowStep].features.map((feature, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-gray-300">
                    <CheckCircle2 size={10} className="text-[#00cec4] shrink-0" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center text-xs text-gray-500 border-t border-gray-800/60 pt-4">
            <span>Monolith Engine Platform Strategy</span>
            <span className="font-bold text-gray-400">03</span>
          </div>
        </section>

        {/* PAGE 4: ACTIVE MODULE DETAILS & 3D INTERACTIVE TILT DEMOS */}
        <section className="brochure-page" id="page-4">
          <div className="flex justify-between items-center border-b border-gray-800/60 pb-4">
            <span className="text-cyan-400 tracking-[0.2em] font-bold text-xs uppercase font-display">Feature Deep Dive</span>
            <span className="text-gray-500 text-xs">Section 03 // 3D Interactive Tiles</span>
          </div>

          <div className="my-auto space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">What is Implemented in Monolith Engine Now?</h2>
              <p className="text-gray-400 text-xs">
                Hover or move your cursor over the tiles below. These cards respond in real-time with 3D perspective adjustments, demonstrating dynamic visual UI elements.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* TILT CARD 1: OVERTIME ENGINE */}
              <div 
                className="glass-card p-5 relative overflow-hidden transition-all duration-100 ease-out select-none cursor-pointer"
                onMouseMove={(e) => handleTilt(e, "ot")}
                onMouseLeave={() => resetTilt("ot")}
                style={{
                  transform: `perspective(1000px) rotateX(${tiltOt.x}deg) rotateY(${tiltOt.y}deg)`,
                  borderColor: hoveredCard === "ot" ? "rgba(0, 206, 196, 0.45)" : ""
                }}
                onMouseEnter={() => setHoveredCard("ot")}
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-xl pointer-events-none"></div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="p-1.5 bg-[#00cec4]/10 rounded-lg text-[#00cec4]">
                    <Clock size={16} />
                  </span>
                  <h4 className="font-bold text-white text-xs uppercase">Smart Overtime Engine</h4>
                </div>
                <p className="text-[11px] text-gray-400 leading-relaxed mb-3">
                  Coded dynamically to extract employee CTC sheets, calculate calendar-based minute rates, enforce compulsory 8-hour shift clockings, apply late threshold shifts, and utilize punch fallbacks for missing checkouts.
                </p>
                <div className="text-[9px] text-[#00cec4] font-bold flex items-center gap-1">
                  <span>Dynamic CTC Minute Salary math</span> <ArrowRight size={10} />
                </div>
              </div>

              {/* TILT CARD 2: APPRAISAL ROUTER */}
              <div 
                className="glass-card p-5 relative overflow-hidden transition-all duration-100 ease-out select-none cursor-pointer"
                onMouseMove={(e) => handleTilt(e, "appraisal")}
                onMouseLeave={() => resetTilt("appraisal")}
                style={{
                  transform: `perspective(1000px) rotateX(${tiltAppraisal.x}deg) rotateY(${tiltAppraisal.y}deg)`,
                  borderColor: hoveredCard === "appraisal" ? "rgba(192, 132, 252, 0.45)" : ""
                }}
                onMouseEnter={() => setHoveredCard("appraisal")}
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-xl pointer-events-none"></div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="p-1.5 bg-purple-500/10 rounded-lg text-purple-400">
                    <Award size={16} />
                  </span>
                  <h4 className="font-bold text-white text-xs uppercase">Multi-Rater Appraisals</h4>
                </div>
                <p className="text-[11px] text-gray-400 leading-relaxed mb-3">
                  Runs review cycles directly mapping self-appraisals to managers and peer raters. Coded with reviewer availability checkers, question banks, progress status logs, and secure HR release visibility gates.
                </p>
                <div className="text-[9px] text-purple-400 font-bold flex items-center gap-1">
                  <span>Coded Peer & Manager flows</span> <ArrowRight size={10} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-[11px]">
              <div className="glass-card p-3.5">
                <h5 className="font-bold text-white mb-1 uppercase">CRM Pipeline</h5>
                <p className="text-gray-400 text-[10px]">Deals Kanban, logs customer call histories, tracks quotes and orders.</p>
              </div>
              <div className="glass-card p-3.5">
                <h5 className="font-bold text-white mb-1 uppercase">AMS Registers</h5>
                <p className="text-gray-400 text-[10px]">Allocates hardware assets, registers audit verify stamps, calculates depreciation.</p>
              </div>
              <div className="glass-card p-3.5">
                <h5 className="font-bold text-white mb-1 uppercase">HRMS Directory</h5>
                <p className="text-gray-400 text-[10px]">Onboarding folders, designations mapping, travel claims, salary revision sheets.</p>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center text-xs text-gray-500 border-t border-gray-800/60 pt-4">
            <span>Monolith Engine Platform Strategy</span>
            <span className="font-bold text-gray-400">04</span>
          </div>
        </section>

        {/* PAGE 12: TECHNICAL ARCHITECTURE */}
        <section className="brochure-page" id="page-12">
          <div className="flex justify-between items-center border-b border-gray-800/60 pb-4">
            <span className="text-cyan-400 tracking-[0.2em] font-bold text-xs uppercase font-display">System Specifications</span>
            <span className="text-gray-500 text-xs">Section 12 // Tech Stack</span>
          </div>

          <div className="my-auto space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Built on a Scalable Modular Architecture</h2>
              <p className="text-gray-400 text-xs">Enterprise-grade core infrastructure tailored to withstand transactional velocity with zero degraded latency profiles.</p>
            </div>

            {/* Layered Architecture Graphic Simulation */}
            <div className="space-y-2 text-xs">
              <div className="p-3 glass-card border-b-2 border-cyan-400 text-center font-bold text-white">User Interface Layer: Next.js / React Framework / Shared UI System</div>
              <div className="p-3 glass-card border-b-2 border-blue-500 text-center font-bold text-cyan-300">API Gateway & App Service Layer: Server Actions / Contracts</div>
              <div className="p-3 glass-card border-b-2 border-purple-500 text-center font-bold text-purple-300">Modular Business Logic Services: (HRMS / CRM / AMS Engine Domains)</div>
              <div className="p-3 glass-card border-b-2 border-emerald-500 text-center font-bold text-emerald-400">Persistence Engine Layer: Prisma ORM & Highly Indexed PostgreSQL Database</div>
            </div>

            <div className="glass-card p-4 text-xs space-y-2 text-gray-400">
              <p className="flex items-center gap-1 text-[#00cec4] font-bold">
                <Info size={12} />
                <span>Active Database Schema Features:</span>
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-300 pl-1">
                <li>Strict multi-tenant organization boundaries built dynamically into queries.</li>
                <li>Biometric punches sync into automated daily timesheet logs natively.</li>
                <li>Employee employment profile records are joined to salary sheets for real-time rates computation.</li>
              </ul>
            </div>
          </div>

          <div className="flex justify-between items-center text-xs text-gray-500 border-t border-gray-800/60 pt-4">
            <span>Monolith Engine Platform Strategy</span>
            <span className="font-bold text-gray-400">12</span>
          </div>
        </section>

        {/* PAGE 15: INVESTOR VALUE PROPOSITION */}
        <section className="brochure-page" id="page-15">
          <div className="flex justify-between items-center border-b border-gray-800/60 pb-4">
            <span className="text-cyan-400 tracking-[0.2em] font-bold text-xs uppercase font-display">Financial Investment Architecture</span>
            <span className="text-gray-500 text-xs">Section 15 // Investor Metrics</span>
          </div>

          <div className="my-auto space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">A Scalable SaaS Opportunity for Operations-Heavy Businesses</h2>
              <p className="text-gray-400 text-xs">Capturing standard enterprise recurring contracts by weaponizing an all-in-one low-friction migration system.</p>
            </div>

            {/* Flywheel Visual Map */}
            <div className="grid grid-cols-3 gap-3 text-center text-xs">
              <div className="p-3 glass-card border-cyan-500/35">
                <div className="text-cyan-400 font-extrabold text-sm mb-1 uppercase">01. Adopt Core</div>
                <p className="text-gray-400 text-[10px] leading-relaxed">Low barrier entry point via modern HRMS/Attendance engine footprints.</p>
              </div>
              <div className="p-3 glass-card border-cyan-500/35">
                <div className="text-cyan-400 font-extrabold text-sm mb-1 uppercase">02. Land & Expand</div>
                <p className="text-gray-400 text-[10px] leading-relaxed">Immediate upsell activations for CRM pipelines and asset vaults.</p>
              </div>
              <div className="p-3 glass-card border-cyan-500/35">
                <div className="text-cyan-400 font-extrabold text-sm mb-1 uppercase">03. High Stickiness</div>
                <p className="text-gray-400 text-[10px] leading-relaxed">Intertwined internal logs build extreme ecosystem structural retention.</p>
              </div>
            </div>

            <div className="glass-card p-4">
              <h4 className="text-xs uppercase text-orange-400 tracking-wider font-bold mb-2">Macro Market Dynamic Tailwinds</h4>
              <p className="text-xs text-gray-400 leading-relaxed">
                SMEs currently expend thousands monthly trying to bind independent point tools using custom engineers. Monolith Engine intercepts this capital by offering native compatibility at a fraction of systemic maintenance expenses.
              </p>
            </div>
          </div>

          <div className="flex justify-between items-center text-xs text-gray-500 border-t border-gray-800/60 pt-4">
            <span>Monolith Engine Platform Strategy</span>
            <span className="font-bold text-gray-400">15</span>
          </div>
        </section>

        {/* PAGE 17: PRODUCT ROADMAP */}
        <section className="brochure-page" id="page-17">
          <div className="flex justify-between items-center border-b border-gray-800/60 pb-4">
            <span className="text-cyan-400 tracking-[0.2em] font-bold text-xs uppercase font-display">Milestone Targets</span>
            <span className="text-gray-500 text-xs">Section 17 // Horizons</span>
          </div>

          <div className="my-auto space-y-5">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">Product Growth Roadmap</h2>
              <p className="text-gray-400 text-xs">A controlled multi-phased engineering rollout targeting total dominance over operational execution spaces.</p>
            </div>

            {/* Horizontal / Stacked Timeline Design */}
            <div className="space-y-2.5 text-[11px]">
              <div className="flex items-start gap-4 p-3 glass-card border-l-4 border-cyan-400">
                <div className="bg-cyan-950 text-cyan-400 px-2 py-1 rounded font-bold uppercase text-[9px] whitespace-nowrap">Phase 1</div>
                <div>
                  <strong className="text-white block uppercase">Core Infrastructure Layer (Current Release)</strong>
                  <span className="text-gray-400 text-[10px]">Authentication architectures, HRMS directory mapping, biometric database synchronizers, overtime rate calculation engine, AMS assets directories.</span>
                </div>
              </div>
              <div className="flex items-start gap-4 p-3 glass-card border-l-4 border-cyan-500">
                <div className="bg-blue-950 text-cyan-400 px-2 py-1 rounded font-bold uppercase text-[9px] whitespace-nowrap">Phase 2</div>
                <div>
                  <strong className="text-white block uppercase">Workflow Advanced Orchestration Engine</strong>
                  <span className="text-gray-400 text-[10px]">Automated employee self-appraisal cycles, peer-reviewer routing chains, task checklists.</span>
                </div>
              </div>
              <div className="flex items-start gap-4 p-3 glass-card border-l-4 border-orange-500">
                <div className="bg-orange-950 text-orange-400 px-2 py-1 rounded font-bold uppercase text-[9px] whitespace-nowrap">Phase 3</div>
                <div>
                  <strong className="text-white block uppercase">Unified Ledger Integration Frame</strong>
                  <span className="text-gray-400 text-[10px]">Double-entry ledger journal postings instantly fed from daily sales orders and HRMS monthly payroll records.</span>
                </div>
              </div>
              <div className="flex items-start gap-4 p-3 glass-card border-l-4 border-purple-500">
                <div className="bg-purple-950 text-purple-400 px-2 py-1 rounded font-bold uppercase text-[9px] whitespace-nowrap">Phase 4</div>
                <div>
                  <strong className="text-white block uppercase">Predictive Business Context Artificial Intelligence</strong>
                  <span className="text-gray-400 text-[10px]">Automated cash-flow forecasting vectors, predictive sales cycle estimations, and HR chatbot interfaces.</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center text-xs text-gray-500 border-t border-gray-800/60 pt-4">
            <span>Monolith Engine Platform Strategy</span>
            <span className="font-bold text-gray-400">17</span>
          </div>
        </section>

        {/* PAGE 18: CLOSING / EXECUTIVE SUMMARY */}
        <section className="brochure-page" id="page-18">
          <div className="flex justify-between items-center border-b border-gray-800/60 pb-4">
            <span className="text-cyan-400 tracking-[0.2em] font-bold text-xs uppercase font-display">Strategic Closing</span>
            <span className="text-gray-500 text-xs">Conclusion // Call To Action</span>
          </div>

          <div className="my-auto text-center space-y-8 max-w-xl mx-auto">
            <h2 className="text-3xl font-extrabold text-white leading-tight font-display">
              The Digital Backbone for Scalable Business Growth
            </h2>
            
            <p className="text-gray-300 text-xs leading-relaxed">
              Monolith Engine represents a powerful evolution in how modern, operations-heavy companies govern execution frameworks. By integrating critical team schedules, assets, leads, and performance reviews, we erase structural waste and establish absolute control.
            </p>

            <div className="inline-block px-6 py-2 bg-gradient-to-r from-cyan-950 to-blue-950 border border-cyan-500/30 rounded-xl text-cyan-300 font-bold text-xs uppercase tracking-widest shadow-xl">
              One Engine. Total Control. Built for Growth.
            </div>

            <div className="pt-6 border-t border-gray-800 max-w-sm mx-auto space-y-2 text-xs">
              <p className="text-gray-400 font-medium">Connect with our Investment & Partnership Committee</p>
              <div className="text-[#00cec4] font-bold">capital@monolithengine.internal</div>
            </div>
          </div>

          <div className="flex justify-between items-center text-xs text-gray-500 border-t border-gray-800/60 pt-4">
            <span>Secure Enterprise Systems Directive</span>
            <span className="font-bold text-gray-400">18</span>
          </div>
        </section>
      </div>
    </div>
  );
}
