import { PeopleWorkspaceFrame } from "@/components/monolith/people-workspace";

export default function HrmsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PeopleWorkspaceFrame>{children}</PeopleWorkspaceFrame>;
}
