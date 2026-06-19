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
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.orgId = (user as any).orgId;
        token.isPlatformAdmin = (user as any).isPlatformAdmin;
        token.roleIds = (user as any).roleIds;
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
