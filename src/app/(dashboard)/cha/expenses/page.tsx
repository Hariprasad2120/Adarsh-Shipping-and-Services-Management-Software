import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/rbac";
import { listAllExpenses } from "@/modules/cha/service";
import { ExpensesClient } from "./expenses-client";

export default async function ChaExpensesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const orgId = session.user.orgId;
  if (!orgId) redirect("/setup");

  // Require expense management permission
  await requirePermission(session.user.id, "cha.expense.manage");

  const params = await searchParams;
  const status = typeof params.status === "string" ? params.status : undefined;
  const search = typeof params.search === "string" ? params.search : undefined;
  const isUrgent = params.isUrgent === "true" ? true : params.isUrgent === "false" ? false : undefined;

  const expenses = await listAllExpenses(orgId, { status, search, isUrgent });

  return (
    <ExpensesClient
      initialExpenses={JSON.parse(JSON.stringify(expenses))}
      filters={{ status, search, isUrgent }}
      currentUserId={session.user.id}
    />
  );
}
