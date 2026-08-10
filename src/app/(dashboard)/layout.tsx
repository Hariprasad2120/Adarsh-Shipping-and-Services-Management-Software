import { NotificationProvider } from "@/modules/notifications/components/notification-provider";
import { SessionSync } from "@/components/providers/session-sync";
import { CapsProvider } from "@/lib/caps-context";
import { getDashboardContext } from "@/lib/dashboard-context";
import {
  getManagedFeatureIdForPath,
  getManagedModuleSectionIdForPath,
} from "@/modules/core/organisation/module-config";
import { getOrganisationThemeSettings } from "@/modules/core/organisation/theme-settings";
import { buildPaletteOverrideCss } from "@/modules/core/organisation/theme-palette-schema";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getOrg } from "@/modules/core/organisation/service";
import { DashboardShellSwitcher } from "./_components/dashboard-shell-switcher";

function normalizePathname(pathname: string | null) {
  if (!pathname) return "/dashboard";
  const normalized = pathname.replace(/\/+$/, "");
  return normalized || "/";
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const context = await getDashboardContext();
  if (!context) redirect("/login");
  if (!context.orgId) redirect("/setup");

  const pathname = normalizePathname(
    (await headers()).get("x-current-pathname"),
  );
  const { session, caps, enabledFeatureIds, enabledModuleIds } = context;
  const managedSectionId = getManagedModuleSectionIdForPath(pathname);
  const managedFeatureId = getManagedFeatureIdForPath(pathname);
  const enabledModuleSet = new Set(enabledModuleIds);
  const enabledFeatureSet = new Set(enabledFeatureIds);

  if (managedSectionId && !enabledModuleSet.has(managedSectionId)) {
    redirect("/dashboard");
  }

  if (managedFeatureId && !enabledFeatureSet.has(managedFeatureId)) {
    redirect("/cha");
  }

  const { lightPalette, darkPalette } = await getOrganisationThemeSettings(
    context.orgId,
  );
  const org = await getOrg(context.orgId);
  const paletteOverrideCss = buildPaletteOverrideCss(lightPalette, darkPalette);

  return (
    <CapsProvider value={caps}>
      {paletteOverrideCss ? (
        <style
          id="org-theme-palette-overrides"
          dangerouslySetInnerHTML={{ __html: paletteOverrideCss }}
        />
      ) : null}
      <NotificationProvider>
        <SessionSync />
        <DashboardShellSwitcher
          caps={caps}
          enabledFeatureIds={enabledFeatureIds}
          isPlatformAdmin={session.user.isPlatformAdmin}
          orgName={org?.name ?? "Organization"}
          userEmail={session.user.email}
          userName={session.user.name}
          userId={session.user.id}
          enabledModuleIds={enabledModuleIds}
        >
          {children}
        </DashboardShellSwitcher>
      </NotificationProvider>
    </CapsProvider>
  );
}
