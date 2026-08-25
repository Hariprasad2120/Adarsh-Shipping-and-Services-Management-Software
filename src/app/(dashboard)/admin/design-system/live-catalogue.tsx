"use client";

import { Badge } from "@/components/ui/badge";
import {
  moduleCatalogue,
  sharedCatalogue,
  type CatalogueEntry,
} from "@/components/monolith/catalogue";

function buildLiveCatalogueGroups() {
  const entries = [...sharedCatalogue, ...moduleCatalogue];
  const checkoutEntry = entries.find((entry) => entry.id === "trial-checkout-pattern");
  const remainingEntries = entries.filter((entry) => entry.id !== "trial-checkout-pattern");
  const grouped = new Map<string, CatalogueEntry[]>();

  for (const entry of remainingEntries) {
    const current = grouped.get(entry.category) ?? [];
    current.push(entry);
    grouped.set(entry.category, current);
  }

  return {
    checkoutEntry,
    grouped: Array.from(grouped.entries()).sort(([left], [right]) => left.localeCompare(right)),
  };
}

export function LiveCatalogueSection() {
  const liveCatalogue = buildLiveCatalogueGroups();

  return (
    <>
      <h2 className="ds-page-title">Live Monolith catalogue</h2>
      <p className="ds-font-family">
        This section renders the actual production shared and module-owned Monolith components
        registered in the live catalogue. New reusable patterns should appear here, not only in
        route-local documentation.
      </p>

      {liveCatalogue.checkoutEntry ? (
        <section className="ds-live-feature" aria-labelledby="ds-live-feature-title">
          <div className="ds-live-feature-heading">
            <p className="ds-type-label">Featured pattern</p>
            <h3 className="ds-type-heading" id="ds-live-feature-title">
              {liveCatalogue.checkoutEntry.displayName}
            </h3>
            <p className="ds-font-family">{liveCatalogue.checkoutEntry.description}</p>
            <p className="ds-type-other">
              <code>{liveCatalogue.checkoutEntry.source}</code>
            </p>
          </div>
          <div className="ds-live-preview ds-live-preview-feature">
            {liveCatalogue.checkoutEntry.render()}
          </div>
        </section>
      ) : null}

      <section className="ds-live-groups" aria-label="Live catalogue groups">
        {liveCatalogue.grouped.map(([category, entries]) => (
          <section className="ds-live-group" key={category}>
            <header className="ds-live-group-header">
              <h3 className="ds-type-heading">{category}</h3>
              <p className="ds-font-family">{entries.length} registered production specimen(s)</p>
            </header>

            <div className="ds-live-grid">
              {entries.map((entry) => (
                <article className="ds-live-card" id={`catalogue-${entry.id}`} key={entry.id}>
                  <header className="ds-live-card-header">
                    <div>
                      <p className="ds-type-label">{entry.scope}</p>
                      <h4 className="ds-type-title">{entry.displayName}</h4>
                      <p className="ds-font-family">{entry.description}</p>
                    </div>
                    <Badge variant="secondary">{entry.status}</Badge>
                  </header>

                  <div className="ds-live-preview">{entry.render()}</div>

                  <footer className="ds-live-card-footer">
                    <p className="ds-type-other">
                      <code>{entry.source}</code>
                    </p>
                  </footer>
                </article>
              ))}
            </div>
          </section>
        ))}
      </section>
    </>
  );
}
