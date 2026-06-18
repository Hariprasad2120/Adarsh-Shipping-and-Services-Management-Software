import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NewQuotePage } from "../_components/NewQuotePage";

export default async function NewCrmQuotePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const orgId = session.user.orgId;
  if (!orgId) redirect("/login");

  const [dbUsers, dbAccounts] = await Promise.all([
    db.user.findMany({
      where: { orgId, active: true },
      select: { id: true, name: true, email: true },
    }),
    db.crmAccount.findMany({
      where: { orgId },
      select: { id: true, name: true, email: true, phone: true, billingAddress: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const salespersons = dbUsers.map((u) => ({
    id: u.id,
    label: u.name || u.email,
  }));

  const accounts = dbAccounts.map((a) => ({
    id: a.id,
    label: a.name,
    description: a.email ?? undefined,
    billingAddress: a.billingAddress ?? undefined,
    contactEmail: a.email ?? undefined,
    phone: a.phone ?? undefined,
  }));

  return <NewQuotePage salespersons={salespersons} accounts={accounts} />;
}
