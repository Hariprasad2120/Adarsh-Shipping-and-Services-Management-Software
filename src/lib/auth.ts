import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { z } from "zod";
import { cache } from "react";
import { db } from "@/lib/db";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

import Google from "next-auth/providers/google";


export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const user = await db.user.findUnique({
          where: { email },
          include: { roles: { include: { role: true } } },
        });

        if (!user || !user.active) return null;
        const valid = await compare(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          orgId: user.orgId ?? undefined,
          isPlatformAdmin: user.isPlatformAdmin,
          roleIds: user.roles.map((ur) => ur.roleId),
        };
      },
    }),
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      authorization: {
        params: {
          scope: "openid email profile https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/contacts.readonly https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/tasks https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/chat.spaces.readonly https://www.googleapis.com/auth/chat.messages",
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
          const fs = require("fs");
          const logMsg = `[${new Date().toISOString()}] Google Sign-in attempt: email=${user.email}, name=${user.name}, provider=${account.provider}, hasAccessToken=${!!account.access_token}, hasRefreshToken=${!!account.refresh_token}\n`;
          fs.appendFileSync("next-auth.log", logMsg);
        } catch (e) {
          console.error("Error writing to next-auth.log", e);
        }

        if (!user.email) return false;
        const dbUser = await db.user.findFirst({
          where: { email: { equals: user.email, mode: "insensitive" } },
        });
        
        try {
          const fs = require("fs");
          const logMsg = `[${new Date().toISOString()}] DB User lookup: found=${!!dbUser}, email=${dbUser?.email}, orgId=${dbUser?.orgId}, active=${dbUser?.active}\n`;
          fs.appendFileSync("next-auth.log", logMsg);
        } catch (e) {}

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
        token.id = user.id;
        token.orgId = (user as any).orgId;
        token.isPlatformAdmin = (user as any).isPlatformAdmin;
        token.roleIds = (user as any).roleIds;
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
      session.user.id = token.id as string;
      session.user.orgId = token.orgId as string | undefined;
      session.user.isPlatformAdmin = token.isPlatformAdmin as boolean;
      session.user.roleIds = token.roleIds as string[];
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" },
});

// Deduplicate auth() calls within a single server request. Pages that call
// auth() themselves AND the dashboard layout calling it would otherwise hit the
// JWT decode + cookie parse twice. This makes the second call free.
export const getSession = cache(auth);
