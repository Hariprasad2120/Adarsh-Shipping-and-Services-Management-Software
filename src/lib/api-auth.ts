import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";

/**
 * Canonical server-side authentication gate for Route Handlers and Server
 * Actions that are authenticated by the Monolith session cookie.
 *
 * Design (MON-S1-010): deny by default. Every mutating / data-returning API
 * route must resolve its actor through `requireApiActor()` (or a wrapper built
 * on it) rather than re-implementing `auth()` + null-checks. This gives one
 * place to add step-up re-auth, audit and future policy hooks.
 *
 * The edge proxy (`src/proxy.ts`) only checks cookie *presence*; the real
 * validation (opaque nonce -> DB session record, fail-closed) happens inside
 * `getSession()` here.
 *
 * Bearer-authenticated mobile routes use `getMobileUser()` instead — it shares
 * the same `validateSession()` core.
 */

export interface ApiActor {
  userId: string;
  orgId: string;
  email: string | null;
  isPlatformAdmin: boolean;
  roleIds: string[];
  sessionNonce: string;
}

export class ApiAuthError extends Error {
  constructor(
    readonly status: number,
    readonly code: "UNAUTHENTICATED" | "NO_ORG" | "FORBIDDEN",
    message: string,
  ) {
    super(message);
    this.name = "ApiAuthError";
  }

  get response(): NextResponse {
    return NextResponse.json(
      { ok: false, error: { code: this.code, message: this.message } },
      { status: this.status, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export interface RequireActorOptions {
  /** Require an active organisation membership. Default true. */
  requireOrg?: boolean;
  /** Require `isPlatformAdmin`. Default false. */
  platformAdmin?: boolean;
}

/**
 * Resolve the authenticated actor or throw `ApiAuthError`.
 * Pair with `withApiAuth` (or a try/catch) to turn the throw into a response.
 */
export async function requireApiActor(
  options: RequireActorOptions = {},
): Promise<ApiActor> {
  const { requireOrg = true, platformAdmin = false } = options;

  const session = await getSession();
  if (!session?.user?.id) {
    throw new ApiAuthError(401, "UNAUTHENTICATED", "Authentication required.");
  }

  const orgId = session.user.orgId;
  if (requireOrg && !orgId) {
    throw new ApiAuthError(403, "NO_ORG", "No active organisation.");
  }

  if (platformAdmin && !session.user.isPlatformAdmin) {
    throw new ApiAuthError(403, "FORBIDDEN", "Platform administrator access required.");
  }

  return {
    userId: session.user.id,
    orgId: orgId ?? "",
    email: session.user.email ?? null,
    isPlatformAdmin: session.user.isPlatformAdmin === true,
    roleIds: session.user.roleIds ?? [],
    sessionNonce: session.user.sessionNonce ?? "",
  };
}

/**
 * Resolve the actor AND assert a permission. Throws `ApiAuthError` for
 * auth/org failures and `ForbiddenError` (from rbac) for the permission.
 */
export async function requireApiPermission(
  permissionKey: string,
  options: RequireActorOptions = {},
): Promise<ApiActor> {
  const actor = await requireApiActor(options);
  await requirePermission(actor.userId, permissionKey);
  return actor;
}

type RouteHandler<Ctx> = (req: Request, ctx: Ctx) => Promise<Response> | Response;

/**
 * Wrap a Route Handler so `ApiAuthError` (and anything with a `.response`
 * `NextResponse`) is returned cleanly instead of surfacing as a 500.
 */
export function withApiAuth<Ctx>(handler: RouteHandler<Ctx>): RouteHandler<Ctx> {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx);
    } catch (e) {
      if (e instanceof ApiAuthError) return e.response;
      if (
        e &&
        typeof e === "object" &&
        "response" in e &&
        e.response instanceof NextResponse
      ) {
        return e.response;
      }
      throw e;
    }
  };
}
