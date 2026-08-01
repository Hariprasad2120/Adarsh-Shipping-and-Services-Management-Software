import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { AdminBadge, AdminButton, AdminInput, AdminPanel, AdminPanelHeader, AdminPermissionState } from "@/modules/admin/components/admin-workspace";
import { WorkspaceState } from "@/components/layout/workspace";
import { decidePasskeyResetAction, forcePasskeyResetAction } from "./actions";
import { requirePermission } from "@/lib/rbac";
import { redirect } from "next/navigation";
import { KeyRound, ShieldAlert } from "lucide-react";

function toTitleCase(value?: string | null): string {
  if (!value) return "";
  return value.replace(/\w\S*/g, (part) =>
    part.charAt(0).toUpperCase() + part.slice(1).toLowerCase(),
  );
}

function requestVariant(status: string) {
  if (status === "APPROVED") return "success" as const;
  if (status === "PENDING") return "warning" as const;
  return "danger" as const;
}

export const metadata = {
  title: "Passkey Resets | Admin | Adarsh Shipping",
};

export default async function AdminPasskeysPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  await requirePermission(session.user.id, "admin.org.manage");
  const orgId = session.user.orgId;
  if (!orgId) {
    return (
      <AdminPermissionState description="Organisation configuration is required before passkey resets can be administered." />
    );
  }

  const [requests, users] = await Promise.all([
    db.passkeyResetRequest.findMany({
      where: { user: { orgId } },
      orderBy: { requestedAt: "desc" },
      take: 100,
      include: {
        user: { select: { id: true, name: true, email: true } },
        decidedBy: { select: { name: true } },
      },
    }),
    db.user.findMany({
      where: { active: true, orgId, isPlatformAdmin: false },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        passkeySetupRequired: true,
      },
    }),
  ]);

  return (
    <div className="mnx-admin-split">
      <AdminPanel>
        <AdminPanelHeader
          eyebrow="Employee requests"
          title="Reset requests"
          description="Approve or reject active passkey recovery requests."
          actions={<KeyRound aria-hidden="true" />}
        />
        {requests.length === 0 ? (
          <WorkspaceState
            variant="empty"
            eyebrow="Passkeys"
            title="No reset requests"
            description="There are no active passkey recovery requests for this organisation."
            icon={<KeyRound aria-hidden="true" />}
          />
        ) : (
          <div className="mnx-admin-record-list">
            {requests.map((request) => (
              <article key={request.id} className="mnx-admin-record">
                <div>
                  <strong>{toTitleCase(request.user.name)}</strong>
                  <small>
                    {request.user.email} ·{" "}
                    {new Date(request.requestedAt).toLocaleString("en-IN")}
                  </small>
                </div>
                <div className="mnx-admin-record-actions">
                  <AdminBadge variant={requestVariant(request.status)}>
                    {request.status}
                  </AdminBadge>
                  {request.status === "PENDING" ? (
                    <>
                      <form action={decidePasskeyResetAction}>
                        <AdminInput
                          type="hidden"
                          name="requestId"
                          value={request.id}
                        />
                        <AdminInput
                          type="hidden"
                          name="decision"
                          value="APPROVED"
                        />
                        <AdminButton type="submit" size="compact" variant="primary">
                          Approve
                        </AdminButton>
                      </form>
                      <form action={decidePasskeyResetAction}>
                        <AdminInput
                          type="hidden"
                          name="requestId"
                          value={request.id}
                        />
                        <AdminInput
                          type="hidden"
                          name="decision"
                          value="REJECTED"
                        />
                        <AdminButton
                          type="submit"
                          size="compact"
                          variant="destructive"
                        >
                          Reject
                        </AdminButton>
                      </form>
                    </>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </AdminPanel>

      <AdminPanel>
        <AdminPanelHeader
          eyebrow="Administrator action"
          title="Force reset credentials"
          description="Require an active employee to register a new passkey at their next sign-in."
          actions={<ShieldAlert aria-hidden="true" />}
        />
        <div className="mnx-admin-record-list mnx-admin-scroll-region">
          {users.map((user) => (
            <article key={user.id} className="mnx-admin-record">
              <div>
                <strong>{toTitleCase(user.name)}</strong>
                <small>{user.email}</small>
              </div>
              <form action={forcePasskeyResetAction}>
                <AdminInput type="hidden" name="userId" value={user.id} />
                <AdminButton
                  type="submit"
                  size="compact"
                  disabled={Boolean(user.passkeySetupRequired)}
                >
                  {user.passkeySetupRequired ? "Reset pending" : "Force reset"}
                </AdminButton>
              </form>
            </article>
          ))}
        </div>
      </AdminPanel>
    </div>
  );
}
