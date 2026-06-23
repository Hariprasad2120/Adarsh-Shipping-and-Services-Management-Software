import { getValidAccessToken } from "./workspace-oauth";

const GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1/users/me";

export type GmailThreadHeader = {
  id: string;
  snippet: string;
  historyId: string;
  subject: string;
  from: string;
  to: string;
  date: string;
  isUnread: boolean;
  isStarred: boolean;
};

export type GmailMessage = {
  id: string;
  threadId: string;
  from: string;
  to: string;
  cc?: string;
  subject: string;
  date: string;
  snippet: string;
  bodyHtml: string;
  bodyText: string;
  labelIds: string[];
  attachments?: { id: string; name: string; mimeType: string; size: number }[];
};

export type GmailThreadDetails = {
  id: string;
  subject: string;
  messages: GmailMessage[];
};

// Parse headers array into friendly key-value map
function parseHeaders(headers: { name: string; value: string }[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const h of headers) {
    result[h.name.toLowerCase()] = h.value;
  }
  return result;
}

// Recursively parse MIME parts to extract HTML and Plain Text
function extractBody(payload: any): { html: string; text: string } {
  let html = "";
  let text = "";

  function traverse(part: any) {
    if (part.mimeType === "text/html" && part.body?.data) {
      html += Buffer.from(part.body.data, "base64url").toString("utf8");
    } else if (part.mimeType === "text/plain" && part.body?.data) {
      text += Buffer.from(part.body.data, "base64url").toString("utf8");
    } else if (part.parts) {
      for (const subPart of part.parts) {
        traverse(subPart);
      }
    }
  }

  if (payload) {
    traverse(payload);
  }
  return { html, text };
}

// List Gmail threads with pagination and search query
export async function listThreads(params: {
  userId: string;
  query?: string;
  maxResults?: number;
  pageToken?: string;
}): Promise<{ threads: GmailThreadHeader[]; nextPageToken?: string }> {
  const token = await getValidAccessToken(params.userId);

  const url = new URL(`${GMAIL_API_BASE}/threads`);
  if (params.query) url.searchParams.set("q", params.query);
  if (params.maxResults) url.searchParams.set("maxResults", String(params.maxResults));
  if (params.pageToken) url.searchParams.set("pageToken", params.pageToken);

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gmail listThreads failed: ${err}`);
  }

  const data = (await res.json()) as {
    threads?: { id: string; snippet: string; historyId: string }[];
    nextPageToken?: string;
  };

  if (!data.threads || data.threads.length === 0) {
    return { threads: [] };
  }

  // Fetch minimal header info for each thread in parallel
  const threads = await Promise.all(
    data.threads.slice(0, 15).map(async (t) => {
      try {
        const threadRes = await fetch(`${GMAIL_API_BASE}/threads/${t.id}?format=minimal`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!threadRes.ok) return null;
        
        const threadData = await threadRes.json();
        const firstMsg = threadData.messages?.[0];
        if (!firstMsg) return null;

        const headers = parseHeaders(firstMsg.payload?.headers || []);
        const labelIds = firstMsg.labelIds || [];

        return {
          id: t.id,
          snippet: t.snippet,
          historyId: t.historyId,
          subject: headers["subject"] || "(No Subject)",
          from: headers["from"] || "Unknown",
          to: headers["to"] || "Unknown",
          date: headers["date"] || "",
          isUnread: labelIds.includes("UNREAD"),
          isStarred: labelIds.includes("STARRED")
        };
      } catch (err) {
        console.error(`Failed to fetch thread header for ${t.id}:`, err);
        return null;
      }
    })
  );

  return {
    threads: threads.filter(Boolean) as GmailThreadHeader[],
    nextPageToken: data.nextPageToken
  };
}

// Get full conversation thread details
export async function getThread(userId: string, threadId: string): Promise<GmailThreadDetails> {
  const token = await getValidAccessToken(userId);

  const res = await fetch(`${GMAIL_API_BASE}/threads/${threadId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gmail getThread failed: ${err}`);
  }

  const data = await res.json();
  const messages = (data.messages || []).map((msg: any) => {
    const headers = parseHeaders(msg.payload?.headers || []);
    const { html, text } = extractBody(msg.payload);

    const attachments: { id: string; name: string; mimeType: string; size: number }[] = [];
    function findAttachments(part: any) {
      if (part.filename && part.body?.attachmentId) {
        attachments.push({
          id: part.body.attachmentId,
          name: part.filename,
          mimeType: part.mimeType,
          size: part.body.size || 0
        });
      }
      if (part.parts) {
        for (const sub of part.parts) {
          findAttachments(sub);
        }
      }
    }
    if (msg.payload) {
      findAttachments(msg.payload);
    }

    return {
      id: msg.id,
      threadId: msg.threadId,
      from: headers["from"] || "Unknown",
      to: headers["to"] || "Unknown",
      cc: headers["cc"],
      subject: headers["subject"] || "(No Subject)",
      date: headers["date"] || "",
      snippet: msg.snippet || "",
      bodyHtml: html,
      bodyText: text,
      labelIds: msg.labelIds || [],
      attachments
    };
  });

  const subject = messages[0]?.subject || "(No Subject)";

  return {
    id: threadId,
    subject,
    messages
  };
}

// Compose and send a new email (RFC 2822 format)
export async function sendEmail(params: {
  userId: string;
  to: string;
  cc?: string;
  subject: string;
  body: string;
  threadId?: string;
}): Promise<any> {
  const token = await getValidAccessToken(params.userId);

  // Construct standard RFC 822 raw message
  const headers = [
    `To: ${params.to}`,
    params.cc ? `Cc: ${params.cc}` : null,
    `Subject: ${params.subject}`,
    `Content-Type: text/html; charset="UTF-8"`,
    params.threadId ? `In-Reply-To: ${params.threadId}` : null,
    params.threadId ? `References: ${params.threadId}` : null,
    "",
    params.body
  ].filter(Boolean);

  const raw = Buffer.from(headers.join("\r\n")).toString("base64url");

  const body: any = { raw };
  if (params.threadId) {
    body.threadId = params.threadId;
  }

  const res = await fetch(`${GMAIL_API_BASE}/messages/send`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gmail sendEmail failed: ${err}`);
  }

  return res.json();
}

// Modify thread labels (e.g. Star, Archive, Mark Read/Unread)
export async function modifyThreadLabels(params: {
  userId: string;
  threadId: string;
  addLabelIds: string[];
  removeLabelIds: string[];
}): Promise<any> {
  const token = await getValidAccessToken(params.userId);

  const res = await fetch(`${GMAIL_API_BASE}/threads/${params.threadId}/modify`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      addLabelIds: params.addLabelIds,
      removeLabelIds: params.removeLabelIds
    })
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gmail modifyThreadLabels failed: ${err}`);
  }

  return res.json();
}

// Fetch attachment data by message ID and attachment ID
export async function getAttachment(params: {
  userId: string;
  messageId: string;
  attachmentId: string;
}): Promise<Buffer> {
  const token = await getValidAccessToken(params.userId);
  const res = await fetch(
    `${GMAIL_API_BASE}/messages/${params.messageId}/attachments/${params.attachmentId}`,
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gmail getAttachment failed: ${err}`);
  }

  const data = (await res.json()) as { data: string };
  return Buffer.from(data.data, "base64url");
}
