import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { loadCaps } from "@/lib/rbac";
import { CapsProvider } from "@/lib/caps-context";
import { SessionProvider } from "next-auth/react";

export default async function CommunicationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const caps = await loadCaps(session.user.id);

  // We enforce basic permission check if required, or allow all authenticated users
  // to access the general shell. Individual features (like mail/chat/admin) are gated.
  return (
    <SessionProvider session={session}>
      <CapsProvider value={caps}>
        <div className="flex flex-1 flex-col h-full min-h-0 bg-background text-on-surface">
          {children}
        </div>
      </CapsProvider>
    </SessionProvider>
  );
}

