import React from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LettersView } from "@/components/hrms/peopleplus/letters-view";

export default async function LettersPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return <LettersView />;
}
