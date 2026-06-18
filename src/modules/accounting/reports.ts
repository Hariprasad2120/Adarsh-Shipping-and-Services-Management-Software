import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { GLEntryLine, TrialBalanceRow, ProfitAndLossStatement, BalanceSheetStatement } from "./types";

// Helper to check the default account balance type
// Asset and Expense are Debit balance sheets. Liabilities, Equity, and Income are Credit balance sheets.
function getAccountDirection(rootType: string): "DR" | "CR" {
  if (rootType === "ASSET" || rootType === "EXPENSE") return "DR";
  return "CR";
}

// ─── General Ledger Report ───────────────────────────────────────────────────

export async function getGeneralLedger(
  orgId: string,
  filters: {
    branchId?: string | null;
    fromDate?: Date | null;
    toDate?: Date | null;
    accountId?: string | null;
  }
): Promise<any[]> {
  const where: Prisma.GeneralLedgerEntryWhereInput = { orgId };
  if (filters.branchId) where.branchId = filters.branchId;
  if (filters.accountId) where.accountId = filters.accountId;

  const dateFilter: Prisma.DateTimeFilter = {};
  if (filters.fromDate) dateFilter.gte = filters.fromDate;
  if (filters.toDate) dateFilter.lte = filters.toDate;
  if (Object.keys(dateFilter).length > 0) where.postingDate = dateFilter;

  // Get matching GL entries
  const entries = await db.generalLedgerEntry.findMany({
    where,
    orderBy: [{ postingDate: "asc" }, { createdAt: "asc" }],
    include: {
      account: { select: { accountCode: true, accountName: true, rootType: true } },
      branch: { select: { name: true } },
    },
  });

  // Calculate opening balance before fromDate
  let startingBalance = 0;
  if (filters.accountId) {
    const account = await db.account.findUnique({ where: { id: filters.accountId } });
    if (account) {
      const dir = getAccountDirection(account.rootType);
      const openingDb = Number(account.openingDebit);
      const openingCr = Number(account.openingCredit);
      startingBalance = dir === "DR" ? (openingDb - openingCr) : (openingCr - openingDb);

      if (filters.fromDate) {
        // Sum up GL entries before fromDate
        const historicEntries = await db.generalLedgerEntry.findMany({
          where: {
            orgId,
            accountId: filters.accountId,
            postingDate: { lt: filters.fromDate },
          },
        });

        historicEntries.forEach((ent) => {
          const deb = Number(ent.debit);
          const cred = Number(ent.credit);
          if (dir === "DR") {
            startingBalance += (deb - cred);
          } else {
            startingBalance += (cred - deb);
          }
        });
      }
    }
  }

  // Build rows with running balance
  let runningBalance = startingBalance;
  return entries.map((ent) => {
    const deb = Number(ent.debit);
    const cred = Number(ent.credit);
    const dir = getAccountDirection(ent.account.rootType);

    if (dir === "DR") {
      runningBalance += (deb - cred);
    } else {
      runningBalance += (cred - deb);
    }

    return {
      id: ent.id,
      postingDate: ent.postingDate,
      accountId: ent.accountId,
      accountCode: ent.account.accountCode,
      accountName: ent.account.accountName,
      partyType: ent.partyType,
      partyId: ent.partyId,
      voucherType: ent.voucherType,
      voucherId: ent.voucherId,
      debit: deb,
      credit: cred,
      remarks: ent.remarks,
      branchName: ent.branch?.name ?? "—",
      runningBalance,
      isCancelled: ent.isCancelled,
    };
  });
}

// ─── Trial Balance Report ────────────────────────────────────────────────────

