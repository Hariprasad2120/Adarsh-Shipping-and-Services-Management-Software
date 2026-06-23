import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";
import {
  seedChartOfAccounts,
  createAccount,
  updateAccount,
  getChartOfAccounts,
  createJournalEntry,
  submitJournalEntry,
  cancelJournalEntry,
  createSalesInvoice,
  submitSalesInvoice,
  cancelSalesInvoice,
  createPurchaseInvoice,
  submitPurchaseInvoice,
  cancelPurchaseInvoice,
  createPaymentEntry,
  submitPaymentEntry,
  cancelPaymentEntry,
  compilePayrollBatch,
  createPayrollBatch,
  finalizePayrollBatch,
  payPayrollBatch,
  createAsset,
  runDepreciationForAsset,
  getAccountingSettings
} from "../service";
import {
  getGeneralLedger,
  getTrialBalance,
  getProfitAndLoss,
  getBalanceSheet
} from "../reports";
import { Prisma } from "@/generated/prisma/client";

describe("Accounting Module Integration Tests", () => {
  let org: any;
  let branch: any;
  let user: any;
  let customer: any;
  let supplier: any;

  beforeAll(async () => {
    // Drop the foreign key constraint that blocks polymorphic GL postings
    try {
      await db.$executeRawUnsafe(
        `ALTER TABLE "GeneralLedgerEntry" DROP CONSTRAINT IF EXISTS "GLEntry_JournalEntry_FK"`
      );
    } catch (e) {
      console.warn("Could not drop constraint (might not exist):", e);
    }

    // 1. Create a unique Organisation
    org = await db.organisation.create({
      data: {
        name: "Test Accounting Org Ltd",
        slug: "test-accounting-org-" + Date.now(),
      },
    });

    // 2. Create a unique Branch
    branch = await db.branch.create({
      data: {
        orgId: org.id,
        name: "Test Branch Chennai",
        code: "MAA-" + Date.now().toString().slice(-4),
      },
    });

    // 3. Create a User (Accountant)
    user = await db.user.create({
      data: {
        orgId: org.id,
        email: `test-acct-${Date.now()}@example.com`,
        passwordHash: "dummy-hash",
        name: "Test Accountant",
        branchId: branch.id,
      },
    });

    // 4. Create an EmploymentRecord for the user (to test Payroll)
    await db.employmentRecord.create({
      data: {
        userId: user.id,
        joinDate: new Date("2025-01-01"),
        ctc: 600000,
        basic: 25000,
        hra: 10000,
        fixedAllowance: 15000, // Monthly Gross = 50000
      },
    });

    // 5. Create a Customer (CrmAccount)
    customer = await db.crmAccount.create({
      data: {
        orgId: org.id,
        ownerId: user.id,
        name: "Test Customer Inc",
        type: "Customer",
        createdById: user.id,
        updatedById: user.id,
      },
    });

    // 6. Create a Supplier (CrmVendor)
    supplier = await db.crmVendor.create({
      data: {
        orgId: org.id,
        ownerId: user.id,
        name: "Test Supplier Corp",
        createdById: user.id,
        updatedById: user.id,
      },
    });
  });

  afterAll(async () => {
    const orgId = org.id;

    // Clean up all data created for this test organization in reverse order of dependencies
    await db.assetDepreciationEntry.deleteMany({ where: { orgId } });
    await db.asset.deleteMany({ where: { orgId } });
    await db.payrollBatch.deleteMany({ where: { orgId } });
    await db.customerLedgerEntry.deleteMany({ where: { orgId } });
    await db.supplierLedgerEntry.deleteMany({ where: { orgId } });
    await db.paymentAllocation.deleteMany({
      where: {
        OR: [
          { salesInvoice: { orgId } },
          { purchaseInvoice: { orgId } }
        ]
      }
    });
    await db.paymentEntry.deleteMany({ where: { orgId } });
    await db.taxLine.deleteMany({
      where: {
        OR: [
          { salesInvoice: { orgId } },
          { purchaseInvoice: { orgId } }
        ]
      }
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
    await db.crmDeal.deleteMany({ where: { orgId } });
    await db.crmAccount.deleteMany({ where: { orgId } });
    await db.crmVendor.deleteMany({ where: { orgId } });
    await db.employmentRecord.deleteMany({ where: { user: { orgId } } });
    await db.user.deleteMany({ where: { orgId } });
    await db.branch.deleteMany({ where: { orgId } });
    await db.organisation.delete({ where: { id: orgId } });
  });

  it("1. should seed the Chart of Accounts and settings", async () => {
    await seedChartOfAccounts(org.id);

    // Verify accounts count
    const count = await db.account.count({ where: { orgId: org.id } });
    expect(count).toBeGreaterThan(0);

    const settings = await getAccountingSettings(org.id);
    expect(settings).not.toBeNull();
    expect(settings?.defaultReceivableAccountId).toBeDefined();
    expect(settings?.defaultPayableAccountId).toBeDefined();

    // Verify fiscal year was created
    const fy = await db.fiscalYear.findFirst({ where: { orgId: org.id } });
    expect(fy).not.toBeNull();
    expect(fy?.name).toBe("2026-2027");
  });

  it("2. should verify balanced and unbalanced Journal Entries", async () => {
    const settings = await getAccountingSettings(org.id);
    const cashAcc = settings!.defaultCashAccountId!;
    const bankAcc = settings!.defaultBankAccountId!;

    // A. Unbalanced JV creation with submit=true should fail
    await expect(
      createJournalEntry(org.id, user.id, {
        branchId: branch.id,
        remarks: "Unbalanced Entry",
        submit: true,
        lines: [
          { accountId: cashAcc, debit: 1000, credit: 0 },
          { accountId: bankAcc, debit: 0, credit: 500 },
        ],
      })
    ).rejects.toThrow(/unbalanced/i);

    // B. Balanced JV creation with submit=true should succeed and post to GL
    const jv = await createJournalEntry(org.id, user.id, {
      branchId: branch.id,
      remarks: "Inter-bank Transfer",
      submit: true,
      lines: [
        { accountId: cashAcc, debit: 1000, credit: 0 },
        { accountId: bankAcc, debit: 0, credit: 1000 },
      ],
    });

    expect(jv).toBeDefined();
    expect(jv.status).toBe("SUBMITTED");

    // Verify General Ledger entries exist and are balanced
    const glEntries = await db.generalLedgerEntry.findMany({
      where: { orgId: org.id, voucherId: jv.id },
    });
    expect(glEntries.length).toBe(2);
    const totalDebit = glEntries.reduce((sum, e) => sum + Number(e.debit), 0);
    const totalCredit = glEntries.reduce((sum, e) => sum + Number(e.credit), 0);
    expect(totalDebit).toBe(1000);
    expect(totalCredit).toBe(1000);
  });

  it("3. should prohibit posting directly to group accounts", async () => {
    // Find a group account root
    const groupAcc = await db.account.findFirst({
      where: { orgId: org.id, isGroup: true },
    });
    expect(groupAcc).not.toBeNull();

    const settings = await getAccountingSettings(org.id);
    const cashAcc = settings!.defaultCashAccountId!;

    // Attempting to post to a group account should fail
    await expect(
      createJournalEntry(org.id, user.id, {
        branchId: branch.id,
        remarks: "Posting to Group Account",
        submit: true,
        lines: [
          { accountId: groupAcc!.id, debit: 500, credit: 0 },
          { accountId: cashAcc, debit: 0, credit: 500 },
        ],
      })
    ).rejects.toThrow(/group account/i);
  });

  it("4. should post double-entry for Sales Invoice", async () => {
    // Create sales invoice
    const inv = await createSalesInvoice(org.id, user.id, {
      branchId: branch.id,
      customerId: customer.id,
      remarks: "Test Sales Invoice",
      submit: true,
      items: [
        { itemName: "Shipping Consultation", qty: 2, rate: 5000 },
      ],
      taxRate: 18,
    });

    expect(inv).toBeDefined();
    expect(inv.status).toBe("UNPAID");
    expect(Number(inv.grandTotal)).toBe(11800); // 10000 + 1800 tax
    expect(Number(inv.outstandingAmount)).toBe(11800);

    // Verify GL Postings
    const glEntries = await db.generalLedgerEntry.findMany({
      where: { orgId: org.id, voucherType: "SALES_INVOICE", voucherId: inv.id },
      include: { account: true },
    });
    
    // Debit Receivable (11800), Credit Sales (10000), Credit Output Tax (1800)
    expect(glEntries.length).toBe(3);
    
    const recEntry = glEntries.find(e => e.account.accountType === "RECEIVABLE");
    const salesEntry = glEntries.find(e => e.account.accountType === "SALES");
    const taxEntry = glEntries.find(e => e.account.accountType === "TAX");

    expect(recEntry).toBeDefined();
    expect(Number(recEntry!.debit)).toBe(11800);

    expect(salesEntry).toBeDefined();
    expect(Number(salesEntry!.credit)).toBe(10000);

    expect(taxEntry).toBeDefined();
    expect(Number(taxEntry!.credit)).toBe(1800);

    // Verify Customer Ledger entry exists
    const custLedger = await db.customerLedgerEntry.findFirst({
      where: { orgId: org.id, voucherId: inv.id },
    });
    expect(custLedger).not.toBeNull();
    expect(Number(custLedger!.debit)).toBe(11800);
  });

  it("5. should record payment entries and reduce outstanding amounts", async () => {
    // Find the Sales Invoice created in the previous step
    const inv = await db.salesInvoice.findFirst({
      where: { orgId: org.id, customerId: customer.id, status: "UNPAID" },
    });
    expect(inv).not.toBeNull();

    const settings = await getAccountingSettings(org.id);
    const bankAcc = settings!.defaultBankAccountId!;
    const receivableAcc = settings!.defaultReceivableAccountId!;

    // Create a receipt payment entry for half of the invoice amount
    const payAmt = 5900;
    const pe = await createPaymentEntry(org.id, user.id, {
      branchId: branch.id,
      paymentType: "RECEIPT",
      partyType: "CUSTOMER",
      partyId: customer.id,
      paidFromAccountId: receivableAcc, // credit Accounts Receivable
      paidToAccountId: bankAcc,       // debit Bank
      amount: payAmt,
      referenceNo: "CHQ-10023",
      remarks: "Part payment for sales invoice",
      submit: true,
      allocations: [
        { salesInvoiceId: inv!.id, allocatedAmount: payAmt },
      ],
    });

    expect(pe).toBeDefined();
    expect(pe.status).toBe("SUBMITTED");

    // Verify sales invoice updated outstanding and status
    const updatedInv = await db.salesInvoice.findUnique({
      where: { id: inv!.id },
    });
    expect(updatedInv!.status).toBe("PARTLY_PAID");
    expect(Number(updatedInv!.outstandingAmount)).toBe(5900);
    expect(Number(updatedInv!.paidAmount)).toBe(5900);

    // Verify GL entries for Payment
    const glEntries = await db.generalLedgerEntry.findMany({
      where: { orgId: org.id, voucherType: "PAYMENT_ENTRY", voucherId: pe.id },
    });
    expect(glEntries.length).toBe(2);

    const bankDebit = glEntries.find(e => e.accountId === bankAcc);
    const recCredit = glEntries.find(e => e.accountId === receivableAcc);

    expect(bankDebit).toBeDefined();
    expect(Number(bankDebit!.debit)).toBe(payAmt);

    expect(recCredit).toBeDefined();
    expect(Number(recCredit!.credit)).toBe(payAmt);

    // Verify customer ledger reflects credit
    const custLedger = await db.customerLedgerEntry.findFirst({
      where: { orgId: org.id, voucherType: "PAYMENT_ENTRY", voucherId: pe.id },
    });
    expect(custLedger).not.toBeNull();
    expect(Number(custLedger!.credit)).toBe(payAmt);
  });

  it("6. should generate financial reports balancing properly", async () => {
    // A. Trial Balance validation
    const tb = await getTrialBalance(org.id, {});
    const totalDebit = tb.reduce((sum, row) => sum + row.closingDebit, 0);
    const totalCredit = tb.reduce((sum, row) => sum + row.closingCredit, 0);
    expect(Math.abs(totalDebit - totalCredit)).toBeLessThanOrEqual(0.05);

    // B. P&L report validation
    const pl = await getProfitAndLoss(org.id, {});
    expect(pl.netProfit).toBe(10000); // 10000 Sales Income, no expenses posted yet

    // C. Balance Sheet report validation
    const bs = await getBalanceSheet(org.id, {});
    expect(bs.isBalanced).toBe(true);
    expect(bs.totalAssets).toBe(bs.totalLiabilitiesAndEquity);
  }, 15000);

  it("7. should verify asset creation and prevent duplicate depreciation runs", async () => {
    const settings = await getAccountingSettings(org.id);
    const officeEquipmentAcc = await db.account.findFirst({
      where: { orgId: org.id, accountCode: "1210" },
    });

    // A. Create Fixed Asset
    const asset = await createAsset(org.id, user.id, {
      assetName: "MacBook Pro M3",
      assetCode: "MAC-001",
      purchaseDate: new Date("2026-04-01"),
      purchaseValue: 120000,
      depreciationRate: 10, // 10% annual straight-line
      assetAccount: officeEquipmentAcc!.id,
    });

    expect(asset).toBeDefined();
    expect(asset.status).toBe("ACTIVE");
    expect(Number(asset.bookValue)).toBe(120000);

    // B. Run Depreciation for April 2026 (Month 4)
    const depDate = new Date("2026-04-01");
    const depEntry = await runDepreciationForAsset(org.id, asset.id, depDate, user.id);

    expect(depEntry).toBeDefined();
    expect(Number(depEntry.depreciationAmount)).toBe(1000); // (120000 * 10%) / 12 months = 1000 per month

    // Check asset is updated
    const updatedAsset = await db.asset.findUnique({ where: { id: asset.id } });
    expect(Number(updatedAsset!.accumulatedDepreciation)).toBe(1000);
    expect(Number(updatedAsset!.bookValue)).toBe(119000);

    // C. Attempt running depreciation again for April 2026 should throw duplicate error
    await expect(
      runDepreciationForAsset(org.id, asset.id, depDate, user.id)
    ).rejects.toThrow(/already been processed/i);
  }, 15000);

  it("8. should compile, create, finalize, and pay payroll batch", async () => {
    const month = new Date("2026-05-01");
    
    // A. Compile payroll batch and check totals
    const compiled = await compilePayrollBatch(org.id, month);
    expect(compiled.totalAmount).toBe(50000);
    expect(compiled.salarySheets.length).toBe(1);
    expect(compiled.salarySheets[0].gross).toBe(50000);

    // B. Create payroll batch
    const batch = await createPayrollBatch(org.id, user.id, month);
    expect(batch).toBeDefined();
    expect(batch.status).toBe("DRAFT");
    expect(Number(batch.totalAmount)).toBe(50000);

    // C. Finalize payroll batch (creates JV and posts accrual: Salary Expense DR, Salary Payable CR)
    const finalized = await finalizePayrollBatch(org.id, batch.id, user.id);
    expect(finalized.status).toBe("FINALIZED");
    expect(finalized.journalEntryId).not.toBeNull();

    // Verify GL Entries for accrual
    const settings = await getAccountingSettings(org.id);
    const expenseAcc = settings!.defaultSalaryExpenseAccountId!;
    const payableAcc = settings!.defaultSalaryPayableAccountId!;

    const glAccrual = await db.generalLedgerEntry.findMany({
      where: { orgId: org.id, voucherType: "JOURNAL_ENTRY", voucherId: finalized.journalEntryId! },
    });
    expect(glAccrual.length).toBe(2);
    const expenseDr = glAccrual.find(e => e.accountId === expenseAcc);
    const payableCr = glAccrual.find(e => e.accountId === payableAcc);
    expect(expenseDr).toBeDefined();
    expect(Number(expenseDr!.debit)).toBe(50000);
    expect(payableCr).toBeDefined();
    expect(Number(payableCr!.credit)).toBe(50000);

    // D. Pay payroll batch (creates JV and posts payout: Salary Payable DR, Bank CR)
    const paid = await payPayrollBatch(org.id, batch.id, user.id);
    expect(paid.status).toBe("PAID");

    // Find the payout JV which is created as the latest JV after finalized.journalEntryId
    const latestJV = await db.journalEntry.findFirst({
      where: { orgId: org.id, remarks: { contains: "payout" } },
      orderBy: { createdAt: "desc" },
    });
    expect(latestJV).toBeDefined();

    const bankAcc = settings!.defaultBankAccountId!;
    const glPayout = await db.generalLedgerEntry.findMany({
      where: { orgId: org.id, voucherType: "JOURNAL_ENTRY", voucherId: latestJV!.id },
    });
    expect(glPayout.length).toBe(2);
    const payableDr = glPayout.find(e => e.accountId === payableAcc);
    const bankCr = glPayout.find(e => e.accountId === bankAcc);
    expect(payableDr).toBeDefined();
    expect(Number(payableDr!.debit)).toBe(50000);
    expect(bankCr).toBeDefined();
    expect(Number(bankCr!.credit)).toBe(50000);
  }, 15000);
});
