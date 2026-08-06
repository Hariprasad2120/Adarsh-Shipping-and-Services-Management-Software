import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Calendar,
  CheckSquare,
  ClipboardList,
  ConciergeBell,
  DollarSign,
  FileText,
  HeartHandshake,
  HelpCircle,
  Inbox,
  MapPin,
  Megaphone,
  Phone,
  Share2,
  Sparkles,
  Truck,
} from "lucide-react";
import { FolderIcon as Folder } from "@/components/ui/folder-icon";

type WorkspaceDetails = {
  title?: string;
  description: string;
  badge: string;
  icon: LucideIcon;
  summary: string;
};

const CRM_WORKSPACE_DETAILS: Record<string, WorkspaceDetails> = {
  campaigns: {
    description:
      "Direct email and trade-show marketing tracker for new freight accounts.",
    badge: "Sales campaigns",
    icon: Megaphone,
    summary: "Acquisition channels and return-on-investment analytics.",
  },
  "sales-inbox": {
    description:
      "Integrated customer email mapped to lead, contact, and owner records.",
    badge: "Liaison inbox",
    icon: Inbox,
    summary: "Relationship communication in its operational context.",
  },
  social: {
    description:
      "Communication registry for messaging channels and shipping notifications.",
    badge: "Communication hub",
    icon: Share2,
    summary: "Multi-channel logistics communication.",
  },
  solutions: {
    description:
      "Knowledge registry for answers, customs guidance, tariffs, and operating policy.",
    badge: "Knowledge base",
    icon: HelpCircle,
    summary: "Reusable customer service and operating guidance.",
  },
  forecasts: {
    description:
      "Team targets and revenue forecasts calculated from active opportunities.",
    badge: "Quarterly target",
    icon: DollarSign,
    summary: "Weighted logistics pipeline analysis.",
  },
  documents: {
    description:
      "Shared document vault for agreements, quotations, procedures, and customer paperwork.",
    badge: "Document control",
    icon: Folder,
    summary: "Relationship and commercial files in one workspace.",
  },
  tasks: {
    description:
      "Activity queue for follow-ups, owner assignments, and sales action items.",
    badge: "Action queue",
    icon: CheckSquare,
    summary: "Task ownership and completion tracking.",
  },
  events: {
    description:
      "Calendar planning for meetings, site visits, calls, and coordination checkpoints.",
    badge: "Schedule board",
    icon: Calendar,
    summary: "Time-bound customer coordination and reminders.",
  },
  calls: {
    description:
      "Call registry for conversations, outcomes, follow-ups, and outreach history.",
    badge: "Call register",
    icon: Phone,
    summary: "Conversation timelines linked to CRM records.",
  },
  "price-books": {
    title: "Price books",
    description:
      "Pricing library for freight lanes, tariffs, services, and negotiated schedules.",
    badge: "Pricing matrix",
    icon: BookOpen,
    summary: "Reusable commercial pricing schedules.",
  },
  masters: {
    title: "Masters",
    description:
      "Central registry for CRM master data used across customer, sales, and service workflows.",
    badge: "Master data",
    icon: BookOpen,
    summary: "Shared CRM master records and reference workspaces.",
  },
  quotes: {
    description:
      "Quotation workspace for preparing controlled proposals and customer estimates.",
    badge: "Commercial drafts",
    icon: FileText,
    summary: "Pre-sale offers and proposal documents.",
  },
  "sales-orders": {
    title: "Sales orders",
    description:
      "Order desk for approved customer work and execution-ready service requests.",
    badge: "Order desk",
    icon: ClipboardList,
    summary: "Commercial commitments moving into fulfilment.",
  },
  "purchase-orders": {
    title: "Purchase orders",
    description:
      "Supplier order register for services, carrier allocations, and buying requests.",
    badge: "Vendor procurement",
    icon: Truck,
    summary: "Approved procurement coordinated with partners.",
  },
  visits: {
    description:
      "Field tracker for customer meetings, inspections, and relationship touchpoints.",
    badge: "Field activity",
    icon: MapPin,
    summary: "On-site customer engagement records.",
  },
  services: {
    description:
      "Service catalogue and delivery coordination for recurring logistics support.",
    badge: "Service operations",
    icon: ConciergeBell,
    summary: "Operational services mapped to customer accounts.",
  },
  voc: {
    title: "Voice of customer",
    description:
      "Feedback repository for satisfaction, pain points, and improvement opportunities.",
    badge: "Customer insight",
    icon: HeartHandshake,
    summary: "Feedback loops tied to retention and service quality.",
  },
};

export function getCrmWorkspaceDetails(slug: string): WorkspaceDetails {
  return (
    CRM_WORKSPACE_DETAILS[slug] ?? {
      description:
        "Collaborative customer operations workspace configured for the organisation.",
      badge: "Integrated mode",
      icon: Sparkles,
      summary: "CRM workspace",
    }
  );
}
