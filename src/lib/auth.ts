import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { compare } from "bcryptjs";
import { z } from "zod";
import { cache } from "react";
import { db } from "@/lib/db";
import {
  CALLBACK_URL_COOKIE_NAME,
  CSRF_COOKIE_NAME,
  SESSION_COOKIE_MAX_AGE_S,
  SESSION_COOKIE_NAME,
  USE_SECURE_COOKIES,
} from "@/lib/session-config";
import {
  createSession,
  extractRequestMeta,
  invalidateValidatedSessionCache,
  logSecurityEvent,
  validateSession,
} from "@/lib/session-service";
import {
  isLoginLocked,
  recordLoginFailure,
  recordLoginSuccess,
} from "@/lib/login-rate-limit";
import { assessOAuthProfile, parseAllowedDomains } from "@/lib/oauth-linking";
import { safeRedirectPath } from "@/lib/safe-redirect";

const GOOGLE_CHAT_DELETE_AUTH_MODE =
  (process.env.GOOGLE_CHAT_DELETE_AUTH_MODE ?? "admin_oauth").toLowerCase();
const GOOGLE_AUTH_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/contacts.readonly",
  "https://www.googleapis.com/auth/directory.readonly",
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/tasks",
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/chat.spaces.readonly",
  "https://www.googleapis.com/auth/chat.memberships.readonly",
  "https://www.googleapis.com/auth/chat.messages",
  "https://www.googleapis.com/auth/chat.users.readstate",
];

if (GOOGLE_CHAT_DELETE_AUTH_MODE === "user_oauth") {
  GOOGLE_AUTH_SCOPES.push("https://www.googleapis.com/auth/chat.delete");
}

if (GOOGLE_CHAT_DELETE_AUTH_MODE === "admin_oauth") {
  GOOGLE_AUTH_SCOPES.push("https://www.googleapis.com/auth/chat.admin.delete");
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  rememberMe: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((v) => v === true || v === "true" || v === "on"),
  // Optional second factor: TOTP code or a one-time recovery code.
  totp: z.string().trim().optional(),
});

/** Thrown when the password is correct but a second factor is still required. */
class MfaRequiredError extends CredentialsSignin {
  code = "mfa_required";
}
/** Thrown when the supplied second factor is wrong. */
class MfaInvalidError extends CredentialsSignin {
  code = "mfa_invalid";
}

type SessionUserPayload = {
  id: string;
  orgId?: string;
  isPlatformAdmin: boolean;
  roleIds: string[];
  sessionNonce: string;
  redirectPath: string;
};

type TokenPayload = {
  id?: string;
  orgId?: string;
  isPlatformAdmin?: boolean;
  roleIds?: string[];
  sessionNonce?: string;
  redirectPath?: string;
};


