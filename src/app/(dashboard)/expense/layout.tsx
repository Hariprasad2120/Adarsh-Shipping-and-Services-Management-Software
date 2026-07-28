import { ChaWorkspaceFrame } from "@/components/monolith/cha-workspace";

export default function ExpenseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ChaWorkspaceFrame>{children}</ChaWorkspaceFrame>;
}
