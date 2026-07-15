import Link from "next/link";
import { requirePortalSession } from "@/modules/customer-portal/auth";
import {
  getPortalShipmentDetail,
  listPortalRatingCategories,
} from "@/modules/customer-portal/service";
import {
  PortalChecklistActionForm,
  PortalDocumentUploadForm,
  PortalQueryReplyForm,
  PortalRatingForm,
} from "../../_components/client-actions";

type PortalRequirementView = {
  id: string;
  name: string;
  customerSubmissions: Array<{
    status: string;
    reviewerComment?: string | null;
    versions?: Array<{ id: string }>;
  }>;
};

type PortalThreadView = {
  id: string;
  title: string;
  description: string;
  requiresCustomerAction: boolean;
  messages: Array<{ id: string; body: string }>;
};

export default async function CustomerPortalShipmentDetailPage({
  params,
}: {
  params: Promise<{ shipmentId: string }>;
}) {
  const session = await requirePortalSession();
  const { shipmentId } = await params;
  const detail = await getPortalShipmentDetail(session.portalUserId, shipmentId);
  const ratingCategories = await listPortalRatingCategories(session.portalUserId);
  const ratingSubmitted = detail.job.shipmentRatings.some(
    (rating: { portalUserId: string }) => rating.portalUserId === session.portalUserId,
  );
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-outline-variant/60 bg-surface p-6 shadow-sm">
        <p className="ds-label">{detail.job.jobNumber}</p>
        <h2 className="ds-h2 mt-2">{detail.job.title}</h2>
        <p className="mt-2 text-sm text-on-surface-variant">
          {detail.currentStage?.label ?? detail.job.stage} • {detail.job.shipmentType?.name ?? "Shipment"} • {detail.job.jobType?.name ?? "CHA"}
        </p>
      </section>

      <section className="rounded-xl border border-outline-variant/60 bg-surface p-5 shadow-sm">
        <h3 className="ds-h3">Progress Tracker</h3>
        <div className="mt-4 grid gap-3">
          {detail.stageMappings.map((stage: { id: string; internalStageKey: string; sortOrder: number; label: string; description?: string | null }) => {
            const active = stage.internalStageKey === detail.job.stage;
            return (
              <div key={stage.id} className={`rounded-xl border p-4 ${active ? "border-[#00cec4]/60 bg-[#00cec4]/10" : "border-outline-variant/60"}`}>
                <p className="ds-label">{stage.sortOrder}</p>
                <p className="mt-1 text-sm font-medium">{stage.label}</p>
                <p className="mt-1 text-xs text-on-surface-variant">{stage.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-xl border border-outline-variant/60 bg-surface p-5 shadow-sm">
          <h3 className="ds-h3">Requested Documents</h3>
          <div className="mt-4 space-y-4">
            {detail.job.documentRequirements.map((requirement: PortalRequirementView) => {
              const submission = requirement.customerSubmissions[0];
              const latestVersion = submission?.versions?.[0];
              return (
                <div key={requirement.id} className="rounded-xl border border-outline-variant/60 p-4">
                  <p className="text-sm font-medium">{requirement.name}</p>
                  <p className="mt-1 text-xs text-on-surface-variant">
                    {submission?.status ?? "NOT_UPLOADED"} {submission?.reviewerComment ? `• ${submission.reviewerComment}` : ""}
                  </p>
                  {latestVersion ? (
                    <Link
                      href={`/api/customer-portal/document-versions/${latestVersion.id}`}
                      className="mt-3 inline-block text-sm text-[#00cec4] hover:underline"
                    >
                      Preview latest upload
                    </Link>
                  ) : null}
                  <div className="mt-3">
                    <PortalDocumentUploadForm jobId={detail.job.id} requirementId={requirement.id} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-6">
          {detail.job.checklistWorkflow ? (
            <div className="rounded-xl border border-outline-variant/60 bg-surface p-5 shadow-sm">
              <h3 className="ds-h3">Checklist Approval</h3>
              <p className="mt-2 text-sm text-on-surface-variant">
                Status: {detail.job.checklistWorkflow.status}
              </p>
              {detail.job.checklistWorkflow.currentFileVersion ? (
                <Link
                  href={`/api/customer-portal/checklist-files/${detail.job.checklistWorkflow.currentFileVersion.id}`}
                  className="mt-3 inline-block text-sm text-[#00cec4] hover:underline"
                >
                  Preview current checklist
                </Link>
              ) : null}
              {detail.actions.checklistPending ? (
                <div className="mt-4">
                  <PortalChecklistActionForm jobId={detail.job.id} checklistId={detail.job.checklistWorkflow.id} />
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="rounded-xl border border-outline-variant/60 bg-surface p-5 shadow-sm">
            <h3 className="ds-h3">Queries</h3>
            <div className="mt-4 space-y-4">
              {detail.job.customerQueryThreads.length === 0 ? (
                <p className="text-sm text-on-surface-variant">No queries have been raised for this shipment.</p>
              ) : (
                detail.job.customerQueryThreads.map((thread: PortalThreadView) => (
                  <div key={thread.id} className="rounded-xl border border-outline-variant/60 p-4">
                    <p className="text-sm font-medium">{thread.title}</p>
                    <p className="mt-1 text-xs text-on-surface-variant">{thread.description}</p>
                    <div className="mt-3 space-y-2">
                      {thread.messages.map((message) => (
                        <div key={message.id} className="rounded-lg bg-surface-container-low p-3 text-sm">
                          {message.body}
                        </div>
                      ))}
                    </div>
                    {thread.requiresCustomerAction ? (
                      <div className="mt-3">
                        <PortalQueryReplyForm threadId={thread.id} />
                      </div>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      {(detail.job.status === "COMPLETED" || detail.job.stage === "FILED") && !ratingSubmitted ? (
        <section className="rounded-xl border border-outline-variant/60 bg-surface p-5 shadow-sm">
          <h3 className="ds-h3">Service Rating</h3>
          <div className="mt-4">
            <PortalRatingForm
              jobId={detail.job.id}
              categories={ratingCategories.map((category) => ({ key: category.key, label: category.label }))}
            />
          </div>
        </section>
      ) : null}
    </div>
  );
}
