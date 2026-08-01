import { redirect } from "next/navigation";
interface EditAccountPageProps {
  params: Promise<{ id: string }>;
}

export default async function CrmEditAccountPage({ params }: EditAccountPageProps) {
  const { id } = await params;
  redirect(`/cha/customers/${id}/edit`);
}
