import type { LucideIcon } from "lucide-react";
import {
  Calendar,
  DollarSign,
  FileText,
  HelpCircle,
  Inbox,
  Megaphone,
  Phone,
  Share2,
  Sparkles,
  Truck,
  ClipboardList,
  ConciergeBell,
  HeartHandshake,
  BookOpen,
  CheckSquare,
  MapPin,
} from "lucide-react";
import { FolderIcon as Folder } from "@/components/ui/folder-icon";

type WorkspaceDetails = {
  title?: string;
  description: string;
  badge: string;
  icon: any;
  iconClassName: string;
  summary: string;
};

const CRM_WORKSPACE_DETAILS: Record<string, WorkspaceDetails> = {
  campaigns: {
    description: "Direct email and trade-show marketing tracker to acquire new freight accounts.",
    badge: "Sales Campaigns",
    icon: Megaphone,
    iconClassName: "text-indigo-400",
    summary: "Acquisition channels and ROI analytics.",
  },
  "sales-inbox": {
    description: "Integrated email inbox mapping client email threads directly to Lead and Contact owner panels.",
    badge: "Liaison Inbox",
    icon: Inbox,
    iconClassName: "text-[#00c4b6]",
    summary: "Direct IMAP/SMTP message sync.",
  },
  social: {
    description: "Liaison communication log registry for WhatsApp, WeChat, and shipping notifications.",
    badge: "Communication Hub",
    icon: Share2,
    iconClassName: "text-[#34d399]",
    summary: "Multi-channel logistics notifications.",
  },
  solutions: {
    description: "Knowledge Base registry linking answers, CHA codes, customs policies, and tariff lookup tools.",
    badge: "Knowledge Base",
    icon: HelpCircle,
    iconClassName: "text-amber-400",
    summary: "Standard operating procedures manual.",
  },
  forecasts: {
    description: "Team performance metrics, commission forecasts, and revenue goals based on won deals.",
    badge: "Quarterly Target",
    icon: DollarSign,
    iconClassName: "text-emerald-400",
    summary: "Weighted logistics pipeline analysis.",
  },
  documents: {
    description: "Shared document vault for freight agreements, quotations, SOP files, and customer paperwork.",
    badge: "Document Control",
    icon: Folder,
    iconClassName: "text-sky-400",
    summary: "Contract packs and operations files in one workspace.",
  },
  tasks: {
    description: "Activity queue for follow-ups, owner assignments, and sales action items across the CRM team.",
    badge: "Action Queue",
    icon: CheckSquare,
    iconClassName: "text-[#00c4b6]",
    summary: "Task ownership and completion tracking.",
  },
  events: {
    description: "Calendar planning for meetings, site visits, client calls, and shipment coordination checkpoints.",
    badge: "Schedule Board",
    icon: Calendar,
    iconClassName: "text-[#fbbf24]",
    summary: "Time-bound CRM coordination and reminders.",
  },
  calls: {
    description: "Call registry for client conversations, follow-up notes, and business development outreach logs.",
    badge: "Call Register",
    icon: Phone,
    iconClassName: "text-violet-400",
    summary: "Conversation timelines linked to CRM records.",
  },
  "price-books": {
    title: "Price Books",
    description: "Pricing library for freight lanes, customer tariffs, bundled services, and negotiated rate cards.",
    badge: "Pricing Matrix",
    icon: BookOpen,
    iconClassName: "text-cyan-400",
    summary: "Reusable commercial pricing schedules.",
  },
  quotes: {
    description: "Quotation workspace for preparing pre-sales offers, service estimates, and customer commercial drafts.",
    badge: "Commercial Drafts",
    icon: FileText,
    iconClassName: "text-orange-400",
    summary: "Pre-invoice offers and proposal documents.",
  },
  "sales-orders": {
    title: "Sales Orders",
    description: "Order desk for confirmed customer jobs, commercial approvals, and execution-ready service requests.",
    badge: "Order Desk",
    icon: ClipboardList,
    iconClassName: "text-emerald-400",
    summary: "Confirmed sales workflows moving into fulfillment.",
  },
  "purchase-orders": {
    title: "Purchase Orders",
    description: "Supplier order register for outsourced services, carrier allocations, and approved buying requests.",
    badge: "Vendor Procurement",
    icon: Truck,
    iconClassName: "text-amber-400",
    summary: "Procurement flows coordinated with vendors.",
  },
  visits: {
    description: "Field visit tracker for customer meetings, warehouse inspections, and on-site relationship touchpoints.",
    badge: "Field Activity",
    icon: MapPin,
    iconClassName: "text-rose-400",
    summary: "Geographic client engagement records.",
  },
  services: {
    description: "Service catalogue and delivery coordination area for recurring logistics support and managed offerings.",
    badge: "Service Operations",
    icon: ConciergeBell,
    iconClassName: "text-[#00c4b6]",
    summary: "Operational services mapped to CRM accounts.",
  },
  voc: {
    title: "Feedback (VoC)",
    description: "Voice-of-customer repository for satisfaction inputs, pain points, and service improvement opportunities.",
    badge: "Customer Insight",
    icon: HeartHandshake,
    iconClassName: "text-pink-400",
    summary: "Feedback loops tied to retention and service quality.",
  },
};

export function getCrmWorkspaceDetails(slug: string) {
  return (
    CRM_WORKSPACE_DETAILS[slug] ?? {
      description: "Collaborative tracking workspace configured for your logistics network.",
      badge: "Integrated Mode",
      icon: Sparkles,
      iconClassName: "text-[#00c4b6]",
      summary: "Workspace running on active monolith channels.",
    }
  );
}

export function CrmWorkspacePage({ slug }: { slug: string }) {
  const details = getCrmWorkspaceDetails(slug);
  const Icon = details.icon;

  return (
    <div className="mx-auto max-w-5xl animate-in space-y-6 p-8 fade-in duration-200">
      <div className="flex flex-col items-center justify-center space-y-4 rounded-xl border border-[#1c212a]/55 bg-[#0f1319] p-8 text-center shadow-2xl">
        <div className="rounded-full bg-slate-800/40 p-4 text-white">
          <Icon className={`size-8 ${details.iconClassName}`} />
        </div>
        <h3 className="text-base font-bold text-white">Active Workspace Interface</h3>
        <p className="max-w-md text-xs text-slate-500">
          {details.summary} Data registers are org-scoped and permissions-aware. Links directly to client operations
          records.
        </p>

        <div className="w-full max-w-lg divide-y divide-[#1c212a]/30 rounded-lg border border-[#1c212a]/40 bg-[#0a0d12]/60 p-4 text-left">
          <div className="flex justify-between py-2.5 text-xs">
            <span className="font-semibold text-slate-400">Workspace Status</span>
            <span className="font-bold text-emerald-400">Synchronised & Live</span>
          </div>
          <div className="flex justify-between py-2.5 text-xs">
            <span className="font-semibold text-slate-400">Auto-Sync Rate</span>
            <span className="text-white">Every 5 minutes</span>
          </div>
          <div className="flex justify-between py-2.5 text-xs">
            <span className="font-semibold text-slate-400">Target Environment</span>
            <span className="text-slate-300">Production monolith cluster</span>
          </div>
        </div>
      </div>
    </div>
  );
}
