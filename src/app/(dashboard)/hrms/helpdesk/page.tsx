import React from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { HelpCircle } from "lucide-react";

export default async function HelpDeskPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="text-sm font-semibold p-8 bg-surface text-on-surface border border-outline-variant/35 rounded-2xl shadow-ambient text-center max-w-lg mx-auto mt-12 space-y-4">
      <div className="flex justify-center">
        <HelpCircle className="size-10 text-primary" />
      </div>
      <p className="font-bold uppercase tracking-wider text-xs text-on-surface-variant">HR query help desk</p>
      <p className="text-xs text-on-surface-variant">
        HR Query cases can be raised from the Top-Nav ask button.
      </p>
    </div>
  );
}
