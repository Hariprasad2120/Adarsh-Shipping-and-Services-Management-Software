"use server";

import { db } from "@/lib/db";
import { getNow } from "@/lib/clock";
import { revalidatePath } from "next/cache";

// Decode base64url standard used in Gmail API payloads
function decodeBase64Url(str: string) {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  try {
    return Buffer.from(base64, "base64").toString("utf-8");
  } catch (err) {
    return "";
  }
}

// Extract specific headers from Google Gmail header arrays
function getHeaderValue(headers: { name: string; value: string }[], name: string): string {
  const header = headers.find((h) => h.name.toLowerCase() === name.toLowerCase());
  return header ? header.value : "";
}

// Parse body HTML/Text from Google message parts
function parseMessageBody(payload: any): { html: string; text: string } {
  let html = "";
  let text = "";

  if (payload.body?.data) {
    const decoded = decodeBase64Url(payload.body.data);
    if (payload.mimeType === "text/html") html = decoded;
    else text = decoded;
  }

  if (payload.parts) {
    for (const part of payload.parts) {
      const parsed = parseMessageBody(part);
      if (parsed.html) html += parsed.html;
      if (parsed.text) text += parsed.text;
    }
  }

  return { html, text };
}

// Refresh Google Access Token using the refresh token
export async function refreshGoogleToken(mailAccountId: string, orgId: string) {
  const account = await db.mailAccount.findUniqueOrThrow({
    where: { id: mailAccountId, orgId },
  });

  if (!account.refreshToken) {
    throw new Error("No refresh token found for this account.");
  }

  const clientId = process.env.AUTH_GOOGLE_ID;
  const clientSecret = process.env.AUTH_GOOGLE_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Google Client ID/Secret environment variables not configured.");
  }

  console.log(`[Gmail Sync] Refreshing access token for account ${account.email}...`);

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: account.refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    console.error("[Gmail Sync] Token refresh error:", data);
    throw new Error(`Google token refresh failed: ${data.error_description || data.error}`);
  }

  const expiresAt = new Date(Date.now() + data.expires_in * 1000);

  const updatedAccount = await db.mailAccount.update({
    where: { id: mailAccountId },
    data: {
      accessToken: data.access_token,
      tokenExpiresAt: expiresAt,
    },
  });

  return updatedAccount.accessToken;
}

