import { ChaWorkspaceFrame } from "@/modules/cha/components/workspace/cha-workspace";

export default function ExpenseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ChaWorkspaceFrame>{children}</ChaWorkspaceFrame>;
}
