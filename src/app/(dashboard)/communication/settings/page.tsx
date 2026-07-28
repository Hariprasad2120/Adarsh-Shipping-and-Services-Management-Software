import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { CheckCircle2, AlertTriangle, Shield, Settings, Server, RefreshCw, Bell } from "lucide-react";
import { NotificationSettings } from "./notification-settings";
import { GoogleChatLiveViewSettings } from "../google-chat-live-view/_components/google-chat-live-view-settings";

export default async function CommunicationSettings() {
  const session = await auth();
  if (!session?.user) return null;

  const orgId = session.user.orgId!;
  
  // Load or create default settings
  let settings = await db.googleWorkspaceSetting.findUnique({
    where: { orgId }
  });

  if (!settings) {
    settings = await db.googleWorkspaceSetting.create({
      data: {
        orgId,
        workspaceDomain: "adarshshipping.in",
        automationUser: "no-reply@adarshshipping.in",
        jobSpaceNamingTemplate: "JOB-{jobNumber} | {customerName} | {serviceName}",
        jobFolderTemplate: [
          "01 Customer KYC",
          "02 Job Documents",
          "03 User Uploads",
          "04 Checklists",
          "05 Customs and CHA",
          "06 Invoices and Billing",
          "07 Correspondence",
          "08 Other Documents"
        ]
      }
    });
  }

  // Get active connection status for the current user
  const connection = await db.googleWorkspaceConnection.findUnique({
    where: { userId: session.user.id }
  });

  // Server Action to save settings
  async function saveSettingsAction(formData: FormData) {
    "use server";
    
    const sess = await auth();
    if (!sess?.user) throw new Error("Unauthorized");
    
    const domain = formData.get("workspaceDomain") as string;
    const automation = formData.get("automationUser") as string;
    const driveId = formData.get("sharedDriveId") as string;
    const rootId = formData.get("jobsRootFolderId") as string;
    const naming = formData.get("jobSpaceNamingTemplate") as string;
    const foldersRaw = formData.get("jobFolderTemplate") as string;

    const extractDriveId = (input: string) => {
      if (!input) return null;
      const trimmed = input.trim();
      const match = trimmed.match(/\/folders\/([a-zA-Z0-9-_]+)/);
      return match && match[1] ? match[1] : trimmed;
    };

    const driveIdParsed = extractDriveId(driveId);
    const rootIdParsed = extractDriveId(rootId);

    const folders = foldersRaw
      ? foldersRaw.split("\n").map(f => f.trim()).filter(Boolean)
      : [];

    await db.googleWorkspaceSetting.update({
      where: { orgId: sess.user.orgId! },
      data: {
        workspaceDomain: domain || "adarshshipping.in",
        automationUser: automation || "no-reply@adarshshipping.in",
        sharedDriveId: driveIdParsed,
        jobsRootFolderId: rootIdParsed,
        jobSpaceNamingTemplate: naming || "JOB-{jobNumber} | {customerName} | {serviceName}",
        jobFolderTemplate: folders
      }
    });

    // Audit Log Entry
    await db.communicationAuditEvent.create({
      data: {
        orgId: sess.user.orgId!,
        userId: sess.user.id,
        action: "UPDATE_SETTINGS",
        details: "Updated Google Workspace settings and templates"
      }
    });

    revalidatePath("/communication/settings");
  }

  return (
    <main className="space-y-8 pb-12">
      {/* Page Title */}
      <div>
        <span className="text-[10px] uppercase font-bold tracking-widest text-[#F9D972]">Module Administration</span>
        <h1 className="monolith-h1 text-mono-text mt-1">Google Workspace Settings</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-left">
        {/* Left Column: Form Settings (Span 2) */}
        <div className="lg:col-span-2 space-y-6">
          <form action={saveSettingsAction} className="space-y-6">
            {/* Domain and Auth section */}
            <div className="monolith-form-section space-y-4 rounded-xl border border-mono-border bg-mono-card p-6 shadow-sm">
              <h2 className="monolith-h2 text-mono-text flex items-center gap-2">
                <Shield size={18} className="text-[#F9D972]" />
                <span>Identity & Auth Domains</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="monolith-label block mb-1">Approved Workspace Domain</label>
                  <input
                    type="text"
                    name="workspaceDomain"
                    defaultValue={settings.workspaceDomain}
                    className="w-full text-xs p-2.5 bg-mono-card border border-mono-border rounded-xl focus:outline-none"
                    placeholder="adarshshipping.in"
                    required
                  />
                  <p className="text-[10px] text-mono-muted mt-1">
                    Only user OAuth connections matching this domain will be permitted.
                  </p>
                </div>

                <div>
                  <label className="monolith-label block mb-1">Workspace Automation Account</label>
                  <input
                    type="email"
                    name="automationUser"
                    defaultValue={settings.automationUser}
                    className="w-full text-xs p-2.5 bg-mono-card border border-mono-border rounded-xl focus:outline-none"
                    placeholder="no-reply@adarshshipping.in"
                    required
                  />
                  <p className="text-[10px] text-mono-muted mt-1">
                    DWD impersonated user for background provisioning pipelines.
                  </p>
                </div>
              </div>
            </div>

             {/* Storage Directories section */}
            <div className="monolith-form-section space-y-4 rounded-xl border border-mono-border bg-mono-card p-6 shadow-sm">
              <h2 className="monolith-h2 text-mono-text flex items-center gap-2">
                <Server size={18} className="text-[#F9D972]" />
                <span>Shared Drive & Storage</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="monolith-label block mb-1">Google Shared Drive ID or URL</label>
                  <input
                    type="text"
                    name="sharedDriveId"
                    defaultValue={settings.sharedDriveId || ""}
                    className="w-full text-xs p-2.5 bg-mono-card border border-mono-border rounded-xl focus:outline-none"
                    placeholder="https://drive.google.com/drive/folders/... or ID"
                  />
                  <p className="text-[10px] text-mono-muted mt-1">
                    Google Drive link or Shared Drive ID designated for corporate storage.
                  </p>
                </div>

                <div>
                  <label className="monolith-label block mb-1">Jobs Root Folder ID or URL</label>
                  <input
                    type="text"
                    name="jobsRootFolderId"
                    defaultValue={settings.jobsRootFolderId || ""}
                    className="w-full text-xs p-2.5 bg-mono-card border border-mono-border rounded-xl focus:outline-none"
                    placeholder="https://drive.google.com/drive/folders/... or ID"
                  />
                  <p className="text-[10px] text-mono-muted mt-1">
                    Google Drive link or Parent folder ID where new Job workspaces will be created. If left blank, Monolith creates a managed root folder inside the configured Shared Drive automatically.
                  </p>
                </div>
              </div>
            </div>

            {/* Naming and templates */}
            <div className="monolith-form-section space-y-4 rounded-xl border border-mono-border bg-mono-card p-6 shadow-sm">
              <h2 className="monolith-h2 text-mono-text flex items-center gap-2">
                <Settings size={18} className="text-[#F9D972]" />
                <span>Job Provisioning Templates</span>
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="monolith-label block mb-1">Job Space Naming Template</label>
                  <input
                    type="text"
                    name="jobSpaceNamingTemplate"
                    defaultValue={settings.jobSpaceNamingTemplate}
                    className="w-full text-xs p-2.5 bg-mono-card border border-mono-border rounded-xl focus:outline-none"
                    placeholder="JOB-{jobNumber} | {customerName}"
                    required
                  />
                  <p className="text-[10px] text-mono-muted mt-1">
                    Supported tags: <code className="text-[#F9D972]">{`{jobNumber}`}</code>, <code className="text-[#F9D972]">{`{customerName}`}</code>, <code className="text-[#F9D972]">{`{serviceName}`}</code>.
                  </p>
                </div>

                <div>
                  <label className="monolith-label block mb-1">Job Folders Structure (One per line)</label>
                  <textarea
                    name="jobFolderTemplate"
                    defaultValue={
                      Array.isArray(settings.jobFolderTemplate)
                        ? (settings.jobFolderTemplate as string[]).join("\n")
                        : ""
                    }
                    rows={6}
                    className="w-full text-xs p-2.5 bg-mono-card border border-mono-border rounded-xl focus:outline-none"
                    required
                  />
                  <p className="text-[10px] text-mono-muted mt-1">
                    Automatic subfolders structure provisioned in Drive for each new Job.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="bg-[#F9D972] text-white hover:bg-[#E8C85D] hover:shadow-[0_0_0_3px_rgba(0,206,196,0.25)] px-6 py-3 rounded-xl text-xs uppercase font-bold tracking-wider transition-all"
              >
                Save Settings
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: API Connection Health Card */}
        <div className="space-y-6">
          <div className="rounded-xl border border-mono-border bg-mono-card p-6 shadow-sm space-y-4">
            <h3 className="monolith-h3 text-mono-text flex items-center gap-2">
              <RefreshCw size={16} className="text-[#F9D972]" />
              <span>OAuth Connection Health</span>
            </h3>

            {connection ? (
              <div className="space-y-4">
                <div className="flex items-center space-x-3 p-3 bg-mono-soft border border-mono-border rounded-xl">
                  {connection.status === "connected" ? (
                    <>
                      <CheckCircle2 size={20} className="text-[#F9D972] shrink-0" />
                      <div>
                        <span className="text-xs font-bold text-mono-text uppercase block">Connection Active</span>
                        <span className="text-[10px] text-mono-muted block">{connection.googleEmail}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <AlertTriangle size={20} className="text-[#D88700] shrink-0" />
                      <div>
                        <span className="text-xs font-bold text-mono-text uppercase block">Connection Expired</span>
                        <span className="text-[10px] text-mono-muted block">Action Required: Reconnect account</span>
                      </div>
                    </>
                  )}
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between border-b border-mono-border/30 py-1">
                    <span className="text-mono-muted">Connected At:</span>
                    <span className="text-mono-text monolith-numeric">{new Date(connection.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between border-b border-mono-border/30 py-1">
                    <span className="text-mono-muted">Token Expiry:</span>
                    <span className="text-mono-text monolith-numeric">
                      {new Date(connection.tokenExpiresAt).toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1 border-b border-mono-border/30 py-1.5">
                    <span className="text-mono-muted">Authorized Scopes:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {connection.scopes.map((s, idx) => (
                        <span key={idx} className="text-[8px] bg-mono-soft border border-mono-border px-1.5 py-0.5 rounded text-mono-muted truncate max-w-[120px]">
                          {s.split("/").pop()}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <form
                  action={async () => {
                    "use server";
                    const { signIn } = await import("@/lib/auth");
                    await signIn("google", { redirectTo: "/communication/settings" });
                  }}
                  className="w-full"
                >
                  <button
                    type="submit"
                    className="inline-flex w-full items-center justify-center border border-mono-border hover:bg-mono-soft px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider font-bold transition-all text-mono-text cursor-pointer"
                  >
                    Reconnect Account
                  </button>
                </form>
              </div>
            ) : (
              <div className="text-center py-6 space-y-3">
                <AlertTriangle size={36} className="text-[#D88700] mx-auto" />
                <p className="text-xs text-mono-muted max-w-[200px] mx-auto">
                  You do not have an active Google Workspace Connection linked to your profile.
                </p>
                <form
                  action={async () => {
                    "use server";
                    const { signIn } = await import("@/lib/auth");
                    await signIn("google", { redirectTo: "/communication/settings" });
                  }}
                >
                  <button
                    type="submit"
                    className="inline-flex bg-[#F9D972] text-white hover:bg-[#E8C85D] px-4 py-2 rounded-xl text-xs uppercase tracking-wider font-bold transition-all cursor-pointer"
                  >
                    Link Google Account
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Chat Notification Preferences */}
          <NotificationSettings />

          {/* Experimental: Google Chat Live View toggle */}
          <GoogleChatLiveViewSettings enabled={settings.enableGoogleChatLiveView ?? false} />
        </div>
      </div>
    </main>
  );
}
