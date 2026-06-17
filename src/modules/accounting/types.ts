export type RootType = "ASSET" | "LIABILITY" | "EQUITY" | "INCOME" | "EXPENSE";

export type AccountType =
  | "CASH"
  | "BANK"
  | "RECEIVABLE"
  | "PAYABLE"
  | "TAX"
  | "SALES"
  | "PURCHASE"
  | "EXPENSE"
  | "FIXED_ASSET"
  | "DEPRECIATION"
  | "EQUITY"
  | "ROUND_OFF"
  | "OTHER";

export interface AccountNode {
  id: string;
  accountCode: string;
  accountName: string;
  parentAccountId: string | null;
  rootType: RootType;
  accountType: AccountType;
  isGroup: boolean;
  isActive: boolean;
  openingDebit: number;
  openingCredit: number;
  balance?: number; // calculated at runtime
  children?: AccountNode[];
}

export interface GLEntryLine {
  id?: string;
  postingDate: Date;
  accountId: string;
  accountCode?: string;
  accountName?: string;
  partyType?: string | null;
  partyId?: string | null;
  voucherType: string;
  voucherId: string;
  debit: number;
  credit: number;
  remarks?: string | null;
  branchId?: string | null;
  branchName?: string;
}

export interface TrialBalanceRow {
  accountId: string;
  accountCode: string;
  accountName: string;
  rootType: RootType;
  openingDebit: number;
  openingCredit: number;
  debit: number;
  credit: number;
  closingDebit: number;
  closingCredit: number;
}

export interface ProfitAndLossStatement {
  income: {
    accounts: { code: string; name: string; amount: number }[];
    total: number;
  };
  expense: {
    accounts: { code: string; name: string; amount: number }[];
    total: number;
  };
  grossProfit: number;
  netProfit: number;
}

export interface BalanceSheetStatement {
  assets: {
    accounts: { code: string; name: string; amount: number }[];
    total: number;
  };
  liabilities: {
    accounts: { code: string; name: string; amount: number }[];
    total: number;
  };
  equity: {
    accounts: { code: string; name: string; amount: number }[];
    total: number;
  };
  currentYearProfit: number;
  totalAssets: number;
  totalLiabilitiesAndEquity: number;
  isBalanced: boolean;
}
