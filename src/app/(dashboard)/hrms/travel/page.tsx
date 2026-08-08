import { renderExpenseWorkspacePage } from "@/modules/expense/server/expense-workspace-page";

export default async function TravelPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return renderExpenseWorkspacePage({
    basePath: "/hrms/travel",
    enforceChaAccess: false,
    searchParams,
  });
}
