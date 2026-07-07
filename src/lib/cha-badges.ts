import type { BadgeVariant } from "@/components/ui/badge";

export function formatChaBadgeLabel(value?: string | null) {
  return value ? value.replace(/_/g, " ") : "UNKNOWN";
}

export function getChaStageBadgeVariant(stage?: string | null): BadgeVariant {
  switch (stage) {
    case "FILING":
      return "default";
    case "CHECKLIST_APPROVAL":
      return "warning";
    case "FILED":
      return "success";
    default:
      return "secondary";
  }
}

export function getChaPriorityBadgeVariant(priority?: string | null): BadgeVariant {
  switch (priority) {
    case "HIGH":
      return "destructive";
    case "MEDIUM":
      return "warning";
    default:
      return "secondary";
  }
}

export function getChaJobStatusBadgeVariant(status?: string | null): BadgeVariant {
  switch (status) {
    case "ACTIVE":
      return "success";
    case "CLOSED":
    case "INACTIVE":
    case "BLOCKED":
      return "destructive";
    default:
      return "warning";
  }
}

export function getChaDocumentStatusBadgeVariant(status?: string | null): BadgeVariant {
  switch (status) {
    case "UPLOADED":
    case "RECEIPT_ACKNOWLEDGED":
      return "success";
    case "FILING":
    case "PAID":
      return "default";
    case "QUERY_RAISED":
    case "CHECKLIST_APPROVAL":
      return "warning";
    case "MANDATORY":
      return "destructive";
    default:
      return "secondary";
  }
}
