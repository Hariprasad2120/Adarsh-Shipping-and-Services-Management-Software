import { AdminWorkspaceFrame } from "@/modules/admin/components/admin-workspace";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminWorkspaceFrame>{children}</AdminWorkspaceFrame>;
}
