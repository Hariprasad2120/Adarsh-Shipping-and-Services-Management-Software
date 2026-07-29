import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { FilesView } from "@/components/hrms/files-view";

export default async function FilesPage() {
  const session = await getSession();
  if (!session?.user?.orgId) redirect("/login");

  return <FilesView />;
}
