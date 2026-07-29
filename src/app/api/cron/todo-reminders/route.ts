import { db } from "@/lib/db";
import { getNow } from "@/lib/clock";
import { requireCronSecret } from "@/lib/security";
import { triggerDueTodoReminders } from "@/modules/todo/service";
import { NextResponse } from "next/server";

const USER_BATCH_SIZE = 5;
const MAX_USERS_PER_RUN = 100;

export async function GET(request: Request) {
  const cronError = requireCronSecret(request);
  if (cronError) return cronError;

  const now = await getNow();
  const dueUsers = await db.todoTask.findMany({
    where: {
      status: "PENDING",
      reminderEnabled: true,
      alertAt: { not: null, lte: now },
      alertTriggeredAt: null,
    },
    distinct: ["userId"],
    select: { userId: true },
    take: MAX_USERS_PER_RUN,
  });

  let triggered = 0;
  for (let index = 0; index < dueUsers.length; index += USER_BATCH_SIZE) {
    const batch = dueUsers.slice(index, index + USER_BATCH_SIZE);
    const results = await Promise.all(
      batch.map(({ userId }) => triggerDueTodoReminders(userId)),
    );
    triggered += results.reduce((total, reminders) => total + reminders.length, 0);
  }

  return NextResponse.json({
    ok: true,
    usersProcessed: dueUsers.length,
    remindersTriggered: triggered,
    hasMore: dueUsers.length === MAX_USERS_PER_RUN,
  });
}
