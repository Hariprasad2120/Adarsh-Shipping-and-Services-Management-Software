"use client";

import { Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "@/modules/notifications/client";
import { AccountingAction, AccountingDetail, AccountingDetailList, AccountingEmptyTableRow, AccountingField, AccountingInput, AccountingMetric, AccountingMetrics, AccountingSection, AccountingSelect, AccountingStatus, AccountingTable, AccountingTextarea, DateInput } from "@/components/monolith";
import {
  cancelRecurringSalesInvoiceProfileAction,
  createRecurringSalesInvoiceProfileAction,
  generateDueRecurringSalesInvoicesAction,
  generateRecurringSalesInvoiceOccurrenceAction,
  pauseRecurringSalesInvoiceProfileAction,
  resumeRecurringSalesInvoiceProfileAction,
  skipRecurringSalesInvoiceOccurrenceAction,
} from "@/modules/accounting/recurring-sales-invoice-actions";

type CustomerOption = { id: string; name: string; email: string | null };
type BranchOption = { id: string; name: string };
type ProfileLine = {
  itemName: string;
  description: string;
  qty: string;
  rate: string;
  taxRate: string;
  unit: string;
};
type ProfileRecord = {
  id: string;
  profileName: string;
  status: string;
  frequency: string;
  timezone: string;
  startDate: string;
  endDate: string | null;
  nextInvoiceDate: string;
  lastInvoiceDate: string | null;
  currencyCode: string;
  autoSend: boolean;
  approvalRequired: boolean;
  autoChargeTokenRef: string | null;
  paymentTermName: string | null;
  subject: string | null;
  remarks: string | null;
  failureCount: number;
  lastFailureAt: string | null;
  lastFailureReason: string | null;
  customer: CustomerOption;
  branch: BranchOption | null;
  lines: Array<{
    id: string;
    itemName: string;
    description: string | null;
    qty: string;
    rate: string;
    taxRate: string;
    unit: string | null;
  }>;
  runs: Array<{
    id: string;
    dueDate: string;
    runStatus: string;
    generatedSalesInvoiceId: string | null;
    failureReason: string | null;
    createdAt: string;
  }>;
};

const EMPTY_LINE = (): ProfileLine => ({
  itemName: "",
  description: "",
  qty: "1",
  rate: "0",
  taxRate: "18",
  unit: "",
});

export function RecurringSalesClient({
  customers,
  branches,
  profiles,
  summary,
  canManageTemplates,
  canProcessOccurrences,
}: {
  customers: CustomerOption[];
  branches: BranchOption[];
  profiles: ProfileRecord[];
  summary: {
    total: number;
    active: number;
    paused: number;
    dueNow: number;
  };
  canManageTemplates: boolean;
  canProcessOccurrences: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [profileName, setProfileName] = useState("");
  const [branchId, setBranchId] = useState("");
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? "");
  const [frequency, setFrequency] = useState<
    "DAILY" | "WEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY"
  >("MONTHLY");
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState("");
  const [nextInvoiceDate, setNextInvoiceDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [currencyCode, setCurrencyCode] = useState("INR");
  const [autoSend, setAutoSend] = useState(false);
  const [approvalRequired, setApprovalRequired] = useState(true);
  const [autoChargeTokenRef, setAutoChargeTokenRef] = useState("");
  const [paymentTermName, setPaymentTermName] = useState("");
  const [subject, setSubject] = useState("");
  const [remarks, setRemarks] = useState("");
  const [lines, setLines] = useState<ProfileLine[]>([EMPTY_LINE()]);

  const estimatedTotals = useMemo(() => {
    const subtotal = lines.reduce(
      (sum, line) => sum + Number(line.qty || 0) * Number(line.rate || 0),
      0,
    );
    const tax = lines.reduce(
      (sum, line) =>
        sum +
        Number(line.qty || 0) *
          Number(line.rate || 0) *
          (Number(line.taxRate || 0) / 100),
      0,
    );
    return { subtotal, tax, total: subtotal + tax };
  }, [lines]);

  function mutateLine(index: number, patch: Partial<ProfileLine>) {
    setLines((current) =>
      current.map((line, lineIndex) =>
        lineIndex === index ? { ...line, ...patch } : line,
      ),
    );
  }

  function runProfileAction(actionKey: string, work: () => Promise<void>) {
    setBusyAction(actionKey);
    startTransition(async () => {
      try {
        await work();
        router.refresh();
      } finally {
        setBusyAction(null);
      }
    });
  }

  function createProfile() {
    runProfileAction("create-profile", async () => {
      const result = await createRecurringSalesInvoiceProfileAction({
        profileName,
        branchId: branchId || null,
        customerId,
        frequency,
        timezone,
        startDate,
        endDate: endDate || null,
        nextInvoiceDate: nextInvoiceDate || null,
        currencyCode,
        autoSend,
        approvalRequired,
        autoChargeTokenRef: autoChargeTokenRef || null,
        paymentTermName: paymentTermName || null,
        subject: subject || null,
        remarks: remarks || null,
        lines,
      });
      if (!result.ok) throw new Error(result.error);
      toast.success("Recurring invoice profile created");
      setProfileName("");
      setAutoChargeTokenRef("");
      setPaymentTermName("");
      setSubject("");
      setRemarks("");
      setLines([EMPTY_LINE()]);
    });
  }

  function processDueProfiles() {
    runProfileAction("process-due", async () => {
      const result = await generateDueRecurringSalesInvoicesAction();
      if (!result.ok) throw new Error(result.error);
      const generated = (result.data as Array<{ status: string }>).filter(
        (entry) => entry.status === "GENERATED",
      ).length;
      toast.success(
        generated > 0
          ? `${generated} recurring invoice occurrence(s) generated`
          : "No due recurring invoices needed processing",
      );
    });
  }

  return (
    <>
      <AccountingMetrics>
        <AccountingMetric label="Profiles" value={summary.total} />
        <AccountingMetric label="Active" value={summary.active} />
        <AccountingMetric label="Paused" value={summary.paused} />
        <AccountingMetric label="Due now" value={summary.dueNow} />
      </AccountingMetrics>

      {canManageTemplates ? (
        <AccountingSection
          eyebrow="Recurring profiles"
          title="Create recurring invoice profile"
          description="Capture customer, cadence, optional auto-send metadata, and template lines for draft sales-invoice generation."
          actions={
            <AccountingAction
              disabled={isPending && busyAction === "create-profile"}
              onClick={() => createProfile()}
            >
              {isPending && busyAction === "create-profile" ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <Plus size={16} />
              )}
              Create profile
            </AccountingAction>
          }
        >
          <div className="mnx-accounting-form-grid mnx-accounting-form-grid-wide">
            <AccountingField label="Profile name" required>
              <AccountingInput value={profileName} onChange={(event) => setProfileName(event.target.value)} />
            </AccountingField>
            <AccountingField label="Customer" required>
              <AccountingSelect value={customerId} onChange={(event) => setCustomerId(event.target.value)}>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Branch">
              <AccountingSelect value={branchId} onChange={(event) => setBranchId(event.target.value)}>
                <option value="">All branches</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Frequency">
              <AccountingSelect value={frequency} onChange={(event) => setFrequency(event.target.value as typeof frequency)}>
                <option value="DAILY">Daily</option>
                <option value="WEEKLY">Weekly</option>
                <option value="MONTHLY">Monthly</option>
                <option value="QUARTERLY">Quarterly</option>
                <option value="YEARLY">Yearly</option>
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Timezone">
              <AccountingInput value={timezone} onChange={(event) => setTimezone(event.target.value)} />
            </AccountingField>
            <AccountingField label="Currency">
              <AccountingSelect value={currencyCode} onChange={(event) => setCurrencyCode(event.target.value)}>
                <option value="INR">INR</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="SGD">SGD</option>
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Start date">
              <DateInput value={startDate} onChange={(event) => setStartDate(event.target.value)} />
            </AccountingField>
            <AccountingField label="End date">
              <DateInput value={endDate} onChange={(event) => setEndDate(event.target.value)} />
            </AccountingField>
            <AccountingField label="Next invoice date">
              <DateInput value={nextInvoiceDate} onChange={(event) => setNextInvoiceDate(event.target.value)} />
            </AccountingField>
            <AccountingField label="Payment term">
              <AccountingInput value={paymentTermName} onChange={(event) => setPaymentTermName(event.target.value)} placeholder="Net 30" />
            </AccountingField>
            <AccountingField label="Auto-charge token reference">
              <AccountingInput value={autoChargeTokenRef} onChange={(event) => setAutoChargeTokenRef(event.target.value)} placeholder="Optional token reference" />
            </AccountingField>
            <AccountingField label="Auto-send">
              <AccountingSelect value={autoSend ? "YES" : "NO"} onChange={(event) => setAutoSend(event.target.value === "YES")}>
                <option value="NO">No</option>
                <option value="YES">Yes</option>
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Approval required">
              <AccountingSelect value={approvalRequired ? "YES" : "NO"} onChange={(event) => setApprovalRequired(event.target.value === "YES")}>
                <option value="YES">Yes</option>
                <option value="NO">No</option>
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Subject" className="mnx-accounting-field-span">
              <AccountingInput value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Monthly managed services invoice" />
            </AccountingField>
            <AccountingField label="Remarks" className="mnx-accounting-field-span">
              <AccountingTextarea value={remarks} onChange={(event) => setRemarks(event.target.value)} rows={3} />
            </AccountingField>
          </div>

          <AccountingTable>
            <thead>
              <tr>
                <th>Item</th>
                <th>Description</th>
                <th>Qty</th>
                <th>Rate</th>
                <th>Tax</th>
                <th>Unit</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, index) => (
                <tr key={index}>
                  <td><AccountingInput value={line.itemName} onChange={(event) => mutateLine(index, { itemName: event.target.value })} /></td>
                  <td><AccountingInput value={line.description} onChange={(event) => mutateLine(index, { description: event.target.value })} /></td>
                  <td><AccountingInput type="number" min="0.000001" step="0.000001" value={line.qty} onChange={(event) => mutateLine(index, { qty: event.target.value })} /></td>
                  <td><AccountingInput type="number" min="0" step="0.01" value={line.rate} onChange={(event) => mutateLine(index, { rate: event.target.value })} /></td>
                  <td><AccountingInput type="number" min="0" step="0.01" value={line.taxRate} onChange={(event) => mutateLine(index, { taxRate: event.target.value })} /></td>
                  <td><AccountingInput value={line.unit} onChange={(event) => mutateLine(index, { unit: event.target.value })} /></td>
                </tr>
              ))}
            </tbody>
          </AccountingTable>
          <div className="mnx-accounting-inline-actions">
            <AccountingAction variant="secondary" onClick={() => setLines((current) => [...current, EMPTY_LINE()])}>
              Add template line
            </AccountingAction>
            {lines.length > 1 ? (
              <AccountingAction variant="secondary" onClick={() => setLines((current) => current.slice(0, -1))}>
                Remove last line
              </AccountingAction>
            ) : null}
          </div>
          <AccountingDetailList>
            <AccountingDetail label="Estimated subtotal" value={estimatedTotals.subtotal.toFixed(2)} />
            <AccountingDetail label="Estimated tax" value={estimatedTotals.tax.toFixed(2)} />
            <AccountingDetail label="Estimated total" value={estimatedTotals.total.toFixed(2)} />
          </AccountingDetailList>
        </AccountingSection>
      ) : null}

      <AccountingSection
        eyebrow="Occurrence processing"
        title="Recurring invoice register"
        description="Generate due drafts, pause or resume profiles, skip an occurrence, and inspect recent run lineage."
        actions={
          canProcessOccurrences ? (
            <AccountingAction
              disabled={isPending && busyAction === "process-due"}
              onClick={() => processDueProfiles()}
            >
              {isPending && busyAction === "process-due" ? (
                <Loader2 className="animate-spin" size={16} />
              ) : null}
              Process due profiles
            </AccountingAction>
          ) : undefined
        }
      >
        <AccountingTable>
          <thead>
            <tr>
              <th>Profile</th>
              <th>Customer</th>
              <th>Schedule</th>
              <th>Status</th>
              <th>Recent runs</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {profiles.length ? profiles.map((profile) => (
              <tr key={profile.id}>
                <td>
                  <strong>{profile.profileName}</strong>
                  <div className="mnx-table-subtext">
                    {profile.currencyCode} · {profile.lines.length} line(s)
                  </div>
                </td>
                <td>
                  <strong>{profile.customer.name}</strong>
                  <div className="mnx-table-subtext">
                    {profile.customer.email || "No email"}
                  </div>
                </td>
                <td>
                  <div>{profile.frequency}</div>
                  <div className="mnx-table-subtext">
                    Next {formatDate(profile.nextInvoiceDate)}
                    {profile.endDate ? ` · Ends ${formatDate(profile.endDate)}` : ""}
                  </div>
                </td>
                <td>
                  <AccountingStatus status={profile.status} />
                  {profile.lastFailureReason ? (
                    <div className="mnx-table-subtext text-rose-600">
                      {profile.lastFailureReason}
                    </div>
                  ) : null}
                </td>
                <td>
                  {profile.runs.length ? profile.runs.map((run) => (
                    <div key={run.id} className="mnx-table-subtext">
                      {formatDate(run.dueDate)} · {run.runStatus}
                    </div>
                  )) : "—"}
                </td>
                <td>
                  <div className="mnx-accounting-inline-actions">
                    {canProcessOccurrences && profile.status === "ACTIVE" ? (
                      <AccountingAction
                        variant="secondary"
                        disabled={isPending && busyAction === `generate-${profile.id}`}
                        onClick={() =>
                          runProfileAction(`generate-${profile.id}`, async () => {
                            const result = await generateRecurringSalesInvoiceOccurrenceAction(profile.id);
                            if (!result.ok) throw new Error(result.error);
                            toast.success("Recurring invoice draft generated");
                          })
                        }
                      >
                        Generate now
                      </AccountingAction>
                    ) : null}
                    {canProcessOccurrences && ["ACTIVE", "PAUSED"].includes(profile.status) ? (
                      <AccountingAction
                        variant="secondary"
                        disabled={isPending && busyAction === `skip-${profile.id}`}
                        onClick={() =>
                          runProfileAction(`skip-${profile.id}`, async () => {
                            const result = await skipRecurringSalesInvoiceOccurrenceAction(profile.id);
                            if (!result.ok) throw new Error(result.error);
                            toast.success("Occurrence skipped");
                          })
                        }
                      >
                        Skip
                      </AccountingAction>
                    ) : null}
                    {canManageTemplates && profile.status === "ACTIVE" ? (
                      <AccountingAction
                        variant="secondary"
                        disabled={isPending && busyAction === `pause-${profile.id}`}
                        onClick={() =>
                          runProfileAction(`pause-${profile.id}`, async () => {
                            const result = await pauseRecurringSalesInvoiceProfileAction(profile.id);
                            if (!result.ok) throw new Error(result.error);
                            toast.success("Profile paused");
                          })
                        }
                      >
                        Pause
                      </AccountingAction>
                    ) : null}
                    {canManageTemplates && profile.status === "PAUSED" ? (
                      <AccountingAction
                        variant="secondary"
                        disabled={isPending && busyAction === `resume-${profile.id}`}
                        onClick={() =>
                          runProfileAction(`resume-${profile.id}`, async () => {
                            const result = await resumeRecurringSalesInvoiceProfileAction(profile.id);
                            if (!result.ok) throw new Error(result.error);
                            toast.success("Profile resumed");
                          })
                        }
                      >
                        Resume
                      </AccountingAction>
                    ) : null}
                    {canManageTemplates && !["CANCELLED", "COMPLETED"].includes(profile.status) ? (
                      <AccountingAction
                        variant="destructive"
                        disabled={isPending && busyAction === `cancel-${profile.id}`}
                        onClick={() =>
                          runProfileAction(`cancel-${profile.id}`, async () => {
                            const result = await cancelRecurringSalesInvoiceProfileAction(profile.id);
                            if (!result.ok) throw new Error(result.error);
                            toast.success("Profile cancelled");
                          })
                        }
                      >
                        Cancel
                      </AccountingAction>
                    ) : null}
                  </div>
                </td>
              </tr>
            )) : (
              <AccountingEmptyTableRow colSpan={6}>
                No recurring sales-invoice profiles are configured yet.
              </AccountingEmptyTableRow>
            )}
          </tbody>
        </AccountingTable>
      </AccountingSection>
    </>
  );
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
