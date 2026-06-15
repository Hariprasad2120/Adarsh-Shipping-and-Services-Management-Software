import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/rbac";
import { BiometricSyncClient } from "./biometric-sync-client";

export const metadata = {
  title: "Biometric Sync | Attendance | Adarsh Shipping",
};

export default async function BiometricSyncPage() {
  const session = await auth();
  if (!session) redirect("/login");
  await requirePermission(session.user.id, "attendance.punch.manage");

  return (
    <div className="space-y-6">
      <h1 className="ds-h1 text-gray-900">Biometric Sync</h1>
      <BiometricSyncClient />
    </div>
  );
}
