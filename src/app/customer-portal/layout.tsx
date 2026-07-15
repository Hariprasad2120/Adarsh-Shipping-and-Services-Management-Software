import { headers } from "next/headers";
import type { ReactNode } from "react";
import { PackageCheck } from "lucide-react";
import { requirePortalSession } from "@/modules/customer-portal/auth";
import { PortalHeaderNav, PortalLogoutButton } from "./_components/client-actions";

export default async function CustomerPortalLayout({
  children,
}: {
  children: ReactNode;
}) {
  const currentPath = (await headers()).get("x-current-pathname") ?? "";
  if (
    currentPath === "/customer-portal/login" ||
    currentPath === "/customer-portal/activate" ||
    currentPath === "/customer-portal/forgot-password"
  ) {
    return <>{children}</>;
  }
  const session = await requirePortalSession();
  const navigationItems = [
    { href: "/customer-portal/dashboard", label: "Dashboard" },
    { href: "/customer-portal/shipments", label: "Shipments" },
    { href: "/customer-portal/notifications", label: "Notifications" },
    { href: "/customer-portal/profile", label: "Profile" },
    { href: "/customer-portal/security", label: "Security" },
  ];

  return (
    <main className="min-h-screen bg-background text-on-surface">
      <div className="sticky top-0 z-40 w-full shrink-0 bg-surface/95 shadow-sm backdrop-blur-sm">
        <header className="border-b border-outline-variant/60 bg-surface/90 backdrop-blur-sm">
          <div className="mx-auto w-full max-w-[1520px] px-4 sm:px-6 lg:px-10 xl:px-14">
            <div className="flex min-h-16 w-full items-center gap-4 py-3">
              <div className="flex min-w-0 shrink-0 items-center gap-3">
                <div className="ds-icon-badge">
                  <PackageCheck size={16} />
                </div>
                <div className="min-w-0">
                  <h1 className="ds-h3 heading-icon-none truncate text-on-surface">Customer Portal</h1>
                </div>
              </div>

              <PortalHeaderNav items={navigationItems} />

              <div className="ml-auto hidden min-w-0 shrink-0 items-center gap-3 xl:flex">
                <div className="truncate text-[13px] text-on-surface-variant">
                  {session.portalUser.customer.name}
                </div>
                <PortalLogoutButton />
              </div>
            </div>
          </div>
        </header>
      </div>

      <div className="mx-auto flex w-full max-w-[1520px] flex-col gap-5 px-4 py-4 sm:px-6 sm:py-5 lg:px-10 xl:px-14">
        {children}
      </div>
    </main>
  );
}
