import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const headers: Record<string, string> = {};
  req.headers.forEach((v, k) => { headers[k] = v; });
  const body = await req.text();
  console.log("[GChat Debug] Headers:", JSON.stringify(headers));
  console.log("[GChat Debug] Body:", body);
  return NextResponse.json({ received: true });
}
