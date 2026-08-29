import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { can, requirePermission } from "@/lib/rbac";
import { listAllExpenses, listExpenseJobOptions } from "@/modules/cha/service";
import { ExpensesClient } from "@/modules/cha/components";

export async function renderExpenseWorkspacePage({
  basePath,
  enforceChaAccess = true,
  searchParams,
}: {
  basePath: string;
  enforceChaAccess?: boolean;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const orgId = session.user.orgId;
  if (!orgId) redirect("/setup");

  if (enforceChaAccess) {
    await requirePermission(session.user.id, "cha.access");
  }

  const params = searchParams ? await searchParams : {};
  const status = typeof params.status === "string" ? params.status : undefined;
  const search = typeof params.search === "string" ? params.search : undefined;
  const isUrgent =
    params.isUrgent === "true"
      ? true
      : params.isUrgent === "false"
        ? false
        : undefined;

  const [canManageExpenses, canPayExpenses, canCreateExpenses] = await Promise.all([
    can(session.user.id, "cha.expense.manage"),
    can(session.user.id, "cha.expense.pay"),
    can(session.user.id, "cha.expense.request"),
  ]);
  const [expenses, jobOptions] = await Promise.all([
    listAllExpenses(
      orgId,
      { status, search, isUrgent },
      {
        userId: session.user.id,
        canViewAll: canManageExpenses || canPayExpenses,
      },
    ),
    listExpenseJobOptions(orgId),
  ]);

  return (
    <ExpensesClient
      initialExpenses={JSON.parse(JSON.stringify(expenses))}
      filters={{ status, search, isUrgent }}
      currentUserId={session.user.id}
      canManageExpenses={canManageExpenses}
      canPayExpenses={canPayExpenses}
      canCreateExpenses={canCreateExpenses}
      jobOptions={JSON.parse(JSON.stringify(jobOptions))}
      basePath={basePath}
    />
  );
}
