"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

/**
 * Toggle the experimental Google Chat Live View feature for the current org.
 * This is completely isolated — it only touches the enableGoogleChatLiveView
 * field in GoogleWorkspaceSetting and creates an audit event.
 *
 * Does NOT affect: Chat tab, sync jobs, OAuth, job-space creation.
 */
export async function toggleGoogleChatLiveView(enabled: boolean): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    const orgId = session.user.orgId;
    if (!orgId) {
      return { success: false, error: "No organization found" };
    }

    // Upsert: create settings row if it doesn't exist yet
    await db.googleWorkspaceSetting.upsert({
      where: { orgId },
      update: { enableGoogleChatLiveView: enabled },
      create: {
        orgId,
        workspaceDomain: "adarshshipping.in",
        automationUser: "no-reply@adarshshipping.in",
        jobSpaceNamingTemplate: "JOB-{jobNumber} | {customerName} | {serviceName}",
        enableGoogleChatLiveView: enabled,
      },
    });

    // Audit log — use existing CommunicationAuditEvent
    try {
      await db.communicationAuditEvent.create({
        data: {
          orgId,
          userId: session.user.id,
          action: "UPDATE_EXPERIMENTAL_SETTINGS",
          details: `Google Chat Live View experimental feature ${enabled ? "ENABLED" : "DISABLED"}`,
        },
      });
    } catch {
      // Audit failure is non-fatal
    }

    // Revalidate pages that depend on this setting
    revalidatePath("/communication");
    revalidatePath("/communication/settings");
    revalidatePath("/communication/google-chat-live-view");

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[GoogleChatLiveView] toggleGoogleChatLiveView error:", message);
    return { success: false, error: message };
  }
}

/**
 * Fetch the current Google Chat Live View setting for the session's org.
 * Returns false if not set.
 */
export async function getGoogleChatLiveViewSetting(): Promise<boolean> {
  try {
    const session = await auth();
    if (!session?.user?.orgId) return false;

    const settings = await db.googleWorkspaceSetting.findUnique({
      where: { orgId: session.user.orgId },
      select: { enableGoogleChatLiveView: true },
    });

    return settings?.enableGoogleChatLiveView ?? false;
  } catch {
    return false;
  }
}