export async function getTrialBalance(
  orgId: string,
  filters: {
    branchId?: string | null;
    fromDate?: Date | null;
    toDate?: Date | null;
    accountId?: string | null;
    includeZero?: boolean;
  }
): Promise<TrialBalanceRow[]> {
  // Fetch all active leaf accounts
  const accounts = await db.account.findMany({
    where: { orgId, isGroup: false },
    orderBy: { accountCode: "asc" },
  });

  const rows: TrialBalanceRow[] = [];

  for (const acc of accounts) {
    const dir = getAccountDirection(acc.rootType);
    let openingDebit = Number(acc.openingDebit);
    let openingCredit = Number(acc.openingCredit);

    // Sum historical GL Entries before fromDate
    if (filters.fromDate) {
      const historicWhere: Prisma.GeneralLedgerEntryWhereInput = {
        orgId,
        accountId: acc.id,
        postingDate: { lt: filters.fromDate },
      };
      if (filters.branchId) historicWhere.branchId = filters.branchId;

      const histEntries = await db.generalLedgerEntry.findMany({ where: historicWhere });
      histEntries.forEach((ent) => {
        openingDebit += Number(ent.debit);
        openingCredit += Number(ent.credit);
      });
    }

    // Standardize opening balances
    let finalOpeningDebit = 0;
    let finalOpeningCredit = 0;
    if (dir === "DR") {
      const balance = openingDebit - openingCredit;
      if (balance >= 0) finalOpeningDebit = balance;
      else finalOpeningCredit = Math.abs(balance);
    } else {
      const balance = openingCredit - openingDebit;
      if (balance >= 0) finalOpeningCredit = balance;
      else finalOpeningDebit = Math.abs(balance);
    }

    // Sum current GL entries during the period
    const currentWhere: Prisma.GeneralLedgerEntryWhereInput = {
      orgId,
      accountId: acc.id,
    };
    if (filters.branchId) currentWhere.branchId = filters.branchId;
    
    const dateFilter: Prisma.DateTimeFilter = {};
    if (filters.fromDate) dateFilter.gte = filters.fromDate;
    if (filters.toDate) dateFilter.lte = filters.toDate;
    if (Object.keys(dateFilter).length > 0) currentWhere.postingDate = dateFilter;

    const currentEntries = await db.generalLedgerEntry.findMany({ where: currentWhere });
    let debit = 0;
    let credit = 0;
    currentEntries.forEach((ent) => {
      debit += Number(ent.debit);
      credit += Number(ent.credit);
    });

    // Compute closing balance
    const totalDb = finalOpeningDebit + debit;
    const totalCr = finalOpeningCredit + credit;

    let closingDebit = 0;
    let closingCredit = 0;
    if (dir === "DR") {
      const balance = totalDb - totalCr;
      if (balance >= 0) closingDebit = balance;
      else closingCredit = Math.abs(balance);
    } else {
      const balance = totalCr - totalDb;
      if (balance >= 0) closingCredit = balance;
      else closingDebit = Math.abs(balance);
    }

    const hasBalances =
      finalOpeningDebit > 0 ||
      finalOpeningCredit > 0 ||
      debit > 0 ||
      credit > 0 ||
      closingDebit > 0 ||
      closingCredit > 0;

    if (filters.includeZero || hasBalances) {
      rows.push({
        accountId: acc.id,
        accountCode: acc.accountCode,
        accountName: acc.accountName,
        rootType: acc.rootType as any,
        openingDebit: finalOpeningDebit,
        openingCredit: finalOpeningCredit,
        debit,
        credit,
        closingDebit,
        closingCredit,
      });
    }
  }

  return rows;
}

// ─── Profit & Loss Statement ─────────────────────────────────────────────────

