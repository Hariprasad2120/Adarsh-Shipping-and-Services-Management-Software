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
  draftId?: string;
  from: string;
  to: string;
  cc?: string;
  subject: string;
  date: string;
  snippet: string;
  bodyHtml: string;
  bodyText: string;
  labelIds: string[];
  attachments?: {
    id: string;
    name: string;
    mimeType: string;
    size: number;
    contentId?: string;
    disposition?: string;
    isInline?: boolean;
  }[];
  listUnsubscribe?: string;
};


export type GmailThreadDetails = {
  id: string;
  subject: string;
  messages: GmailMessage[];
};

type GmailApiHeader = {
  name: string;
  value: string;
};

type GmailApiPart = {
  mimeType?: string;
  filename?: string;
  headers?: GmailApiHeader[];
  body?: {
    data?: string;
    attachmentId?: string;
    size?: number;
  };
  parts?: GmailApiPart[];
};

type GmailApiMessage = {
  id: string;
  threadId: string;
  snippet?: string;
  labelIds?: string[];
  payload?: GmailApiPart;
};

type GmailApiThread = {
  id: string;
  snippet: string;
  historyId: string;
};

type GmailApiThreadResponse = {
  messages?: GmailApiMessage[];
};

type GmailApiDraft = {
  id: string;
  message?: {
    id?: string;
    threadId?: string;
  };
};

type GmailApiDraftListResponse = {
  drafts?: GmailApiDraft[];
  nextPageToken?: string;
};

type GmailSendResponse = {
  id: string;
  threadId: string;
  labelIds?: string[];
};

type GmailLabel = {
  id: string;
  name: string;
  type: "system" | "user";
  messagesTotal?: number;
  messagesUnread?: number;
  threadsTotal?: number;
  threadsUnread?: number;
};

type GmailLabelsResponse = {
  labels?: GmailLabel[];
};

type GmailDraftAttachment = {
  filename: string;
  mimeType: string;
  content: Buffer;
};

type GmailMessageAttachment = GmailDraftAttachment;

