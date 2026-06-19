import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { CrmWorkspacePage } from "../_components/crm-workspace-page";

interface CatchAllPageProps {
  params: Promise<{ slug: string[] }>;
}

export default async function CrmCatchAllPage({ params }: CatchAllPageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { slug } = await params;
  return <CrmWorkspacePage slug={slug[0] || "workspace"} />;
}
