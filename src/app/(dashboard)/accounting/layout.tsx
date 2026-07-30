import { AccountingWorkspaceFrame } from "@/components/monolith/accounting-workspace";
import { requireAccountingRouteAccess } from "@/modules/accounting/operational-auth";
import { headers } from "next/headers";

export default async function AccountingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname =
    (await headers()).get("x-current-pathname")?.replace(/\/+$/, "") ||
    "/accounting";
  if (pathname !== "/accounting/access-denied") {
    await requireAccountingRouteAccess(pathname);
  }
  return <AccountingWorkspaceFrame>{children}</AccountingWorkspaceFrame>;
}
