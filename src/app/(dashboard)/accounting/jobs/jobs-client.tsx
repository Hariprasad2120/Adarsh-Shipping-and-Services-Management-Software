"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { Loader2, Plus } from "lucide-react";
import { useState } from "react";
import { DateInput } from "@/components/ui/date-input";
import {
  AccountingAction,
  AccountingAlert,
  AccountingDialog,
  AccountingEmptyTableRow,
  AccountingField,
  AccountingInput,
  AccountingMetric,
  AccountingMetrics,
  AccountingRecordCard,
  AccountingSection,
  AccountingSelect,
  AccountingStatus,
  AccountingTable,
} from "@/modules/accounting/components/accounting-workspace";
import {
  createJobCostingAction,
  getJobCostingAction,
} from "@/modules/accounting/actions";

interface Job {
  id: string;
  jobCode: string;
  jobName: string;
  customerName: string;
  startDate: Date;
  expectedEndDate: Date | null;
  contractValue: number;
  actualRevenue: number;
  actualExpense: number;
  netProfit: number;
  marginPercent: number;
  status: string;
}

export function JobsClient({
  customers,
  jobs,
}: {
  jobs: Job[];
  customers: Array<{ id: string; name: string }>;
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [selectedJob, setSelectedJob] = useState<any | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [jobName, setJobName] = useState("");
  const [customer, setCustomer] = useState("");
  const [contractValue, setContractValue] = useState("");
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [expectedEndDate, setExpectedEndDate] = useState("");
  const [costCentre, setCostCentre] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const totalContractValue = jobs.reduce(
    (sum, job) => sum + job.contractValue,
    0,
  );
  const totalNetProfit = jobs.reduce((sum, job) => sum + job.netProfit, 0);
  const activeJobs = jobs.filter((job) => job.status === "OPEN").length;
  const averageMargin =
    jobs.length > 0 ? (totalNetProfit / (totalContractValue || 1)) * 100 : 0;

  async function createJob(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    if (!customer) return setError("Please select a customer.");
    const numericContractValue = Number(contractValue);
    if (!Number.isFinite(numericContractValue) || numericContractValue < 0)
      return setError("Please enter a valid contract value.");

    setLoading(true);
    try {
      const result = await createJobCostingAction({
        jobName,
        customerId: customer,
        startDate,
        expectedEndDate: expectedEndDate || undefined,
        contractValue: numericContractValue,
        costCentre,
      });
      if (result.ok) {
        setSuccess("Cargo job created and initialised.");
        setJobName("");
        setCustomer("");
        setContractValue("");
        setCostCentre("");
        window.setTimeout(() => window.location.reload(), 1200);
      } else setError(result.error || "Failed to create cargo job.");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "An unexpected error occurred.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function viewJob(job: Job) {
    setLoadingDetails(true);
    try {
      const result = await getJobCostingAction(job.id);
      if (result.ok) setSelectedJob(result.data);
      else alert(result.error || "Failed to load job details.");
    } catch (caught) {
      alert(caught instanceof Error ? caught.message : "An error occurred.");
    } finally {
      setLoadingDetails(false);
    }
  }

  return (
    <>
      <AccountingMetrics>
        <AccountingMetric
          label="Contract value"
          value={`₹${totalContractValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`}
          detail="Total active contract pipeline"
        />
        <AccountingMetric
          label="Actual net profit"
          value={`₹${totalNetProfit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`}
          detail="Posted income less posted expense"
        />
        <AccountingMetric
          label="Average margin"
          value={`${averageMargin.toFixed(1)}%`}
          detail="Across the visible cargo register"
        />
        <AccountingMetric
          label="Active jobs"
          value={activeJobs}
          detail="Cargo jobs currently open"
        />
      </AccountingMetrics>

      <AccountingSection
        eyebrow="Job accounting"
        title="Cargo costing register"
        description="Select a job to inspect its sales, purchases, and linked general-ledger postings."
        actions={
          <AccountingAction onClick={() => setShowCreate(true)}>
            <Plus aria-hidden="true" size={16} />
            New costing job
          </AccountingAction>
        }
      >
        <div className="mnx-accounting-card-grid">
          {jobs.map((job) => (
            <AccountingRecordCard
              disabled={loadingDetails}
              key={job.id}
              onClick={() => viewJob(job)}
            >
              <header>
                <div>
                  <h3>{job.jobName}</h3>
                  <small>
                    {job.jobCode} · {job.customerName}
                  </small>
                </div>
                <AccountingStatus status={job.status} />
              </header>
              <div className="mnx-accounting-detail-list">
                <div>
                  <dt>Contract</dt>
                  <dd>₹{job.contractValue.toLocaleString("en-IN")}</dd>
                </div>
                <div>
                  <dt>Expense</dt>
                  <dd>₹{job.actualExpense.toLocaleString("en-IN")}</dd>
                </div>
                <div>
                  <dt>Margin</dt>
                  <dd>{job.marginPercent.toFixed(1)}%</dd>
                </div>
              </div>
              <footer>
                <span>{new Date(job.startDate).toLocaleDateString("en-IN")}</span>
                <strong
                  className={
                    job.netProfit >= 0
                      ? "mnx-accounting-amount-success"
                      : "mnx-accounting-amount-danger"
                  }
                >
                  ₹{job.netProfit.toLocaleString("en-IN")} net
                </strong>
              </footer>
            </AccountingRecordCard>
          ))}
        </div>
      </AccountingSection>

      <AccountingDialog
        open={Boolean(selectedJob)}
        onClose={() => setSelectedJob(null)}
        size="wide"
        title={selectedJob ? `${selectedJob.jobName} details` : "Job details"}
        description={
          selectedJob
            ? `${selectedJob.jobCode} · ${selectedJob.customer?.name || "Customer"}`
            : undefined
        }
      >
        {selectedJob ? (
          <div className="mnx-accounting-form">
            <AccountingMetrics>
              <AccountingMetric
                label="Contract value"
                value={`₹${Number(selectedJob.contractValue).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`}
              />
              <AccountingMetric
                label="Total invoiced"
                value={`₹${selectedJob.salesInvoices
                  .reduce(
                    (sum: number, invoice: any) =>
                      sum + Number(invoice.grandTotal),
                    0,
                  )
                  .toLocaleString("en-IN", { minimumFractionDigits: 2 })}`}
              />
              <AccountingMetric
                label="Purchase cost"
                value={`₹${selectedJob.purchaseInvoices
                  .reduce(
                    (sum: number, invoice: any) =>
                      sum + Number(invoice.grandTotal),
                    0,
                  )
                  .toLocaleString("en-IN", { minimumFractionDigits: 2 })}`}
              />
            </AccountingMetrics>
            <AccountingTable>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Account</th>
                  <th>Debit</th>
                  <th>Credit</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {selectedJob.glEntries.length === 0 ? (
                  <AccountingEmptyTableRow colSpan={5}>
                    No ledger transactions are linked to this cargo job.
                  </AccountingEmptyTableRow>
                ) : (
                  selectedJob.glEntries.map((entry: any) => (
                    <tr key={entry.id}>
                      <td>
                        {new Date(entry.postingDate).toLocaleDateString("en-IN")}
                      </td>
                      <td>
                        <strong>{entry.account.accountName}</strong>
                        <small>{entry.account.accountCode}</small>
                      </td>
                      <td className="mnx-accounting-amount">
                        {Number(entry.debit) > 0
                          ? `₹${Number(entry.debit).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
                          : "—"}
                      </td>
                      <td className="mnx-accounting-amount">
                        {Number(entry.credit) > 0
                          ? `₹${Number(entry.credit).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
                          : "—"}
                      </td>
                      <td>{entry.remarks || "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </AccountingTable>
          </div>
        ) : null}
      </AccountingDialog>

      <AccountingDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Initialise cargo job"
        description="Create the costing record used to connect contract value, invoices, purchases, and ledger activity."
        footer={
          <>
            <AccountingAction
              type="button"
              variant="secondary"
              onClick={() => setShowCreate(false)}
            >
              Cancel
            </AccountingAction>
            <AccountingAction
              disabled={loading}
              form="accounting-job-form"
              type="submit"
            >
              {loading ? <Loader2 aria-hidden="true" className="animate-spin" size={16} /> : null}
              Initialise job
            </AccountingAction>
          </>
        }
      >
        <form
          className="mnx-accounting-form"
          id="accounting-job-form"
          onSubmit={createJob}
        >
          {error ? <AccountingAlert variant="danger">{error}</AccountingAlert> : null}
          {success ? (
            <AccountingAlert variant="success">{success}</AccountingAlert>
          ) : null}
          <AccountingField label="Cargo job name" required>
            <AccountingInput
              required
              value={jobName}
              onChange={(event) => setJobName(event.target.value)}
            />
          </AccountingField>
          <AccountingField label="Customer" required>
            <AccountingSelect
              required
              value={customer}
              onChange={(event) => setCustomer(event.target.value)}
            >
              <option value="">Select customer</option>
              {customers.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </AccountingSelect>
          </AccountingField>
          <AccountingField label="Contract value" required>
            <AccountingInput
              required
              type="number"
              min="0"
              step="0.01"
              value={contractValue}
              onChange={(event) => setContractValue(event.target.value)}
            />
          </AccountingField>
          <div className="mnx-accounting-form-grid">
            <AccountingField label="Start date" required>
              <DateInput
                required
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
              />
            </AccountingField>
            <AccountingField label="Expected end date">
              <DateInput
                value={expectedEndDate}
                onChange={(event) => setExpectedEndDate(event.target.value)}
              />
            </AccountingField>
          </div>
          <AccountingField label="Cost centre">
            <AccountingInput
              value={costCentre}
              onChange={(event) => setCostCentre(event.target.value)}
            />
          </AccountingField>
        </form>
      </AccountingDialog>
    </>
  );
}
