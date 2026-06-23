import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAuthorizationUrl } from "@/lib/workspace-oauth";
import Link from "next/link";
import { ArrowRight, Mail, Folder } from "lucide-react";

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

  // Check if user has an active Google Workspace Connection
  const connection = await db.googleWorkspaceConnection.findUnique({
    where: { userId: session.user.id }
  });

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

  // If connected, render the sub-views with standard Monolith shell wrapping layout (if navigation requires headers)
  return (
    <div className="flex flex-col space-y-6 w-full animate-page-enter">
      {/* Standard top navbar submenu specifically for Google Workspace components */}
      <div className="flex items-center space-x-1 border-b border-outline-variant bg-surface px-6 py-2 -mx-6 -mt-8 mb-4">
        <Link href="/communication" className="px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider text-on-surface-variant hover:text-[#00cec4] hover:bg-surface-container transition-colors">
          Workspace Home
        </Link>
        <Link href="/communication/mail" className="px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider text-on-surface-variant hover:text-[#00cec4] hover:bg-surface-container transition-colors">
          Mail
        </Link>
        <Link href="/communication/chat" className="px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider text-on-surface-variant hover:text-[#00cec4] hover:bg-surface-container transition-colors">
          Chat
        </Link>
        <Link href="/communication/job-spaces" className="px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider text-on-surface-variant hover:text-[#00cec4] hover:bg-surface-container transition-colors">
          Job Spaces
        </Link>
        <Link href="/communication/meetings" className="px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider text-on-surface-variant hover:text-[#00cec4] hover:bg-surface-container transition-colors">
          Meetings
        </Link>
        <Link href="/communication/calendar" className="px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider text-on-surface-variant hover:text-[#00cec4] hover:bg-surface-container transition-colors">
          Calendar
        </Link>
        <Link href="/communication/drive" className="px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider text-on-surface-variant hover:text-[#00cec4] hover:bg-surface-container transition-colors">
          Job Drive
        </Link>
        <Link href="/communication/search" className="px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider text-on-surface-variant hover:text-[#00cec4] hover:bg-surface-container transition-colors">
          Search
        </Link>
        <Link href="/communication/settings" className="px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider text-on-surface-variant hover:text-[#00cec4] hover:bg-surface-container transition-colors">
          Settings
        </Link>
      </div>

      <div className="flex-1">
        {children}
      </div>
    </div>
  );
}
