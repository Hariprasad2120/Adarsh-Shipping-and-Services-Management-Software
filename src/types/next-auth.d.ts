import "next-auth";

declare module "next-auth" {
  interface User {
    orgId?: string;
    isPlatformAdmin: boolean;
    roleIds: string[];
  }
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      orgId?: string;
      isPlatformAdmin: boolean;
      roleIds: string[];
    };
  }
}
