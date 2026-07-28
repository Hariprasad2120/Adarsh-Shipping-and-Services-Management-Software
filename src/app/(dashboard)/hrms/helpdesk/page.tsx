import React from "react";
import { auth } from "@/lib/auth";
import { PeopleNotice } from "@/components/monolith/people-workspace";
import { redirect } from "next/navigation";
import { HelpCircle } from "lucide-react";

export default async function HelpDeskPage() {
  const session = await auth();
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