function buildRawMessage(params: {
  to?: string;
  cc?: string;
  bcc?: string;
  subject: string;
  body: string;
  textBody?: string;
  threadId?: string;
  attachments?: GmailMessageAttachment[];
}) {
  const textBody = params.textBody ?? params.body.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const encodeBodyPart = (value: string) => Buffer.from(value, "utf8").toString("base64").replace(/(.{76})/g, "$1\r\n");
  const encodeHeaderValue = (value: string) => value.replace(/[\\"]/g, "\\$&");
  const attachments = params.attachments ?? [];
  if (attachments.length === 0) {
    const altBoundary = `alt_${Date.now().toString(36)}`;
    const headers = [
      params.to ? `To: ${params.to}` : null,
      params.cc ? `Cc: ${params.cc}` : null,
      params.bcc ? `Bcc: ${params.bcc}` : null,
      `Subject: ${params.subject}`,
      "MIME-Version: 1.0",
      `Content-Type: multipart/alternative; boundary="${altBoundary}"`,
      params.threadId ? `In-Reply-To: ${params.threadId}` : null,
      params.threadId ? `References: ${params.threadId}` : null,
      "",
    ].filter(Boolean);

    const parts = [
      `--${altBoundary}`,
      'Content-Type: text/plain; charset="UTF-8"',
      "Content-Transfer-Encoding: base64",
      "",
      encodeBodyPart(textBody),
      "",
      `--${altBoundary}`,
      'Content-Type: text/html; charset="UTF-8"',
      "Content-Transfer-Encoding: base64",
      "",
      encodeBodyPart(params.body),
      "",
      `--${altBoundary}--`,
    ];

    return Buffer.from([...headers, ...parts].join("\r\n")).toString("base64url");
  }

  const mixedBoundary = `mixed_${Date.now().toString(36)}`;
  const altBoundary = `alt_${Date.now().toString(36)}`;
  const headers = [
    params.to ? `To: ${params.to}` : null,
    params.cc ? `Cc: ${params.cc}` : null,
    params.bcc ? `Bcc: ${params.bcc}` : null,
    `Subject: ${params.subject}`,
    params.threadId ? `In-Reply-To: ${params.threadId}` : null,
    params.threadId ? `References: ${params.threadId}` : null,
    "MIME-Version: 1.0",
    `Content-Type: multipart/mixed; boundary="${mixedBoundary}"`,
    "",
  ].filter(Boolean);

  const parts: string[] = [];
  parts.push(`--${mixedBoundary}`);
  parts.push(`Content-Type: multipart/alternative; boundary="${altBoundary}"`);
  parts.push("");
  parts.push(`--${altBoundary}`);
  parts.push('Content-Type: text/plain; charset="UTF-8"');
  parts.push("Content-Transfer-Encoding: base64");
  parts.push("");
  parts.push(encodeBodyPart(textBody));
  parts.push("");
  parts.push(`--${altBoundary}`);
  parts.push('Content-Type: text/html; charset="UTF-8"');
  parts.push("Content-Transfer-Encoding: base64");
  parts.push("");
  parts.push(encodeBodyPart(params.body));
  parts.push("");
  parts.push(`--${altBoundary}--`);

  for (const attachment of attachments) {
    const filename = encodeHeaderValue(attachment.filename);
    parts.push(`--${mixedBoundary}`);
    parts.push(`Content-Type: ${attachment.mimeType}; name="${filename}"`);
    parts.push("Content-Transfer-Encoding: base64");
    parts.push(`Content-Disposition: attachment; filename="${filename}"`);
    parts.push("");
    parts.push(attachment.content.toString("base64").replace(/(.{76})/g, "$1\r\n"));
    parts.push("");
  }

  parts.push(`--${mixedBoundary}--`);

  return Buffer.from([...headers, ...parts].join("\r\n")).toString("base64url");
}

// Parse headers array into friendly key-value map
function parseHeaders(headers: { name: string; value: string }[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const h of headers) {
    result[h.name.toLowerCase()] = h.value;
  }
  return result;
}

// Recursively parse MIME parts to extract HTML and Plain Text
function extractBody(payload?: GmailApiPart): { html: string; text: string } {
  let html = "";
  let text = "";

  function traverse(part: GmailApiPart) {
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
    threads?: GmailApiThread[];
    nextPageToken?: string;
  };

  if (!data.threads || data.threads.length === 0) {
    return { threads: [] };
  }

  // Fetch minimal header info for each thread in parallel
  const threads = await Promise.all(
    data.threads.map(async (t) => {
      try {
        const threadRes = await fetch(`${GMAIL_API_BASE}/threads/${t.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date&metadataHeaders=To`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!threadRes.ok) return null;
        
        const threadData = (await threadRes.json()) as GmailApiThreadResponse;
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

  const data = (await res.json()) as GmailApiThreadResponse;
  const threadMessages = data.messages || [];
  const hasDraftMessages = threadMessages.some((msg) => (msg.labelIds || []).includes("DRAFT"));
  const draftIdByMessageId = hasDraftMessages
    ? await listDraftIdsByMessageId(token, threadId)
    : new Map<string, string>();
  const messages = threadMessages.map((msg) => {
    const headers = parseHeaders(msg.payload?.headers || []);
    const { html, text } = extractBody(msg.payload);

    const attachments: {
      id: string;
      name: string;
      mimeType: string;
      size: number;
      contentId?: string;
      disposition?: string;
      isInline?: boolean;
    }[] = [];
    function findAttachments(part: GmailApiPart) {
      if (part.filename && part.body?.attachmentId) {
        const partHeaders = parseHeaders(part.headers || []);
        const disposition = partHeaders["content-disposition"] || "";
        const contentId = partHeaders["content-id"]?.replace(/[<>]/g, "");
        attachments.push({
          id: part.body.attachmentId,
          name: part.filename,
          mimeType: part.mimeType || "application/octet-stream",
          size: part.body.size || 0,
          contentId,
          disposition,
          isInline:
            disposition.toLowerCase().includes("inline") ||
            Boolean(contentId),
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
      draftId: draftIdByMessageId.get(msg.id),
      from: headers["from"] || "Unknown",
      to: headers["to"] || "Unknown",
      cc: headers["cc"],
      subject: headers["subject"] || "(No Subject)",
      date: headers["date"] || "",
      snippet: msg.snippet || "",
      bodyHtml: html,
      bodyText: text,
      labelIds: msg.labelIds || [],
      attachments,
      listUnsubscribe: headers["list-unsubscribe"]
    };
  });

  const subject = messages[0]?.subject || "(No Subject)";

  return {
    id: threadId,
    subject,
    messages
  };
}

async function listDraftIdsByMessageId(token: string, threadId: string): Promise<Map<string, string>> {
  const draftIdByMessageId = new Map<string, string>();
  let pageToken: string | undefined;

  do {
    const url = new URL(`${GMAIL_API_BASE}/drafts`);
    url.searchParams.set("maxResults", "100");
    if (pageToken) {
      url.searchParams.set("pageToken", pageToken);
    }

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Gmail listDrafts failed: ${err}`);
    }

    const data = (await res.json()) as GmailApiDraftListResponse;
    for (const draft of data.drafts || []) {
      const messageId = draft.message?.id;
      if (!messageId || draft.message?.threadId !== threadId) continue;
      draftIdByMessageId.set(messageId, draft.id);
    }

    pageToken = data.nextPageToken;
  } while (pageToken);

  return draftIdByMessageId;
}

// Compose and send a new email (RFC 2822 format)
export async function sendEmail(params: {
  userId: string;
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  body: string;
  textBody?: string;
  threadId?: string;
  attachments?: GmailMessageAttachment[];
}): Promise<GmailSendResponse> {
  const token = await getValidAccessToken(params.userId);
  const raw = buildRawMessage(params);

  const body: Record<string, string> = { raw };
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

export async function createDraft(params: {
  userId: string;
  to?: string;
  cc?: string;
  bcc?: string;
  subject: string;
  body: string;
  textBody?: string;
  attachments?: GmailDraftAttachment[];
}): Promise<{ id: string; message: { id: string } }> {
  const token = await getValidAccessToken(params.userId);
  const raw = buildRawMessage(params);
  const res = await fetch(`${GMAIL_API_BASE}/drafts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: { raw },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gmail createDraft failed: ${err}`);
  }

  return res.json();
}

export async function sendDraft(params: { userId: string; draftId: string }): Promise<GmailSendResponse> {
  const token = await getValidAccessToken(params.userId);
  const res = await fetch(`${GMAIL_API_BASE}/drafts/send`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id: params.draftId,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gmail sendDraft failed: ${err}`);
  }

  return res.json();
}

// Modify thread labels (e.g. Star, Archive, Mark Read/Unread)
export async function modifyThreadLabels(params: {
  userId: string;
  threadId: string;
  addLabelIds: string[];
  removeLabelIds: string[];
}): Promise<GmailSendResponse> {
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

// List user labels
export async function listLabels(userId: string): Promise<GmailLabelsResponse> {
  const token = await getValidAccessToken(userId);
  const res = await fetch(`${GMAIL_API_BASE}/labels`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gmail listLabels failed: ${err}`);
  }
  return res.json();
}

// Create a new user label
export async function createLabel(userId: string, name: string): Promise<GmailLabel> {
  const token = await getValidAccessToken(userId);
  const res = await fetch(`${GMAIL_API_BASE}/labels`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      name,
      labelListVisibility: "labelShow",
      messageListVisibility: "show"
    })
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gmail createLabel failed: ${err}`);
  }
  return res.json();
}

// Delete a user label
export async function deleteLabel(userId: string, labelId: string): Promise<true> {
  const token = await getValidAccessToken(userId);
  const res = await fetch(`${GMAIL_API_BASE}/labels/${labelId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gmail deleteLabel failed: ${err}`);
  }
  return true;
}

