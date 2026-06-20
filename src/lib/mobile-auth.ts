import { db } from "@/lib/db";

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

    // Touch the session lastSeenAt
    await db.userSession.update({
      where: { id: session.id },
      data: { lastSeenAt: new Date() },
    });

    return session.user;
  } catch (error) {
    console.error("mobile-auth error:", error);
    return null;
  }
}
