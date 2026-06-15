const { PrismaClient } = require('./src/generated/prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
require('dotenv/config');

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

async function queryUsers() {
  try {
    const users = await db.user.findMany({
      select: {
        id: true,
        name: true,
        employeeNumber: true
      }
    });
    console.log("HRMS Users:");
    console.log(users);
  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    await db.$disconnect();
  }
}

queryUsers();
