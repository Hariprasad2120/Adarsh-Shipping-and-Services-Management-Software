"use client";

import { useEffect, useState } from "react";
import type { Caps } from "@/lib/rbac";
import { NAV_SECTIONS } from "@/lib/navigation";
import { MonolithReferenceSidebar } from "@/components/navigation/monolith-reference-sidebar";

const SPECIMEN_CAPS = new Proxy(
  {},
  {
    get: () => true,
  },
) as Caps;

const SPECIMEN_SECTIONS = NAV_SECTIONS.filter((section) =>
  ["dashboard", "notifications", "admin", "hrms", "cha", "crm", "accounting"].includes(section.id),
).map((section) =>
  section.id === "admin"
    ? section
    : {
        ...section,
        items: section.items.slice(0, 6),
      },
);

export function SidebarLayoutSpecimen() {
  const [collapsed, setCollapsed] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const syncTheme = () => {
      setTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
    };

    syncTheme();
    window.addEventListener("themechange", syncTheme);
    return () => window.removeEventListener("themechange", syncTheme);
  }, []);

  return (
    <section className="ds-sidebar-specimen">
      <div className="ds-sidebar-preview">
        <MonolithReferenceSidebar
          caps={SPECIMEN_CAPS}
          currentTheme={theme}
          isCollapsed={collapsed}
          isPlatformAdmin
          onToggleAccent={() => {}}
          onToggleSidebar={() => setCollapsed((current) => !current)}
          onToggleTheme={() => {}}
          orgName="Adarsh Shipping"
          pathname="/admin/design-system"
          userEmail="admin@example.com"
          userId="specimen-user"
          userName="Administrator"
          visibleSections={SPECIMEN_SECTIONS}
        />
        <div className="ds-sidebar-canvas">
          <div className="ds-sidebar-canvas-bar" />
          <div className="ds-sidebar-canvas-surface">
            <p className="ds-type-body">Sidebar content canvas</p>
            <p className="ds-type-other">
              Expanded and collapsed states both use the shared production sidebar component.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
