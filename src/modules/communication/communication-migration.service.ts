"use server";

import { db } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";
import { getNow } from "@/lib/clock";
import { createCommunicationAuditLog } from "./communication-audit.service";
import { getOrCreatePersonalCalendar } from "./calendar.service";

export type MigrationLog = {
  timestamp: string;
  level: "INFO" | "WARNING" | "ERROR";
  message: string;
};

export type MigrationSummary = {
  success: boolean;
  importedCount: number;
  skippedCount: number;
  failedCount: number;
  logs: MigrationLog[];
};

/**
 * Import a Gmail MBOX export file content
 */
export async function importMbox(
  userId: string,
  orgId: string,
  mailAccountId: string,
  fileName: string,
  fileContent: string // Mocked or text contents of emails
): Promise<MigrationSummary> {
  await requirePermission(userId, "communication.admin.manage");
  const now = await getNow();
  const logs: MigrationLog[] = [];
  let importedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  logs.push({ timestamp: now.toISOString(), level: "INFO", message: `Starting MBOX import for file: ${fileName}` });

  try {
    const account = await db.mailAccount.findUniqueOrThrow({
      where: { id: mailAccountId, orgId },
    });

    // In a real system, we would use an MBOX parser. Here we split by "From " or standard patterns
    const messagesRaw = fileContent.split(/\r?\nFrom /);
    logs.push({ timestamp: now.toISOString(), level: "INFO", message: `Detected ${messagesRaw.length} raw messages inside archive.` });

    for (let i = 0; i < messagesRaw.length; i++) {
      const raw = messagesRaw[i]?.trim();
      if (!raw) continue;

      try {
        // Extract basic fields: Subject, Date, From, To, Body
        const subjectMatch = raw.match(/^Subject:\s*(.*)$/im);
        const fromMatch = raw.match(/^From:\s*(.*)$/im);
        const toMatch = raw.match(/^To:\s*(.*)$/im);
        
        const subject = subjectMatch ? subjectMatch[1].trim() : `Imported Thread #${i + 1}`;
        const fromEmail = fromMatch ? fromMatch[1].trim() : "unknown@domain.com";
        const toEmail = toMatch ? toMatch[1].trim() : account.email;

        // Extract body (everything after double newlines)
        const headerEndIdx = raw.indexOf("\n\n");
        const bodyText = headerEndIdx !== -1 ? raw.substring(headerEndIdx + 2).trim() : raw;

        // Create thread and email message in database
        await db.$transaction(async (tx) => {
          const thread = await tx.mailThread.create({
            data: {
              orgId,
              subject,
              updatedAt: now,
            },
          });

          // Apply initial labels
          await tx.mailLabel.createMany({
            data: [
              { orgId, userId, name: "INBOX" },
            ],
          });

          const label = await tx.mailLabel.findFirst({
            where: { userId, orgId, name: "INBOX" },
          });

          if (label) {
            await tx.mailThread.update({
              where: { id: thread.id },
              data: {
                labels: {
                  connect: { id: label.id },
                },
              },
            });
          }

          await tx.mailMessage.create({
            data: {
              orgId,
              threadId: thread.id,
              mailAccountId,
              from: fromEmail,
              to: toEmail,
              subject,
              bodyHtml: bodyText.replace(/\n/g, "<br/>"),
              bodyText,
              isIncoming: true,
              status: "SENT",
              readAt: now,
            },
          });
        });

        importedCount++;
        if (i < 5) {
          logs.push({ timestamp: new Date().toISOString(), level: "INFO", message: `Successfully imported: "${subject}"` });
        }
      } catch (err: any) {
        failedCount++;
        logs.push({ timestamp: new Date().toISOString(), level: "ERROR", message: `Failed to import message index ${i}: ${err.message}` });
      }
    }

    logs.push({ timestamp: new Date().toISOString(), level: "INFO", message: `MBOX Import complete. Imported: ${importedCount}, Failed: ${failedCount}` });
    await createCommunicationAuditLog(orgId, userId, "IMPORT_MBOX", { fileName, importedCount, failedCount });
    return { success: true, importedCount, skippedCount, failedCount, logs };

  } catch (err: any) {
    logs.push({ timestamp: new Date().toISOString(), level: "ERROR", message: `Migration fatal error: ${err.message}` });
    return { success: false, importedCount, skippedCount, failedCount, logs };
  }
}

