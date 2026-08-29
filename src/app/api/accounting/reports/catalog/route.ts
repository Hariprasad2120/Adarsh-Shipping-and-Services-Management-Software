import { ok } from "@/lib/api-helpers";
import { requireApiActor, withApiAuth } from "@/lib/api-auth";
import { listAccountingReportCatalog } from "@/modules/accounting/phase9-workspaces";

export const GET = withApiAuth(async () => {
  await requireApiActor();
  return ok({ reports: listAccountingReportCatalog() });
});
