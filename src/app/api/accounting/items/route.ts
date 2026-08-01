import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { apiError, requirePermission } from "@/lib/rbac";
import { itemFormSchema } from "@/lib/items/validation";
import {
  createAccountingItem,
  deleteAccountingItems,
  listAccountingItems,
  updateAccountingItemsStatus,
} from "@/modules/accounting/item-master";

const statusSchema = z.object({
  ids: z.array(z.string().min(1)).min(1, "Select at least one item"),
  status: z.enum(["Active", "Inactive"] as const),
});

const deleteSchema = z.object({
  ids: z.array(z.string().min(1)).min(1, "Select at least one item"),
});

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

export async function GET(request: NextRequest) {
  try {
    const { session, response } = await getAccountingItemsSession();
    if (response) return response;

    const searchParams = request.nextUrl.searchParams;
    const activeOnly = searchParams.get("activeOnly") === "true";
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? Number(limitParam) : undefined;

    const data = await listAccountingItems(session!.user.orgId!, {
      activeOnly,
      limit: Number.isFinite(limit) ? limit : undefined,
    });
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { session, response } = await getAccountingItemsSession();
    if (response) return response;

    const parsed = itemFormSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.issues[0]?.message ?? "Invalid item payload",
          },
        },
        { status: 400 },
      );
    }

    const data = await createAccountingItem(session!.user.orgId!, parsed.data);
    return NextResponse.json({ ok: true, data }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { session, response } = await getAccountingItemsSession();
    if (response) return response;

    const parsed = statusSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "VALIDATION_ERROR",
            message:
              parsed.error.issues[0]?.message ?? "Invalid item status update",
          },
        },
        { status: 400 },
      );
    }

    await updateAccountingItemsStatus(
      session!.user.orgId!,
      parsed.data.ids,
      parsed.data.status,
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { session, response } = await getAccountingItemsSession();
    if (response) return response;

    const parsed = deleteSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.issues[0]?.message ?? "Invalid item delete request",
          },
        },
        { status: 400 },
      );
    }

    await deleteAccountingItems(session!.user.orgId!, parsed.data.ids);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
