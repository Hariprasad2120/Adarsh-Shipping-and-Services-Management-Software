import { AdminWorkspaceFrame } from "@/components/monolith/admin-workspace";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminWorkspaceFrame>{children}</AdminWorkspaceFrame>;
}
