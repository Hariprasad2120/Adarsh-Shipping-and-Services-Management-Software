import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAuthorizationUrl } from "@/lib/workspace-oauth";
import Link from "next/link";
import { ArrowRight, Mail, Folder } from "lucide-react";
import CommunicationNavbar from "./_components/communication-navbar";
import { ChatProvider } from "./_components/chat-provider";

export default async function CommunicationLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <p className="text-on-surface-variant">Please log in to continue.</p>
      </div>
    );
  }

  // Parallelize workspace connection and settings fetch
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

  const isConnected = connection && connection.status === "connected";

  if (!isConnected) {
    // Render standard beautiful connect screen
    return (
      <main className="flex min-h-[75vh] flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-2xl text-center space-y-6">
          <div className="flex justify-center space-x-2">
            <span className="ds-icon-badge" style={{ background: "rgba(0, 206, 196, 0.15)", color: "#00cec4" }}>
              <Mail size={24} />
            </span>
            <span className="ds-icon-badge" style={{ background: "rgba(129, 140, 248, 0.15)", color: "#818cf8" }}>
              <Folder size={24} />
            </span>
          </div>

          <h1 className="ds-h1 font-family-[var(--font-kiona-sans)] text-on-surface">
            Connect Your Google Workspace
          </h1>

          <p className="text-on-surface-variant max-w-md mx-auto text-base">
            Integrate your Adarsh Shipping Monolith account with Gmail, Google Chat, Drive, and Calendar to manage logistics correspondence and job documents in one place.
          </p>

          {/* Value props grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left max-w-lg mx-auto py-6">
            <div className="flex items-start space-x-3 p-4 rounded-xl border border-outline-variant bg-surface shadow-sm">
              <span className="text-[#00cec4] shrink-0 mt-1">✓</span>
              <div>
                <h3 className="text-sm font-bold text-on-surface uppercase tracking-wide">Gmail Sync</h3>
                <p className="text-xs text-on-surface-variant">Link client emails to jobs and save attachments directly.</p>
              </div>
            </div>
            <div className="flex items-start space-x-3 p-4 rounded-xl border border-outline-variant bg-surface shadow-sm">
              <span className="text-[#00cec4] shrink-0 mt-1">✓</span>
              <div>
                <h3 className="text-sm font-bold text-on-surface uppercase tracking-wide">Google Chat Backbone</h3>
                <p className="text-xs text-on-surface-variant">Synchronized team workspaces, DMs, and automated job channels.</p>
              </div>
            </div>
            <div className="flex items-start space-x-3 p-4 rounded-xl border border-outline-variant bg-surface shadow-sm">
              <span className="text-[#00cec4] shrink-0 mt-1">✓</span>
              <div>
                <h3 className="text-sm font-bold text-on-surface uppercase tracking-wide">Shared Drive Folders</h3>
                <p className="text-xs text-on-surface-variant">Automatic generation of folders for KYC, customs bills, and invoices.</p>
              </div>
            </div>
            <div className="flex items-start space-x-3 p-4 rounded-xl border border-outline-variant bg-surface shadow-sm">
              <span className="text-[#00cec4] shrink-0 mt-1">✓</span>
              <div>
                <h3 className="text-sm font-bold text-on-surface uppercase tracking-wide">Calendar & Meet</h3>
                <p className="text-xs text-on-surface-variant">Schedule meetings with customers, with video links auto-provisioned.</p>
              </div>
            </div>
          </div>

          <div className="pt-4">
            <form
              action={async () => {
                "use server";
                const { signIn } = await import("@/lib/auth");
                await signIn("google", { redirectTo: "/communication" });
              }}
            >
              <button
                type="submit"
                className="inline-flex items-center space-x-2 bg-[#00cec4] text-white hover:bg-[#00b8af] hover:shadow-[0_0_0_3px_rgba(0,206,196,0.25)] px-6 py-3 rounded-xl text-sm font-medium uppercase tracking-wider transition-all cursor-pointer"
              >
                <span>Connect Google Workspace</span>
                <ArrowRight size={16} />
              </button>
            </form>
          </div>

          <p className="text-xs text-on-surface-variant">
            Restriction: Standard connections require an authorized <span className="font-semibold text-on-surface">@adarshshipping.in</span> account.
          </p>
        </div>
      </main>
    );
  }

  const showGoogleChatLiveView = workspaceSettings?.enableGoogleChatLiveView ?? false;

  // If connected, render the sub-views with standard Monolith shell wrapping layout (if navigation requires headers)
  return (
    <div className="flex flex-col w-full animate-page-enter">
      <CommunicationNavbar showGoogleChatLiveView={showGoogleChatLiveView} />

      <ChatProvider>
        <div className="flex-1">
          {children}
        </div>
      </ChatProvider>
    </div>
  );
}
