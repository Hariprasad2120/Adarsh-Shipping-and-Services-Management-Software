import { renderExpenseWorkspacePage } from "@/modules/expense/server/expense-workspace-page";

export default async function ExpensePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return renderExpenseWorkspacePage({
    basePath: "/expense",
    enforceChaAccess: true,
    searchParams,
  });
}
