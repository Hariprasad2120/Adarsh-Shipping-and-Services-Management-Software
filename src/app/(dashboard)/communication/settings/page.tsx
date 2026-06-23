import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { CheckCircle2, AlertTriangle, Shield, Settings, Server, RefreshCw } from "lucide-react";

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

    const folders = foldersRaw
      ? foldersRaw.split("\n").map(f => f.trim()).filter(Boolean)
      : [];

    await db.googleWorkspaceSetting.update({
      where: { orgId: sess.user.orgId! },
      data: {
        workspaceDomain: domain || "adarshshipping.in",
        automationUser: automation || "no-reply@adarshshipping.in",
        sharedDriveId: driveId || null,
        jobsRootFolderId: rootId || null,
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
        <span className="text-[10px] uppercase font-bold tracking-widest text-[#00cec4]">Module Administration</span>
        <h1 className="ds-h1 text-on-surface mt-1">Google Workspace Settings</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-left">
        {/* Left Column: Form Settings (Span 2) */}
        <div className="lg:col-span-2 space-y-6">
          <form action={saveSettingsAction} className="space-y-6">
            {/* Domain and Auth section */}
            <div className="ds-form-section space-y-4 rounded-xl border border-outline-variant bg-surface p-6 shadow-sm">
              <h2 className="ds-h2 text-on-surface flex items-center gap-2">
                <Shield size={18} className="text-[#00cec4]" />
                <span>Identity & Auth Domains</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="ds-label block mb-1">Approved Workspace Domain</label>
                  <input
                    type="text"
                    name="workspaceDomain"
                    defaultValue={settings.workspaceDomain}
                    className="w-full text-xs p-2.5 bg-surface border border-outline-variant rounded-xl focus:outline-none"
                    placeholder="adarshshipping.in"
                    required
                  />
                  <p className="text-[10px] text-on-surface-variant mt-1">
                    Only user OAuth connections matching this domain will be permitted.
                  </p>
                </div>

                <div>
                  <label className="ds-label block mb-1">Workspace Automation Account</label>
                  <input
                    type="email"
                    name="automationUser"
                    defaultValue={settings.automationUser}
                    className="w-full text-xs p-2.5 bg-surface border border-outline-variant rounded-xl focus:outline-none"
                    placeholder="no-reply@adarshshipping.in"
                    required
                  />
                  <p className="text-[10px] text-on-surface-variant mt-1">
                    DWD impersonated user for background provisioning pipelines.
                  </p>
                </div>
              </div>
            </div>

            {/* Storage Directories section */}
            <div className="ds-form-section space-y-4 rounded-xl border border-outline-variant bg-surface p-6 shadow-sm">
              <h2 className="ds-h2 text-on-surface flex items-center gap-2">
                <Server size={18} className="text-[#00cec4]" />
                <span>Shared Drive & Storage</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="ds-label block mb-1">Google Shared Drive ID</label>
                  <input
                    type="text"
                    name="sharedDriveId"
                    defaultValue={settings.sharedDriveId || ""}
                    className="w-full text-xs p-2.5 bg-surface border border-outline-variant rounded-xl focus:outline-none"
                    placeholder="0AI..."
                  />
                  <p className="text-[10px] text-on-surface-variant mt-1">
                    Shared Drive ID designated for corporate storage.
                  </p>
                </div>

                <div>
                  <label className="ds-label block mb-1">Jobs Root Folder ID</label>
                  <input
                    type="text"
                    name="jobsRootFolderId"
                    defaultValue={settings.jobsRootFolderId || ""}
                    className="w-full text-xs p-2.5 bg-surface border border-outline-variant rounded-xl focus:outline-none"
                    placeholder="1fh..."
                  />
                  <p className="text-[10px] text-on-surface-variant mt-1">
                    Parent folder ID where new Job workspaces will be created.
                  </p>
                </div>
              </div>
            </div>

            {/* Naming and templates */}
            <div className="ds-form-section space-y-4 rounded-xl border border-outline-variant bg-surface p-6 shadow-sm">
              <h2 className="ds-h2 text-on-surface flex items-center gap-2">
                <Settings size={18} className="text-[#00cec4]" />
                <span>Job Provisioning Templates</span>
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="ds-label block mb-1">Job Space Naming Template</label>
                  <input
                    type="text"
                    name="jobSpaceNamingTemplate"
                    defaultValue={settings.jobSpaceNamingTemplate}
                    className="w-full text-xs p-2.5 bg-surface border border-outline-variant rounded-xl focus:outline-none"
                    placeholder="JOB-{jobNumber} | {customerName}"
                    required
                  />
                  <p className="text-[10px] text-on-surface-variant mt-1">
                    Supported tags: <code className="text-[#00cec4]">{`{jobNumber}`}</code>, <code className="text-[#00cec4]">{`{customerName}`}</code>, <code className="text-[#00cec4]">{`{serviceName}`}</code>.
                  </p>
                </div>

                <div>
                  <label className="ds-label block mb-1">Job Folders Structure (One per line)</label>
                  <textarea
                    name="jobFolderTemplate"
                    defaultValue={
                      Array.isArray(settings.jobFolderTemplate)
                        ? (settings.jobFolderTemplate as string[]).join("\n")
                        : ""
                    }
                    rows={6}
                    className="w-full text-xs p-2.5 bg-surface border border-outline-variant rounded-xl focus:outline-none"
                    required
                  />
                  <p className="text-[10px] text-on-surface-variant mt-1">
                    Automatic subfolders structure provisioned in Drive for each new Job.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="bg-[#00cec4] text-white hover:bg-[#00b8af] hover:shadow-[0_0_0_3px_rgba(0,206,196,0.25)] px-6 py-3 rounded-xl text-xs uppercase font-bold tracking-wider transition-all"
              >
                Save Settings
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: API Connection Health Card */}
        <div className="space-y-6">
          <div className="rounded-xl border border-outline-variant bg-surface p-6 shadow-sm space-y-4">
            <h3 className="ds-h3 text-on-surface flex items-center gap-2">
              <RefreshCw size={16} className="text-[#00cec4]" />
              <span>OAuth Connection Health</span>
            </h3>

            {connection ? (
              <div className="space-y-4">
                <div className="flex items-center space-x-3 p-3 bg-surface-container-low border border-outline-variant rounded-xl">
                  {connection.status === "connected" ? (
                    <>
                      <CheckCircle2 size={20} className="text-[#00cec4] shrink-0" />
                      <div>
                        <span className="text-xs font-bold text-on-surface uppercase block">Connection Active</span>
                        <span className="text-[10px] text-on-surface-variant block">{connection.googleEmail}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <AlertTriangle size={20} className="text-[#fb923c] shrink-0" />
                      <div>
                        <span className="text-xs font-bold text-on-surface uppercase block">Connection Expired</span>
                        <span className="text-[10px] text-on-surface-variant block">Action Required: Reconnect account</span>
                      </div>
                    </>
                  )}
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between border-b border-outline-variant/30 py-1">
                    <span className="text-on-surface-variant">Connected At:</span>
                    <span className="text-on-surface ds-numeric">{new Date(connection.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between border-b border-outline-variant/30 py-1">
                    <span className="text-on-surface-variant">Token Expiry:</span>
                    <span className="text-on-surface ds-numeric">
                      {new Date(connection.tokenExpiresAt).toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1 border-b border-outline-variant/30 py-1.5">
                    <span className="text-on-surface-variant">Authorized Scopes:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {connection.scopes.map((s, idx) => (
                        <span key={idx} className="text-[8px] bg-surface-container border border-outline-variant px-1.5 py-0.5 rounded text-on-surface-variant truncate max-w-[120px]">
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
                    className="inline-flex w-full items-center justify-center border border-outline-variant hover:bg-surface-container-low px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider font-bold transition-all text-on-surface cursor-pointer"
                  >
                    Reconnect Account
                  </button>
                </form>
              </div>
            ) : (
              <div className="text-center py-6 space-y-3">
                <AlertTriangle size={36} className="text-[#fb923c] mx-auto" />
                <p className="text-xs text-on-surface-variant max-w-[200px] mx-auto">
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
                    className="inline-flex bg-[#00cec4] text-white hover:bg-[#00b8af] px-4 py-2 rounded-xl text-xs uppercase tracking-wider font-bold transition-all cursor-pointer"
                  >
                    Link Google Account
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
