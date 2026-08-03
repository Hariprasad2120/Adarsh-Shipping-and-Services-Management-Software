import { BriefcaseBusiness, CreditCard, HandCoins } from "lucide-react";

import {
  type AccountingWorkflowCardItem,
  AccountingWorkflowCards,
} from "@/components/monolith/accounting-workflow-cards";
import {
  AccountingActionLink,
  AccountingAlert,
  AccountingDetail,
  AccountingDetailList,
  AccountingEmptyTableRow,
  AccountingMetric,
  AccountingMetrics,
  AccountingRoutePageHeader,
  AccountingSection,
  AccountingStatus,
  AccountingTable,
} from "@/components/monolith/accounting-workspace";
import { can } from "@/lib/rbac";
import { requireAccountingRouteAccess } from "@/modules/accounting/operational-auth";
import { formatAccountingMoney } from "@/modules/accounting/operational-helpers";
import { listAllExpenses } from "@/modules/cha/service";
import { listReimbursementClaims } from "@/modules/hrms/on-duty";

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN");
}

function sumAmounts(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

function getExpenseRequestAmount(request: {
  lines: Array<{ amount: number | string | { toString(): string } }>;
}) {
  return sumAmounts(
    request.lines.map((line) => Number(line.amount?.toString?.() ?? line.amount ?? 0)),
  );
}

function getExpenseRequestRequiredDate(request: {
  lines: Array<{ requiredDate: Date | string | null }>;
}) {
  const requiredDates = request.lines
    .map((line) => (line.requiredDate ? new Date(line.requiredDate) : null))
    .filter((value): value is Date => Boolean(value))
    .sort((left, right) => left.getTime() - right.getTime());
  return requiredDates[0] ?? null;
}

function getExpenseRequestCategory(request: {
  lines: Array<{ category: string | null }>;
}) {
  return request.lines[0]?.category || "Operational expense";
}

export default async function AccountingExpensesPage() {
  const { caps, orgId, userId } = await requireAccountingRouteAccess(
    "/accounting/expenses",
  );

  const [chaExpenseAccess, hrmsReimbursementAccess, expenseRequests, reimbursementClaims] =
    await Promise.all([
      Promise.all([
        can(userId, "cha.expense.manage"),
        can(userId, "cha.expense.pay"),
      ]).then(([canManage, canPay]) => canManage || canPay),
      can(userId, "hrms.salary.read"),
      listAllExpenses(orgId, {}, { userId, canViewAll: true }),
      listReimbursementClaims(orgId),
    ]);

  const readyOperationalExpenses = expenseRequests
    .filter((request) =>
      ["APPROVED", "READY_FOR_DISBURSEMENT"].includes(request.status),
    )
    .slice(0, 12);
  const approvedReimbursements = reimbursementClaims
    .filter((claim) => claim.status === "APPROVED")
    .slice(0, 12);

  const readyOperationalAmount = sumAmounts(
    readyOperationalExpenses.map((request) => getExpenseRequestAmount(request)),
  );
  const approvedReimbursementAmount = sumAmounts(
    approvedReimbursements.map((claim) => Number(claim.amount ?? 0)),
  );

  const workflows: AccountingWorkflowCardItem[] = [
    caps["accounting.payment.read"]
      ? {
          href: "/accounting/vendor-payments",
          title: "Vendor Payments",
          description:
            "Review canonical supplier disbursements and payment lineage alongside upstream expense queues.",
          icon: CreditCard,
        }
      : null,
    chaExpenseAccess
      ? {
          href: "/expense",
          title: "Operational Expenses",
          description:
            "Open the CHA expense workflow to review, approve, and register live operational disbursements.",
          icon: BriefcaseBusiness,
        }
      : null,
    hrmsReimbursementAccess
      ? {
          href: "/hrms/reimbursement",
          title: "Fuel Reimbursements",
          description:
            "Open the HRMS reimbursement workflow to approve or mark paid employee fuel claims.",
          icon: HandCoins,
        }
      : null,
  ].filter((value): value is AccountingWorkflowCardItem => value !== null);

  return (
    <>
      <AccountingRoutePageHeader
        actions={
          <div className="flex gap-2">
            {chaExpenseAccess ? (
              <AccountingActionLink href="/expense">
                Open expense workspace
              </AccountingActionLink>
            ) : null}
            {hrmsReimbursementAccess ? (
              <AccountingActionLink href="/hrms/reimbursement">
                Open reimbursement workspace
              </AccountingActionLink>
            ) : null}
          </div>
        }
      />
      <AccountingAlert>
        This workspace centralizes payable-ready operational expenses and
        employee reimbursements for Finance visibility. Direct canonical
        Accounting payment creation is not implied here because the upstream
        source flows do not yet resolve into customer or supplier subledger
        parties automatically.
      </AccountingAlert>
      <AccountingMetrics>
        <AccountingMetric
          label="Operational payouts"
          value={readyOperationalExpenses.length.toLocaleString("en-IN")}
          detail="CHA expense requests approved or ready for disbursement"
        />
        <AccountingMetric
          label="Operational amount"
          value={formatAccountingMoney(readyOperationalAmount.toFixed(2), "INR", 2)}
          detail="Pending disbursement across the current operational expense queue"
        />
        <AccountingMetric
          label="Approved reimbursements"
          value={approvedReimbursements.length.toLocaleString("en-IN")}
          detail="HR fuel claims approved and still awaiting payment marking"
        />
        <AccountingMetric
          label="Reimbursement amount"
          value={formatAccountingMoney(
            approvedReimbursementAmount.toFixed(2),
            "INR",
            2,
          )}
          detail="Approved employee reimbursement liability awaiting payout"
        />
      </AccountingMetrics>
      <AccountingSection
        eyebrow="Payment connectors"
        title="Expense settlement workspaces"
        description="Use the live upstream modules for approval, payout registration, and supporting-proof review until direct canonical settlement mapping exists."
      >
        <AccountingWorkflowCards items={workflows} />
      </AccountingSection>
      <AccountingSection
        eyebrow="Operational expenses"
        title="CHA payouts ready for disbursement"
        description="Approved or payout-ready operational expense requests that Accounts may still need to process in the source expense workflow."
      >
        <AccountingTable>
          <thead>
            <tr>
              <th>Request</th>
              <th>Requester</th>
              <th>Job / purpose</th>
              <th>Required date</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {readyOperationalExpenses.length === 0 ? (
              <AccountingEmptyTableRow colSpan={7}>
                No operational expense requests are currently waiting for payout.
              </AccountingEmptyTableRow>
            ) : (
              readyOperationalExpenses.map((request) => (
                <tr key={request.id}>
                  <td>
                    <div>
                      <strong>{request.job?.jobNumber ?? "Direct expense"}</strong>
                      <small>{getExpenseRequestCategory(request)}</small>
                    </div>
                  </td>
                  <td>{request.requestedBy?.name ?? "Unknown"}</td>
                  <td>
                    <div>
                      <strong>{request.job?.customer?.name ?? "Non-job expense"}</strong>
                      <small>{request.directPurpose || "No purpose recorded"}</small>
                    </div>
                  </td>
                  <td>{formatDate(getExpenseRequestRequiredDate(request))}</td>
                  <td className="mnx-accounting-amount">
                    {formatAccountingMoney(
                      getExpenseRequestAmount(request).toFixed(2),
                      "INR",
                      2,
                    )}
                  </td>
                  <td>
                    <AccountingStatus status={request.status} />
                  </td>
                  <td>
                    {chaExpenseAccess ? (
                      <AccountingActionLink
                        className="mnx-button-compact"
                        href={`/expense?search=${encodeURIComponent(request.job?.jobNumber ?? request.requestedBy?.name ?? "")}`}
                      >
                        Open source
                      </AccountingActionLink>
                    ) : "Source access required"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </AccountingTable>
      </AccountingSection>
      <AccountingSection
        eyebrow="Employee claims"
        title="Approved reimbursements awaiting payment"
        description="HR fuel reimbursement claims that are already approved and still need payout processing or payment confirmation in HRMS."
      >
        <AccountingTable>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Trip / purpose</th>
              <th>Distance</th>
              <th>Approved on</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {approvedReimbursements.length === 0 ? (
              <AccountingEmptyTableRow colSpan={7}>
                No approved reimbursements are currently waiting for payout.
              </AccountingEmptyTableRow>
            ) : (
              approvedReimbursements.map((claim) => (
                <tr key={claim.id}>
                  <td>{claim.user.name}</td>
                  <td>
                    <div>
                      <strong>
                        {claim.onDutyRequest.purpose || "On-duty trip reimbursement"}
                      </strong>
                      <small>
                        {formatDate(claim.onDutyRequest.fromDate)} to{" "}
                        {formatDate(claim.onDutyRequest.toDate)}
                      </small>
                    </div>
                  </td>
                  <td>{claim.distanceKm.toLocaleString("en-IN")} km</td>
                  <td>{formatDate(claim.approvedAt)}</td>
                  <td className="mnx-accounting-amount">
                    {formatAccountingMoney(claim.amount.toFixed(2), "INR", 2)}
                  </td>
                  <td>
                    <AccountingStatus status={claim.status} />
                  </td>
                  <td>
                    {hrmsReimbursementAccess ? (
                      <AccountingActionLink
                        className="mnx-button-compact"
                        href="/hrms/reimbursement"
                      >
                        Open source
                      </AccountingActionLink>
                    ) : "Source access required"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </AccountingTable>
      </AccountingSection>
      <AccountingSection
        eyebrow="Current boundary"
        title="Why this route does not post payments directly"
        description="The live expense and reimbursement modules still own approval, payout evidence, and party identity. Accounting can review the queue here, but canonical disbursement creation should only be added after the source flows resolve payable party mappings and settlement metadata explicitly."
      >
        <AccountingDetailList>
          <AccountingDetail
            label="CHA expenses"
            value="Operational payouts still complete through the CHA expense workflow, including proofs and manager or Accounts routing."
          />
          <AccountingDetail
            label="HR reimbursements"
            value="Fuel claims still complete through the HR reimbursement workflow, including reimbursement-rate policy and paid-state updates."
          />
          <AccountingDetail
            label="Next parity step"
            value="Add canonical payable-party and settlement mapping if these source flows need one-click Accounting payment creation later."
          />
        </AccountingDetailList>
      </AccountingSection>
    </>
  );
}
