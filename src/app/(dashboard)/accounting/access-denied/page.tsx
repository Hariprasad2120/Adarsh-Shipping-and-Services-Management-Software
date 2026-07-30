import { ShieldAlert } from "lucide-react";

import {
  AccountingActionLink,
  AccountingState,
} from "@/components/monolith/accounting-workspace";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AccountingAccessDeniedPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");
  return (
    <AccountingState
      variant="danger"
      icon={<ShieldAlert aria-hidden="true" />}
      eyebrow="Accounting access"
      title="Permission required"
      description="Your current role does not permit access to that Accounting workspace. No financial data was loaded."
      action={
        <AccountingActionLink href="/dashboard">
          Return to dashboard
        </AccountingActionLink>
      }
    />
  );
}
