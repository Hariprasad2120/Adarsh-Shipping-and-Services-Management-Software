import { AccountingWorkspaceFrame } from "@/components/monolith/accounting-workspace";

export default function AccountingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AccountingWorkspaceFrame>{children}</AccountingWorkspaceFrame>;
}