export async function getProfitAndLoss(
  orgId: string,
  filters: {
    branchId?: string | null;
    fromDate?: Date | null;
    toDate?: Date | null;
  }
): Promise<ProfitAndLossStatement> {
  const accounts = await db.account.findMany({
    where: { orgId, rootType: { in: ["INCOME", "EXPENSE"] }, isGroup: false },
    orderBy: { accountCode: "asc" },
  });

  const incomeAccounts: { code: string; name: string; amount: number }[] = [];
  const expenseAccounts: { code: string; name: string; amount: number }[] = [];
  let totalIncome = 0;
  let totalExpense = 0;

  for (const acc of accounts) {
    const currentWhere: Prisma.GeneralLedgerEntryWhereInput = {
      orgId,
      accountId: acc.id,
    };
    if (filters.branchId) currentWhere.branchId = filters.branchId;

    const dateFilter: Prisma.DateTimeFilter = {};
    if (filters.fromDate) dateFilter.gte = filters.fromDate;
    if (filters.toDate) dateFilter.lte = filters.toDate;
    if (Object.keys(dateFilter).length > 0) currentWhere.postingDate = dateFilter;

    const glEntries = await db.generalLedgerEntry.findMany({ where: currentWhere });
    let debitSum = 0;
    let creditSum = 0;
    glEntries.forEach((ent) => {
      debitSum += Number(ent.debit);
      creditSum += Number(ent.credit);
    });

    if (acc.rootType === "INCOME") {
      const balance = creditSum - debitSum;
      if (balance !== 0) {
        incomeAccounts.push({ code: acc.accountCode, name: acc.accountName, amount: balance });
        totalIncome += balance;
      }
    } else {
      const balance = debitSum - creditSum;
      if (balance !== 0) {
        expenseAccounts.push({ code: acc.accountCode, name: acc.accountName, amount: balance });
        totalExpense += balance;
      }
    }
  }

  return {
    income: { accounts: incomeAccounts, total: totalIncome },
    expense: { accounts: expenseAccounts, total: totalExpense },
    grossProfit: totalIncome - totalExpense, // simple gross calculation
    netProfit: totalIncome - totalExpense,
  };
}

// ─── Balance Sheet Statement ─────────────────────────────────────────────────

export async function getBalanceSheet(
  orgId: string,
  filters: {
    branchId?: string | null;
    toDate?: Date | null;
  }
): Promise<BalanceSheetStatement> {
  const accounts = await db.account.findMany({
    where: { orgId, rootType: { in: ["ASSET", "LIABILITY", "EQUITY"] }, isGroup: false },
    orderBy: { accountCode: "asc" },
  });

  const assetList: { code: string; name: string; amount: number }[] = [];
  const liabilityList: { code: string; name: string; amount: number }[] = [];
  const equityList: { code: string; name: string; amount: number }[] = [];

  let totalAssets = 0;
  let totalLiabilities = 0;
  let totalEquity = 0;

  for (const acc of accounts) {
    let openingDb = Number(acc.openingDebit);
    let openingCr = Number(acc.openingCredit);

    // Sum GL postings up to toDate
    const glWhere: Prisma.GeneralLedgerEntryWhereInput = {
      orgId,
      accountId: acc.id,
    };
    if (filters.branchId) glWhere.branchId = filters.branchId;
    if (filters.toDate) glWhere.postingDate = { lte: filters.toDate };

    const entries = await db.generalLedgerEntry.findMany({ where: glWhere });
    entries.forEach((ent) => {
      openingDb += Number(ent.debit);
      openingCr += Number(ent.credit);
    });

    const dir = getAccountDirection(acc.rootType);
    let balance = 0;
    if (dir === "DR") {
      balance = openingDb - openingCr;
    } else {
      balance = openingCr - openingDb;
    }

    if (balance !== 0) {
      const row = { code: acc.accountCode, name: acc.accountName, amount: balance };
      if (acc.rootType === "ASSET") {
        assetList.push(row);
        totalAssets += balance;
      } else if (acc.rootType === "LIABILITY") {
        liabilityList.push(row);
        totalLiabilities += balance;
      } else {
        equityList.push(row);
        totalEquity += balance;
      }
    }
  }

  // Net Profit for current year (all income entries - expense entries) up to toDate
  const plWhere: Prisma.GeneralLedgerEntryWhereInput = {
    orgId,
    account: { rootType: { in: ["INCOME", "EXPENSE"] } },
  };
  if (filters.branchId) plWhere.branchId = filters.branchId;
  if (filters.toDate) plWhere.postingDate = { lte: filters.toDate };

  const plEntries = await db.generalLedgerEntry.findMany({
    where: plWhere,
    include: { account: true },
  });

  let currentYearProfit = 0;
  plEntries.forEach((ent) => {
    const deb = Number(ent.debit);
    const cred = Number(ent.credit);
    if (ent.account.rootType === "INCOME") {
      currentYearProfit += (cred - deb);
    } else {
      currentYearProfit -= (deb - cred);
    }
  });

  totalEquity += currentYearProfit;
  const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;

  // Enforce validation rule
  const isBalanced = Math.abs(totalAssets - totalLiabilitiesAndEquity) <= 0.05;

  return {
    assets: { accounts: assetList, total: totalAssets },
    liabilities: { accounts: liabilityList, total: totalLiabilities },
    equity: { accounts: equityList, total: totalEquity },
    currentYearProfit,
    totalAssets,
    totalLiabilitiesAndEquity,
    isBalanced,
  };
}

