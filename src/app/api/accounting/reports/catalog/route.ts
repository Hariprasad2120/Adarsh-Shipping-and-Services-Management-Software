import { ok } from "@/lib/api-helpers";
import { listAccountingReportCatalog } from "@/modules/accounting/phase9-workspaces";

export async function GET() {
  return ok({ reports: listAccountingReportCatalog() });
}
