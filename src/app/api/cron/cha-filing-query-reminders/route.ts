import { NextResponse } from "next/server";
import { runFilingWorkflowQueryReminderCron } from "@/modules/cha/service";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const secret = url.searchParams.get("secret");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && secret !== cronSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
