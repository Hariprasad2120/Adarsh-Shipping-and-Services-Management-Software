import { NextResponse } from "next/server";
import { requireCronSecret } from "@/lib/security";
import { runFilingWorkflowQueryReminderCron } from "@/modules/cha/service";

export async function GET(request: Request) {
  try {
    const cronError = requireCronSecret(request);
    if (cronError) return cronError;

    const result = await runFilingWorkflowQueryReminderCron();

    return NextResponse.json({
      ok: true,
      data: {
        ...result,
        processedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error("cha filing query reminder cron error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