// Main Gmail Sync trigger function
export async function syncGmailInbox(userId: string, orgId: string, mailAccountId: string) {
  const account = await db.mailAccount.findUniqueOrThrow({
    where: { id: mailAccountId, orgId, userId },
  });

  if (account.provider !== "GOOGLE" || !account.accessToken) {
    return { success: false, reason: "Account is not a Google account or lacks token." };
  }

  let token = account.accessToken;
  const now = await getNow();

  // Refresh token if expired or near expiry (within 2 minutes)
  if (account.tokenExpiresAt && account.tokenExpiresAt.getTime() - now.getTime() < 120000) {
    try {
      const refreshedToken = await refreshGoogleToken(mailAccountId, orgId);
      if (refreshedToken) token = refreshedToken;
    } catch (err: any) {
      return { success: false, reason: `OAuth Refresh Failed: ${err.message}` };
    }
  }

  try {
    console.log(`[Gmail Sync] Fetching recent threads for ${account.email}...`);
    // Query Google Gmail threads endpoint
    const threadsResponse = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/threads?maxResults=15",
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!threadsResponse.ok) {
      const errData = await threadsResponse.json();
      throw new Error(`Gmail API fetch threads failed: ${errData.error?.message || threadsResponse.statusText}`);
    }

    const threadsData = await threadsResponse.json();
    const googleThreads = threadsData.threads || [];

    let importedCount = 0;

    // Load or create Inbox & Sent labels
    let inboxLabel = await db.mailLabel.findFirst({
      where: { userId, orgId, name: "INBOX" },
    });
    if (!inboxLabel) {
      inboxLabel = await db.mailLabel.create({
        data: { orgId, userId, name: "INBOX" },
      });
    }

    let sentLabel = await db.mailLabel.findFirst({
      where: { userId, orgId, name: "SENT" },
    });
    if (!sentLabel) {
      sentLabel = await db.mailLabel.create({
        data: { orgId, userId, name: "SENT" },
      });
    }

    // Process each thread
    for (const gThreadSummary of googleThreads) {
      const threadDetailResponse = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/threads/${gThreadSummary.id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!threadDetailResponse.ok) continue;

      const gThread = await threadDetailResponse.json();
      const messages = gThread.messages || [];
      if (messages.length === 0) continue;

      const firstMsg = messages[0];
      const headers = firstMsg.payload?.headers || [];
      const subject = getHeaderValue(headers, "Subject") || "(No Subject)";
      const threadTime = new Date(Number(firstMsg.internalDate));

      // 1. Sync or Create local MailThread using dynamic mapping
      // We check if we already have this thread stored (using subject & matching created bounds, or custom metadata tracking if needed)
      // Since Google thread ID is unique, we can search for a MailMessage that matches it or map it.
      // To prevent duplication, check if a mail message already exists with thread Google-Subject
      let thread = await db.mailThread.findFirst({
        where: { orgId, subject, createdAt: threadTime },
      });

      if (!thread) {
        thread = await db.mailThread.create({
          data: {
            orgId,
            subject,
            createdAt: threadTime,
            updatedAt: threadTime,
            labels: {
              connect: [{ id: inboxLabel.id }],
            },
          },
        });
      }

      // 2. Import individual messages in thread
      for (const gMsg of messages) {
        const msgHeaders = gMsg.payload?.headers || [];
        const msgId = gMsg.id;

        // Check if message already stored
        const msgExists = await db.mailMessage.findFirst({
          where: { orgId, threadId: thread.id, subject: getHeaderValue(msgHeaders, "Subject") || subject, createdAt: new Date(Number(gMsg.internalDate)) },
        });

        if (msgExists) continue;

        const from = getHeaderValue(msgHeaders, "From");
        const to = getHeaderValue(msgHeaders, "To");
        const cc = getHeaderValue(msgHeaders, "Cc") || null;
        const bcc = getHeaderValue(msgHeaders, "Bcc") || null;
        const msgSubject = getHeaderValue(msgHeaders, "Subject") || subject;
        const parsedBody = parseMessageBody(gMsg.payload);
        const createdAt = new Date(Number(gMsg.internalDate));

        const isIncoming = !from.toLowerCase().includes(account.email.toLowerCase());

        await db.mailMessage.create({
          data: {
            orgId,
            threadId: thread.id,
            mailAccountId: mailAccountId,
            from,
            to,
            cc,
            bcc,
            subject: msgSubject,
            bodyText: parsedBody.text || gMsg.snippet || "",
            bodyHtml: parsedBody.html || `<p>${parsedBody.text || gMsg.snippet || ""}</p>`,
            isIncoming,
            status: "SENT",
            createdAt,
            updatedAt: createdAt,
          },
        });

        // Link folder labels based on google system tags
        const labelIds = gMsg.labelIds || [];
        if (labelIds.includes("SENT")) {
          // Connect thread to sent label if not already
          await db.mailThread.update({
            where: { id: thread.id },
            data: {
              labels: {
                connect: [{ id: sentLabel.id }],
              },
            },
          });
        }

        importedCount++;
      }
    }

    console.log(`[Gmail Sync] Successfully integrated ${importedCount} messages.`);
    
    // Auto-register watch subscription if historyId is available and not already watched
    if (googleThreads.length > 0 && !account.watchResource) {
      try {
        const firstMsg = googleThreads[0];
        // Fetch fresh historyId from profile/threads if possible, or just watch
        await registerGmailWatch(mailAccountId, orgId);
      } catch (e) {
        console.error("Auto watch registration failed during initial sync:", e);
      }
    }

    revalidatePath("/communication/mail");
    return { success: true, count: importedCount };
  } catch (err: any) {
    console.error("[Gmail Sync] Process exception:", err);
    return { success: false, reason: err.message };
  }
}

