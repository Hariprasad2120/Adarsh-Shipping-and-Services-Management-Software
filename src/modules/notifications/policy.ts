export type NotificationVariant =
  | "secondary"
  | "primary"
  | "destructive"
  | "success"
  | "info"
  | "mono"
  | "warning";

export type NotificationAppearance = "solid" | "outline" | "light" | "stroke";
export type NotificationPriority = "normal" | "important";
export type NotificationSource = "AMS" | "Attendance" | "HRMS" | "Admin" | "System" | "To-Do";

export type NotificationPolicy = {
  source: NotificationSource;
  variant: NotificationVariant;
  appearance: NotificationAppearance;
  priority: NotificationPriority;
  requiresAck: boolean;
  resendable: boolean;
  allowDismiss: boolean;
  autoFadeMs: number | null;
  emailByDefault: boolean;
  labels?: {
    open?: string;
    acknowledge?: string;
  };
};

const DEFAULT_POLICY: NotificationPolicy = {
  source: "System",
  variant: "secondary",
  appearance: "light",
  priority: "normal",
  requiresAck: false,
  resendable: true,
  allowDismiss: true,
  autoFadeMs: 5000,
  emailByDefault: false,
  labels: {
    open: "Open",
    acknowledge: "Acknowledge",
  },
};

export const NOTIFICATION_POLICIES: Record<string, NotificationPolicy> = {
  APPRAISAL_DUE: {
    source: "AMS",
    variant: "info",
    appearance: "light",
    priority: "normal",
    requiresAck: false,
    resendable: true,
    allowDismiss: true,
    autoFadeMs: 5000,
    emailByDefault: true,
    labels: { open: "Open appraisal" },
  },
  REVIEWER_ASSIGNED: {
    source: "AMS",
    variant: "primary",
    appearance: "light",
    priority: "important",
    requiresAck: true,
    resendable: true,
    allowDismiss: true,
    autoFadeMs: null,
    emailByDefault: false,
    labels: { open: "Review now", acknowledge: "Acknowledge" },
  },
  REVIEWER_UNAVAILABLE: {
    source: "AMS",
    variant: "warning",
    appearance: "light",
    priority: "important",
    requiresAck: false,
    resendable: true,
    allowDismiss: true,
    autoFadeMs: null,
    emailByDefault: false,
    labels: { open: "Reassign reviewer" },
  },
  REVIEWERS_PENDING_PAST_DEADLINE: {
    source: "AMS",
    variant: "warning",
    appearance: "light",
    priority: "important",
    requiresAck: false,
    resendable: true,
    allowDismiss: true,
    autoFadeMs: null,
    emailByDefault: false,
    labels: { open: "Review pending appraisals" },
  },
  SELF_ASSESSMENT_OPEN: {
    source: "AMS",
    variant: "primary",
    appearance: "light",
    priority: "important",
    requiresAck: true,
    resendable: true,
    allowDismiss: true,
    autoFadeMs: null,
    emailByDefault: false,
    labels: { open: "Open self assessment", acknowledge: "Acknowledge" },
  },
  REVIEW_OPEN: {
    source: "AMS",
    variant: "info",
    appearance: "light",
    priority: "important",
    requiresAck: true,
    resendable: true,
    allowDismiss: true,
    autoFadeMs: null,
    emailByDefault: false,
    labels: { open: "Open review", acknowledge: "Acknowledge" },
  },
  MANAGEMENT_REVIEW_OPEN: {
    source: "AMS",
    variant: "warning",
    appearance: "light",
    priority: "important",
    requiresAck: true,
    resendable: true,
    allowDismiss: true,
    autoFadeMs: null,
    emailByDefault: false,
    labels: { open: "Claim appraisal", acknowledge: "Acknowledge" },
  },
  MEETING_PENDING: {
    source: "AMS",
    variant: "info",
    appearance: "outline",
    priority: "important",
    requiresAck: false,
    resendable: true,
    allowDismiss: true,
    autoFadeMs: null,
    emailByDefault: true,
    labels: { open: "Confirm meeting" },
  },
  MEETING_CONFIRMED: {
    source: "AMS",
    variant: "success",
    appearance: "light",
    priority: "important",
    requiresAck: true,
    resendable: true,
    allowDismiss: true,
    autoFadeMs: null,
    emailByDefault: true,
    labels: { open: "View meeting", acknowledge: "Acknowledge" },
  },
  HIKE_FINALISED: {
    source: "AMS",
    variant: "success",
    appearance: "light",
    priority: "normal",
    requiresAck: false,
    resendable: true,
    allowDismiss: true,
    autoFadeMs: 5000,
    emailByDefault: true,
    labels: { open: "View appraisal" },
  },
  LEAVE_REQUEST_SUBMITTED: {
    source: "Attendance",
    variant: "info",
    appearance: "light",
    priority: "important",
    requiresAck: false,
    resendable: true,
    allowDismiss: true,
    autoFadeMs: null,
    emailByDefault: false,
    labels: { open: "Review leave request" },
  },
  LEAVE_DECISION: {
    source: "Attendance",
    variant: "success",
    appearance: "light",
    priority: "normal",
    requiresAck: false,
    resendable: true,
    allowDismiss: true,
    autoFadeMs: 5000,
    emailByDefault: true,
    labels: { open: "View leave status" },
  },
  TODO_REMINDER: {
    source: "To-Do",
    variant: "warning",
    appearance: "light",
    priority: "normal",
    requiresAck: false,
    resendable: false,
    allowDismiss: true,
    autoFadeMs: 5000,
    emailByDefault: false,
    labels: { open: "Open task" },
  },
};

export function getNotificationPolicy(kind: string): NotificationPolicy {
  return NOTIFICATION_POLICIES[kind] ?? DEFAULT_POLICY;
}
