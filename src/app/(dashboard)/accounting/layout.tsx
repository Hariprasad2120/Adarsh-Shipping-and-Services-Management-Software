import { AccountingWorkspaceFrame } from "@/modules/accounting/components/accounting-workspace";

export default function AccountingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AccountingWorkspaceFrame>{children}</AccountingWorkspaceFrame>;
}
