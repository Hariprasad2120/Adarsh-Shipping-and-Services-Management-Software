import { redirect } from "next/navigation";

interface SearchParams {
  search?: string;
  status?: string;
  portal?: string;
  balance?: string;
}

export default async function CrmCustomersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const query = new URLSearchParams();

  if (params.search?.trim()) query.set("search", params.search.trim());
  if (params.status?.trim()) query.set("status", params.status.trim());
  if (params.portal?.trim()) query.set("portal", params.portal.trim());
  if (params.balance?.trim()) query.set("balance", params.balance.trim());

  redirect(
    query.size > 0 ? `/cha/customers?${query.toString()}` : "/cha/customers",
  );
}
