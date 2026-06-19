import React from "react";
import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/rbac";
import { getAccount } from "@/modules/crm/service";
import { AccountForm } from "../../account-form";
import { ShieldAlert } from "lucide-react";

interface EditAccountPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditAccountPage({ params }: EditAccountPageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const orgId = session.user.orgId;
  if (!orgId) {
    return (
      <div className="p-8 text-center text-red-400">
        <ShieldAlert className="size-12 mx-auto mb-4" />
        <h2 className="text-xl font-bold">Configuration Error</h2>
        <p className="text-sm mt-1">Missing organisation context.</p>
      </div>
    );
  }

  // Permission check
  try {
    await requirePermission(session.user.id, "crm.account.manage");
  } catch (e) {
    return (
      <div className="p-8 text-center text-red-400">
        <ShieldAlert className="size-12 mx-auto mb-4" />
        <h2 className="text-xl font-bold">Access Denied</h2>
        <p className="text-sm mt-1">You do not have permission to edit accounts.</p>
      </div>
    );
  }

  const { id } = await params;
  const account = await getAccount(orgId, id);
  if (!account) notFound();

  // Fetch users for ownership
  const employees = await db.user.findMany({
    where: { orgId },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="p-8 space-y-6 max-w-5xl mx-auto">
      <AccountForm initialData={account} employees={employees} />
    </div>
  );
}
