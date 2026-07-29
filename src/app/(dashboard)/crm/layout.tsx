import { CrmWorkspaceFrame } from "@/components/monolith/crm-workspace";

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  return <CrmWorkspaceFrame>{children}</CrmWorkspaceFrame>;
}
