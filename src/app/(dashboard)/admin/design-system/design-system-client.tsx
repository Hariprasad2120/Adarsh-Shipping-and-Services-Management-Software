"use client";

import { useMemo, useState } from "react";
import { Boxes, Search } from "lucide-react";
import {
  Input,
  WorkspacePage,
  WorkspacePageHeader,
  WorkspaceSectionHeading,
} from "@/components/monolith";
import {
  moduleCatalogue,
  sharedCatalogue,
  type CatalogueEntry,
  type CatalogueScope,
} from "@/components/monolith/catalogue";

const scopeLabels: Record<CatalogueScope, string> = {
  foundation: "Foundations",
  shared: "Shared components",
  cha: "CHA",
  accounting: "Accounting",
  crm: "CRM",
  hrms: "HRMS",
  attendance: "Attendance",
  ams: "AMS",
  communication: "Communication",
  admin: "Admin",
};

const moduleScopes: CatalogueScope[] = [
  "cha",
  "accounting",
  "crm",
  "hrms",
  "attendance",
  "ams",
  "communication",
  "admin",
];

function Specimen({ entry }: { entry: CatalogueEntry }) {
  return (
    <article
      className="mnx-catalogue-specimen"
      data-catalogue-component={entry.component}
      data-catalogue-id={entry.id}
      data-catalogue-source={entry.source}
      id={entry.id}
    >
      <header className="mnx-catalogue-specimen-label">
        <div>
          <span>{entry.status}</span>
          <h3>{entry.displayName}</h3>
          <p>{entry.description}</p>
        </div>
        <dl>
          <div><dt>Source</dt><dd>{entry.source}</dd></div>
          <div><dt>States</dt><dd>{entry.states.join(", ")}</dd></div>
          <div><dt>Themes</dt><dd>{entry.themes.join(", ")}</dd></div>
          <div><dt>Interaction</dt><dd>{entry.interactive ? "Interactive" : "Static"}</dd></div>
          <div><dt>Accessibility</dt><dd>{entry.accessibility}</dd></div>
        </dl>
      </header>
      <div className="mnx-catalogue-preview">{entry.render()}</div>
    </article>
  );
}

function CatalogueSection({
  description,
  entries,
  index,
  title,
}: {
  description: string;
  entries: CatalogueEntry[];
  index: string;
  title: string;
}) {
  if (entries.length === 0) return null;

  return (
    <section className="mnx-catalogue-section" id={`catalogue-${entries[0].scope}`}>
      <WorkspaceSectionHeading
        index={index}
        title={title}
        description={description}
      />
      <div className="mnx-catalogue-specimen-list">
        {entries.map((entry) => <Specimen entry={entry} key={entry.id} />)}
      </div>
    </section>
  );
}

export default function DesignSystemClient() {
  const [query, setQuery] = useState("");
  const entries = useMemo(
    () => [...sharedCatalogue, ...moduleCatalogue],
    [],
  );
  const visibleEntries = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return entries;
    return entries.filter((entry) =>
      [
        entry.component,
        entry.displayName,
        entry.category,
        entry.scope,
        entry.description,
      ].some((value) => value.toLowerCase().includes(normalized)),
    );
  }, [entries, query]);

  const entriesFor = (scope: CatalogueScope) =>
    visibleEntries.filter((entry) => entry.scope === scope);
  const visibleModuleScopes = moduleScopes.filter(
    (scope) => entriesFor(scope).length > 0,
  );

  return (
    <WorkspacePage className="mnx-catalogue-page">
      <WorkspacePageHeader
        eyebrow="Live production catalogue"
        title="Monolith design system"
        description="Every specimen below renders the exact canonical production component. Catalogue CSS arranges specimens but never restyles them."
        icon={<Boxes aria-hidden="true" />}
      />

      <div className="mnx-catalogue-toolbar">
        <label htmlFor="catalogue-search">
          <Search aria-hidden="true" />
          <span>Search components</span>
        </label>
        <Input
          id="catalogue-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Heading, panel, CHA, table..."
        />
        <p>{visibleEntries.length} of {entries.length} registered specimens</p>
      </div>

      <nav className="mnx-catalogue-navigation" aria-label="Component catalogue">
        <div>
          <strong>FOUNDATIONS</strong>
          {entriesFor("foundation").length > 0 ? <a href="#catalogue-foundation">Foundations</a> : null}
        </div>
        <div>
          <strong>SHARED COMPONENTS</strong>
          {entriesFor("shared").length > 0 ? <a href="#catalogue-shared">Shared components</a> : null}
        </div>
        {visibleModuleScopes.length > 0 ? (
          <div>
            <strong>MODULES</strong>
            {visibleModuleScopes.map((scope) => (
              <a href={`#catalogue-${scope}`} key={scope}>{scopeLabels[scope]}</a>
            ))}
          </div>
        ) : null}
      </nav>

      <CatalogueSection
        index="01"
        title="Foundations"
        description="Canonical fonts, semantic tokens, themes, spacing, shape, and motion."
        entries={entriesFor("foundation")}
      />
      <CatalogueSection
        index="02"
        title="Shared components"
        description="Business-neutral production components reused across every Monolith module."
        entries={entriesFor("shared")}
      />

      {visibleModuleScopes.length > 0 ? (
        <section className="mnx-catalogue-module-group" aria-labelledby="catalogue-modules-title">
          <WorkspaceSectionHeading
            id="catalogue-modules-title"
            index="03"
            title="Modules"
            description="Genuinely module-specific production compositions built from shared primitives."
          />
          {visibleModuleScopes.map((scope, moduleIndex) => (
            <CatalogueSection
              key={scope}
              index={`03.${moduleIndex + 1}`}
              title={scopeLabels[scope]}
              description={`${scopeLabels[scope]} production components and supported states.`}
              entries={entriesFor(scope)}
            />
          ))}
        </section>
      ) : null}

      {visibleEntries.length === 0 ? (
        <p className="mnx-catalogue-no-results">No registered components match “{query}”.</p>
      ) : null}
    </WorkspacePage>
  );
}
