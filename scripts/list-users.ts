import "dotenv/config";
import { db } from "../src/lib/db";

async function main() {
  const users = await db.user.findMany({
    where: {
      email: {
        contains: "hr"
      }
    },
    select: {
      id: true,
      name: true,
      email: true,
      active: true,
      roles: {
        select: {
          role: {
            select: {
              name: true
            }
          }
        }
      }
    }
  });
  console.log("MATCHING USERS:", JSON.stringify(users, null, 2));
}

main().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
