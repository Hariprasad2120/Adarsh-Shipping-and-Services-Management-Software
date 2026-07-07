import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ShowcaseClient } from "./showcase-client";

export const metadata = {
  title: "CHA UI Showcase — Monolith Engine",
};

/**
 * Temporary internal review page. Displays every visual element / CSS pattern
 * currently used inside the CHA module so the design owner can decide what to
 * keep, merge, or drop. Read-only: does not import or affect any CHA module
 * code. Companion document: /cha-ui-elements-audit.md (project root).
 */
export default async function ChaUiShowcasePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!session.user.orgId) redirect("/setup");

  return <ShowcaseClient />;
}
