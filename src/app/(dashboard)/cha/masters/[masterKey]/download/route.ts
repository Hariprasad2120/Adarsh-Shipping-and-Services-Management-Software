import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { getChaCustomsFeatureFlags, isChaCustomsFeatureEnabled } from "@/modules/cha/customs/feature-flags";
import { exportCustomsMasterCsv } from "@/modules/cha/customs/masters/service";
import { masterGridQuerySchema } from "@/modules/cha/customs/masters/schemas";
import { getCustomsMasterPageConfig } from "@/modules/cha/customs/masters/page-config";

type RouteProps = {
  params: Promise<{ masterKey: string }>;
};

export async function GET(request: NextRequest, { params }: RouteProps) {
  const { masterKey } = await params;
  const config = getCustomsMasterPageConfig(masterKey);
  if (!config) return NextResponse.json({ error: "Unknown customs master." }, { status: 404 });

  const session = await getSession();
  if (!session?.user?.id || !session.user.orgId) {
    return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
  }
  const flags = await getChaCustomsFeatureFlags(session.user.orgId);
  if (!isChaCustomsFeatureEnabled(flags, "CHA_CUSTOMS_MASTER_DATA")) {
    return NextResponse.json({ error: "Feature disabled." }, { status: 404 });
  }
  if (!(await can(session.user.id, "cha.customs.master.view"))) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const query = parseGridQuery(request.nextUrl.searchParams);
  const csv = await exportCustomsMasterCsv(session.user.orgId, config.key, query);
  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${config.slug}.csv"`,
    },
  });
}

function parseGridQuery(searchParams: URLSearchParams) {
  return masterGridQuerySchema.parse({
    page: 1,
    pageSize: 200,
    sortBy: searchParams.get("sort") ?? undefined,
    sortDirection: searchParams.get("dir") === "desc" ? "desc" : "asc",
    globalSearch: searchParams.get("q") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    datasetVersion: searchParams.get("datasetVersion") ?? undefined,
    effectiveOn: searchParams.get("effectiveOn") ?? undefined,
    exactCode: searchParams.get("exactCode") ?? undefined,
    filters: Array.from(searchParams.entries())
      .filter(([key, value]) => key.startsWith("filter.") && value)
      .map(([key, value]) => ({ field: key.slice("filter.".length), value })),
  });
}
