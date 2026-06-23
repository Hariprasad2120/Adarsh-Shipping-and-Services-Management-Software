import { createSign } from "crypto";

const SA_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL!;
const PRIVATE_KEY = (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ?? "").replace(/\\n/g, "\n");
const DELEGATION_USER = process.env.GOOGLE_WORKSPACE_AUTOMATION_USER || "no-reply@adarshshipping.in";
const SHARED_DRIVE_ID = process.env.GOOGLE_SHARED_DRIVE_ID!;

let cachedDriveToken: { token: string; expiresAt: number } | null = null;

// Obtains delegation tokens using Domain-Wide Delegation (DWD)
async function getDriveAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedDriveToken && cachedDriveToken.expiresAt > now + 60) {
    return cachedDriveToken.token;
  }

  if (!SA_EMAIL || !PRIVATE_KEY) {
    throw new Error("Google service account credentials for Drive are not configured.");
  }

  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: SA_EMAIL,
    scope: "https://www.googleapis.com/auth/drive",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
    sub: DELEGATION_USER
  };

  const toSign = `${Buffer.from(JSON.stringify(header)).toString("base64url")}.${Buffer.from(JSON.stringify(payload)).toString("base64url")}`;
  const sign = createSign("RSA-SHA256");
  sign.update(toSign);
  const signature = sign.sign(PRIVATE_KEY).toString("base64url");
  const jwt = `${toSign}.${signature}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt
    })
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google Drive Service Account DWD failed: ${err}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedDriveToken = { token: data.access_token, expiresAt: now + data.expires_in };
  return data.access_token;
}

// Create a new folder
export async function createFolder(params: {
  name: string;
  parentFolderId?: string;
}): Promise<string> {
  const token = await getDriveAccessToken();

  const body: any = {
    name: params.name,
    mimeType: "application/vnd.google-apps.folder"
  };

  if (params.parentFolderId) {
    body.parents = [params.parentFolderId];
  } else if (SHARED_DRIVE_ID) {
    // If no parent is specified but we have a Shared Drive ID, use it as parent
    body.parents = [SHARED_DRIVE_ID];
  }

  const url = new URL("https://www.googleapis.com/drive/v3/files");
  url.searchParams.set("supportsAllDrives", "true");

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Drive createFolder failed: ${err}`);
  }

  const data = (await res.json()) as { id: string };
  return data.id;
}

// List files and folders in a parent folder
export async function listFiles(parentFolderId: string): Promise<{
  id: string;
  name: string;
  mimeType: string;
  size?: number;
  webViewLink?: string;
}[]> {
  if (
    process.env.NODE_ENV === "development" &&
    (parentFolderId.startsWith("mock-") || !process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL)
  ) {
    return [
      {
        id: "mock-file-1",
        name: "01_Adarsh_Cargo_KYC_Signed.pdf",
        mimeType: "application/pdf",
        size: 245760,
        webViewLink: "https://drive.google.com/file/d/mock-file-1/view"
      },
      {
        id: "mock-file-2",
        name: "02_Commercial_Invoice_INV-9821.xlsx",
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        size: 94208,
        webViewLink: "https://drive.google.com/file/d/mock-file-2/view"
      },
      {
        id: "mock-file-3",
        name: "03_Packing_List_Cargo.pdf",
        mimeType: "application/pdf",
        size: 153600,
        webViewLink: "https://drive.google.com/file/d/mock-file-3/view"
      },
      {
        id: "mock-file-4",
        name: "04_Bill_Of_Lading_Draft.pdf",
        mimeType: "application/pdf",
        size: 409600,
        webViewLink: "https://drive.google.com/file/d/mock-file-4/view"
      }
    ];
  }

  const token = await getDriveAccessToken();

  const url = new URL("https://www.googleapis.com/drive/v3/files");
  url.searchParams.set("q", `'${parentFolderId}' in parents and trashed = false`);
  url.searchParams.set("fields", "files(id, name, mimeType, size, webViewLink)");
  url.searchParams.set("supportsAllDrives", "true");
  url.searchParams.set("includeItemsFromAllDrives", "true");

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Drive listFiles failed: ${err}`);
  }

  const data = (await res.json()) as {
    files?: { id: string; name: string; mimeType: string; size?: number; webViewLink?: string }[];
  };

  return data.files || [];
}

// Upload a file to a parent folder using Multipart Upload
export async function uploadFile(params: {
  name: string;
  mimeType: string;
  parentFolderId: string;
  fileBuffer: Buffer;
}): Promise<{ id: string; webViewLink: string }> {
  const token = await getDriveAccessToken();

  const boundary = "-------314159265358979323846";
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metadata = {
    name: params.name,
    parents: [params.parentFolderId]
  };

  const base64Data = params.fileBuffer.toString("base64");
  
  const multipartBody = Buffer.concat([
    Buffer.from(delimiter),
    Buffer.from('Content-Type: application/json; charset=UTF-8\r\n\r\n'),
    Buffer.from(JSON.stringify(metadata)),
    Buffer.from(delimiter),
    Buffer.from(`Content-Type: ${params.mimeType}\r\n`),
    Buffer.from('Content-Transfer-Encoding: base64\r\n\r\n'),
    Buffer.from(base64Data),
    Buffer.from(closeDelimiter)
  ]);

  const url = new URL("https://www.googleapis.com/upload/drive/v3/files");
  url.searchParams.set("uploadType", "multipart");
  url.searchParams.set("supportsAllDrives", "true");
  url.searchParams.set("fields", "id, name, mimeType, webViewLink");

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
      "Content-Length": String(multipartBody.length)
    },
    body: multipartBody
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Drive uploadFile failed: ${err}`);
  }

  return res.json() as Promise<{ id: string; webViewLink: string }>;
}

// Search files matching name query in Google Drive
export async function searchFiles(query: string): Promise<{
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
}[]> {
  const token = await getDriveAccessToken();

  const url = new URL("https://www.googleapis.com/drive/v3/files");
  url.searchParams.set("q", `name contains '${query.replace(/'/g, "\\'")}' and trashed = false`);
  url.searchParams.set("fields", "files(id, name, mimeType, webViewLink)");
  url.searchParams.set("supportsAllDrives", "true");
  url.searchParams.set("includeItemsFromAllDrives", "true");

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Drive searchFiles failed: ${err}`);
  }

  const data = (await res.json()) as { files?: any[] };
  return data.files || [];
}
