import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "@/lib/db";

import { getBalanceSheet, getProfitAndLoss, getTrialBalance } from "../reports";
import {
  compilePayrollBatch,
  createAsset,
  createJournalEntry,
  createSalesInvoice,
  getAccountingSettings,
  runDepreciationForAsset,
  seedChartOfAccounts,
} from "../service";

describe("Accounting legacy compatibility after canonical posting cutover", () => {
  const suffix = Date.now().toString();
  let orgId: string;
  let branchId: string;
  let userId: string;
  let customerId: string;

  beforeAll(async () => {
    const org = await db.organisation.create({
      data: {
        name: "P3TEST Accounting Compatibility Org",
        slug: `p3test-accounting-compat-${suffix}`,
      },
    });
    orgId = org.id;
    const branch = await db.branch.create({
      data: { orgId, name: "P3TEST Branch", code: `P3-${suffix.slice(-6)}` },
    });
    branchId = branch.id;
    const user = await db.user.create({
      data: {
        orgId,
        branchId,
        email: `p3test-accounting-${suffix}@example.com`,
        passwordHash: "synthetic-test-only",
        name: "P3TEST Accountant",
      },
    });
    userId = user.id;
    const customer = await db.crmAccount.create({
      data: {
        orgId,
        ownerId: userId,
        name: "P3TEST Customer",
        type: "Customer",
        createdById: userId,
        updatedById: userId,
      },
    });
    customerId = customer.id;
    await seedChartOfAccounts(orgId);
  });

  afterAll(async () => {
    await db.assetDepreciationEntry.deleteMany({ where: { orgId } });
    await db.asset.deleteMany({ where: { orgId } });
    await db.payrollBatch.deleteMany({ where: { orgId } });
    await db.customerLedgerEntry.deleteMany({ where: { orgId } });
    await db.supplierLedgerEntry.deleteMany({ where: { orgId } });
    await db.paymentEntry.deleteMany({ where: { orgId } });
    await db.taxLine.deleteMany({
      where: { OR: [{ salesInvoice: { orgId } }, { purchaseInvoice: { orgId } }] },
    });
    await db.salesInvoiceItem.deleteMany({ where: { salesInvoice: { orgId } } });
    await db.salesInvoice.deleteMany({ where: { orgId } });
    await db.purchaseInvoiceItem.deleteMany({ where: { purchaseInvoice: { orgId } } });
    await db.purchaseInvoice.deleteMany({ where: { orgId } });
    await db.generalLedgerEntry.deleteMany({ where: { orgId } });
    await db.journalEntryLine.deleteMany({ where: { journalEntry: { orgId } } });
    await db.journalEntry.deleteMany({ where: { orgId } });
    await db.accountingSettings.deleteMany({ where: { orgId } });
    await db.fiscalYear.deleteMany({ where: { orgId } });
    await db.account.deleteMany({ where: { orgId } });
    await db.crmAccount.deleteMany({ where: { orgId } });
    await db.user.deleteMany({ where: { orgId } });
    await db.branch.deleteMany({ where: { orgId } });
    await db.organisation.delete({ where: { id: orgId } });
  });

  it("retains chart-of-accounts and settings compatibility", async () => {
    expect(await db.account.count({ where: { orgId } })).toBeGreaterThan(0);
    const settings = await getAccountingSettings(orgId);
    expect(settings?.defaultReceivableAccountId).toBeTruthy();
    expect(settings?.defaultPayableAccountId).toBeTruthy();
  });

  it("accepts exact decimal strings for drafts and creates no posted effect", async () => {
    const settings = await getAccountingSettings(orgId);
    await expect(
      createJournalEntry(orgId, userId, {
        branchId,
        lines: [
          { accountId: settings!.defaultCashAccountId!, debit: 0.1, credit: 0 },
          { accountId: settings!.defaultBankAccountId!, debit: 0, credit: 0.1 },
        ],
      }),
    ).rejects.toThrow(/JavaScript number is not accepted/);

    const draft = await createJournalEntry(orgId, userId, {
      branchId,
      submit: true,
      lines: [
        { accountId: settings!.defaultCashAccountId!, debit: "1000.00", credit: "0" },
        { accountId: settings!.defaultBankAccountId!, debit: "0", credit: "1000.00" },
      ],
    });
    expect(draft.status).toBe("DRAFT");
    expect(await db.generalLedgerEntry.count({ where: { orgId, voucherId: draft.id } })).toBe(0);
  });

  it("fails closed and rolls back a legacy invoice direct-post attempt", async () => {
    await expect(
      createSalesInvoice(orgId, userId, {
        branchId,
        customerId,
        remarks: "P3TEST blocked legacy posting",
        submit: true,
        dueDate: new Date("2026-05-01"),
        items: [{ itemName: "Synthetic service", qty: 1, rate: 100 }],
        taxRate: 0,
      }),
    ).rejects.toThrow(/LEGACY_DIRECT_LEDGER_WRITE_BLOCKED/);
    expect(await db.salesInvoice.count({ where: { orgId } })).toBe(0);
    expect(await db.generalLedgerEntry.count({ where: { orgId } })).toBe(0);
  });

  it("keeps reports balanced when blocked legacy attempts leave no effects", async () => {
    const trialBalance = await getTrialBalance(orgId, {});
    expect(trialBalance.every((row) => row.closingDebit === row.closingCredit)).toBe(true);
    expect((await getProfitAndLoss(orgId, {})).netProfit).toBe(0);
    const balanceSheet = await getBalanceSheet(orgId, {});
    expect(balanceSheet.isBalanced).toBe(true);
  });

  it("gates depreciation until a validated versioned policy exists", async () => {
    const assetAccount = await db.account.findFirstOrThrow({
      where: { orgId, accountCode: "1210" },
    });
    const asset = await createAsset(orgId, userId, {
      assetName: "P3TEST Asset",
      assetCode: `P3-ASSET-${suffix}`,
      purchaseDate: new Date("2026-04-01"),
      purchaseValue: 120000,
      depreciationRate: 10,
      assetAccount: assetAccount.id,
    });
    await expect(
      runDepreciationForAsset(orgId, asset.id, new Date("2026-04-01"), userId),
    ).rejects.toThrow(/DEPRECIATION_POSTING_GATED/);
    expect(await db.assetDepreciationEntry.count({ where: { orgId } })).toBe(0);
  });

  it("rejects Accounting-owned payroll compilation", async () => {
    await expect(compilePayrollBatch(orgId, new Date("2026-05-01"))).rejects.toThrow(
      /HRMS must submit an immutable approved payroll-run snapshot/,
    );
    expect(await db.payrollBatch.count({ where: { orgId } })).toBe(0);
  });
});
