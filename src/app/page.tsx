import { Boxes, Building2, LifeBuoy, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { PublicMonolithShell } from "@/modules/auth/components/public-workspace";
import { RootModuleControlClient } from "@/modules/core/components/root-module-control-client";
import { RootSignOutButton } from "@/modules/core/components/root-signout-button";
import {
  MODULE_CONTROL_ITEMS,
  MODULE_FEATURE_CONTROL_ITEMS,
} from "@/modules/core/organisation/module-config";
import {
  getEnabledFeatureIds,
  getEnabledModuleIds,
} from "@/modules/core/organisation/module-settings";
import { hasRootModuleControl } from "@/lib/root-access";

function Stat({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  detail: React.ReactNode;
}) {
  return (
    <div className="mnx-panel flex flex-col gap-1 p-4">
      <div className="flex items-center gap-2 text-[color:var(--mnx-text-muted)]">
        <span className="grid h-7 w-7 place-items-center rounded-md border border-[color:var(--mnx-border)]">
          {icon}
        </span>
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <div className="text-2xl font-semibold leading-tight">{value}</div>
      <div className="truncate text-xs text-[color:var(--mnx-text-muted)]">{detail}</div>
    </div>
  );
}

export default async function RootPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!(await hasRootModuleControl(session.user.id))) redirect("/dashboard");

  const [enabledModuleIds, enabledFeatureIds] = await Promise.all([
    getEnabledModuleIds(session.user.orgId!),
    getEnabledFeatureIds(session.user.orgId!),
  ]);

  return (
    <PublicMonolithShell workspace data-public-route="root-control">
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
        {/* Page header */}
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-[color:var(--mnx-border)] bg-[color:var(--mnx-surface-soft)]">
              <ShieldCheck size={20} aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--mnx-text-muted)]">
                Root control
              </p>
              <h1 className="text-xl font-semibold sm:text-2xl">
                Organisation module access
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-[color:var(--mnx-text-muted)]">
                Enable or suspend complete operational workspaces for every
                signed-in user. This does not change user roles or the
                permissions inside each module.
              </p>
            </div>
          </div>
          <RootSignOutButton />
        </header>

        {/* Summary stats */}
        <section
          aria-label="Root access summary"
          className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        >
          <Stat
            icon={<ShieldCheck size={15} />}
            label="Control account"
            value="ROOT"
            detail={session.user.email}
          />
          <Stat
            icon={<Boxes size={15} />}
            label="Enabled modules"
            value={enabledModuleIds.length}
            detail="Available organisation-wide"
          />
          <Stat
            icon={<Building2 size={15} />}
            label="Managed modules"
            value={MODULE_CONTROL_ITEMS.length}
            detail="Root-controlled workspaces"
          />
          <Link
            href="/admin"
            className="mnx-panel flex flex-col gap-1 p-4 transition-colors hover:border-[color:var(--mnx-accent)]"
          >
            <div className="flex items-center gap-2 text-[color:var(--mnx-text-muted)]">
              <span className="grid h-7 w-7 place-items-center rounded-md border border-[color:var(--mnx-border)]">
                <LifeBuoy size={15} />
              </span>
              <span className="text-xs font-medium uppercase tracking-wide">
                Recovery access
              </span>
            </div>
            <div className="text-2xl font-semibold leading-tight">ON</div>
            <div className="text-xs text-[color:var(--mnx-text-muted)]">
              Open the administration workspace →
            </div>
          </Link>
        </section>

        {/* Section heading */}
        <div className="mt-10 border-b border-[color:var(--mnx-border)] pb-3">
          <div className="flex items-baseline gap-2">
            <span className="text-xs font-semibold text-[color:var(--mnx-text-muted)]">
              01
            </span>
            <h2 className="text-lg font-semibold">Global availability</h2>
          </div>
        </div>

        <div className="mt-5">
          <RootModuleControlClient
            initialFeatureItems={MODULE_FEATURE_CONTROL_ITEMS}
            initialEnabledFeatureIds={enabledFeatureIds}
            initialItems={MODULE_CONTROL_ITEMS}
            initialEnabledModuleIds={enabledModuleIds}
          />
        </div>
      </div>
    </PublicMonolithShell>
  );
}