// Register watch subscription for real-time Pub/Sub push notifications
export async function registerGmailWatch(mailAccountId: string, orgId: string) {
  const account = await db.mailAccount.findUniqueOrThrow({
    where: { id: mailAccountId, orgId },
  });

  if (account.provider !== "GOOGLE" || !account.accessToken) {
    return { success: false, reason: "Not a Google account or lacks token." };
  }

  let token = account.accessToken;
  const now = await getNow();

  // Refresh if near expiration
  if (account.tokenExpiresAt && account.tokenExpiresAt.getTime() - now.getTime() < 120000) {
    try {
      const refreshedToken = await refreshGoogleToken(mailAccountId, orgId);
      if (refreshedToken) token = refreshedToken;
    } catch (err: any) {
      return { success: false, reason: `Token refresh failed: ${err.message}` };
    }
  }

  const topicName = process.env.GCP_PUBSUB_TOPIC || "projects/leadbot-477205/topics/gmail-notifications";

  try {
    console.log(`[Gmail Sync] Registering watch for ${account.email} on topic ${topicName}...`);
    const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/watch", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        topicName,
        labelIds: ["INBOX"],
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("[Gmail Sync] Watch registration error:", data);
      throw new Error(`Gmail Watch API failed: ${data.error?.message || response.statusText}`);
    }

    const watchExpiration = data.expiration ? new Date(Number(data.expiration)) : null;
    const historyId = data.historyId ? String(data.historyId) : account.historyId;

    await db.mailAccount.update({
      where: { id: mailAccountId },
      data: {
        watchResource: data.resourceId || null,
        watchExpiration,
        historyId,
      },
    });

    console.log(`[Gmail Sync] Watch registered successfully. Expires at: ${watchExpiration?.toISOString()}`);
    return { success: true, watchExpiration, historyId };
  } catch (err: any) {
    console.error("[Gmail Sync] Watch registration exception:", err);
    return { success: false, reason: err.message };
  }
}

