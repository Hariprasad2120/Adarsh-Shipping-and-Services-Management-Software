import React from "react";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LetterPreparationPage } from "@/modules/hrms/components/letter-preparation-page";

export default async function HrLettersPreparePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return <LetterPreparationPage />;
}
