import React from "react";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LettersView } from "@/components/hrms/letters-view";

export default async function LettersPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return <LettersView />;
}
