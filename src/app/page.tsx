import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { RootModuleControlClient } from "@/components/root-module-control-client";
import { RootSignOutButton } from "@/components/root-signout-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/monolith/card";
import { MODULE_CONTROL_ITEMS } from "@/modules/core/organisation/module-config";
import { getEnabledModuleIds } from "@/modules/core/organisation/module-settings";
import { isRootControlEmail } from "@/lib/root-access";

export default async function RootPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  if (!isRootControlEmail(session.user.email)) {
    redirect("/dashboard");
  }

  const enabledModuleIds = await getEnabledModuleIds(session.user.orgId!);

  return (
    <main className="min-h-screen bg-mono-page px-6 py-8 text-mono-text lg:px-8 xl:px-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-4">
            <p className="monolith-label">ROOT CONTROL</p>
            <div className="space-y-3">
              <h1 className="monolith-h1 text-mono-accent">Organisation Module Access</h1>
              <p className="max-w-3xl text-sm leading-6 text-mono-muted">
                Manage which major modules are available across Adarsh Shipping. These toggles update navigation and route access for every signed-in user.
              </p>
            </div>
          </div>
          <RootSignOutButton />
        </section>

        <Card className="monolith-card monolith-accent">
          <CardHeader>
            <CardTitle className="text-mono-accent">Root Access Policy</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-mono-border bg-mono-soft p-4">
              <p className="monolith-label">Account</p>
              <p className="mt-2 text-sm text-mono-text">{session.user.email}</p>
            </div>
            <div className="rounded-xl border border-mono-border bg-mono-soft p-4">
              <p className="monolith-label">Enabled Modules</p>
              <p className="monolith-numeric mt-2 text-2xl text-mono-text">{enabledModuleIds.length}</p>
            </div>
            <div className="rounded-xl border border-mono-border bg-mono-soft p-4">
              <p className="monolith-label">Managed Modules</p>
              <p className="monolith-numeric mt-2 text-2xl text-mono-text">{MODULE_CONTROL_ITEMS.length}</p>
            </div>
          </CardContent>
        </Card>

        <RootModuleControlClient
          initialItems={MODULE_CONTROL_ITEMS}
          initialEnabledModuleIds={enabledModuleIds}
        />
      </div>
    </main>
  );
}
