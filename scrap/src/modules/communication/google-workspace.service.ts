"use server";

import { db } from "@/lib/db";
import { getNow } from "@/lib/clock";
import { refreshGoogleToken } from "./gmail-sync.service";
import { revalidatePath } from "next/cache";

// Search contacts in Google People API
export async function searchGoogleContacts(userId: string, orgId: string, query: string) {
  const account = await db.mailAccount.findFirst({
    where: { userId, orgId, provider: "GOOGLE", isActive: true },
  });

  if (!account || !account.accessToken) {
    return [];
  }

  let token = account.accessToken;
  const now = await getNow();
  if (account.tokenExpiresAt && account.tokenExpiresAt.getTime() - now.getTime() < 120000) {
    try {
      const refreshedToken = await refreshGoogleToken(account.id, orgId);
      if (refreshedToken) token = refreshedToken;
    } catch (err) {}
  }

  try {
    // Attempt standard searchContacts endpoint
    const url = `https://people.googleapis.com/v1/people:searchContacts?query=${encodeURIComponent(query)}&readMask=names,emailAddresses`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      // Fallback: list connections and filter locally if search endpoint not supported
      const connectionsRes = await fetch(
        "https://people.googleapis.com/v1/people/me/connections?personFields=names,emailAddresses&pageSize=150",
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!connectionsRes.ok) return [];
      const data = await connectionsRes.json();
      const connections = data.connections || [];
      return connections
        .map((p: any) => {
          const name = p.names?.[0]?.displayName || "";
          const email = p.emailAddresses?.[0]?.value || "";
          return { name, email };
        })
        .filter((c: any) => c.email && (c.name.toLowerCase().includes(query.toLowerCase()) || c.email.toLowerCase().includes(query.toLowerCase())));
    }

    const data = await res.json();
    const results = data.results || [];
    return results.map((r: any) => {
      const p = r.person;
      const name = p?.names?.[0]?.displayName || "";
      const email = p?.emailAddresses?.[0]?.value || "";
      return { name, email };
    }).filter((c: any) => c.email);
  } catch (err) {
    console.error("[Google Contacts Search error]", err);
    return [];
  }
}

// List Tasks from Google Tasks API
export async function listGoogleTasks(userId: string, orgId: string) {
  const account = await db.mailAccount.findFirst({
    where: { userId, orgId, provider: "GOOGLE", isActive: true },
  });
  if (!account || !account.accessToken) return [];

  let token = account.accessToken;
  const now = await getNow();
  if (account.tokenExpiresAt && account.tokenExpiresAt.getTime() - now.getTime() < 120000) {
    try {
      const refreshedToken = await refreshGoogleToken(account.id, orgId);
      if (refreshedToken) token = refreshedToken;
    } catch (e) {}
  }

  try {
    const listsRes = await fetch("https://tasks.googleapis.com/v1/users/@me/lists", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!listsRes.ok) return [];
    const listsData = await listsRes.json();
    const lists = listsData.items || [];
    if (lists.length === 0) return [];

    const listId = lists[0].id;
    const tasksRes = await fetch(`https://tasks.googleapis.com/v1/lists/${listId}/tasks`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!tasksRes.ok) return [];
    const tasksData = await tasksRes.json();
    return tasksData.items || [];
  } catch (err) {
    console.error("[Google Tasks List error]", err);
    return [];
  }
}

// Create a task in Google Tasks API
export async function createGoogleTask(
  userId: string,
  orgId: string,
  data: { title: string; notes?: string; due?: Date }
) {
  const account = await db.mailAccount.findFirst({
    where: { userId, orgId, provider: "GOOGLE", isActive: true },
  });
  if (!account || !account.accessToken) return null;

  let token = account.accessToken;
  const now = await getNow();
  if (account.tokenExpiresAt && account.tokenExpiresAt.getTime() - now.getTime() < 120000) {
    try {
      const refreshedToken = await refreshGoogleToken(account.id, orgId);
      if (refreshedToken) token = refreshedToken;
    } catch (e) {}
  }

  try {
    const listsRes = await fetch("https://tasks.googleapis.com/v1/users/@me/lists", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!listsRes.ok) return null;
    const listsData = await listsRes.json();
    const listId = listsData.items?.[0]?.id;
    if (!listId) return null;

    const res = await fetch(`https://tasks.googleapis.com/v1/lists/${listId}/tasks`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: data.title,
        notes: data.notes || "",
        due: data.due ? data.due.toISOString() : undefined,
      }),
    });

    if (!res.ok) return null;
    return res.json();
  } catch (err) {
    console.error("[Google Tasks Create error]", err);
    return null;
  }
}

// Disconnect Google Account and revoke tokens
export async function disconnectGoogleAccount(userId: string, orgId: string, mailAccountId: string) {
  const account = await db.mailAccount.findUniqueOrThrow({
    where: { id: mailAccountId, orgId, userId },
  });

  if (account.provider !== "GOOGLE") {
    throw new Error("Cannot disconnect a non-Google account");
  }

  // Revoke token on Google servers if refresh token is present
  if (account.refreshToken) {
    try {
      console.log(`[Google Workspace] Revoking token for ${account.email}...`);
      await fetch(`https://oauth2.googleapis.com/revoke?token=${account.refreshToken}`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });
    } catch (err) {
      console.error("[Google OAuth] Revocation call failed:", err);
    }
  }

  // Delete MailAccount record in our database
  await db.mailAccount.delete({
    where: { id: mailAccountId },
  });

  console.log(`[Google Workspace] Disconnected account: ${account.email}`);
  revalidatePath("/communication/mail");
  return { success: true };
}

// Search files in Google Drive API
export async function searchGoogleDriveFiles(userId: string, orgId: string, query: string) {
  const account = await db.mailAccount.findFirst({
    where: { userId, orgId, provider: "GOOGLE", isActive: true },
  });

  if (!account || !account.accessToken) {
    return [];
  }

  let token = account.accessToken;
  const now = await getNow();
  if (account.tokenExpiresAt && account.tokenExpiresAt.getTime() - now.getTime() < 120000) {
    try {
      const refreshedToken = await refreshGoogleToken(account.id, orgId);
      if (refreshedToken) token = refreshedToken;
    } catch (err) {}
  }

  try {
    // Escape single quotes in search query
    const escapedQuery = query.replace(/'/g, "\\'");
    // Search files by name containing query, excluding trashed files
    const q = `name contains '${escapedQuery}' and trashed = false`;
    const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,webViewLink,mimeType,size)`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      console.error("[Google Drive Search] API error:", await res.json());
      return [];
    }

    const data = await res.json();
    return data.files || [];
  } catch (err) {
    console.error("[Google Drive Search error]", err);
    return [];
  }
}
