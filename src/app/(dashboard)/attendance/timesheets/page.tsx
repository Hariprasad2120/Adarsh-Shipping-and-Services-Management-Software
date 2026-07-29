import { getSession } from "@/lib/auth";
import { PeopleNotice } from "@/components/monolith/people-workspace";
import { redirect } from "next/navigation";
import { Clock } from "lucide-react";

export default async function TimesheetsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <PeopleNotice
      eyebrow="Planned capability"
      title="Timesheets coming soon"
      description="Weekly timesheet submission and approval will be available here."
      icon={<Clock aria-hidden="true" />}
    />
  );
}
