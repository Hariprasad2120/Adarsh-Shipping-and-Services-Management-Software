"use client";

import { use, useEffect, useState } from "react";
import {
  AlertTriangle,
  FileCheck2,
  Fingerprint,
  LoaderCircle,
  ShieldCheck,
} from "lucide-react";
import { PublicBrand, PublicDetail, PublicDetailGrid, PublicFooter, PublicHeader, PublicInset, PublicMonolithShell, PublicPanel, PublicStage, PublicStatus, PublicStatusBadge } from "@/modules/auth/components/public-workspace";

interface VerifiedDocument {
  documentHash: string;
  documentType: string;
  issueDate: string;
  letterNumber: string;
  maskedAadhaar?: string | null;
  maskedEmail?: string | null;
  recipientName: string;
  status: string;
  validityStatus: string;
  verificationTimestamp: string;
}

interface VerificationResponse {
  data?: VerifiedDocument;
  error?: { message?: string };
  ok?: boolean;
}

export default function VerifyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [loading, setLoading] = useState(true);
  const [documentRecord, setDocumentRecord] =
    useState<VerifiedDocument | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchVerification() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/hrms/letters/verify?q=${encodeURIComponent(id)}`,
          { signal: controller.signal },
        );
        const payload = (await response.json()) as VerificationResponse;

        if (payload.ok && payload.data) {
          setDocumentRecord(payload.data);
        } else {
          setError(
            payload.error?.message ?? "Document verification failed.",
          );
        }
      } catch (requestError) {
        if (
          requestError instanceof DOMException &&
          requestError.name === "AbortError"
        ) {
          return;
        }
        setError("Failed to query the document register.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void fetchVerification();
    return () => controller.abort();
  }, [id]);

  if (loading) {
    return (
      <PublicMonolithShell data-public-route="verify" aria-busy="true">
        <PublicBrand subtitle="Secure document registry" />
        <PublicStage className="mnx-public-stage-narrow">
          <PublicPanel className="mnx-public-state-panel">
            <PublicStatus
              tone="info"
              eyebrow="Registry lookup"
              icon={<LoaderCircle className="mnx-public-spinner" />}
              title="Verifying document credentials"
              description="The secure ledger is checking the supplied document identifier."
            />
          </PublicPanel>
        </PublicStage>
      </PublicMonolithShell>
    );
  }

  if (error || !documentRecord) {
    return (
      <PublicMonolithShell data-public-route="verify">
        <PublicBrand subtitle="Secure document registry" />
        <PublicStage className="mnx-public-stage-narrow">
          <PublicPanel className="mnx-public-state-panel">
            <PublicHeader
              eyebrow="Public verification"
              icon={<Fingerprint />}
              title="Document authenticity registry"
              description="Adarsh Shipping and Services secure document register."
            />
            <PublicStatus
              tone="danger"
              eyebrow="Verification rejected"
              icon={<AlertTriangle />}
              title={error ?? "No matching document was returned."}
              description="Check the verification link or request a fresh document from the issuing team."
            />
          </PublicPanel>
        </PublicStage>
        <PublicFooter>Powered by Monolith Engine Secure Ledger.</PublicFooter>
      </PublicMonolithShell>
    );
  }

  const isValid =
    documentRecord.status !== "CANCELLED" &&
    documentRecord.validityStatus === "VALID";

  return (
    <PublicMonolithShell data-public-route="verify">
      <PublicBrand subtitle="Secure document registry" />
      <PublicStage className="mnx-public-stage-narrow">
        <PublicPanel>
          <PublicHeader
            badge={
              <PublicStatusBadge tone={isValid ? "success" : "warning"}>
                {isValid ? "Verified authentic" : "Archived record"}
              </PublicStatusBadge>
            }
            eyebrow="Public verification"
            icon={isValid ? <ShieldCheck /> : <FileCheck2 />}
            title="Document authenticity registry"
            description="Adarsh Shipping and Services secure document register."
          />

          <div className="mnx-public-panel-content">
            <PublicStatus
              tone={isValid ? "success" : "warning"}
              eyebrow="Registry status"
              icon={isValid ? <ShieldCheck /> : <AlertTriangle />}
              title={
                isValid
                  ? "This document is authentic"
                  : "This record is not currently applicable"
              }
              description="The document exists in the organisation's protected registry."
            />

            <PublicDetailGrid>
              <PublicDetail
                label="Letter number"
                value={<code>{documentRecord.letterNumber}</code>}
              />
              <PublicDetail
                label="Document type"
                value={documentRecord.documentType}
              />
              <PublicDetail
                label="Recipient name"
                value={documentRecord.recipientName}
              />
              <PublicDetail
                label="Issue date"
                value={documentRecord.issueDate}
              />
              <PublicDetail
                label="Masked email"
                value={<code>{documentRecord.maskedEmail || "N/A"}</code>}
              />
              <PublicDetail
                label="Masked Aadhaar"
                value={<code>{documentRecord.maskedAadhaar || "N/A"}</code>}
              />
              <PublicDetail
                wide
                label="SHA-256 PDF hash"
                value={<code>{documentRecord.documentHash}</code>}
              />
            </PublicDetailGrid>

            <PublicInset className="mnx-public-registry-meta">
              <span>
                Verified timestamp
                <strong>
                  {new Date(
                    documentRecord.verificationTimestamp,
                  ).toLocaleString()}
                </strong>
              </span>
              <span>
                LIN / registration
                <strong>DL-889812-LIN / TN-600112</strong>
              </span>
            </PublicInset>

            <PublicStatus
              tone="warning"
              eyebrow="Privacy notice"
              icon={<ShieldCheck />}
              title="Sensitive document fields remain concealed"
              description="Salary breakdowns, physical addresses, and contractual clauses are hidden for DPDP Act compliance."
            />
          </div>
        </PublicPanel>
      </PublicStage>

      <PublicFooter>Powered by Monolith Engine Secure Ledger.</PublicFooter>
    </PublicMonolithShell>
  );
}