// Perform incremental sync using the Gmail History API
export async function syncGmailIncremental(mailAccountId: string, orgId: string) {
  const account = await db.mailAccount.findUniqueOrThrow({
    where: { id: mailAccountId, orgId },
  });

  if (account.provider !== "GOOGLE" || !account.accessToken) {
    return { success: false, reason: "Not a Google account or lacks token." };
  }

  // If no historyId exists, fall back to bootstrap sync
  if (!account.historyId) {
    console.log(`[Gmail Sync] No historyId found for ${account.email}. Executing bootstrap sync...`);
    const res = await syncGmailInbox(account.userId || "", orgId, mailAccountId);
    if (res.success) {
      await registerGmailWatch(mailAccountId, orgId);
    }
    return res;
  }

  let token = account.accessToken;
  const now = await getNow();

  // Refresh if near expiration
  if (account.tokenExpiresAt && account.tokenExpiresAt.getTime() - now.getTime() < 120000) {
    try {
      const refreshedToken = await refreshGoogleToken(mailAccountId, orgId);
      if (refreshedToken) token = refreshedToken;
    } catch (err: any) {
      return { success: false, reason: `Token refresh failed: ${err.message}` };
    }
  }

  try {
    console.log(`[Gmail Sync] Fetching history for ${account.email} starting from ${account.historyId}...`);
    
    let url = `https://gmail.googleapis.com/gmail/v1/users/me/history?startHistoryId=${account.historyId}&maxResults=50`;
    let hasMore = true;
    let importedCount = 0;
    let latestHistoryId = account.historyId;

    // Load folder labels
    let inboxLabel = await db.mailLabel.findFirst({
      where: { userId: account.userId || "", orgId, name: "INBOX" },
    });
    if (!inboxLabel) {
      inboxLabel = await db.mailLabel.create({
        data: { orgId, userId: account.userId || "", name: "INBOX" },
      });
    }

    let sentLabel = await db.mailLabel.findFirst({
      where: { userId: account.userId || "", orgId, name: "SENT" },
    });
    if (!sentLabel) {
      sentLabel = await db.mailLabel.create({
        data: { orgId, userId: account.userId || "", name: "SENT" },
      });
    }

    let starredLabel = await db.mailLabel.findFirst({
      where: { userId: account.userId || "", orgId, name: "STARRED" },
    });
    if (!starredLabel) {
      starredLabel = await db.mailLabel.create({
        data: { orgId, userId: account.userId || "", name: "STARRED" },
      });
    }

    while (hasMore && url) {
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const errData = await response.json();
        // If historyId is too old (404/400), run full sync bootstrap
        if (response.status === 404 || response.status === 400) {
          console.warn(`[Gmail Sync] historyId ${account.historyId} is expired or invalid. Re-bootstrapping.`);
          return syncGmailInbox(account.userId || "", orgId, mailAccountId);
        }
        throw new Error(`Gmail History API failed: ${errData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const historyRecords = data.history || [];

      if (data.historyId) {
        latestHistoryId = String(data.historyId);
      }

      for (const record of historyRecords) {
        // 1. New Messages Added
        if (record.messagesAdded) {
          for (const item of record.messagesAdded) {
            const gMsgSummary = item.message;
            if (!gMsgSummary || !gMsgSummary.id) continue;

            const detailRes = await fetch(
              `https://gmail.googleapis.com/gmail/v1/users/me/messages/${gMsgSummary.id}`,
              {
                headers: { Authorization: `Bearer ${token}` },
              }
            );
            if (!detailRes.ok) continue;

            const gMsg = await detailRes.json();
            const msgHeaders = gMsg.payload?.headers || [];
            const subject = getHeaderValue(msgHeaders, "Subject") || "(No Subject)";
            const createdAt = new Date(Number(gMsg.internalDate));

            // Deduplicate check
            const duplicate = await db.mailMessage.findFirst({
              where: { orgId, mailAccountId, subject, createdAt },
            });
            if (duplicate) continue;

            const from = getHeaderValue(msgHeaders, "From");
            const to = getHeaderValue(msgHeaders, "To");
            const cc = getHeaderValue(msgHeaders, "Cc") || null;
            const bcc = getHeaderValue(msgHeaders, "Bcc") || null;
            const parsedBody = parseMessageBody(gMsg.payload);
            const isIncoming = !from.toLowerCase().includes(account.email.toLowerCase());

            let thread = await db.mailThread.findFirst({
              where: { orgId, subject, createdAt: { gte: new Date(createdAt.getTime() - 86400000), lte: new Date(createdAt.getTime() + 86400000) } },
            });

            if (!thread) {
              thread = await db.mailThread.create({
                data: {
                  orgId,
                  subject,
                  createdAt,
                  updatedAt: createdAt,
                  labels: {
                    connect: [{ id: isIncoming ? inboxLabel.id : sentLabel.id }],
                  },
                },
              });
            }

            await db.mailMessage.create({
              data: {
                orgId,
                threadId: thread.id,
                mailAccountId,
                from,
                to,
                cc,
                bcc,
                subject,
                bodyText: parsedBody.text || gMsg.snippet || "",
                bodyHtml: parsedBody.html || `<p>${parsedBody.text || gMsg.snippet || ""}</p>`,
                isIncoming,
                status: "SENT",
                createdAt,
                updatedAt: createdAt,
              },
            });

            importedCount++;
          }
        }

        // 2. Labels Added (e.g. Starred)
        if (record.labelsAdded) {
          for (const item of record.labelsAdded) {
            const addedLabels = item.labelIds || [];
            if (addedLabels.includes("STARRED")) {
              const msg = await db.mailMessage.findFirst({
                where: { orgId, mailAccountId, threadId: { not: "" } },
              });
              if (msg) {
                await db.mailThread.update({
                  where: { id: msg.threadId },
                  data: { labels: { connect: [{ id: starredLabel.id }] } },
                });
              }
            }
          }
        }

        // 3. Labels Removed (e.g. Unread / Starred)
        if (record.labelsRemoved) {
          for (const item of record.labelsRemoved) {
            const removedLabels = item.labelIds || [];
            if (removedLabels.includes("STARRED")) {
              const msg = await db.mailMessage.findFirst({
                where: { orgId, mailAccountId, threadId: { not: "" } },
              });
              if (msg) {
                await db.mailThread.update({
                  where: { id: msg.threadId },
                  data: { labels: { disconnect: [{ id: starredLabel.id }] } },
                });
              }
            }
            if (removedLabels.includes("UNREAD")) {
              const msg = await db.mailMessage.findFirst({
                where: { orgId, mailAccountId, readAt: null },
              });
              if (msg) {
                await db.mailMessage.update({
                  where: { id: msg.id },
                  data: { readAt: new Date() },
                });
              }
            }
          }
        }
      }

      url = data.nextPageToken
        ? `https://gmail.googleapis.com/gmail/v1/users/me/history?startHistoryId=${account.historyId}&pageToken=${data.nextPageToken}&maxResults=50`
        : "";
      hasMore = !!data.nextPageToken;
    }

    await db.mailAccount.update({
      where: { id: mailAccountId },
      data: { historyId: latestHistoryId },
    });

    console.log(`[Gmail Sync] Incremental sync complete. Synced ${importedCount} messages. Latest historyId: ${latestHistoryId}`);
    revalidatePath("/communication/mail");
    return { success: true, count: importedCount };
  } catch (err: any) {
    console.error("[Gmail Sync] Incremental sync exception:", err);
    return { success: false, reason: err.message };
  }
}
