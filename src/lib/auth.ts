import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { z } from "zod";
import { cache } from "react";
import { db } from "@/lib/db";
import { randomUUID } from "crypto";
import { appendFileSync } from "fs";
import { isRootControlEmail } from "@/lib/root-access";

// ─── Configuration (env-driven with safe defaults) ───────────────────────────

const SESSION_MAX_AGE_HOURS = Number(process.env.SESSION_MAX_AGE_HOURS) || 24;
const SESSION_IDLE_TIMEOUT_HOURS =
  Number(process.env.SESSION_IDLE_TIMEOUT_HOURS) || 4;
const SESSION_ACTIVITY_THROTTLE_MS =
  (Number(process.env.SESSION_ACTIVITY_THROTTLE_MINUTES) || 5) * 60 * 1000;

const SESSION_MAX_AGE_S = SESSION_MAX_AGE_HOURS * 60 * 60;

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

import Google from "next-auth/providers/google";

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
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const normalizedEmail = email.trim().toLowerCase();
        const user = await db.user.findFirst({
          where: { email: { equals: normalizedEmail, mode: "insensitive" } },
          include: { roles: { include: { role: true } } },
        });

        if (!user || !user.active) return null;
        const valid = await compare(password, user.passwordHash);
        if (!valid) return null;

        // Generate a unique nonce for this login session.
        // This will be stored in both the JWT and the UserSession DB record,
        // allowing server-side session revocation without abandoning JWT.
        const sessionNonce = randomUUID();

        // Create a server-side session record for revocation tracking.
        try {
          await db.userSession.create({
            data: {
              userId: user.id,
              token: sessionNonce,
              status: "ACTIVE",
            },
          });
        } catch (e) {
          console.error("[auth] Failed to create UserSession record:", e);
          // Non-fatal — login still succeeds, but revocation won't work for this session
        }

        // Log the security event
        try {
          await db.securityEvent.create({
            data: {
              userId: user.id,
              email: user.email,
              event: "LOGIN_SUCCESS",
              outcome: "SUCCESS",
              sessionToken: sessionNonce,
            },
          });
        } catch {
          // Non-fatal
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          orgId: user.orgId ?? undefined,
          isPlatformAdmin: user.isPlatformAdmin,
          roleIds: user.roles.map((ur) => ur.roleId),
          sessionNonce,
          redirectPath: isRootControlEmail(user.email) ? "/" : "/dashboard",
        };
      },
    }),
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      authorization: {
        params: {
          scope: "openid email profile https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/contacts.readonly https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/tasks https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/chat.spaces.readonly https://www.googleapis.com/auth/chat.memberships.readonly https://www.googleapis.com/auth/chat.messages",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        try {
          const logMsg = `[${new Date().toISOString()}] Google Sign-in attempt: email=${user.email}, name=${user.name}, provider=${account.provider}, hasAccessToken=${!!account.access_token}, hasRefreshToken=${!!account.refresh_token}\n`;
          appendFileSync("next-auth.log", logMsg);
        } catch (e) {
          console.error("Error writing to next-auth.log", e);
        }

        if (!user.email) return false;
        const dbUser = await db.user.findFirst({
          where: { email: { equals: user.email, mode: "insensitive" } },
        });
        
        try {
          const logMsg = `[${new Date().toISOString()}] DB User lookup: found=${!!dbUser}, email=${dbUser?.email}, orgId=${dbUser?.orgId}, active=${dbUser?.active}\n`;
          appendFileSync("next-auth.log", logMsg);
        } catch {}

        if (!dbUser || !dbUser.orgId) return false; // Must be pre-registered by admin in database

        const tokenExpiresAt = account.expires_at
          ? new Date(account.expires_at * 1000)
          : new Date(Date.now() + 3600 * 1000);

        const { encryptToken } = await import("@/lib/workspace-oauth");
        const encryptedRefreshToken = account.refresh_token ? encryptToken(account.refresh_token) : "";
        const scopes = account.scope ? account.scope.split(" ") : [];

        await db.googleWorkspaceConnection.upsert({
          where: { userId: dbUser.id },
          update: {
            accessToken: account.access_token || "",
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
            accessToken: account.access_token || "",
            refreshToken: encryptedRefreshToken,
            tokenExpiresAt,
            scopes,
            status: "connected",
          },
        });
      }
      return true;
    },
    async jwt({ token, user }) {
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

      // If logging in via Google OAuth, the user object won't have orgId or roleIds in it.
      // We look up the corresponding database user by email and populate the token.
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
  },
  events: {
    async signOut(message) {
      // Mark the session as revoked in the database when user signs out.
      // NextAuth v5 passes the token in the message for JWT strategy.
      const token =
        "token" in message ? (message.token as TokenPayload | undefined) : undefined;
      if (token?.sessionNonce) {
        try {
          await db.userSession.updateMany({
            where: { token: token.sessionNonce, status: "ACTIVE" },
            data: { status: "REVOKED", logoutAt: new Date() },
          });
          await db.securityEvent.create({
            data: {
              userId: token.id as string,
              event: "LOGOUT",
              outcome: "SUCCESS",
              sessionToken: token.sessionNonce,
            },
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
    maxAge: SESSION_MAX_AGE_S,
  },
});

// Deduplicate auth() calls within a single server request. Pages that call
// auth() themselves AND the dashboard layout calling it would otherwise hit the
// JWT decode + cookie parse twice. This makes the second call free.
export const getSession = cache(auth);

// ─── Session Validation ──────────────────────────────────────────────────────

/**
 * Validate that a session nonce is still active in the database.
 * Returns false if the session has been revoked, expired, or doesn't exist.
 * Throttles lastSeenAt updates to avoid excessive DB writes.
 */
export async function isSessionValid(sessionNonce: string): Promise<boolean> {
  if (!sessionNonce) return false;

  try {
    const session = await db.userSession.findUnique({
      where: { token: sessionNonce },
      select: { status: true, loginAt: true, lastSeenAt: true },
    });

    if (!session || session.status !== "ACTIVE") return false;

    // Check absolute lifetime
    const ageMs = Date.now() - session.loginAt.getTime();
    if (ageMs > SESSION_MAX_AGE_S * 1000) {
      // Session has exceeded absolute lifetime — revoke it
      await db.userSession.update({
        where: { token: sessionNonce },
        data: { status: "EXPIRED", logoutAt: new Date() },
      });
      return false;
    }

    // Check idle timeout
    const idleMs = Date.now() - session.lastSeenAt.getTime();
    if (idleMs > SESSION_IDLE_TIMEOUT_HOURS * 60 * 60 * 1000) {
      await db.userSession.update({
        where: { token: sessionNonce },
        data: { status: "EXPIRED", logoutAt: new Date() },
      });
      return false;
    }

    // Throttle lastSeenAt updates
    if (idleMs > SESSION_ACTIVITY_THROTTLE_MS) {
      // Fire-and-forget — don't block the request
      db.userSession
        .update({
          where: { token: sessionNonce },
          data: { lastSeenAt: new Date() },
        })
        .catch(() => {});
    }

    return true;
  } catch {
    // DB error — fail open for availability, but log
    console.error("[auth] Session validation DB error for nonce:", sessionNonce);
    return true; // fail open to avoid locking users out on transient DB issues
  }
}
