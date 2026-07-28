import { PeopleWorkspaceFrame } from "@/components/monolith/people-workspace";

export default function AttendanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PeopleWorkspaceFrame>{children}</PeopleWorkspaceFrame>;
}
