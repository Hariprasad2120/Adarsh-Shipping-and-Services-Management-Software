import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { apiError, requirePermission } from "@/lib/rbac";

const REVERSE_GEOCODE_URL = "https://nominatim.openstreetmap.org/reverse";

function coordinateAddress(latitude: number, longitude: number) {
  return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
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
    await requirePermission(session.user.id, "hrms.workreport.submit");

    const { searchParams } = new URL(request.url);
    const latitude = Number(searchParams.get("latitude"));
    const longitude = Number(searchParams.get("longitude"));
    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid location coordinates",
          },
        },
        { status: 400 },
      );
    }

    const params = new URLSearchParams({
      format: "jsonv2",
      lat: String(latitude),
      lon: String(longitude),
      zoom: "18",
      addressdetails: "1",
    });
    let address = coordinateAddress(latitude, longitude);

    try {
      const response = await fetch(`${REVERSE_GEOCODE_URL}?${params}`, {
        headers: {
          Accept: "application/json",
          "User-Agent": "Adarsh-Shipping-HRMS/1.0",
        },
        signal: AbortSignal.timeout(6000),
        next: { revalidate: 86400 },
      });
      if (response.ok) {
        const result = (await response.json()) as { display_name?: unknown };
        if (
          typeof result.display_name === "string" &&
          result.display_name.trim()
        ) {
          address = result.display_name.trim();
        }
      }
    } catch (error) {
      console.warn("[Work reports] Reverse geocoding unavailable:", error);
    }

    return NextResponse.json({
      ok: true,
      data: {
        address,
        latitude,
        longitude,
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
