import { PerformanceWorkspaceFrame } from "@/modules/performance/components/performance-workspace";

export default function AmsLayout({ children }: { children: React.ReactNode }) {
  return <PerformanceWorkspaceFrame>{children}</PerformanceWorkspaceFrame>;
}
