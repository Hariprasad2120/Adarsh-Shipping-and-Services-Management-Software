"use client";

import { Badge } from "@/components/monolith/badge";
import { Modal } from "@/components/monolith/modal";
import { CriteriaPointsView } from "@/components/ams/criteria-points-form";
import type {
  AppraisalSelfFormTemplate,
  ManagementReviewAnswers,
  ReviewerRatingAnswers,
  SelfAssessmentAnswers,
} from "@/modules/ams/criteria-config";
import type { CriterionPoint } from "@/modules/ams/types";

type SelfPreview = {
  answers: SelfAssessmentAnswers | null;
  editCount?: number;
  submittedAt?: string | null;
  updatedAt?: string | null;
};

type ReviewerPreview = {
  id: string;
  reviewerName: string;
  reviewerRole: string;
  status?: string | null;
  submittedAt?: string | null;
  updatedAt?: string | null;
  answers: ReviewerRatingAnswers | ManagementReviewAnswers | null;
};

type FormPreviewModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  appraisee: { name: string; designation: string | null };
  cycle: { name: string; year: number };
  selfTemplate?: AppraisalSelfFormTemplate;
  selfCriteria: CriterionPoint[];
  reviewerCriteria: CriterionPoint[];
  managementCriteria?: CriterionPoint[];
  selfPreview?: SelfPreview | null;
  reviewerPreviews?: ReviewerPreview[];
};

function MetaRow({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="mnx-label text-mono-muted">{label}</span>
      <span className="text-mono-text">{value || "-"}</span>
    </div>
  );
}

export function FormPreviewModal({
  open,
  onClose,
  title,
  appraisee,
  cycle,
  selfTemplate,
  selfCriteria,
  reviewerCriteria,
  managementCriteria,
  selfPreview,
  reviewerPreviews = [],
}: FormPreviewModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={`${appraisee.name} · ${appraisee.designation ?? "No designation"} · ${cycle.name} ${cycle.year}`}
    >
      <div className="space-y-6">
        <section className="grid gap-3 rounded-2xl border border-mono-border/35 bg-mono-soft p-4 md:grid-cols-2">
          <MetaRow label="Appraisee" value={appraisee.name} />
          <MetaRow label="Designation" value={appraisee.designation} />
          <MetaRow label="Cycle" value={`${cycle.name} ${cycle.year}`} />
          <MetaRow
            label="Forms"
            value={`${(selfPreview ? 1 : 0) + reviewerPreviews.length}`}
          />
        </section>

        {selfPreview ? (
          <section className="space-y-4 rounded-2xl border border-mono-border/35 bg-mono-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="mnx-title-3 text-mono-text">Self Assessment</h3>
                <p className="mt-1 text-sm text-mono-muted">
                  Employee submitted responses and self ratings.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">Employee</Badge>
                {selfPreview.submittedAt ? (
                  <Badge variant="success">Submitted</Badge>
                ) : (
                  <Badge variant="warning">Pending</Badge>
                )}
              </div>
            </div>
            <div className="grid gap-2 text-sm md:grid-cols-2">
              <MetaRow
                label="Last Updated"
                value={
                  selfPreview.updatedAt
                    ? new Date(selfPreview.updatedAt).toLocaleString("en-IN")
                    : null
                }
              />
              <MetaRow
                label="Submitted At"
                value={
                  selfPreview.submittedAt
                    ? new Date(selfPreview.submittedAt).toLocaleString("en-IN")
                    : null
                }
              />
            </div>
            <CriteriaPointsView
              criteria={selfCriteria}
              supplementary={[]}
              answers={selfPreview.answers}
              editCount={selfPreview.editCount}
              selfTemplate={selfTemplate}
            />
          </section>
        ) : null}

        {reviewerPreviews.map((preview) => {
          const criteria =
            preview.reviewerRole === "MANAGEMENT" && managementCriteria
              ? managementCriteria
              : reviewerCriteria;
          return (
            <section
              key={preview.id}
              className="space-y-4 rounded-2xl border border-mono-border/35 bg-mono-card p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="mnx-title-3 text-mono-text">
                    {preview.reviewerName}
                  </h3>
                  <p className="mt-1 text-sm text-mono-muted">
                    {preview.reviewerRole} form, ratings, comments, and edits.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">{preview.reviewerRole}</Badge>
                  {preview.status ? (
                    <Badge
                      variant={
                        preview.status === "SUBMITTED" ? "success" : "warning"
                      }
                    >
                      {preview.status}
                    </Badge>
                  ) : null}
                </div>
              </div>
              <div className="grid gap-2 text-sm md:grid-cols-2">
                <MetaRow label="Reviewer" value={preview.reviewerName} />
                <MetaRow label="Role" value={preview.reviewerRole} />
                <MetaRow
                  label="Last Updated"
                  value={
                    preview.updatedAt
                      ? new Date(preview.updatedAt).toLocaleString("en-IN")
                      : null
                  }
                />
                <MetaRow
                  label="Submitted At"
                  value={
                    preview.submittedAt
                      ? new Date(preview.submittedAt).toLocaleString("en-IN")
                      : null
                  }
                />
              </div>
              <CriteriaPointsView
                criteria={criteria}
                supplementary={[]}
                answers={preview.answers}
              />
            </section>
          );
        })}
      </div>
    </Modal>
  );
}
