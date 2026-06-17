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
