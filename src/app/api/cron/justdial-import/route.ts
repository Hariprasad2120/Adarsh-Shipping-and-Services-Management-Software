import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireCronSecret } from "@/lib/security";
import { createImportLog, setImportingLock } from "@/modules/crm/lead-source.service";
import { runJustdialImport } from "@/modules/crm/justdial-import.service";

export async function GET(req: NextRequest) {
  const cronError = requireCronSecret(req);
  if (cronError) return cronError;

  try {
    const configs = await db.crmLeadSourceJustdialConfig.findMany({
      where: { isActive: true, importMode: "SCHEDULED" }
    });
    
    console.log(`[Justdial Cron] Triggering scheduled sync for ${configs.length} active configurations.`);
    const results: any[] = [];

    for (const config of configs) {
      if (config.isImporting) {
        results.push({ orgId: config.orgId, status: "SKIPPED_ALREADY_IMPORTING" });
        continue;
      }

      await setImportingLock(config.orgId, true);
      const log = await createImportLog(config.orgId);
      
      try {
        await runJustdialImport(config.orgId, config.defaultOwnerId, log.id);
        results.push({ orgId: config.orgId, status: "SUCCESS", logId: log.id });
      } catch (err: any) {
        results.push({ orgId: config.orgId, status: "FAILED", logId: log.id, error: err.message });
      } finally {
        await setImportingLock(config.orgId, false);
      }
    }

    return NextResponse.json({ triggered: true, results });
  } catch (err: any) {
    return NextResponse.json({ triggered: false, error: err.message }, { status: 500 });
  }
}
