import {
  type AccountingCapabilityPolicyListItem,
  getAccountingCapabilityPolicyEditor,
  listAccountingCapabilityPolicies,
  listAccountingCapabilityPolicyAudit,
  ACCOUNTING_CAPABILITY_CODES,
} from "@/modules/accounting/capability-policies";
import {
  approveAccountingCapabilityPolicyAction,
  rejectAccountingCapabilityPolicyAction,
  revokeAccountingCapabilityPolicyAction,
  saveAccountingCapabilityPolicyDraftAction,
  submitAccountingCapabilityPolicyAction,
  supersedeAccountingCapabilityPolicyAction,
} from "@/modules/accounting/capability-policy-actions";
import { requireAccountingRouteAccess } from "@/modules/accounting/operational-auth";
import { getAccountingConfigurationOverview } from "@/modules/accounting/operational-queries";
import { Button } from "@/components/ui/button";
import {
  AccountingActionLink,
  AccountingAlert,
  AccountingDetail,
  AccountingDetailList,
  AccountingField,
  AccountingInput,
  AccountingRoutePageHeader,
  AccountingSection,
  AccountingSelect,
  AccountingStatus,
  AccountingTable,
  AccountingTextarea,
} from "@/components/monolith/accounting-workspace";

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default async function AccountingCapabilityPoliciesPage({
  searchParams,
}: {
  searchParams: Promise<{
    capability?: string;
    legalEntityId?: string;
    status?: string;
    edit?: string;
  }>;
}) {
  const { orgId } = await requireAccountingRouteAccess("/accounting/capabilities");
  const params = await searchParams;
  const configuration = await getAccountingConfigurationOverview(orgId);
  const policies = await listAccountingCapabilityPolicies(orgId, {
    capabilityCode:
      params.capability &&
      ACCOUNTING_CAPABILITY_CODES.includes(params.capability as never)
        ? (params.capability as (typeof ACCOUNTING_CAPABILITY_CODES)[number])
        : null,
    legalEntityId: params.legalEntityId ?? null,
    status: params.status ?? null,
  });
  const editor = params.edit
    ? await getAccountingCapabilityPolicyEditor(orgId, params.edit)
    : null;
  const audit = editor
    ? await listAccountingCapabilityPolicyAudit(orgId, editor.id)
    : [];

  async function rejectSelectedPolicy(formData: FormData) {
    "use server";
    if (!editor) return;
    await rejectAccountingCapabilityPolicyAction(
      editor.id,
      editor.rowVersion,
      String(formData.get("reason") ?? ""),
    );
  }

  async function saveSelectedPolicyDraft(formData: FormData) {
    "use server";
    await saveAccountingCapabilityPolicyDraftAction(formData);
  }

  async function submitSelectedPolicy() {
    "use server";
    if (!editor) return;
    await submitAccountingCapabilityPolicyAction(editor.id, editor.rowVersion);
  }

  async function approveSelectedPolicy() {
    "use server";
    if (!editor) return;
    await approveAccountingCapabilityPolicyAction(editor.id, editor.rowVersion);
  }

  async function supersedeSelectedPolicy() {
    "use server";
    if (!editor) return;
    await supersedeAccountingCapabilityPolicyAction(editor.id);
  }

  async function revokeSelectedPolicy(formData: FormData) {
    "use server";
    if (!editor) return;
    await revokeAccountingCapabilityPolicyAction(
      editor.id,
      editor.rowVersion,
      String(formData.get("reason") ?? ""),
    );
  }

  const defaultConfiguration = JSON.stringify(
    {
      enabled: false,
      mode: "ACTIVE",
      allowOrganisationFallback: true,
      checklist: [
        {
          code: "APPROVAL",
          label: "Independent approval evidence",
          status: "PENDING",
        },
      ],
      blockers: ["Approved operational configuration is still required."],
      warnings: [],
      notes: "",
    },
    null,
    2,
  );

  return (
    <>
      <AccountingRoutePageHeader
        actions={
          <AccountingActionLink href="/accounting/configuration">
            Back to configuration
          </AccountingActionLink>
        }
      />

      <AccountingAlert>
        Capability activation remains fail-closed until an approved,
        effective, hash-valid policy is present. Saving a draft does not enable
        any workflow.
      </AccountingAlert>

      <AccountingSection
        eyebrow="Filters"
        title="Capability policy registry"
        description="Filter the versioned policy register by capability, scope, and lifecycle state."
      >
        <form className="mnx-accounting-form" method="get">
          <div className="mnx-accounting-form-grid">
            <AccountingField label="Capability" htmlFor="capability-filter">
              <AccountingSelect
                id="capability-filter"
                name="capability"
                defaultValue={params.capability ?? ""}
              >
                <option value="">All capabilities</option>
                {ACCOUNTING_CAPABILITY_CODES.map((capability) => (
                  <option key={capability} value={capability}>
                    {capability.replaceAll("_", " ")}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Legal entity" htmlFor="legal-entity-filter">
              <AccountingSelect
                id="legal-entity-filter"
                name="legalEntityId"
                defaultValue={params.legalEntityId ?? ""}
              >
                <option value="">All scopes</option>
                <option value="__ORG_WIDE__">Organisation wide only</option>
                {configuration.legalEntities.map((entity) => (
                  <option key={entity.id} value={entity.id}>
                    {entity.code} — {entity.legalName}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Status" htmlFor="status-filter">
              <AccountingSelect
                id="status-filter"
                name="status"
                defaultValue={params.status ?? ""}
              >
                <option value="">All statuses</option>
                <option value="DRAFT">Draft</option>
                <option value="PENDING_APPROVAL">Pending approval</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
                <option value="REVOKED">Revoked</option>
                <option value="SUPERSEDED">Superseded</option>
                <option value="EXPIRED">Expired</option>
              </AccountingSelect>
            </AccountingField>
          </div>
          <div className="mnx-accounting-form-actions">
            <Button variant="inverse" type="submit">
              Apply filters
            </Button>
            <AccountingActionLink href="/accounting/capabilities">
              Clear filters
            </AccountingActionLink>
          </div>
        </form>
      </AccountingSection>

      <AccountingSection
        eyebrow={editor ? "Edit or review" : "Create draft"}
        title={
          editor
            ? `${editor.capabilityCode.replaceAll("_", " ")} v${editor.version}`
            : "New capability policy draft"
        }
        description="Drafts remain editable until submitted. Approved policies can only be superseded or revoked."
      >
        <form action={saveSelectedPolicyDraft} className="mnx-accounting-form">
          <input type="hidden" name="policyId" value={editor?.id ?? ""} />
          <input
            type="hidden"
            name="expectedVersion"
            value={editor?.rowVersion ?? ""}
          />
          <input
            type="hidden"
            name="supersedesId"
            value={editor?.status === "APPROVED" ? editor.id : ""}
          />
          <div className="mnx-accounting-form-grid mnx-accounting-form-grid-wide">
            <AccountingField label="Capability" htmlFor="capability-code">
              <AccountingSelect
                id="capability-code"
                name="capabilityCode"
                defaultValue={editor?.capabilityCode ?? "RECURRING_GENERATION"}
                disabled={Boolean(editor && editor.status !== "DRAFT")}
              >
                {ACCOUNTING_CAPABILITY_CODES.map((capability) => (
                  <option key={capability} value={capability}>
                    {capability.replaceAll("_", " ")}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Legal entity scope" htmlFor="legal-entity-id">
              <AccountingSelect
                id="legal-entity-id"
                name="legalEntityId"
                defaultValue={editor?.legalEntityId ?? ""}
                disabled={Boolean(editor && editor.status !== "DRAFT")}
              >
                <option value="">Organisation wide</option>
                {configuration.legalEntities.map((entity) => (
                  <option key={entity.id} value={entity.id}>
                    {entity.code} — {entity.legalName}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Effective from" htmlFor="effective-from">
              <AccountingInput
                id="effective-from"
                name="effectiveFrom"
                type="date"
                defaultValue={editor?.effectiveFrom ?? ""}
                disabled={Boolean(editor && editor.status !== "DRAFT")}
              />
            </AccountingField>
            <AccountingField label="Effective to" htmlFor="effective-to">
              <AccountingInput
                id="effective-to"
                name="effectiveTo"
                type="date"
                defaultValue={editor?.effectiveTo ?? ""}
                disabled={Boolean(editor && editor.status !== "DRAFT")}
              />
            </AccountingField>
          </div>
          <AccountingField
            label="Configuration JSON"
            htmlFor="configuration-json"
            hint="The hash is recalculated server-side before every save and read."
          >
            <AccountingTextarea
              id="configuration-json"
              name="configurationJson"
              defaultValue={editor?.configurationJson ?? defaultConfiguration}
              rows={16}
              disabled={Boolean(editor && editor.status !== "DRAFT")}
            />
          </AccountingField>
          <div className="mnx-accounting-form-actions">
            <Button
              type="submit"
              disabled={Boolean(editor && editor.status !== "DRAFT")}
            >
              {editor ? "Save draft" : "Create draft"}
            </Button>
          </div>
        </form>

        {editor ? (
          <AccountingDetailList>
            <AccountingDetail label="Current status" value={<AccountingStatus status={editor.status} />} />
            <AccountingDetail label="Current readiness" value={<AccountingStatus status={editor.readiness.uiStatus} />} />
            <AccountingDetail label="Configuration hash" value={editor.configurationHash} />
            <AccountingDetail label="Row version" value={editor.rowVersion} />
          </AccountingDetailList>
        ) : null}

        {editor?.status === "DRAFT" ? (
          <form action={submitSelectedPolicy}>
            <Button variant="inverse" type="submit">
              Submit for approval
            </Button>
          </form>
        ) : null}

        {editor?.status === "APPROVED" ? (
          <form action={supersedeSelectedPolicy}>
            <Button variant="inverse" type="submit">
              Supersede with new draft
            </Button>
          </form>
        ) : null}
      </AccountingSection>

      {editor?.status === "PENDING_APPROVAL" ? (
        <AccountingSection
          eyebrow="Review"
          title="Independent approval"
          description="Approvers must remain distinct from the draft creator."
        >
          <div className="mnx-accounting-form-actions">
            <form action={approveSelectedPolicy}>
              <Button type="submit">
                Approve policy
              </Button>
            </form>
            <form action={rejectSelectedPolicy} className="mnx-accounting-form">
              <AccountingField label="Rejection reason" htmlFor="reject-reason">
                <AccountingTextarea id="reject-reason" name="reason" rows={3} />
              </AccountingField>
              <Button variant="destructive" type="submit">
                Reject policy
              </Button>
            </form>
          </div>
        </AccountingSection>
      ) : null}

      {editor?.status === "APPROVED" ? (
        <AccountingSection
          eyebrow="Revocation"
          title="Revoke approved policy"
          description="Revocation preserves history and keeps the capability fail-closed until a replacement is approved."
        >
          <form action={revokeSelectedPolicy} className="mnx-accounting-form">
            <AccountingField label="Revocation reason" htmlFor="revoke-reason">
              <AccountingTextarea id="revoke-reason" name="reason" rows={3} />
            </AccountingField>
            <Button variant="destructive" type="submit">
              Revoke policy
            </Button>
          </form>
        </AccountingSection>
      ) : null}

      {editor ? (
        <AccountingSection
          eyebrow="Audit"
          title="Capability policy history"
          description="Maker, checker, revocation, and supersession activity are preserved in the Accounting audit log."
        >
          <ul className="mnx-accounting-list">
            {audit.length === 0 ? (
              <li>No audit events are available for this policy yet.</li>
            ) : (
              audit.map((entry) => (
                <li className="mnx-accounting-list-row" key={entry.id}>
                  <div>
                    <b>{entry.action.replaceAll("_", " ")}</b>
                    <small>{entry.actor}</small>
                  </div>
                  <span>{formatDateTime(entry.occurredAt)}</span>
                </li>
              ))
            )}
          </ul>
        </AccountingSection>
      ) : null}

      <AccountingSection
        eyebrow="Registry"
        title="Versioned capability policies"
        description="Each row shows the current policy lifecycle, effective scope, configuration hash, and evaluated readiness."
      >
        <AccountingTable>
          <thead>
            <tr>
              <th>Capability</th>
              <th>Scope</th>
              <th>Version</th>
              <th>Status</th>
              <th>Readiness</th>
              <th>Effective dates</th>
              <th>Hash</th>
              <th>Maker / checker</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {policies.length === 0 ? (
              <tr>
                <td colSpan={9}>No capability policies match these filters.</td>
              </tr>
            ) : (
              policies.map((policy: AccountingCapabilityPolicyListItem) => (
                <tr key={policy.id}>
                  <td>{policy.capabilityCode.replaceAll("_", " ")}</td>
                  <td>{policy.legalEntityLabel}</td>
                  <td>{policy.version}</td>
                  <td>
                    <AccountingStatus status={policy.status} />
                  </td>
                  <td>
                    <AccountingStatus status={policy.readiness.uiStatus} />
                  </td>
                  <td>
                    {policy.effectiveFrom}
                    <small>{policy.effectiveTo ?? "Open ended"}</small>
                  </td>
                  <td>
                    <code>{policy.configurationHash}</code>
                  </td>
                  <td>
                    {policy.createdByName}
                    <small>{policy.approvedByName ?? "Not approved"}</small>
                  </td>
                  <td>
                    <AccountingActionLink
                      className="mnx-button-compact"
                      href={`/accounting/capabilities?edit=${policy.id}`}
                    >
                      Review
                    </AccountingActionLink>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </AccountingTable>
      </AccountingSection>
    </>
  );
}