// ─── Accounts Receivable (AR) Ageing ──────────────────────────────────────────
export async function getARAgeing(
  orgId: string,
  asOfDate: Date = new Date()
): Promise<any[]> {
  const unpaidInvoices = await db.salesInvoice.findMany({
    where: {
      orgId,
      status: { in: ["UNPAID", "PARTLY_PAID", "OVERDUE"] },
      postingDate: { lte: asOfDate },
    },
    include: {
      customer: { select: { name: true } },
    },
  });

  const customerMap = new Map<string, any>();

  for (const inv of unpaidInvoices) {
    const custId = inv.customerId;
    const custName = inv.customer?.name || "Unknown Customer";
    const outstanding = Number(inv.outstandingAmount);
    if (outstanding <= 0) continue;

    const diffTime = asOfDate.getTime() - new Date(inv.postingDate).getTime();
    const diffDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));

    if (!customerMap.has(custId)) {
      customerMap.set(custId, {
        customerId: custId,
        customerName: custName,
        totalOutstanding: 0,
        bucket0To30: 0,
        bucket31To60: 0,
        bucket61To90: 0,
        bucket90Plus: 0,
      });
    }

    const row = customerMap.get(custId);
    row.totalOutstanding += outstanding;

    if (diffDays <= 30) {
      row.bucket0To30 += outstanding;
    } else if (diffDays <= 60) {
      row.bucket31To60 += outstanding;
    } else if (diffDays <= 90) {
      row.bucket61To90 += outstanding;
    } else {
      row.bucket90Plus += outstanding;
    }
  }

  return Array.from(customerMap.values());
}

// ─── Accounts Payable (AP) Ageing ────────────────────────────────────────────
export async function getAPAgeing(
  orgId: string,
  asOfDate: Date = new Date()
): Promise<any[]> {
  const unpaidBills = await db.purchaseInvoice.findMany({
    where: {
      orgId,
      status: { in: ["UNPAID", "PARTLY_PAID", "OVERDUE"] },
      postingDate: { lte: asOfDate },
    },
    include: {
      supplier: { select: { name: true } },
    },
  });

  const supplierMap = new Map<string, any>();

  for (const bill of unpaidBills) {
    const suppId = bill.supplierId;
    const suppName = bill.supplier?.name || "Unknown Supplier";
    const outstanding = Number(bill.outstandingAmount);
    if (outstanding <= 0) continue;

    const diffTime = asOfDate.getTime() - new Date(bill.postingDate).getTime();
    const diffDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));

    if (!supplierMap.has(suppId)) {
      supplierMap.set(suppId, {
        supplierId: suppId,
        supplierName: suppName,
        totalOutstanding: 0,
        bucket0To30: 0,
        bucket31To60: 0,
        bucket61To90: 0,
        bucket90Plus: 0,
      });
    }

    const row = supplierMap.get(suppId);
    row.totalOutstanding += outstanding;

    if (diffDays <= 30) {
      row.bucket0To30 += outstanding;
    } else if (diffDays <= 60) {
      row.bucket31To60 += outstanding;
    } else if (diffDays <= 90) {
      row.bucket61To90 += outstanding;
    } else {
      row.bucket90Plus += outstanding;
    }
  }

  return Array.from(supplierMap.values());
}

