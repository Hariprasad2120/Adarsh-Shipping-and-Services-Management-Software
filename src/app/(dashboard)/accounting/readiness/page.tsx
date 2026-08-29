import {
  AccountingAction,
  AccountingAlert,
  AccountingDetail,
  AccountingDetailList,
  AccountingMetric,
  AccountingMetrics,
  AccountingRoutePageHeader,
  AccountingSection,
  AccountingStatus,
  AccountingTable,
} from "@/components/monolith";
import { requireAccountingRouteAccess } from "@/modules/accounting/operational-auth";
import {
  PRODUCTION_RESPONSIBILITY_ROLES,
  createDefaultPhase8Snapshot,
} from "@/modules/accounting/authorization-planning";

const evidenceChecklist = [
  ["EVIDENCE-POLICY", "Policy authority and decision support"],
  ["EVIDENCE-BACKUP", "Backup scope, integrity and encryption"],
  ["EVIDENCE-RESTORE", "Independent isolated restoration"],
  ["EVIDENCE-CONFIGURATION", "Production configuration declaration"],
  ["EVIDENCE-MANIFEST", "Final real-source extraction manifest"],
  ["EVIDENCE-SECURITY", "Security and scope-isolation verification"],
  ["EVIDENCE-ACCEPTANCE", "Business and technical acceptance"],
  ["EVIDENCE-RELEASE", "Release commit and artifact digest"],
] as const;

export default async function AccountingReadinessPage() {
  const { orgId } = await requireAccountingRouteAccess(
    "/accounting/readiness",
    ["accounting.readiness.read"],
  );
  const snapshot = createDefaultPhase8Snapshot({
    organizationId: orgId,
    legalEntityId: "UNASSIGNED",
    environment: "PRODUCTION",
  });
  const approvedPolicies = snapshot.policies.filter(
    (policy) => policy.status === "APPROVED",
  ).length;

  return (
    <>
      <AccountingRoutePageHeader
        actions={
          <AccountingAction type="button" disabled>
            Prepare authorization request
          </AccountingAction>
        }
      />
      <AccountingAlert variant="danger">
        <strong>NOT_READY.</strong> Phase 8 is an evidence-intake and planning
        boundary only. It does not grant production authorization, enable a
        provider, execute migration, or begin cutover.
      </AccountingAlert>
      <AccountingMetrics>
        <AccountingMetric
          label="Overall state"
          value="NOT_READY"
          detail="Critical evidence and human decisions are missing"
        />
        <AccountingMetric
          label="Governed policies"
          value={`${approvedPolicies} / ${snapshot.policies.length}`}
          detail="All decisions remain awaiting authorized human review"
        />
        <AccountingMetric
          label="Required roles"
          value={`0 / ${PRODUCTION_RESPONSIBILITY_ROLES.length}`}
          detail="No production identities are assigned automatically"
        />
        <AccountingMetric
          label="Authorization request"
          value="NOT_READY"
          detail="Request readiness is not production authorization"
        />
      </AccountingMetrics>

      <AccountingSection
        eyebrow="01"
        title="Readiness boundary"
        description="The current snapshot is organization-scoped. A verified legal-entity scope and every critical dependency are still required."
      >
        <AccountingDetailList>
          <AccountingDetail label="Organization scope" value={orgId} />
          <AccountingDetail label="Legal-entity scope" value="Not selected" />
          <AccountingDetail
            label="Environment classification"
            value="Production planning only"
          />
          <AccountingDetail
            label="Production authorization"
            value={<AccountingStatus status="UNREACHABLE_IN_PHASE_8" />}
          />
          <AccountingDetail
            label="Cutover execution"
            value={<AccountingStatus status="DISABLED" />}
          />
          <AccountingDetail
            label="Providers and outbound delivery"
            value={<AccountingStatus status="DISABLED" />}
          />
        </AccountingDetailList>
      </AccountingSection>

      <AccountingSection
        eyebrow="02"
        title="Evidence checklist"
        description="Only independently verified metadata pointing to a secure external evidence location may satisfy a gate. Payloads are never stored here."
      >
        <AccountingTable>
          <thead>
            <tr>
              <th>Requirement</th>
              <th>Evidence</th>
              <th>Review state</th>
            </tr>
          </thead>
          <tbody>
            {evidenceChecklist.map(([id, label]) => (
              <tr key={id}>
                <td>{id}</td>
                <td>{label}</td>
                <td>
                  <AccountingStatus status="MISSING" />
                </td>
              </tr>
            ))}
          </tbody>
        </AccountingTable>
      </AccountingSection>

      <AccountingSection
        eyebrow="03"
        title="Policy governance"
        description="Each decision requires versioned rationale, supporting accepted evidence, an authoritative maker, and an independent checker."
      >
        <AccountingTable>
          <thead>
            <tr>
              <th>Policy</th>
              <th>Version</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {snapshot.policies.map((policy) => (
              <tr key={policy.policyId}>
                <td>{policy.policyId}</td>
                <td>{policy.version}</td>
                <td>
                  <AccountingStatus status={policy.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </AccountingTable>
      </AccountingSection>

      <AccountingSection
        eyebrow="04"
        title="Responsibility assignments"
        description="Production roles require active non-placeholder identities, scoped permissions, acknowledgement, validity, and separation of duties."
      >
        <AccountingTable>
          <thead>
            <tr>
              <th>Required role</th>
              <th>Assignment</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {PRODUCTION_RESPONSIBILITY_ROLES.map((role) => (
              <tr key={role}>
                <td>{role.replaceAll("_", " ")}</td>
                <td>Unassigned</td>
                <td>
                  <AccountingStatus status="MISSING" />
                </td>
              </tr>
            ))}
          </tbody>
        </AccountingTable>
      </AccountingSection>

      <AccountingSection
        eyebrow="05"
        title="Infrastructure and source certification"
        description="A backup claim alone is insufficient. Isolated restore, exact reconciliation, configuration attestations, and a fresh real-source manifest are mandatory."
      >
        <AccountingDetailList>
          <AccountingDetail
            label="Backup and isolated restore"
            value={<AccountingStatus status="NOT_READY" />}
          />
          <AccountingDetail
            label="RPO and RTO evidence"
            value={<AccountingStatus status="MISSING" />}
          />
          <AccountingDetail
            label="Canonical reversal strategy"
            value={<AccountingStatus status="AWAITING_DECISION" />}
          />
          <AccountingDetail
            label="Configuration declaration"
            value={<AccountingStatus status="MISSING" />}
          />
          <AccountingDetail
            label="Real-source manifest"
            value={<AccountingStatus status="MISSING" />}
          />
          <AccountingDetail
            label="Exceptions"
            value="No exception can waive a critical control"
          />
        </AccountingDetailList>
      </AccountingSection>

      <AccountingSection
        eyebrow="06"
        title="Immutable audit timeline"
        description="Audit events contain actor, action, scope, object, outcome and tamper-evident chaining—never evidence payloads, secrets, PII, financial records, or connection strings."
      >
        <AccountingAlert>
          No Phase 8 audit events exist. External alert delivery remains
          disconnected.
        </AccountingAlert>
      </AccountingSection>
    </>
  );
}
