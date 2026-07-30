import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { ArrowRight, Link2 } from "lucide-react";
import { CommunicationWorkspaceFrame } from "@/modules/communication/components/workspace/communication-workspace";
import { WorkspaceAction, WorkspacePage, WorkspacePageHeader, WorkspaceState } from "@/components/layout/workspace";
import { ChatProvider } from "./_components/chat-provider";

export default async function CommunicationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session?.user) {
    return (
      <WorkspaceState
        variant="permission"
        eyebrow="Communication"
        title="Sign in required"
        description="Please sign in to use the connected communication workspace."
        icon={<Link2 aria-hidden="true" />}
      />
    );
  }

  const [connection, workspaceSettings] = await Promise.all([
    db.googleWorkspaceConnection.findUnique({
      where: { userId: session.user.id },
    }),
    session.user.orgId
      ? db.googleWorkspaceSetting.findUnique({
          where: { orgId: session.user.orgId },
          select: { enableGoogleChatLiveView: true },
        })
      : Promise.resolve(null),
  ]);

  if (!connection || connection.status !== "connected") {
    return (
      <WorkspacePage className="mnx-communication-page">
        <WorkspacePageHeader
          className="mnx-communication-page-header"
          eyebrow="Connected workspace"
          title="Connect Google Workspace"
          description="Link the authorised organisation account to use Gmail, Google Chat, Drive, Calendar, and Meet from one operational workspace."
          icon={<Link2 aria-hidden="true" />}
        />
        <WorkspaceState
          variant="empty"
          eyebrow="Connection required"
          title="Authorise the communication workspace"
          description="Standard connections require an authorised @adarshshipping.in account with the scopes needed for the enabled services."
          icon={<Link2 aria-hidden="true" />}
          action={
            <form
              action={async () => {
                "use server";
                const { signIn } = await import("@/lib/auth");
                await signIn("google", { redirectTo: "/communication" });
              }}
            >
              <WorkspaceAction type="submit" variant="primary">
                <span>Connect Google Workspace</span>
                <ArrowRight aria-hidden="true" />
              </WorkspaceAction>
            </form>
          }
        />
      </WorkspacePage>
    );
  }

  return (
    <CommunicationWorkspaceFrame
      showGoogleChatLiveView={
        workspaceSettings?.enableGoogleChatLiveView ?? false
      }
    >
      <ChatProvider>{children}</ChatProvider>
    </CommunicationWorkspaceFrame>
  );
}
