import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { RootModuleControlClient } from "@/components/root-module-control-client";
import { RootSignOutButton } from "@/components/root-signout-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <main className="min-h-screen bg-background px-6 py-8 text-on-surface lg:px-8 xl:px-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-4">
            <p className="ds-label">ROOT CONTROL</p>
            <div className="space-y-3">
              <h1 className="ds-h1 text-primary">Organisation Module Access</h1>
              <p className="max-w-3xl text-sm leading-6 text-on-surface-variant">
                Manage which major modules are available across Adarsh Shipping. These toggles update navigation and route access for every signed-in user.
              </p>
            </div>
          </div>
          <RootSignOutButton />
        </section>

        <Card className="card-top-accent">
          <CardHeader>
            <CardTitle className="text-primary">Root Access Policy</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-outline-variant bg-surface-container-low p-4">
              <p className="ds-label">Account</p>
              <p className="mt-2 text-sm text-on-surface">{session.user.email}</p>
            </div>
            <div className="rounded-xl border border-outline-variant bg-surface-container-low p-4">
              <p className="ds-label">Enabled Modules</p>
              <p className="ds-numeric mt-2 text-2xl text-on-surface">{enabledModuleIds.length}</p>
            </div>
            <div className="rounded-xl border border-outline-variant bg-surface-container-low p-4">
              <p className="ds-label">Managed Modules</p>
              <p className="ds-numeric mt-2 text-2xl text-on-surface">{MODULE_CONTROL_ITEMS.length}</p>
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
