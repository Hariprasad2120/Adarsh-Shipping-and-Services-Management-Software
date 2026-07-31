import { notFound, redirect } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";
import { WorkspaceState } from "@/components/monolith/workspace";
import { getChaCustomsFeatureFlags, isChaCustomsFeatureEnabled } from "@/modules/cha/customs/feature-flags";
import { queryCustomsMasterGrid } from "@/modules/cha/customs/masters/service";
import { masterGridQuerySchema, type MasterGridQueryInput } from "@/modules/cha/customs/masters/schemas";
import {
  getCustomsMasterPageConfig,
  type CustomsMasterPageKey,
} from "@/modules/cha/customs/masters/page-config";
import { CustomsMasterRegister, type CustomsMasterGridRow } from "./master-register-client";

type PageProps = {
  params: Promise<{ masterKey: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ExportSharedCustomsMasterPage({ params, searchParams }: PageProps) {
  const [{ masterKey }, rawSearchParams] = await Promise.all([params, searchParams]);
  const config = getCustomsMasterPageConfig(masterKey);
  if (!config) notFound();

  const session = await getSession();
  if (!session?.user?.id || !session.user.orgId) redirect("/login");

  const flags = await getChaCustomsFeatureFlags(session.user.orgId);
  if (!isChaCustomsFeatureEnabled(flags, "CHA_CUSTOMS_MASTER_DATA")) {
    return (
      <WorkspaceState
        variant="permission"
        eyebrow="Feature disabled"
        title="Customs master data is disabled"
        description="This page stays hidden and inaccessible until the server-side customs master feature flag is enabled."
        icon={<ShieldAlert size={22} aria-hidden="true" />}
      />
    );
  }

  const [canView, canManage, canImport] = await Promise.all([
    can(session.user.id, "cha.customs.master.view"),
    can(session.user.id, "cha.customs.master.manage"),
    can(session.user.id, "cha.customs.master.bulk_import"),
  ]);

  if (!canView) {
    return (
      <WorkspaceState
        variant="permission"
        eyebrow="Permission required"
        title="Customs master permission required"
        description="Ask an administrator to assign customs master view access before opening this register."
        icon={<ShieldAlert size={22} aria-hidden="true" />}
      />
    );
  }

  const gridQuery = parseGridQuery(rawSearchParams);
  const [grid, latestRun] = await Promise.all([
    queryCustomsMasterGrid({
      actorId: session.user.id,
      orgId: session.user.orgId,
      masterType: config.key,
      query: gridQuery,
    }),
    getLatestImportRun(session.user.orgId, config.key),
  ]);

  return (
    <CustomsMasterRegister
      canImport={canImport}
      canManage={canManage}
      config={config}
      downloadHref={`/cha/masters/${config.slug}/download?${new URLSearchParams(flattenSearchParams(rawSearchParams)).toString()}`}
      rows={grid.rows.map(serializeMasterRow)}
      sourceVersion={latestRun?.datasetVersion ?? null}
      lastImportedAt={latestRun?.completedAt?.toISOString() ?? latestRun?.startedAt?.toISOString() ?? null}
      total={grid.total}
      page={grid.page}
      pageSize={grid.pageSize}
      search={String(firstParam(rawSearchParams.q) ?? "")}
      sortKey={String(firstParam(rawSearchParams.sort) ?? "") || null}
      sortDirection={firstParam(rawSearchParams.dir) === "desc" ? "desc" : "asc"}
      filters={collectColumnFilters(rawSearchParams)}
      status={String(firstParam(rawSearchParams.status) ?? "") || undefined}
    />
  );
}

function parseGridQuery(params: Record<string, string | string[] | undefined>): MasterGridQueryInput {
  return masterGridQuerySchema.parse({
    page: firstParam(params.page),
    pageSize: firstParam(params.pageSize),
    sortBy: firstParam(params.sort),
    sortDirection: firstParam(params.dir) === "desc" ? "desc" : "asc",
    globalSearch: firstParam(params.q),
    status: firstParam(params.status),
    datasetVersion: firstParam(params.datasetVersion),
    effectiveOn: firstParam(params.effectiveOn),
    exactCode: firstParam(params.exactCode),
    filters: Object.entries(collectColumnFilters(params)).map(([field, value]) => ({ field, value })),
  });
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function collectColumnFilters(params: Record<string, string | string[] | undefined>) {
  return Object.fromEntries(
    Object.entries(params)
      .filter(([key, value]) => key.startsWith("filter.") && firstParam(value))
      .map(([key, value]) => [key.slice("filter.".length), String(firstParam(value))]),
  );
}

function flattenSearchParams(params: Record<string, string | string[] | undefined>) {
  const flattened: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    const first = firstParam(value);
    if (first) flattened[key] = first;
  }
  return flattened;
}

function serializeMasterRow(row: Record<string, unknown> & { id: string }): CustomsMasterGridRow {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => {
      if (value instanceof Date) return [key, value.toISOString()];
      if (value && typeof value === "object" && "toFixed" in value && typeof value.toFixed === "function") {
        return [key, value.toFixed()];
      }
      return [key, value];
    }),
  ) as CustomsMasterGridRow;
}

function getLatestImportRun(orgId: string, masterType: CustomsMasterPageKey) {
  return db.chaCustomsMasterImportRun.findFirst({
    where: { orgId, masterType },
    orderBy: [{ completedAt: "desc" }, { startedAt: "desc" }],
    select: { datasetVersion: true, completedAt: true, startedAt: true },
  });
}