// ─── Sales Register ──────────────────────────────────────────────────────────
export async function getSalesRegister(
  orgId: string,
  filters: { fromDate?: Date; toDate?: Date } = {}
): Promise<any[]> {
  const where: Prisma.SalesInvoiceWhereInput = { orgId };
  const dateFilter: Prisma.DateTimeFilter = {};
  if (filters.fromDate) dateFilter.gte = filters.fromDate;
  if (filters.toDate) dateFilter.lte = filters.toDate;
  if (Object.keys(dateFilter).length > 0) where.postingDate = dateFilter;

  const invoices = await db.salesInvoice.findMany({
    where,
    orderBy: { postingDate: "asc" },
    include: {
      customer: { select: { name: true, gstin: true } },
    },
  });

  return invoices.map((inv) => {
    const total = Number(inv.grandTotal);
    const tax = Number(inv.taxAmount);
    const taxable = total - tax;
    const hasGST = !!inv.customer?.gstin;
    const cgst = hasGST ? tax / 2 : 0;
    const sgst = hasGST ? tax / 2 : 0;
    const igst = !hasGST ? tax : 0;

    return {
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      postingDate: inv.postingDate,
      customerName: inv.customer?.name || "Unknown Customer",
      customerGstin: inv.customer?.gstin || "—",
      taxableValue: taxable,
      taxAmount: tax,
      cgst,
      sgst,
      igst,
      grandTotal: total,
      status: inv.status,
    };
  });
}

// ─── Purchase Register ───────────────────────────────────────────────────────
export async function getPurchaseRegister(
  orgId: string,
  filters: { fromDate?: Date; toDate?: Date } = {}
): Promise<any[]> {
  const where: Prisma.PurchaseInvoiceWhereInput = { orgId };
  const dateFilter: Prisma.DateTimeFilter = {};
  if (filters.fromDate) dateFilter.gte = filters.fromDate;
  if (filters.toDate) dateFilter.lte = filters.toDate;
  if (Object.keys(dateFilter).length > 0) where.postingDate = dateFilter;

  const bills = await db.purchaseInvoice.findMany({
    where,
    orderBy: { postingDate: "asc" },
    include: {
      supplier: { select: { name: true, gstin: true } },
    },
  });

  return bills.map((bill) => {
    const total = Number(bill.grandTotal);
    const tax = Number(bill.taxAmount);
    const taxable = total - tax;
    const hasGST = !!bill.supplier?.gstin;
    const cgst = hasGST ? tax / 2 : 0;
    const sgst = hasGST ? tax / 2 : 0;
    const igst = !hasGST ? tax : 0;

    return {
      id: bill.id,
      billNumber: bill.invoiceNumber,
      postingDate: bill.postingDate,
      supplierName: bill.supplier?.name || "Unknown Supplier",
      supplierGstin: bill.supplier?.gstin || "—",
      taxableValue: taxable,
      taxAmount: tax,
      cgst,
      sgst,
      igst,
      grandTotal: total,
      status: bill.status,
    };
  });
}

