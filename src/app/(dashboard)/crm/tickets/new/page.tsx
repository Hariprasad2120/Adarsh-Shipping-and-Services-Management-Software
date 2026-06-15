import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { redirect } from "next/navigation";
import { TicketForm } from "../ticket-form";
import Link from "next/link";
import { ArrowLeft, LifeBuoy } from "lucide-react";

export const metadata = {
  title: "Raise Support Ticket | CRM | Adarsh Shipping",
};

export default async function RaiseTicketPage() {
  const session = await auth();
  if (!session) redirect("/login");

  await requirePermission(session.user.id, "crm.access");

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <Link href="/crm/tickets" passHref>
          <button className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition">
            <ArrowLeft className="size-4" /> Back to Support Tickets
          </button>
        </Link>
      </div>

      <div className="space-y-1">
        <h1 className="ds-h1 flex items-center gap-4 text-gray-900 dark:text-white">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#00cec4]/10 text-[#00cec4]">
            <LifeBuoy className="size-5" />
          </span>
          Raise Support Ticket
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
          Create a support ticket to report an issue or request assistance.
        </p>
      </div>

      <TicketForm defaultOpen={true} />
    </div>
  );
}
