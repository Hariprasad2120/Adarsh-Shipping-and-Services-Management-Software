import { PerformanceWorkspaceFrame } from "@/components/monolith/performance-workspace";

export default function AmsLayout({ children }: { children: React.ReactNode }) {
  return <PerformanceWorkspaceFrame>{children}</PerformanceWorkspaceFrame>;
}
