import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  PublicBrand,
  PublicFooter,
  PublicHeader,
  PublicMonolithShell,
  PublicPanel,
  PublicStage,
} from "@/modules/auth/components/public-workspace";
import {
  WorkspacePage,
  WorkspacePageHeader,
  WorkspacePanel,
  WorkspaceSectionHeading,
} from "@/components/layout/workspace";

export function CustomerPortalPage({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <WorkspacePage
      className={cn("mnx-customer-portal-page", className)}
      {...props}
    />
  );
}

export function CustomerPortalPageHeader({
  className,
  ...props
}: React.ComponentProps<typeof WorkspacePageHeader>) {
  return (
    <WorkspacePageHeader
      className={cn("mnx-customer-portal-page-header", className)}
      {...props}
    />
  );
}

export function CustomerPortalSectionHeading({
  className,
  ...props
}: React.ComponentProps<typeof WorkspaceSectionHeading>) {
  return (
    <WorkspaceSectionHeading
      className={cn("mnx-customer-portal-section-heading", className)}
      {...props}
    />
  );
}

export function CustomerPortalPanel({
  className,
  ...props
}: React.ComponentProps<typeof WorkspacePanel>) {
  return (
    <WorkspacePanel
      className={cn("mnx-customer-portal-panel", className)}
      {...props}
    />
  );
}

export function CustomerPortalMetrics({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "mnx-workspace-metrics mnx-customer-portal-metrics",
        className,
      )}
      {...props}
    />
  );
}

export function CustomerPortalAuth({
  children,
  description,
  eyebrow,
  footer,
  title,
}: {
  children: ReactNode;
  description: ReactNode;
  eyebrow: string;
  footer?: ReactNode;
  title: ReactNode;
}) {
  return (
    <PublicMonolithShell className="mnx-customer-portal-auth">
      <PublicStage>
        <PublicBrand subtitle="Customer operations portal" />
        <PublicPanel>
          <PublicHeader
            eyebrow={eyebrow}
            title={title}
            description={description}
          />
          <div className="mnx-customer-portal-auth-form">{children}</div>
          <PublicFooter>
            {footer ?? (
              <>
                <span>Secure customer workspace</span>
                <Link href="/customer-portal/login">Sign in</Link>
              </>
            )}
          </PublicFooter>
        </PublicPanel>
      </PublicStage>
    </PublicMonolithShell>
  );
}

export function CustomerPortalPlaceholder({
  description,
  title,
}: {
  description: ReactNode;
  title: ReactNode;
}) {
  return (
    <CustomerPortalPage>
      <CustomerPortalPageHeader
        eyebrow="Customer portal"
        title={title}
        description={description}
      />
      <CustomerPortalPanel className="mnx-customer-portal-placeholder">
        <p>
          This route remains available inside the production portal shell while
          its account workflow is configured.
        </p>
      </CustomerPortalPanel>
    </CustomerPortalPage>
  );
}
