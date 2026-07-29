import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { FilesView } from "@/components/hrms/files-view";

export default async function FilesPage() {
  const session = await auth();
  if (!session?.user?.orgId) redirect("/login");

  return <FilesView />;
}
