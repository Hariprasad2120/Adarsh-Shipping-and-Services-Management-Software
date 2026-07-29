import { EmployeeInvitationAcceptance } from "./employee-invitation-acceptance";

export default async function EmployeeInvitationPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token = "" } = await searchParams;

  return <EmployeeInvitationAcceptance token={token} />;
}
