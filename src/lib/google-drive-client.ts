import { db } from "@/lib/db";
import { getValidAccessToken } from "./workspace-oauth";

const SHARED_DRIVE_ID = process.env.GOOGLE_SHARED_DRIVE_ID || "";

/**
 * Get a valid Drive access token by finding the first connected Google Workspace user
 * in the org and refreshing their OAuth token. No service account needed.
 */
async function getDriveAccessToken(): Promise<string> {
  // Find any connected Google Workspace user to act as the Drive API caller
  const connection = await db.googleWorkspaceConnection.findFirst({
    where: { status: "connected" },
    orderBy: { createdAt: "asc" },
    select: { userId: true }
  });

  if (!connection) {
    throw new Error(
      "No connected Google Workspace account found. Please go to Communication > Settings and link a Google account."
    );
  }

  return getValidAccessToken(connection.userId);
}

// Create a new folder
export async function createFolder(params: {
  name: string;
  parentFolderId?: string;
  accessToken?: string;
}): Promise<string> {
  const token = params.accessToken || (await getDriveAccessToken());

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
export async function listFiles(
  parentFolderId: string,
  accessToken?: string
): Promise<{
  id: string;
  name: string;
  mimeType: string;
  size?: number;
  webViewLink?: string;
}[]> {
  if (
    !accessToken &&
    parentFolderId.startsWith("mock-")
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

  const token = accessToken || (await getDriveAccessToken());

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
  accessToken?: string;
}): Promise<{ id: string; webViewLink: string }> {
  const token = params.accessToken || (await getDriveAccessToken());

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
export async function searchFiles(
  query: string,
  accessToken?: string
): Promise<{
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
}[]> {
  const token = accessToken || (await getDriveAccessToken());

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
