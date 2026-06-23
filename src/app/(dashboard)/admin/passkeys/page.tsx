import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { decidePasskeyResetAction, forcePasskeyResetAction } from "./actions";
import { requirePermission } from "@/lib/rbac";
import { redirect } from "next/navigation";
import { KeyRound, ShieldAlert } from "lucide-react";

function toTitleCase(str?: string | null): string {
  if (!str) return "";
  return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase());
}

export const metadata = {
  title: "Passkey Resets | Admin | Adarsh Shipping",
};

export default async function AdminPasskeysPage() {
  const session = await auth();
  if (!session) redirect("/login");

  await requirePermission(session.user.id, "admin.org.manage");
  const orgId = session.user.orgId;
  if (!orgId) {
    return (
      <div className="rounded-xl border border-outline-variant bg-surface p-8 text-center text-sm text-on-surface-variant">
        Organisation configuration missing.
      </div>
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
      select: { id: true, name: true, email: true, passkeySetupRequired: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-sm text-on-surface-variant dark:text-on-surface-variant font-medium">
          Manage user credentials reset requests or force users to register new passkeys.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Reset requests list */}
        <Card className="border-0 shadow-sm overflow-hidden bg-surface h-fit">
          <CardHeader className="pb-3 border-b border-outline-variant/60">
            <CardTitle className="text-base font-semibold text-on-surface-variant dark:text-on-surface-variant">
              Reset Requests
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 divide-y divide-outline-variant/60">
            {requests.length === 0 ? (
              <div className="text-center text-on-surface-variant/80 py-12 text-sm font-medium">
                No active passkey reset requests.
              </div>
            ) : (
              requests.map((request) => (
                <div key={request.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 hover:bg-surface-container-high/20 transition">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-on-surface-variant dark:text-white">{toTitleCase(request.user.name)}</p>
                    <p className="text-xs text-on-surface-variant font-semibold mt-0.5">
                      {request.user.email} · {new Date(request.requestedAt).toLocaleString("en-IN")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                      request.status === "PENDING"
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                        : request.status === "APPROVED"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                        : "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                    }`}>
                      {request.status}
                    </span>
                    {request.status === "PENDING" && (
                      <div className="flex items-center gap-1.5 ml-2">
                        <form action={decidePasskeyResetAction}>
                          <input type="hidden" name="requestId" value={request.id} />
                          <input type="hidden" name="decision" value="APPROVED" />
                          <Button type="submit" size="sm" className="h-8 text-[11px] font-semibold bg-[#00cec4] hover:bg-[#00b8af] text-white">
                            Approve
                          </Button>
                        </form>
                        <form action={decidePasskeyResetAction}>
                          <input type="hidden" name="requestId" value={request.id} />
                          <input type="hidden" name="decision" value="REJECTED" />
                          <Button type="submit" size="sm" variant="outline" className="h-8 text-[11px] font-semibold border-outline-variant/60 text-rose-600 hover:text-rose-700 hover:bg-rose-50/30">
                            Reject
                          </Button>
                        </form>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Force reset list */}
        <Card className="border-0 shadow-sm overflow-hidden bg-surface">
          <CardHeader className="pb-3 border-b border-outline-variant/60">
            <CardTitle className="text-base flex items-center gap-2 font-semibold text-on-surface-variant dark:text-on-surface-variant">
              <ShieldAlert className="size-4 text-[#00cec4]" /> Force Reset Credentials
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 max-h-[500px] overflow-y-auto divide-y divide-outline-variant/60">
            {users.map((user) => (
              <div key={user.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 hover:bg-surface-container-high/20 transition">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-on-surface-variant dark:text-white">{toTitleCase(user.name)}</p>
                  <p className="text-xs text-on-surface-variant font-semibold mt-0.5">{user.email}</p>
                </div>
                <form action={forcePasskeyResetAction}>
                  <input type="hidden" name="userId" value={user.id} />
                  <Button
                    type="submit"
                    size="sm"
                    variant="outline"
                    disabled={!!user.passkeySetupRequired}
                    className={`h-8 text-[11px] font-semibold border-outline-variant/60 transition ${
                      user.passkeySetupRequired
                        ? "bg-surface-container-high text-on-surface-variant border-outline-variant dark:bg-slate-800/40"
                        : "text-on-surface-variant dark:text-on-surface-variant hover:bg-surface-container-low"
                    }`}
                  >
                    {user.passkeySetupRequired ? "Reset pending" : "Force reset"}
                  </Button>
                </form>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
