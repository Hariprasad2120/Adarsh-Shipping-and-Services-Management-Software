import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import {
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Server,
  Settings,
  Shield,
} from "lucide-react";
import { NotificationSettings } from "./notification-settings";
import { GoogleChatLiveViewSettings } from "../google-chat-live-view/_components/google-chat-live-view-settings";
import {
  CommunicationBadge,
  CommunicationButton,
  CommunicationField,
  CommunicationInput,
  CommunicationPanel,
  CommunicationPanelHeader,
  CommunicationTextarea,
} from "@/components/monolith";

export default async function CommunicationSettings() {
  const session = await auth();
  if (!session?.user) return null;

  const orgId = session.user.orgId!;
  let settings = await db.googleWorkspaceSetting.findUnique({
    where: { orgId },
  });

  if (!settings) {
    settings = await db.googleWorkspaceSetting.create({
      data: {
        orgId,
        workspaceDomain: "adarshshipping.in",
        automationUser: "no-reply@adarshshipping.in",
        jobSpaceNamingTemplate:
          "JOB-{jobNumber} | {customerName} | {serviceName}",
        jobFolderTemplate: [
          "01 Customer KYC",
          "02 Job Documents",
          "03 User Uploads",
          "04 Checklists",
          "05 Customs and CHA",
          "06 Invoices and Billing",
          "07 Correspondence",
          "08 Other Documents",
        ],
      },
    });
  }

  const connection = await db.googleWorkspaceConnection.findUnique({
    where: { userId: session.user.id },
  });

  async function saveSettingsAction(formData: FormData) {
    "use server";
    const activeSession = await auth();
    if (!activeSession?.user) throw new Error("Unauthorized");

    const extractDriveId = (input: string) => {
      if (!input) return null;
      const trimmed = input.trim();
      const match = trimmed.match(/\/folders\/([a-zA-Z0-9-_]+)/);
      return match?.[1] ?? trimmed;
    };

    const foldersValue = formData.get("jobFolderTemplate") as string;
    const folders = foldersValue
      ? foldersValue
          .split("\n")
          .map((folder) => folder.trim())
          .filter(Boolean)
      : [];

    await db.googleWorkspaceSetting.update({
      where: { orgId: activeSession.user.orgId! },
      data: {
        workspaceDomain:
          (formData.get("workspaceDomain") as string) ||
          "adarshshipping.in",
        automationUser:
          (formData.get("automationUser") as string) ||
          "no-reply@adarshshipping.in",
        sharedDriveId: extractDriveId(
          formData.get("sharedDriveId") as string,
        ),
        jobsRootFolderId: extractDriveId(
          formData.get("jobsRootFolderId") as string,
        ),
        jobSpaceNamingTemplate:
          (formData.get("jobSpaceNamingTemplate") as string) ||
          "JOB-{jobNumber} | {customerName} | {serviceName}",
        jobFolderTemplate: folders,
      },
    });

    await db.communicationAuditEvent.create({
      data: {
        orgId: activeSession.user.orgId!,
        userId: activeSession.user.id,
        action: "UPDATE_SETTINGS",
        details: "Updated Google Workspace settings and templates",
      },
    });

    revalidatePath("/communication/settings");
  }

  const reconnectAction = async () => {
    "use server";
    const { signIn } = await import("@/lib/auth");
    await signIn("google", { redirectTo: "/communication/settings" });
  };

  return (
    <div className="mnx-communication-settings-layout">
      <form
        action={saveSettingsAction}
        className="mnx-communication-settings-form"
      >
        <CommunicationPanel>
          <CommunicationPanelHeader
            eyebrow="Identity"
            title="Workspace domain"
            description="Control the approved OAuth domain and background automation identity."
            actions={<Shield aria-hidden="true" />}
          />
          <div className="mnx-communication-panel-body">
            <div className="mnx-communication-field-grid">
              <CommunicationField
                label="Approved workspace domain"
                hint="Only OAuth connections matching this domain are permitted."
                required
              >
                <CommunicationInput
                  type="text"
                  name="workspaceDomain"
                  defaultValue={settings.workspaceDomain}
                  placeholder="adarshshipping.in"
                  required
                />
              </CommunicationField>
              <CommunicationField
                label="Automation account"
                hint="Domain-wide delegation identity used by background provisioning."
                required
              >
                <CommunicationInput
                  type="email"
                  name="automationUser"
                  defaultValue={settings.automationUser}
                  placeholder="no-reply@adarshshipping.in"
                  required
                />
              </CommunicationField>
            </div>
          </div>
        </CommunicationPanel>

        <CommunicationPanel>
          <CommunicationPanelHeader
            eyebrow="Storage"
            title="Shared Drive"
            description="Set the corporate Drive and optional managed jobs root."
            actions={<Server aria-hidden="true" />}
          />
          <div className="mnx-communication-panel-body">
            <div className="mnx-communication-field-grid">
              <CommunicationField
                label="Google Shared Drive ID or URL"
                hint="Paste a Drive folder URL or its identifier."
              >
                <CommunicationInput
                  type="text"
                  name="sharedDriveId"
                  defaultValue={settings.sharedDriveId ?? ""}
                  placeholder="https://drive.google.com/drive/folders/..."
                />
              </CommunicationField>
              <CommunicationField
                label="Jobs root folder ID or URL"
                hint="Leave blank to let Monolith create a managed root."
              >
                <CommunicationInput
                  type="text"
                  name="jobsRootFolderId"
                  defaultValue={settings.jobsRootFolderId ?? ""}
                  placeholder="https://drive.google.com/drive/folders/..."
                />
              </CommunicationField>
            </div>
          </div>
        </CommunicationPanel>

        <CommunicationPanel>
          <CommunicationPanelHeader
            eyebrow="Provisioning"
            title="Job workspace templates"
            description="Define the naming pattern and category folders created for each job."
            actions={<Settings aria-hidden="true" />}
          />
          <div className="mnx-communication-panel-body">
            <CommunicationField
              label="Job space naming template"
              hint="Supported tags: {jobNumber}, {customerName}, and {serviceName}."
              required
            >
              <CommunicationInput
                type="text"
                name="jobSpaceNamingTemplate"
                defaultValue={settings.jobSpaceNamingTemplate}
                required
              />
            </CommunicationField>
            <CommunicationField
              label="Job folder structure"
              hint="Enter one automatically provisioned subfolder per line."
              required
            >
              <CommunicationTextarea
                name="jobFolderTemplate"
                defaultValue={
                  Array.isArray(settings.jobFolderTemplate)
                    ? (settings.jobFolderTemplate as string[]).join("\n")
                    : ""
                }
                rows={8}
                required
              />
            </CommunicationField>
          </div>
        </CommunicationPanel>

        <div className="mnx-communication-form-actions">
          <CommunicationButton type="submit" variant="primary">
            Save settings
          </CommunicationButton>
        </div>
      </form>

      <aside className="mnx-communication-settings-aside">
        <CommunicationPanel>
          <CommunicationPanelHeader
            eyebrow="OAuth"
            title="Connection health"
            actions={<RefreshCw aria-hidden="true" />}
          />
          <div className="mnx-communication-panel-body">
            {connection ? (
              <>
                <div className="mnx-communication-health">
                  {connection.status === "connected" ? (
                    <CheckCircle2 aria-hidden="true" />
                  ) : (
                    <AlertTriangle aria-hidden="true" />
                  )}
                  <span>
                    <strong>
                      {connection.status === "connected"
                        ? "Connection active"
                        : "Connection expired"}
                    </strong>
                    <small>{connection.googleEmail}</small>
                  </span>
                  <CommunicationBadge
                    variant={
                      connection.status === "connected"
                        ? "success"
                        : "warning"
                    }
                  >
                    {connection.status}
                  </CommunicationBadge>
                </div>
                <dl className="mnx-communication-detail-list">
                  <div>
                    <dt>Connected</dt>
                    <dd>
                      {new Date(connection.createdAt).toLocaleDateString()}
                    </dd>
                  </div>
                  <div>
                    <dt>Token expiry</dt>
                    <dd>
                      {new Date(connection.tokenExpiresAt).toLocaleTimeString(
                        "en-IN",
                        { hour: "2-digit", minute: "2-digit" },
                      )}
                    </dd>
                  </div>
                </dl>
                <div className="mnx-communication-scope-list">
                  {connection.scopes.map((scope) => (
                    <CommunicationBadge key={scope}>
                      {scope.split("/").pop()}
                    </CommunicationBadge>
                  ))}
                </div>
                <form action={reconnectAction}>
                  <CommunicationButton type="submit">
                    Reconnect account
                  </CommunicationButton>
                </form>
              </>
            ) : (
              <>
                <p>
                  No Google Workspace connection is linked to your profile.
                </p>
                <form action={reconnectAction}>
                  <CommunicationButton type="submit" variant="primary">
                    Link Google account
                  </CommunicationButton>
                </form>
              </>
            )}
          </div>
        </CommunicationPanel>

        <NotificationSettings />
        <GoogleChatLiveViewSettings
          enabled={settings.enableGoogleChatLiveView ?? false}
        />
      </aside>
    </div>
  );
}
