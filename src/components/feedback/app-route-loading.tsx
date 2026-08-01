import { LoadingScreen } from "@/components/feedback/loading-screen";

type LoadingScope =
  | "app"
  | "auth"
  | "dashboard"
  | "admin"
  | "crm"
  | "cha"
  | "accounting"
  | "ams"
  | "attendance"
  | "communication"
  | "expense"
  | "hrms"
  | "lms"
  | "portal"
  | "invite"
  | "verify";

const LOADING_COPY: Record<
  LoadingScope,
  {
    message: string;
    subtitle: string;
  }
> = {
  app: {
    message: "Preparing Monolith",
    subtitle:
      "Loading the latest workspace shell, session context, and route data.",
  },
  auth: {
    message: "Opening secure access",
    subtitle: "Loading authentication controls and your sign-in experience.",
  },
  dashboard: {
    message: "Preparing your workspace",
    subtitle:
      "Loading the latest records, permissions, and workspace controls.",
  },
  admin: {
    message: "Opening administration",
    subtitle:
      "Loading organisation settings, access controls, and security tools.",
  },
  crm: {
    message: "Loading customer operations",
    subtitle: "Preparing pipeline, accounts, and relationship data.",
  },
  cha: {
    message: "Loading shipment operations",
    subtitle: "Preparing jobs, documents, and customs workflow data.",
  },
  accounting: {
    message: "Loading finance workspace",
    subtitle: "Preparing ledgers, documents, and accounting controls.",
  },
  ams: {
    message: "Loading appraisal workspace",
    subtitle: "Preparing reviews, goals, and performance workflows.",
  },
  attendance: {
    message: "Loading attendance workspace",
    subtitle: "Preparing shifts, requests, and attendance records.",
  },
  communication: {
    message: "Loading communication workspace",
    subtitle: "Preparing channels, templates, and coordination tools.",
  },
  expense: {
    message: "Loading expense workspace",
    subtitle: "Preparing claims, approvals, and reimbursement data.",
  },
  hrms: {
    message: "Loading people operations",
    subtitle: "Preparing employee records, policies, and workforce tools.",
  },
  lms: {
    message: "Loading learning workspace",
    subtitle: "Preparing courses, progress, and learning resources.",
  },
  portal: {
    message: "Opening customer portal",
    subtitle: "Preparing shipments, approvals, and account updates.",
  },
  invite: {
    message: "Preparing invitation",
    subtitle: "Loading verification details and onboarding access.",
  },
  verify: {
    message: "Verifying access",
    subtitle: "Loading confirmation details and secure next steps.",
  },
};

export function AppRouteLoading({
  scope = "app",
}: {
  scope?: LoadingScope;
}) {
  const copy = LOADING_COPY[scope];

  return <LoadingScreen message={copy.message} subtitle={copy.subtitle} />;
}
