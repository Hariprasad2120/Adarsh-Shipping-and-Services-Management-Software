import React from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { HelpCircle } from "lucide-react";

export default async function HelpDeskPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="text-sm font-semibold p-8 bg-mono-card text-mono-text border border-mono-border/35 rounded-2xl shadow-ambient text-center max-w-lg mx-auto mt-12 space-y-4">
      <div className="flex justify-center">
        <HelpCircle className="size-10 text-mono-accent" />
      </div>
      <p className="font-bold uppercase tracking-wider text-xs text-mono-muted">HR query help desk</p>
      <p className="text-xs text-mono-muted">
        HR Query cases can be raised from the Top-Nav ask button.
      </p>
    </div>
  );
}
