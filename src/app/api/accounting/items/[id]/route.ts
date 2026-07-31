import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { apiError, requirePermission } from "@/lib/rbac";
import { getAccountingItem } from "@/modules/accounting/item-master";

async function getAccountingItemsSession() {
  const session = await auth();
  if (!session?.user?.orgId) {
    return {
      session: null,
      response: NextResponse.json(
        {
          ok: false,
          error: { code: "UNAUTHORIZED", message: "Unauthorized" },
        },
        { status: 401 },
      ),
    };
  }

  await requirePermission(session.user.id, "accounting.dashboard.view");
  return { session, response: null };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { session, response } = await getAccountingItemsSession();
    if (response) return response;

    const { id } = await params;
    const data = await getAccountingItem(session!.user.orgId!, id);
    if (!data) {
      return NextResponse.json(
        {
          ok: false,
          error: { code: "NOT_FOUND", message: "Item not found" },
        },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return apiError(error);
  }
}
