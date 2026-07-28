import { PerformanceWorkspaceFrame } from "@/components/monolith/performance-workspace";

export default function LmsLayout({ children }: { children: React.ReactNode }) {
  return <PerformanceWorkspaceFrame>{children}</PerformanceWorkspaceFrame>;
}
