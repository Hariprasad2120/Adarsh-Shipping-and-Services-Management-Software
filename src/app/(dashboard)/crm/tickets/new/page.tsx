import { CrmButton } from "@/components/monolith/crm-workspace";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { redirect } from "next/navigation";
import { TicketForm } from "../ticket-form";
import Link from "next/link";
import { ArrowLeft} from "lucide-react";

export const metadata = {
  title: "Raise Support Ticket | CRM | Adarsh Shipping",
};

export default async function RaiseTicketPage() {
  const session = await auth();
  if (!session) redirect("/login");

  await requirePermission(session.user.id, "crm.access");

  return (
    <div className="space-y-6">
      <div>
        <Link href="/crm/tickets" passHref>
          <CrmButton className="flex items-center gap-2 text-sm font-semibold text-mono-muted hover:text-mono-muted dark:hover:text-mono-text transition">
            <ArrowLeft className="size-4" /> Back to Support Tickets
          </CrmButton>
        </Link>
      </div>

      <TicketForm defaultOpen={true} />
    </div>
  );
}
