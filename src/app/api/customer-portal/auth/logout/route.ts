import { NextResponse } from "next/server";
import { logoutCustomerPortal } from "@/modules/customer-portal/service";

export async function POST() {
  await logoutCustomerPortal();
  return NextResponse.json({ ok: true });
}
