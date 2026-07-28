import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { can } from "@/lib/rbac";
import DesignSystemClient from "./design-system-client";

export default async function AdminDesignSystemPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const allowed = await can(session.user.id, "admin.org.manage");
  if (!allowed) {
    return (
      <section className="monolith-card p-6">
        <p className="monolith-label">Permission Required</p>
        <h1 className="monolith-section-title mt-2">Design System</h1>
        <p className="mt-3 text-sm text-mono-muted">
          You need administrator access to view the Monolith design-system reference.
        </p>
      </section>
    );
  }

  return <DesignSystemClient />;
}