export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  // Monolith-isolated cookies. Prevents AMS (or any other app on the same
  // host) from reading — or being read by — a Monolith session. Production
  // uses the __Host- prefix (Secure, Path=/, no Domain).
  cookies: {
    sessionToken: {
      name: SESSION_COOKIE_NAME,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: USE_SECURE_COOKIES,
      },
    },
    csrfToken: {
      name: CSRF_COOKIE_NAME,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: USE_SECURE_COOKIES,
      },
    },
    callbackUrl: {
      name: CALLBACK_URL_COOKIE_NAME,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: USE_SECURE_COOKIES,
      },
    },
  },
  providers: [
    Credentials({
      async authorize(credentials, request) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password, rememberMe, totp } = parsed.data;
        const normalizedEmail = email.trim().toLowerCase();
        const { ip, userAgent } = extractRequestMeta(request);

        // Brute-force protection
        const lock = await isLoginLocked(normalizedEmail, ip);
        if (lock.locked) {
          await logSecurityEvent({
            event: "LOGIN_LOCKED",
            outcome: "BLOCKED",
            email: normalizedEmail,
            ip,
            userAgent,
            reason: `Locked, retry in ${Math.ceil((lock.retryAfterMs ?? 0) / 1000)}s`,
          });
          return null;
        }

        const user = await db.user.findFirst({
          where: { email: { equals: normalizedEmail, mode: "insensitive" } },
          include: { roles: { include: { role: true } } },
        });

        const valid =
          user && user.active
            ? await compare(password, user.passwordHash)
            : false;

        if (!user || !user.active || !valid) {
          const lockedNow = await recordLoginFailure(normalizedEmail, ip);
          await logSecurityEvent({
            event: lockedNow ? "LOGIN_LOCKED" : "LOGIN_FAILURE",
            outcome: lockedNow ? "BLOCKED" : "FAILURE",
            userId: user?.id,
            email: normalizedEmail,
            ip,
            userAgent,
            reason:
              user && !user.active ? "Account disabled" : "Invalid credentials",
          });
          return null;
        }

        // ── Second factor ──────────────────────────────────────────────────
        // Password is correct. If this account has an active factor (or its
        // org / platform-admin status mandates MFA), a valid TOTP or recovery
        // code must be supplied before a session is created.
        const { hasActiveMfa, verifyMfa } = await import("@/lib/mfa/service");
        const mfaActive = await hasActiveMfa(user.id);
        let mfaVerified = false;
        if (mfaActive) {
          if (!totp) {
            await logSecurityEvent({
              event: "MFA_CHALLENGE_REQUIRED",
              outcome: "BLOCKED",
              userId: user.id,
              email: user.email,
              ip,
              userAgent,
            });
            throw new MfaRequiredError();
          }
          const result = await verifyMfa(user.id, totp, { ip, userAgent });
          if (!result.ok) {
            await recordLoginFailure(normalizedEmail, ip);
            throw new MfaInvalidError();
          }
          mfaVerified = true;
        }

        await recordLoginSuccess(normalizedEmail, ip);

        // Opaque server-side session — the DB record is the source of truth
        // for expiry and revocation. The JWT only carries this nonce.
        const sessionNonce = await createSession({
          userId: user.id,
          ip,
          userAgent,
          rememberMe,
          mfaVerified,
        });

        await logSecurityEvent({
          event: "LOGIN_SUCCESS",
          outcome: "SUCCESS",
          userId: user.id,
          email: user.email,
          ip,
          userAgent,
          sessionToken: sessionNonce,
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          orgId: user.orgId ?? undefined,
          isPlatformAdmin: user.isPlatformAdmin,
          roleIds: user.roles.map((ur) => ur.roleId),
          sessionNonce,
          // Everyone lands on /dashboard. The root module-control surface at "/"
          // is permission-gated on the page itself (admin.modules.manage).
          redirectPath: "/dashboard",
        };
      },
    }),
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      authorization: {
        params: {
          scope: GOOGLE_AUTH_SCOPES.join(" "),
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        // 1. Provider-asserted email ownership + domain policy (MON-S1-013).
        const assessment = assessOAuthProfile(
          {
            email: profile?.email ?? user.email,
            email_verified: (profile as { email_verified?: unknown } | undefined)
              ?.email_verified as boolean | string | undefined,
            hd: (profile as { hd?: string } | undefined)?.hd,
          },
          { allowedDomains: parseAllowedDomains(process.env.GOOGLE_WORKSPACE_DOMAIN) },
        );
        if (!assessment.ok) {
          await logSecurityEvent({
            event: "LOGIN_FAILURE",
            outcome: "FAILURE",
            email: (profile?.email ?? user.email) ?? null,
            reason: `Google login rejected: ${assessment.reason}`,
          });
          return false;
        }
        const normalizedEmail = assessment.email;

        const dbUser = await db.user.findFirst({
          where: { email: { equals: normalizedEmail, mode: "insensitive" } },
        });

        // Must be pre-registered by admin and active
        if (!dbUser || !dbUser.orgId || !dbUser.active) {
          await logSecurityEvent({
            event: "LOGIN_FAILURE",
            outcome: "FAILURE",
            email: normalizedEmail,
            reason: dbUser
              ? "Google login for disabled/unprovisioned user"
              : "Google login for unknown user",
          });
          return false;
        }

        // 2. Bind the verified provider subject (sub) to this user. Linking
        //    happens only for the pre-provisioned account whose verified email
        //    matches; a sub already linked to a *different* user is rejected
        //    (no silent takeover). (MON-S1-013)
        const sub = account.providerAccountId;
        if (sub) {
          const existingLink = await db.identityLink.findUnique({
            where: { provider_providerAccountId: { provider: "google", providerAccountId: sub } },
          });
          if (existingLink && existingLink.userId !== dbUser.id) {
            await logSecurityEvent({
              event: "OAUTH_IDENTITY_CONFLICT",
              outcome: "BLOCKED",
              userId: dbUser.id,
              email: normalizedEmail,
              reason: "Google subject already linked to another Monolith user",
            });
            return false;
          }
          if (!existingLink) {
            await db.identityLink.create({
              data: {
                userId: dbUser.id,
                provider: "google",
                providerAccountId: sub,
                email: normalizedEmail,
                lastLoginAt: new Date(),
              },
            });
            await logSecurityEvent({
              event: "OAUTH_IDENTITY_LINKED",
              outcome: "SUCCESS",
              userId: dbUser.id,
              email: normalizedEmail,
              reason: "google",
            });
          } else {
            await db.identityLink.update({
              where: { id: existingLink.id },
              data: { lastLoginAt: new Date(), email: normalizedEmail },
            });
          }
        }

        const tokenExpiresAt = account.expires_at
          ? new Date(account.expires_at * 1000)
          : new Date(Date.now() + 3600 * 1000);

        const { encryptToken, encryptAccessToken } = await import("@/lib/workspace-oauth");
        const encryptedRefreshToken = account.refresh_token ? encryptToken(account.refresh_token) : "";
        // MON-S1-030 — access token is encrypted at rest, like the refresh token.
        const encryptedAccessToken = encryptAccessToken(account.access_token);
        const scopes = account.scope ? account.scope.split(" ") : [];

        await db.googleWorkspaceConnection.upsert({
          where: { userId: dbUser.id },
          update: {
            accessToken: encryptedAccessToken,
            refreshToken: encryptedRefreshToken || undefined,
            tokenExpiresAt,
            googleEmail: user.email || dbUser.email,
            googleUserId: account.providerAccountId || "",
            scopes,
            status: "connected",
          },
          create: {
            orgId: dbUser.orgId,
            userId: dbUser.id,
            googleEmail: user.email || dbUser.email,
            googleUserId: account.providerAccountId || "",
            accessToken: encryptedAccessToken,
            refreshToken: encryptedRefreshToken,
            tokenExpiresAt,
            scopes,
            status: "connected",
          },
        });
      }
      return true;
    },
    async jwt({ token, user, trigger }) {
      if (user) {
        const sessionUser = user as SessionUserPayload;
        // First-time token creation (login)
        token.id = user.id;
        token.orgId = sessionUser.orgId;
        token.isPlatformAdmin = sessionUser.isPlatformAdmin;
        token.roleIds = sessionUser.roleIds;
        token.sessionNonce = sessionUser.sessionNonce;
        token.redirectPath = sessionUser.redirectPath;
      }

      // Google OAuth logins don't pass through the credentials authorize() —
      // populate org/roles from the DB and create the server-side session.
      if (!token.orgId && token.email) {
        const dbUser = await db.user.findFirst({
          where: { email: { equals: token.email, mode: "insensitive" } },
          include: { roles: { include: { role: true } } },
        });
        if (dbUser) {
          token.id = dbUser.id;
          token.orgId = dbUser.orgId ?? undefined;
          token.isPlatformAdmin = dbUser.isPlatformAdmin;
          token.roleIds = dbUser.roles.map((ur) => ur.roleId);
        }
      }
      if (token.id && !token.sessionNonce) {
        token.sessionNonce = await createSession({ userId: token.id as string });
        await logSecurityEvent({
          event: "LOGIN_SUCCESS",
          outcome: "SUCCESS",
          userId: token.id as string,
          email: (token.email as string) ?? null,
          sessionToken: token.sessionNonce,
          reason: "Google OAuth login",
        });
      }

      // ── Server-side session enforcement ──
      // On every subsequent request (no `user`), validate the opaque nonce
      // against the DB. Revoked / idle-expired / absolute-expired sessions and
      // disabled users are rejected: returning null invalidates the JWT and
      // clears the cookie, forcing a redirect to /login.
      if (!user && trigger !== "update") {
        const nonce = token.sessionNonce as string | undefined;
        if (!nonce) return null;
        const result = await validateSession(nonce, {
          isAdmin: token.isPlatformAdmin === true,
        });
        if (!result.valid) return null;
      }

      return token;
    },
    session({ session, token }) {
      const tokenPayload = token as TokenPayload;
      session.user.id = tokenPayload.id ?? "";
      session.user.orgId = tokenPayload.orgId;
      session.user.isPlatformAdmin = tokenPayload.isPlatformAdmin ?? false;
      session.user.roleIds = tokenPayload.roleIds ?? [];
      session.user.sessionNonce = tokenPayload.sessionNonce ?? "";
      session.user.redirectPath = tokenPayload.redirectPath ?? "/dashboard";
      return session;
    },
    // Clamp every post-auth redirect to a same-origin path (MON-S1-031).
    redirect({ url, baseUrl }) {
      const path = safeRedirectPath(url, "/dashboard", [baseUrl]);
      return path.startsWith("http") ? path : `${baseUrl}${path}`;
    },
  },
  events: {
    async signOut(message) {
      // Mark the session as revoked in the database when user signs out.
      // NextAuth v5 passes the token in the message for JWT strategy.
      const token =
        "token" in message ? (message.token as TokenPayload | undefined) : undefined;
      if (token?.sessionNonce) {
        try {
          invalidateValidatedSessionCache(token.sessionNonce);
          await db.userSession.updateMany({
            where: { token: token.sessionNonce, status: "ACTIVE" },
            data: {
              status: "REVOKED",
              logoutAt: new Date(),
              revokedAt: new Date(),
              revokeReason: "LOGOUT",
            },
          });
          await logSecurityEvent({
            event: "LOGOUT",
            outcome: "SUCCESS",
            userId: token.id,
            sessionToken: token.sessionNonce,
          });
        } catch (e) {
          console.error("[auth] Failed to revoke session on signOut:", e);
        }
      }
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    // Cookie lifetime covers the longest possible (remember-me) session.
    // Actual expiry is enforced per-request against the UserSession record.
    maxAge: SESSION_COOKIE_MAX_AGE_S,
  },
});

// Deduplicate auth() calls within a single server request. Pages that call
// auth() themselves AND the dashboard layout calling it would otherwise hit the
// JWT decode + DB session validation twice. This makes the second call free.
export const getSession = cache(auth);
