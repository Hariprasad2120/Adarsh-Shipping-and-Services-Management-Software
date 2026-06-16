import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const orgId = req.nextUrl.searchParams.get("orgId");
  if (!orgId) {
    return NextResponse.json({ error: "Missing orgId parameter" }, { status: 400 });
  }

  const globalForScraper = globalThis as unknown as {
    justdialStatus?: Record<string, any>;
    justdialScreenshot?: Record<string, string>;
  };

  const status = globalForScraper.justdialStatus?.[orgId] || {
    status: "IDLE",
    currentStep: "Scraper is idle.",
    processedCount: 0,
    totalCount: 0,
    logs: [],
    currentUrl: ""
  };

  const screenshot = globalForScraper.justdialScreenshot?.[orgId] || "";

  return NextResponse.json({ status, screenshot });
}
