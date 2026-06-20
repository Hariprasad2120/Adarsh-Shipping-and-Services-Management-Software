import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
} as ConstructorParameters<typeof PrismaClient>[0]);

async function main() {
  console.log("\n=======================================================");
  console.log("   MONOLITH SYSTEM DEMO DATA SEEDER (COMMUNICATION)");
  console.log("=======================================================\n");

  // 1. Fetch organization
  const org = await db.organisation.findFirst();
  if (!org) {
    console.error("Error: No organisation found.");
    process.exit(1);
  }

  // Helper function to find user by email
  const findUserByEmail = async (email: string) => {
    return db.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" }, orgId: org.id },
    });
  };

  // 2. Fetch critical users for linking
  const purushothaman = await findUserByEmail("purushothaman.v@adarshshipping.in");
  const naveen = await findUserByEmail("naveen@adarshshipping.in");
  const sathya = await findUserByEmail("sathiyam4545@gmail.com"); // Sathya Moorthy
  const john = await findUserByEmail("john.a@adarshshipping.in"); // John Arputharaj
  const selvam = await findUserByEmail("selvam.delhi@adarshshipping.in");
  const akshaya = await findUserByEmail("akshaya.blessey@adarshshipping.in");
  const shalini = await findUserByEmail("babyshalini424@gmail.com"); // Shalini K
  const shyam = await findUserByEmail("shyamnarayanyadav802@gmail.com");
  const maansi = await findUserByEmail("maansi@adarshshipping.in");
  const surya = await findUserByEmail("surya.k@adarshshipping.in");
  const amanulla = await findUserByEmail("amanulla@adarshshipping.in");
  const vijaykumar = await findUserByEmail("vijaykumar@adarshshipping.in");
  const srivathsan = await findUserByEmail("srivathsan.r@adarshshipping.in");
  const dineshan = await findUserByEmail("dineshan.accounts@adarshshipping.in");
  const adminUser = await findUserByEmail("hr@adarshshipping.in");

  if (!purushothaman) {
    console.error("Error: Primary user 'purushothaman.v@adarshshipping.in' not found in database.");
    process.exit(1);
  }

  console.log(`Linking profiles to owner: ${purushothaman.name} (${purushothaman.id})`);

  // Get or Create Purushothaman's default MailAccount
  let mailAccount = await db.mailAccount.findFirst({
    where: { userId: purushothaman.id, orgId: org.id },
  });

  if (!mailAccount) {
    mailAccount = await db.mailAccount.create({
      data: {
        orgId: org.id,
        userId: purushothaman.id,
        name: purushothaman.name,
        email: purushothaman.email,
        isActive: true,
        isDefault: true,
      },
    });
  }

  // Get or Create the INBOX label for Purushothaman
  let inboxLabel = await db.mailLabel.findFirst({
    where: { userId: purushothaman.id, orgId: org.id, name: "INBOX" },
  });
  if (!inboxLabel) {
    inboxLabel = await db.mailLabel.create({
      data: {
        orgId: org.id,
        userId: purushothaman.id,
        name: "INBOX",
      },
    });
  }

  // Get or Create the SENT label
  let sentLabel = await db.mailLabel.findFirst({
    where: { userId: purushothaman.id, orgId: org.id, name: "SENT" },
  });
  if (!sentLabel) {
    sentLabel = await db.mailLabel.create({
      data: {
        orgId: org.id,
        userId: purushothaman.id,
        name: "SENT",
      },
    });
  }

  console.log("\n--- Seeding Email Inbox (Gmail Screenshot mappings) ---");

  // Email subjects, senders, and content mapped from user's Gmail screenshot
  const emailsData = [
    {
      from: "noreply@adarshshipping.in",
      subject: "Amanulla R location capture failed",
      body: "Hello PURUSHOTHAMAN V, Location capture for Amanulla R has failed. User was out of geo-fence boundary. Please verify attendance status.",
      time: new Date(Date.now() - 2 * 60 * 1000), // 2 mins ago
    },
    {
      from: "noreply@adarshshipping.in",
      subject: "Reportees - Missed Check-in Alert",
      body: "Shift Name Special shift 10.00 to 5.00 Time 10:00 AM - 05:00 PM Employee: Surya K did not check in. Supervisor check recommended.",
      time: new Date(Date.now() - 14 * 60 * 1000), // 14 mins ago
    },
    {
      from: "noreply@adarshshipping.in",
      subject: "SHYAM NARAYAN YADAV location capture failed",
      body: "Hello PURUSHOTHAMAN V, Location capture for SHYAM NARAYAN YADAV has failed. The user has attempted punch-in outside of valid warehouse coordinates.",
      time: new Date(Date.now() - 15 * 60 * 1000), // 15 mins ago
    },
    {
      from: "noreply@adarshshipping.in",
      subject: "Maansi B location capture failed",
      body: "Hello PURUSHOTHAMAN V, Location capture for Maansi B has failed. Unsuccessful location lookup at check-in scan.",
      time: new Date(Date.now() - 36 * 60 * 1000), // 36 mins ago
    },
    {
      from: "hr@adarshshipping.in",
      subject: "Do not forget to do your Check-in!",
      body: "This is a reminder to check-in. Your shift begins at 09:30 AM. Ensure your biometric device is synced and geolocation services are active.",
      time: new Date(Date.now() - 1.5 * 60 * 60 * 1000), // 1.5 hrs ago
    },
    {
      from: "info@naukri.com",
      subject: "Summary of Total Responses Received on 2026-06-19",
      body: "Job Posting Summary: We received 12 new responses against your active Freight Operations Specialist job posting.",
      time: new Date(Date.now() - 2.5 * 60 * 60 * 1000), // 2.5 hrs ago
    },
    {
      from: "noreply@adarshshipping.in",
      subject: "Absent Notification",
      body: "Absent Notification Given below is the list of employees who are marked as absent for 19-Jun-2026. Please update leave requests.",
      time: new Date(Date.now() - 10 * 60 * 60 * 1000), // 10 hrs ago
    },
    {
      from: "noreply@adarshshipping.in",
      subject: "New Daily Reports request",
      body: "Hi Naveen Sathiyan, SUJATHA SURESH 105's request is waiting for your approval. Please log in to approve.",
      time: new Date(Date.now() - 12 * 60 * 60 * 1000),
    },
    {
      from: "noreply@adarshshipping.in",
      subject: "SURYA K location capture failed",
      body: "Hello PURUSHOTHAMAN V, Location capture for SURYA K has failed. Unsuccessful scan registered.",
      time: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
    },
  ];

  for (const mail of emailsData) {
    // Check if message already exists to avoid duplicates
    const exists = await db.mailMessage.findFirst({
      where: { orgId: org.id, subject: mail.subject, mailAccountId: mailAccount.id }
    });

    if (!exists) {
      const thread = await db.mailThread.create({
        data: {
          orgId: org.id,
          subject: mail.subject,
          createdAt: mail.time,
          updatedAt: mail.time,
          labels: {
            connect: [{ id: inboxLabel.id }]
          }
        }
      });

      await db.mailMessage.create({
        data: {
          orgId: org.id,
          threadId: thread.id,
          mailAccountId: mailAccount.id,
          from: mail.from,
          to: purushothaman.email,
          subject: mail.subject,
          bodyText: mail.body,
          bodyHtml: `<p>${mail.body}</p>`,
          isIncoming: true,
          status: "SENT",
          createdAt: mail.time,
          updatedAt: mail.time,
        }
      });

      console.log(`[+] Seeded Email: ${mail.subject}`);
    }
  }

  console.log("\n--- Seeding Chat Channels & DMs (Chat Screenshot mappings) ---");

  // Chat conversation structures
  const chatRooms = [
    {
      name: "Freight Forwarding Plus+",
      type: "CHANNEL",
      isPublic: true,
      recentMsg: "Also please work on the followup data in the sheet.",
      sender: naveen,
    },
    {
      name: "Internal Office Work",
      type: "CHANNEL",
      isPublic: true,
      recentMsg: "Created a task for @John Arputharaj",
      sender: sathya,
    },
    {
      name: "JINDAL OFFSET INDIA PVT LTD Ref no ASS/CB/DEL/AIR",
      type: "CHANNEL",
      isPublic: true,
      recentMsg: "Dear Team This Delhi job no",
      sender: selvam,
    },
    {
      name: "HR Department",
      type: "CHANNEL",
      isPublic: false,
      recentMsg: "Vijayakumar Kindly look into this ASAP",
      sender: akshaya,
    },
    {
      name: null, // Direct Message with Shalini K
      type: "DIRECT",
      isPublic: false,
      recentMsg: "Okey noted",
      sender: shalini,
    },
    {
      name: null, // Direct Message with Vijayakumar
      type: "DIRECT",
      isPublic: false,
      recentMsg: "Sure, working on it",
      sender: vijaykumar,
    },
    {
      name: null, // Direct Message with Srivathsan R
      type: "DIRECT",
      isPublic: false,
      recentMsg: "Draft reports prepared",
      sender: srivathsan,
    },
    {
      name: null, // Direct Message with Dineshan PM
      type: "DIRECT",
      isPublic: false,
      recentMsg: "Accounts verified",
      sender: dineshan,
    },
  ];

  for (const room of chatRooms) {
    let conversation;

    if (room.type === "CHANNEL") {
      // Find or create channel
      conversation = await db.chatConversation.findFirst({
        where: { orgId: org.id, name: room.name, type: "CHANNEL" }
      });

      if (!conversation) {
        conversation = await db.chatConversation.create({
          data: {
            orgId: org.id,
            name: room.name,
            type: "CHANNEL",
            isPublic: room.isPublic,
          }
        });

        // Add participants: Purushothaman + Naveen/Sathya/Selvam/Akshaya/etc.
        const participants = [purushothaman];
        if (room.sender) participants.push(room.sender);
        
        await db.chatParticipant.createMany({
          data: participants.map((p) => ({
            orgId: org.id,
            conversationId: conversation!.id,
            userId: p!.id,
            role: p!.id === purushothaman.id ? "ADMIN" : "MEMBER",
          }))
        });
      }
    } else {
      // Find or create DM
      const targetUser = room.sender;
      if (!targetUser) continue;

      conversation = await db.chatConversation.findFirst({
        where: {
          orgId: org.id,
          type: "DIRECT",
          participants: {
            some: { userId: targetUser.id }
          }
        }
      });

      if (!conversation) {
        conversation = await db.chatConversation.create({
          data: {
            orgId: org.id,
            type: "DIRECT",
            isPublic: false,
          }
        });

        await db.chatParticipant.createMany({
          data: [
            { orgId: org.id, conversationId: conversation.id, userId: purushothaman.id, role: "MEMBER" },
            { orgId: org.id, conversationId: conversation.id, userId: targetUser.id, role: "MEMBER" },
          ]
        });
      }
    }

    // Add recent message
    if (room.sender && conversation) {
      const msgExists = await db.chatMessage.findFirst({
        where: { conversationId: conversation.id, body: room.recentMsg }
      });

      if (!msgExists) {
        await db.chatMessage.create({
          data: {
            orgId: org.id,
            conversationId: conversation.id,
            senderId: room.sender.id,
            body: room.recentMsg,
          }
        });
        console.log(`[+] Seeded Chat Message in '${room.name || "DM"}' from ${room.sender.name}`);
      }
    }
  }

  console.log("\n--- Seeding Meet Rooms & Scheduling (Meet Screenshot mappings) ---");

  // Meet and Calendar records
  const meetingsData = [
    {
      title: "Weekly Manifest Review Sync",
      description: "Review pending customs releases for Adarsh container shipping lines.",
      startAt: new Date("2026-06-25T10:00:00Z"),
      endAt: new Date("2026-06-25T11:00:00Z"),
      host: purushothaman,
    },
    {
      title: "Board Meeting - Q2 Financials",
      description: "Review general ledgers and trial balance audits.",
      startAt: new Date("2026-06-28T14:00:00Z"),
      endAt: new Date("2026-06-28T16:30:00Z"),
      host: purushothaman,
    },
    {
      title: "Freight Forwarding Status Call",
      description: "Cargo load verification check-in call.",
      startAt: new Date("2026-06-29T11:30:00Z"),
      endAt: new Date("2026-06-29T12:00:00Z"),
      host: naveen || purushothaman,
    }
  ];

  // Get or Create Purushothaman's default Calendar
  let calendar = await db.calendar.findFirst({
    where: { userId: purushothaman.id, orgId: org.id },
  });
  if (!calendar) {
    calendar = await db.calendar.create({
      data: {
        orgId: org.id,
        userId: purushothaman.id,
        name: "Personal Calendar",
        type: "PERSONAL",
      }
    });
  }

  for (const meet of meetingsData) {
    const eventExists = await db.calendarEvent.findFirst({
      where: { orgId: org.id, title: meet.title }
    });

    if (!eventExists) {
      const event = await db.calendarEvent.create({
        data: {
          orgId: org.id,
          calendarId: calendar.id,
          title: meet.title,
          description: meet.description,
          startAt: meet.startAt,
          endAt: meet.endAt,
          createdById: meet.host.id,
        }
      });

      // Create Jitsi Meeting adapter record
      await db.meeting.create({
        data: {
          orgId: org.id,
          eventId: event.id,
          title: meet.title,
          agenda: meet.description,
          link: `https://meet.jit.si/Adarsh-${meet.title.replace(/\s+/g, "-")}`,
          hostId: meet.host.id,
          startAt: meet.startAt,
          endAt: meet.endAt,
        }
      });

      console.log(`[+] Seeded Meet Room: ${meet.title}`);
    }
  }

  console.log(`\n=======================================================`);
  console.log(`✓ Communication Demo Seeding Completed successfully!`);
  console.log(`=======================================================\n`);
}

main()
  .catch((err) => {
    console.error("\n❌ Seeding Process Failed:", err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
