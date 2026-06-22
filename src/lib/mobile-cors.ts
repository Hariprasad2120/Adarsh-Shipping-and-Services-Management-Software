import { NextResponse } from "next/server";

/**
 * CORS headers for mobile API endpoints.
 *
 * The CRM mobile app ("Sales Force Client") runs as a native Android app
 * and makes cross-origin requests to the Vercel deployment. Without these
 * headers, the app's HTTP client may silently reject responses.
 */
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Requested-With",
  "Access-Control-Max-Age": "86400",
};

/**
 * Wrap a NextResponse with CORS headers for mobile API responses.
 */
export function mobileCors(response: NextResponse): NextResponse {
  Object.entries(CORS_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

/**
 * Return a preflight OPTIONS response with CORS headers.
 */
export function mobileOptions(): NextResponse {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

/**
 * Helper: create a JSON response with CORS headers in one call.
 */
export function mobileJson(data: any, status = 200): NextResponse {
  const response = NextResponse.json(data, { status });
  return mobileCors(response);
}
