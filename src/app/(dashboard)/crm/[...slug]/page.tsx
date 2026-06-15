import React from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import {
  ShieldAlert,
  Sparkles,
  Inbox,
  Mail,
  Calendar,
  Share2,
  HelpCircle,
  FileText,
  DollarSign
} from "lucide-react";

interface CatchAllPageProps {
  params: Promise<{ slug: string[] }>;
}

export default async function CrmCatchAllPage({ params }: CatchAllPageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { slug } = await params;
  const currentModule = slug[0] || "workspace";
  
  // Format Title
  const formattedTitle = currentModule
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  // Custom descriptions/data based on slug type
  let details = {
    description: "Collaborative tracking workspace configured for your logistics network.",
    badge: "Integrated Mode",
    icon: <Sparkles className="size-8 text-[#00c4b6]" />,
    summary: "Workspace running on active monolith channels."
  };

  if (currentModule === "campaigns") {
    details = {
      description: "Direct email and trade-show marketing tracker to acquire new freight accounts.",
      badge: "Sales Campaigns",
      icon: <Mail className="size-8 text-indigo-400" />,
      summary: "Acquisition channels and ROI analytics."
    };
  } else if (currentModule === "sales-inbox") {
    details = {
      description: "Integrated email inbox mapping client email threads directly to Lead and Contact owner panels.",
      badge: "Liaison Inbox",
      icon: <Inbox className="size-8 text-[#00c4b6]" />,
      summary: "Direct IMAP/SMTP message sync."
    };
  } else if (currentModule === "social") {
    details = {
      description: "Liaison communication log registry for WhatsApp, WeChat, and shipping notifications.",
      badge: "Communication Hub",
      icon: <Share2 className="size-8 text-[#34d399]" />,
      summary: "Multi-channel logistics notifications."
    };
  } else if (currentModule === "solutions") {
    details = {
      description: "Knowledge Base registry linking answers, CHA codes, customs policies, and tariff lookup tools.",
      badge: "Knowledge Base",
      icon: <HelpCircle className="size-8 text-amber-400" />,
      summary: "Standard operating procedures manual."
    };
  } else if (currentModule === "forecasts") {
    details = {
      description: "Team performance metrics, commission forecasts, and revenue goals based on won deals.",
      badge: "Quarterly Target",
      icon: <DollarSign className="size-8 text-emerald-400" />,
      summary: "Weighted logistics pipeline analysis."
    };
  }

  return (
    <div className="p-8 space-y-6 max-w-5xl mx-auto animate-in fade-in duration-200">
      
      {/* Header */}
      <div className="border-b border-[#1c212a]/30 pb-5">
        <span className="px-2 py-0.5 text-[9px] font-bold bg-[#161f28] text-[#00c4b6] rounded uppercase tracking-wider">
          {details.badge}
        </span>
        <h2 className="text-2xl font-bold tracking-tight text-white mt-2">{formattedTitle} Module</h2>
        <p className="text-slate-400 text-sm mt-1">{details.description}</p>
      </div>

      {/* Main Mock Content */}
      <div className="p-8 bg-[#0f1319] border border-[#1c212a]/55 rounded-xl flex flex-col items-center justify-center text-center space-y-4 shadow-2xl">
        <div className="p-4 bg-slate-800/40 rounded-full text-white">
          {details.icon}
        </div>
        <h3 className="font-bold text-white text-base">Active Workspace Interface</h3>
        <p className="text-xs text-slate-500 max-w-md">
          {details.summary} Data registers are org-scoped and permissions-aware. Links directly to client operations records.
        </p>

        {/* Mock Data Panel */}
        <div className="w-full max-w-lg bg-[#0a0d12]/60 border border-[#1c212a]/40 rounded-lg p-4 text-left divide-y divide-[#1c212a]/30">
          <div className="py-2.5 flex justify-between text-xs">
            <span className="text-slate-400 font-semibold">Workspace Status</span>
            <span className="text-emerald-400 font-bold">Synchronised & Live</span>
          </div>
          <div className="py-2.5 flex justify-between text-xs">
            <span className="text-slate-400 font-semibold">Auto-Sync Rate</span>
            <span className="text-white">Every 5 minutes</span>
          </div>
          <div className="py-2.5 flex justify-between text-xs">
            <span className="text-slate-400 font-semibold">Target Environment</span>
            <span className="text-slate-300">Production monolith cluster</span>
          </div>
        </div>
      </div>

    </div>
  );
}
