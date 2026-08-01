import { ChaWorkspaceFrame } from "@/modules/cha/components/workspace/cha-workspace";

export default function ChaLayout({ children }: { children: React.ReactNode }) {
  return <ChaWorkspaceFrame>{children}</ChaWorkspaceFrame>;
}
