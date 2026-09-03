/**
 * Stage 2 — enterprise platform: module registry queries + dependency resolution.
 */

import { MODULE_REGISTRY } from "./registry";
import type { ModuleId, ModuleManifest } from "./types";

const BY_ID = new Map<ModuleId, ModuleManifest>(
  MODULE_REGISTRY.map((m) => [m.id, m]),
);

export function listModules(): readonly ModuleManifest[] {
  return MODULE_REGISTRY;
}

export function getModule(id: string): ModuleManifest | undefined {
  return BY_ID.get(id as ModuleId);
}

export function isModuleId(id: string): id is ModuleId {
  return BY_ID.has(id as ModuleId);
}

export function listCoreModuleIds(): ModuleId[] {
  return MODULE_REGISTRY.filter((m) => m.kind === "core").map((m) => m.id);
}

export function listBusinessModuleIds(): ModuleId[] {
  return MODULE_REGISTRY.filter((m) => m.kind === "business").map((m) => m.id);
}

export class RegistryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RegistryError";
  }
}

/**
 * Structural validation — unknown `dependsOn` targets, core-depends-on-business,
 * and dependency cycles. Throws `RegistryError` on the first problem. Called once
 * at module load (below) so a bad manifest fails fast in dev / CI.
 */
export function validateRegistry(): void {
  const ids = new Set<string>();
  for (const m of MODULE_REGISTRY) {
    if (ids.has(m.id)) throw new RegistryError(`duplicate module id: ${m.id}`);
    ids.add(m.id);
  }

  for (const m of MODULE_REGISTRY) {
    for (const dep of m.dependsOn) {
      const target = BY_ID.get(dep);
      if (!target) {
        throw new RegistryError(`module "${m.id}" depends on unknown module "${dep}"`);
      }
      if (m.kind === "core" && target.kind === "business") {
        throw new RegistryError(
          `core module "${m.id}" cannot depend on business module "${dep}"`,
        );
      }
    }
  }

  // Cycle detection (DFS with colouring).
  const WHITE = 0;
  const GREY = 1;
  const BLACK = 2;
  const colour = new Map<ModuleId, number>();
  for (const m of MODULE_REGISTRY) colour.set(m.id, WHITE);

  const visit = (id: ModuleId, path: ModuleId[]): void => {
    colour.set(id, GREY);
    for (const dep of BY_ID.get(id)?.dependsOn ?? []) {
      const c = colour.get(dep);
      if (c === GREY) {
        throw new RegistryError(
          `dependency cycle: ${[...path, id, dep].join(" -> ")}`,
        );
      }
      if (c === WHITE) visit(dep, [...path, id]);
    }
    colour.set(id, BLACK);
  };

  for (const m of MODULE_REGISTRY) {
    if (colour.get(m.id) === WHITE) visit(m.id, []);
  }
}

/**
 * Resolve a requested set of business modules into the full set that must be
 * enabled: core modules are always included, and every requested module pulls in
 * its transitive `dependsOn` closure.
 *
 * Returns the resolved id list (registry order) plus the ids that were added by
 * dependency resolution but were not explicitly requested — callers surface
 * those to the admin and record them in the config-audit trail.
 */
export function resolveEnabledModules(requested: Iterable<string>): {
  enabled: ModuleId[];
  autoAdded: ModuleId[];
} {
  const requestedSet = new Set<ModuleId>();
  for (const id of requested) {
    if (isModuleId(id)) requestedSet.add(id);
  }

  const resolved = new Set<ModuleId>(listCoreModuleIds());

  const pull = (id: ModuleId): void => {
    if (resolved.has(id)) return;
    resolved.add(id);
    for (const dep of BY_ID.get(id)?.dependsOn ?? []) pull(dep);
  };
  for (const id of requestedSet) pull(id);

  const enabled = MODULE_REGISTRY.filter((m) => resolved.has(m.id)).map((m) => m.id);
  const autoAdded = enabled.filter(
    (id) =>
      !requestedSet.has(id) &&
      BY_ID.get(id)?.kind === "business",
  );
  return { enabled, autoAdded };
}

/** The module that owns a URL path, honouring longest-prefix wins. */
export function getModuleForPath(pathname: string): ModuleManifest | undefined {
  let best: { module: ModuleManifest; len: number } | undefined;
  for (const m of MODULE_REGISTRY) {
    for (const prefix of m.routePrefixes) {
      if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
        if (!best || prefix.length > best.len) best = { module: m, len: prefix.length };
      }
    }
  }
  return best?.module;
}

// Fail fast on a malformed registry.
validateRegistry();