// ─── GSTR-1 Summary (Sales) ──────────────────────────────────────────────────
export async function getGSTR1Summary(
  orgId: string,
  filters: { fromDate?: Date; toDate?: Date } = {}
): Promise<any> {
  const sales = await getSalesRegister(orgId, filters);

  const b2b = sales.filter((s) => s.customerGstin !== "—");
  const b2c = sales.filter((s) => s.customerGstin === "—");

  const sum = (arr: any[], key: string) => arr.reduce((acc, curr) => acc + (curr[key] || 0), 0);

  return {
    b2b: {
      count: b2b.length,
      taxableValue: sum(b2b, "taxableValue"),
      cgst: sum(b2b, "cgst"),
      sgst: sum(b2b, "sgst"),
      igst: sum(b2b, "igst"),
      taxAmount: sum(b2b, "taxAmount"),
      grandTotal: sum(b2b, "grandTotal"),
      invoices: b2b,
    },
    b2c: {
      count: b2c.length,
      taxableValue: sum(b2c, "taxableValue"),
      cgst: sum(b2c, "cgst"),
      sgst: sum(b2c, "sgst"),
      igst: sum(b2c, "igst"),
      taxAmount: sum(b2c, "taxAmount"),
      grandTotal: sum(b2c, "grandTotal"),
      invoices: b2c,
    },
    total: {
      count: sales.length,
      taxableValue: sum(sales, "taxableValue"),
      cgst: sum(sales, "cgst"),
      sgst: sum(sales, "sgst"),
      igst: sum(sales, "igst"),
      taxAmount: sum(sales, "taxAmount"),
      grandTotal: sum(sales, "grandTotal"),
    },
  };
}

// ─── GSTR-2B Summary (Purchase Inputs) ────────────────────────────────────────
export async function getGSTR2BSummary(
  orgId: string,
  filters: { fromDate?: Date; toDate?: Date } = {}
): Promise<any> {
  const purchases = await getPurchaseRegister(orgId, filters);

  const sum = (arr: any[], key: string) => arr.reduce((acc, curr) => acc + (curr[key] || 0), 0);

  return {
    count: purchases.length,
    taxableValue: sum(purchases, "taxableValue"),
    cgst: sum(purchases, "cgst"),
    sgst: sum(purchases, "sgst"),
    igst: sum(purchases, "igst"),
    taxAmount: sum(purchases, "taxAmount"),
    grandTotal: sum(purchases, "grandTotal"),
    bills: purchases,
  };
}

// ─── Consolidated GST Ledger ────────────────────────────────────────────────
export async function getConsolidatedGSTLedger(
  orgId: string,
  filters: { fromDate?: Date; toDate?: Date } = {}
): Promise<any[]> {
  const where: Prisma.GeneralLedgerEntryWhereInput = {
    orgId,
    account: {
      OR: [
        { accountCode: { startsWith: "2120" } }, // tax payable
        { accountCode: { startsWith: "1140" } }, // tax receivable
        { accountName: { contains: "GST", mode: "insensitive" } },
        { accountName: { contains: "Tax", mode: "insensitive" } },
      ],
    },
  };

  const dateFilter: Prisma.DateTimeFilter = {};
  if (filters.fromDate) dateFilter.gte = filters.fromDate;
  if (filters.toDate) dateFilter.lte = filters.toDate;
  if (Object.keys(dateFilter).length > 0) where.postingDate = dateFilter;

  const entries = await db.generalLedgerEntry.findMany({
    where,
    orderBy: { postingDate: "asc" },
    include: {
      account: { select: { accountCode: true, accountName: true } },
    },
  });

  return entries.map((ent) => ({
    id: ent.id,
    postingDate: ent.postingDate,
    accountCode: ent.account.accountCode,
    accountName: ent.account.accountName,
    voucherType: ent.voucherType,
    voucherId: ent.voucherId,
    debit: Number(ent.debit),
    credit: Number(ent.credit),
    remarks: ent.remarks || "—",
  }));
}