/**
 * Import a Google Calendar ICS export file
 */
export async function importIcs(
  userId: string,
  orgId: string,
  fileName: string,
  fileContent: string
): Promise<MigrationSummary> {
  await requirePermission(userId, "communication.admin.manage");
  const now = await getNow();
  const logs: MigrationLog[] = [];
  let importedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  logs.push({ timestamp: now.toISOString(), level: "INFO", message: `Starting ICS calendar import for: ${fileName}` });

  try {
    const calendar = await getOrCreatePersonalCalendar(userId, orgId);

    // Parse ICS events. A standard event starts with BEGIN:VEVENT and ends with END:VEVENT
    const eventBlocks = fileContent.split("BEGIN:VEVENT");
    eventBlocks.shift(); // Remove content before first BEGIN:VEVENT

    logs.push({ timestamp: now.toISOString(), level: "INFO", message: `Detected ${eventBlocks.length} event blocks in ICS stream.` });

    for (let i = 0; i < eventBlocks.length; i++) {
      const block = eventBlocks[i];
      try {
        const summaryMatch = block.match(/SUMMARY:(.*)/i);
        const descriptionMatch = block.match(/DESCRIPTION:(.*)/i);
        const dtStartMatch = block.match(/DTSTART:(.*)/i);
        const dtEndMatch = block.match(/DTEND:(.*)/i);

        const title = summaryMatch ? summaryMatch[1].trim() : `ICS Event #${i + 1}`;
        const description = descriptionMatch ? descriptionMatch[1].trim() : "Imported via ICS";
        
        let startAt = now;
        let endAt = new Date(now.getTime() + 3600000); // 1 hour default

        if (dtStartMatch) {
          const rawDate = dtStartMatch[1].trim();
          startAt = parseIcsDate(rawDate) || now;
        }
        if (dtEndMatch) {
          const rawDate = dtEndMatch[1].trim();
          endAt = parseIcsDate(rawDate) || endAt;
        }

        // Insert into database
        await db.calendarEvent.create({
          data: {
            orgId,
            calendarId: calendar.id,
            title,
            description,
            startAt,
            endAt,
            isAllDay: block.includes("VALUE=DATE"),
            createdById: userId,
          },
        });

        importedCount++;
        if (i < 5) {
          logs.push({ timestamp: new Date().toISOString(), level: "INFO", message: `Imported event: "${title}" (${startAt.toLocaleDateString()})` });
        }
      } catch (err: any) {
        failedCount++;
        logs.push({ timestamp: new Date().toISOString(), level: "ERROR", message: `Failed to import event block ${i}: ${err.message}` });
      }
    }

    logs.push({ timestamp: new Date().toISOString(), level: "INFO", message: `ICS calendar import complete. Imported: ${importedCount}, Failed: ${failedCount}` });
    await createCommunicationAuditLog(orgId, userId, "IMPORT_ICS", { fileName, importedCount, failedCount });
    return { success: true, importedCount, skippedCount, failedCount, logs };

  } catch (err: any) {
    logs.push({ timestamp: new Date().toISOString(), level: "ERROR", message: `Migration fatal error: ${err.message}` });
    return { success: false, importedCount, skippedCount, failedCount, logs };
  }
}

/**
 * Helper to parse ICS date strings
 * e.g., 20260620T100000Z or 20260620
 */
function parseIcsDate(raw: string): Date | null {
  try {
    const clean = raw.replace(/[^0-9TZ]/g, "");
    if (clean.length === 8) {
      // YYYYMMDD
      const y = parseInt(clean.substring(0, 4));
      const m = parseInt(clean.substring(4, 6)) - 1;
      const d = parseInt(clean.substring(6, 8));
      return new Date(y, m, d);
    } else if (clean.length >= 15) {
      // YYYYMMDDTHHMMSS
      const y = parseInt(clean.substring(0, 4));
      const m = parseInt(clean.substring(4, 6)) - 1;
      const d = parseInt(clean.substring(6, 8));
      const h = parseInt(clean.substring(9, 11));
      const min = parseInt(clean.substring(11, 13));
      const s = parseInt(clean.substring(13, 15));
      if (clean.endsWith("Z")) {
        return new Date(Date.UTC(y, m, d, h, min, s));
      }
      return new Date(y, m, d, h, min, s);
    }
    return null;
  } catch {
    return null;
  }
}
