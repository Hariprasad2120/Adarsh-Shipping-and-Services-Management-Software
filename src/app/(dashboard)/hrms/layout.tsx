import { PeopleWorkspaceFrame } from "@/modules/people/components/people-workspace";

export default function HrmsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PeopleWorkspaceFrame>{children}</PeopleWorkspaceFrame>;
}
