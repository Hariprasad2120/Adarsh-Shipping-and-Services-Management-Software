import { CrmWorkspaceFrame } from "@/modules/crm/components/workspace/crm-workspace";

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  return <CrmWorkspaceFrame>{children}</CrmWorkspaceFrame>;
}
