import { WelcomeBar } from "@/components/welcome-bar";

export function DashboardShell({
  children,
  userName,
  sessionToken,
}: {
  children: React.ReactNode;
  userName: string;
  sessionToken: string;
}) {
  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-6 px-8 py-7">
      <WelcomeBar userName={userName} sessionToken={sessionToken} />
      <div className="flex-1">{children}</div>
    </div>
  );
}