// ─── Day Book ─────────────────────────────────────────────────────────────────
export async function getDayBook(
  orgId: string,
  date: Date
): Promise<any[]> {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const entries = await db.generalLedgerEntry.findMany({
    where: {
      orgId,
      postingDate: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
    orderBy: { createdAt: "asc" },
    include: {
      account: { select: { accountCode: true, accountName: true } },
    },
  });

  return entries.map((ent) => ({
    id: ent.id,
    postingDate: ent.postingDate,
    accountCode: ent.account.accountCode,
    accountName: ent.account.accountName,
    voucherType: ent.voucherType,
    voucherId: ent.voucherId,
    debit: Number(ent.debit),
    credit: Number(ent.credit),
    remarks: ent.remarks || "—",
  }));
}

// ─── Journal Register ────────────────────────────────────────────────────────
export async function getJournalRegister(
  orgId: string,
  filters: { fromDate?: Date; toDate?: Date } = {}
): Promise<any[]> {
  const where: Prisma.JournalEntryWhereInput = { orgId };
  const dateFilter: Prisma.DateTimeFilter = {};
  if (filters.fromDate) dateFilter.gte = filters.fromDate;
  if (filters.toDate) dateFilter.lte = filters.toDate;
  if (Object.keys(dateFilter).length > 0) where.postingDate = dateFilter;

  const journals = await db.journalEntry.findMany({
    where,
    orderBy: { postingDate: "asc" },
    include: {
      lines: {
        include: {
          account: { select: { accountCode: true, accountName: true } },
        },
      },
    },
  });

  return journals.map((jv) => ({
    id: jv.id,
    voucherNo: jv.voucherNo,
    postingDate: jv.postingDate,
    remarks: jv.remarks || "—",
    status: jv.status,
    totalDebit: Number(jv.totalDebit),
    totalCredit: Number(jv.totalCredit),
    lines: jv.lines.map((ln) => ({
      id: ln.id,
      accountCode: ln.account.accountCode,
      accountName: ln.account.accountName,
      debit: Number(ln.debit),
      credit: Number(ln.credit),
      remarks: ln.remarks || "—",
    })),
  }));
}

// ─── Job Costing Profitability ────────────────────────────────────────────────
export async function getJobProfitability(orgId: string): Promise<any[]> {
  const jobs = await db.jobCosting.findMany({
    where: { orgId },
    include: {
      glEntries: {
        include: {
          account: { select: { rootType: true } },
        },
      },
    },
  });

  return jobs.map((job: any) => {
    let actualRevenue = 0;
    let actualExpense = 0;

    job.glEntries.forEach((ent: any) => {
      const dbVal = Number(ent.debit);
      const crVal = Number(ent.credit);

      if (ent.account.rootType === "INCOME") {
        actualRevenue += (crVal - dbVal);
      } else if (ent.account.rootType === "EXPENSE") {
        actualExpense += (dbVal - crVal);
      }
    });

    const netProfit = actualRevenue - actualExpense;
    const contractVal = Number(job.contractValue);
    const marginPercent = contractVal > 0 ? (netProfit / contractVal) * 100 : 0;

    return {
      id: job.id,
      jobNo: job.jobNo,
      title: job.title,
      status: job.status,
      contractValue: contractVal,
      actualRevenue,
      actualExpense,
      netProfit,
      marginPercent,
    };
  });
}

// ─── Cash & Bank Ledger ───────────────────────────────────────────────────────
export async function getCashAndBankLedger(
  orgId: string,
  filters: { fromDate?: Date; toDate?: Date } = {}
): Promise<any[]> {
  const where: Prisma.GeneralLedgerEntryWhereInput = {
    orgId,
    account: {
      accountType: { in: ["CASH", "BANK"] },
    },
  };

  const dateFilter: Prisma.DateTimeFilter = {};
  if (filters.fromDate) dateFilter.gte = filters.fromDate;
  if (filters.toDate) dateFilter.lte = filters.toDate;
  if (Object.keys(dateFilter).length > 0) where.postingDate = dateFilter;

  const entries = await db.generalLedgerEntry.findMany({
    where,
    orderBy: [{ postingDate: "asc" }, { createdAt: "asc" }],
    include: {
      account: { select: { accountCode: true, accountName: true } },
    },
  });

  let runningBalance = 0;
  return entries.map((ent) => {
    const debit = Number(ent.debit);
    const credit = Number(ent.credit);
    runningBalance += (debit - credit);

    return {
      id: ent.id,
      postingDate: ent.postingDate,
      accountCode: ent.account.accountCode,
      accountName: ent.account.accountName,
      voucherType: ent.voucherType,
      voucherId: ent.voucherId,
      debit,
      credit,
      runningBalance,
      remarks: ent.remarks || "—",
    };
  });
}

