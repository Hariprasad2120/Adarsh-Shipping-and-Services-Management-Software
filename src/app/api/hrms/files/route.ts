import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  HrDocumentDriveError,
  isHrDocumentCategory,
  listHrDocuments,
  uploadHrDocument,
} from "@/modules/hrms/document-drive";

function errorResponse(error: unknown) {
  if (error instanceof HrDocumentDriveError) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: error.code,
          message: error.message,
        },
      },
      { status: error.status },
    );
  }

  console.error("HR document drive request failed:", error);
  return NextResponse.json(
    {
      ok: false,
      error: {
        code: "INTERNAL_ERROR",
        message:
          error instanceof Error
            ? error.message
            : "The document drive request failed.",
      },
    },
    { status: 500 },
  );
}

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.orgId) {
      return NextResponse.json(
        {
          ok: false,
          error: { code: "UNAUTHORIZED", message: "Unauthorized" },
        },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") || "MY_SPACE";
    if (!isHrDocumentCategory(category)) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid document category.",
          },
        },
        { status: 400 },
      );
    }

    const data = await listHrDocuments({
      orgId: session.user.orgId,
      actorId: session.user.id,
      category,
      ownerId: searchParams.get("employeeId"),
      search: searchParams.get("search"),
    });
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.orgId) {
      return NextResponse.json(
        {
          ok: false,
          error: { code: "UNAUTHORIZED", message: "Unauthorized" },
        },
        { status: 401 },
      );
    }

    const formData = await request.formData();
    const categoryValue = formData.get("category");
    const category =
      typeof categoryValue === "string" ? categoryValue : undefined;
    const file = formData.get("file");
    if (!isHrDocumentCategory(category) || !(file instanceof File)) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "A valid category and file are required.",
          },
        },
        { status: 400 },
      );
    }

    const ownerId = formData.get("employeeId");
    const data = await uploadHrDocument({
      orgId: session.user.orgId,
      actorId: session.user.id,
      category,
      ownerId: typeof ownerId === "string" ? ownerId : null,
      file,
    });
    return NextResponse.json({ ok: true, data }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
