"use client";

import { CalendarCheck, Ship, Users } from "lucide-react";
import { WorkspacePanelHeader } from "@/components/monolith";
import { AccountingPanel } from "@/modules/accounting/components/accounting-workspace";
import { AdminPanel } from "@/modules/admin/components/admin-workspace";
import { ChaSection } from "@/modules/cha/components/workspace/cha-workspace";
import { CommunicationPanel } from "@/modules/communication/components/workspace/communication-workspace";
import { CrmPanel } from "@/modules/crm/components/workspace/crm-workspace";
import {
  PeopleSection,
  PeopleSummary,
  PeopleSummaryGrid,
} from "@/modules/people/components/people-workspace";
import {
  PerformanceCard,
  PerformanceGrid,
  PerformanceSection,
} from "@/modules/performance/components/performance-workspace";
import {
  allCatalogueThemes,
  type CatalogueEntry,
  type CatalogueScope,
} from "@/components/monolith/catalogue/types";

const themes = allCatalogueThemes;

function panelEntry(
  scope: "accounting" | "crm" | "communication" | "admin",
  component: string,
  source: string,
  Panel: typeof AccountingPanel,
  title: string,
  description: string,
): CatalogueEntry {
  return {
    id: `${scope}-panel`,
    component,
    displayName: `${title} panel`,
    category: "Module composition",
    scope,
    description,
    status: "stable",
    source,
    render: () => (
      <Panel>
        <WorkspacePanelHeader
          eyebrow={`${title} production`}
          title={`${title} operations`}
          description={description}
        />
        <div className="mnx-catalogue-panel-content">Canonical module composition using shared primitives.</div>
      </Panel>
    ),
    themes,
    states: ["default", "responsive"],
    interactive: false,
    accessibility: "Inherits semantic panel and heading behavior from shared primitives.",
  };
}

function peopleEntry(scope: "hrms" | "attendance", title: string): CatalogueEntry {
  return {
    id: `${scope}-people-section`,
    component: "PeopleSection",
    displayName: `${title} people section`,
    category: "Module composition",
    scope,
    description: `The production People Operations composition used by ${title}.`,
    status: "stable",
    source: "src/modules/people/components/people-workspace.tsx",
    render: () => (
      <PeopleSection>
        <WorkspacePanelHeader
          eyebrow={`${title} production`}
          title={`${title} overview`}
          description="Shared people data composition with module-owned content."
        />
        <PeopleSummaryGrid className="mnx-catalogue-panel-content">
          <PeopleSummary
            icon={scope === "attendance" ? <CalendarCheck /> : <Users />}
            label={scope === "attendance" ? "Present today" : "Active employees"}
            value={scope === "attendance" ? "86" : "124"}
            detail="Live production component"
          />
        </PeopleSummaryGrid>
      </PeopleSection>
    ),
    themes,
    states: ["summary", "responsive"],
    interactive: false,
    accessibility: "Summary labels and values remain available as text.",
  };
}

function performanceEntry(scope: CatalogueScope, title: string): CatalogueEntry {
  return {
    id: `${scope}-performance-section`,
    component: "PerformanceSection",
    displayName: `${title} performance section`,
    category: "Module composition",
    scope,
    description: `The production performance composition used by ${title}.`,
    status: "stable",
    source: "src/modules/performance/components/performance-workspace.tsx",
    render: () => (
      <PerformanceSection>
        <WorkspacePanelHeader
          eyebrow={`${title} production`}
          title={`${title} cycle`}
          description="Module-owned performance content composed from shared surfaces."
        />
        <PerformanceGrid className="mnx-catalogue-panel-content">
          <PerformanceCard>
            <strong>Quarterly review</strong>
            <p>Assessment cycle is active.</p>
          </PerformanceCard>
        </PerformanceGrid>
      </PerformanceSection>
    ),
    themes,
    states: ["cycle", "responsive"],
    interactive: false,
    accessibility: "Card content uses visible text and semantic grouping.",
  };
}

export const moduleCatalogue: CatalogueEntry[] = [
  {
    id: "cha-section",
    component: "ChaSection",
    displayName: "CHA section",
    category: "Module composition",
    scope: "cha",
    description: "The same section composition used by the CHA workspace.",
    status: "stable",
    source: "src/modules/cha/components/workspace/cha-workspace.tsx",
    render: () => (
      <ChaSection
        index="01"
        title="My Assigned Jobs"
        description="Open or manage the jobs currently assigned to you."
        badge="Live"
      >
        <div className="mnx-catalogue-module-copy"><Ship /> Production CHA content renders here.</div>
      </ChaSection>
    ),
    themes,
    states: ["heading", "badge", "panel"],
    interactive: false,
    accessibility: "Composes the canonical WorkspaceSectionHeading and WorkspacePanel.",
  },
  panelEntry(
    "accounting",
    "AccountingPanel",
    "src/modules/accounting/components/accounting-workspace.tsx",
    AccountingPanel,
    "Accounting",
    "Ledger, invoice, payment, and reporting surfaces.",
  ),
  panelEntry(
    "crm",
    "CrmPanel",
    "src/modules/crm/components/workspace/crm-workspace.tsx",
    CrmPanel,
    "CRM",
    "Customer, lead, deal, and sales operation surfaces.",
  ),
  peopleEntry("hrms", "HRMS"),
  peopleEntry("attendance", "Attendance"),
  performanceEntry("ams", "AMS"),
  panelEntry(
    "communication",
    "CommunicationPanel",
    "src/modules/communication/components/workspace/communication-workspace.tsx",
    CommunicationPanel,
    "Communication",
    "Mail, chat, meeting, and connected workspace surfaces.",
  ),
  panelEntry(
    "admin",
    "AdminPanel",
    "src/modules/admin/components/admin-workspace.tsx",
    AdminPanel,
    "Admin",
    "Roles, sessions, settings, and platform operation surfaces.",
  ),
];
