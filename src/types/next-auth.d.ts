import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    orgId?: string;
    isPlatformAdmin: boolean;
    roleIds: string[];
    /** Unique per-login identifier for session tracking (not the JWT itself). */
    sessionNonce?: string;
  }
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      orgId?: string;
      isPlatformAdmin: boolean;
      roleIds: string[];
      /** Unique per-login identifier — safe to expose to client JS. */
      sessionNonce: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    orgId?: string;
    isPlatformAdmin?: boolean;
    roleIds?: string[];
    /** Unique per-login identifier stored in the JWT for session tracking. */
    sessionNonce?: string;
  }
}
