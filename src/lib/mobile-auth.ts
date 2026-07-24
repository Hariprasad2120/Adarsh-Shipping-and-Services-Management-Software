import { db } from "@/lib/db";
import { validateSession } from "@/lib/session-service";

export async function getMobileUser(request: Request) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.substring(7).trim();
  if (!token) {
    return null;
  }

  try {
    const validation = await validateSession(token);
    if (!validation.valid) {
      return null;
    }

    const session = await db.userSession.findFirst({
      where: {
        token,
        status: "ACTIVE",
      },
      include: {
        user: {
          include: {
            roles: {
              include: {
                role: true,
              },
            },
          },
        },
      },
    });

    if (!session || !session.user) {
      return null;
    }

    return session.user;
  } catch (error) {
    console.error("mobile-auth error:", error);
    return null;
  }
}
