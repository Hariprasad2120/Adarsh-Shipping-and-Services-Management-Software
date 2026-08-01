import React from "react";
import { getSession } from "@/lib/auth";
import { PeopleNotice } from "@/modules/people/components/people-workspace";
import { redirect } from "next/navigation";
import { HelpCircle } from "lucide-react";

export default async function HelpDeskPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <PeopleNotice
      eyebrow="HR query help desk"
      title="Ask HR from the application header"
      description="HR query cases can be raised from the Ask action in the application header."
      icon={<HelpCircle aria-hidden="true" />}
    />
  );
}
