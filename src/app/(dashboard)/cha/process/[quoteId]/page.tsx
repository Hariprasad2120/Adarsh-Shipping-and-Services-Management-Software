import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { getCreateJobOptions } from "@/modules/cha/jobs/queries";
import { getQuoteProcessRecord } from "@/modules/crm/quote-process";
import { ChaProcessJobClient } from "./cha-process-job-client";

export default async function ChaProcessDetailPage({
  params,
}: {
  params: Promise<{ quoteId: string }>;
}) {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const orgId = session.user.orgId;
  if (!orgId) redirect("/setup");

  const allowed = await can(session.user.id, "cha.job.create");
  if (!allowed) redirect("/cha/process");

  const { quoteId } = await params;
  const [quote, options] = await Promise.all([
    getQuoteProcessRecord(orgId, quoteId),
    getCreateJobOptions(orgId),
  ]);

  if (!quote || quote.workflowContext?.conversion?.chaStatus !== "PROCESSING_PENDING") {
    notFound();
  }

  return (
    <ChaProcessJobClient
      currentUserId={session.user.id}
      options={options}
      quoteId={quote.id}
      initialValues={{
        title: `${quote.customerName} - ${quote.quoteNumber}`,
        customerId: quote.customerId || "",
        customerRef: quote.referenceNumber,
        primaryOwnerId: quote.ownerId || session.user.id,
        assignedManagerId: "",
        remarks: `Created from approved quotation ${quote.quoteNumber}.`,
        estimatedClosureDate: "",
      }}
    />
  );
}
