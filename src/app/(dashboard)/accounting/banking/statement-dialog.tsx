"use client";

import { useMemo, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { FileUploadField } from "@/components/monolith/file-upload-field";
import {
  AccountingAction,
  AccountingAlert,
  AccountingDialog,
  AccountingEmptyTableRow,
  AccountingField,
  AccountingInput,
  AccountingMoney,
  AccountingPanel,
  AccountingSelect,
  AccountingStatus,
  AccountingTable,
  AccountingTextarea,
} from "@/components/monolith/accounting-workspace";
import {
  commitBankStatementImportAction,
  previewBankStatementImportAction,
} from "@/modules/accounting/banking-actions";

type AccountOption = {
  id: string;
  name: string;
  bankName: string;
  currencyCode: string;
  isActive: boolean;
};

type StatementHistoryRow = {
  id: string;
  bankAccountId: string;
  bankAccountName: string;
  sourceFileName: string;
  sourceFileKeyLabel: string | null;
  sourceFormat: string;
  statementStart: string | null;
  statementEnd: string | null;
  importDate: string;
  importedBy: string;
  status: string;
  totalRows: number;
  importedRows: number;
  invalidRows: number;
  duplicateRows: number;
  closingBalance: string | null;
  currencyCode: string;
  failureReason: string | null;
};

type StatementPreviewResult = {
  bankAccountId: string;
  accountName: string;
  currencyCode: string;
  displayName: string;
  fileHash: string;
  fileKey: string;
  headers: string[];
  headerRowIndex: number;
  sampleRows: Array<Record<string, string>>;
  requiresMapping: boolean;
  config: {
    headerRowIndex: number;
    dateFormat?: string | null;
    decimalSeparator: "." | ",";
    statementStart?: string | null;
    statementEnd?: string | null;
    openingBalance?: string | null;
    closingBalance?: string | null;
    columns?: {
      dateColumn: string;
      descriptionColumn: string;
      referenceColumn?: string | null;
      debitColumn?: string | null;
      creditColumn?: string | null;
      amountColumn?: string | null;
      balanceColumn?: string | null;
      currencyColumn?: string | null;
    } | null;
  };
  summary: {
    totalRows: number;
    validRows: number;
    invalidRows: number;
    duplicateRows: number;
    potentialDuplicateRows: number;
    rowsToImport: number;
    totalDeposits: string;
    totalWithdrawals: string;
  };
  previewRows: Array<{
    sourceRowNumber: number;
    transactionDate: string | null;
    description: string;
    reference: string | null;
    deposit: string;
    withdrawal: string;
    amount: string | null;
    runningBalance: string | null;
    currencyCode: string;
    duplicateState: "NONE" | "WITHIN_FILE" | "EXISTING_DUPLICATE" | "POTENTIAL_DUPLICATE";
    errors: string[];
  }>;
};

type MappingState = {
  headerRowIndex: string;
  dateFormat: string;
  decimalSeparator: "." | ",";
  statementStart: string;
  statementEnd: string;
  openingBalance: string;
  closingBalance: string;
  dateColumn: string;
  descriptionColumn: string;
  referenceColumn: string;
  debitColumn: string;
  creditColumn: string;
  amountColumn: string;
  balanceColumn: string;
  currencyColumn: string;
};

const EMPTY_MAPPING: MappingState = {
  headerRowIndex: "1",
  dateFormat: "",
  decimalSeparator: ".",
  statementStart: "",
  statementEnd: "",
  openingBalance: "",
  closingBalance: "",
  dateColumn: "",
  descriptionColumn: "",
  referenceColumn: "",
  debitColumn: "",
  creditColumn: "",
  amountColumn: "",
  balanceColumn: "",
  currencyColumn: "",
};

function suggestHeaders(headers: string[]) {
  const lower = headers.map((header) => header.toLowerCase());
  const find = (patterns: string[]) =>
    headers[lower.findIndex((header) => patterns.some((pattern) => header.includes(pattern)))] || "";
  return {
    dateColumn: find(["date", "transaction date", "txn date"]),
    descriptionColumn: find(["description", "narration", "details", "particular"]),
    referenceColumn: find(["reference", "ref", "cheque", "utr"]),
    debitColumn: find(["debit", "withdrawal", "money out"]),
    creditColumn: find(["credit", "deposit", "money in"]),
    amountColumn: find(["amount", "signed amount"]),
    balanceColumn: find(["balance", "running balance"]),
    currencyColumn: find(["currency", "ccy"]),
  };
}

function appendConfig(formData: FormData, bankAccountId: string, mapping: MappingState) {
  formData.set("bankAccountId", bankAccountId);
  formData.set("headerRowIndex", mapping.headerRowIndex || "1");
  formData.set("dateFormat", mapping.dateFormat);
  formData.set("decimalSeparator", mapping.decimalSeparator);
  formData.set("statementStart", mapping.statementStart);
  formData.set("statementEnd", mapping.statementEnd);
  formData.set("openingBalance", mapping.openingBalance);
  formData.set("closingBalance", mapping.closingBalance);
  formData.set("dateColumn", mapping.dateColumn);
  formData.set("descriptionColumn", mapping.descriptionColumn);
  formData.set("referenceColumn", mapping.referenceColumn);
  formData.set("debitColumn", mapping.debitColumn);
  formData.set("creditColumn", mapping.creditColumn);
  formData.set("amountColumn", mapping.amountColumn);
  formData.set("balanceColumn", mapping.balanceColumn);
  formData.set("currencyColumn", mapping.currencyColumn);
}

export function StatementDialog({
  accountOptions = [],
  canManageBankAccounts,
  initialAccountId,
  history = [],
  onRefreshRequested,
  onClose,
  open,
  title,
}: {
  accountOptions?: AccountOption[];
  canManageBankAccounts: boolean;
  initialAccountId?: string | null;
  history?: StatementHistoryRow[];
  onRefreshRequested: () => void;
  onClose: () => void;
  open: boolean;
  title: string;
}) {
  const [mapping, setMapping] = useState<MappingState>(EMPTY_MAPPING);
  const [selectedAccountId, setSelectedAccountId] = useState(
    initialAccountId ?? accountOptions.find((account) => account.isActive)?.id ?? "",
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<StatementPreviewResult | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPreviewing, startPreviewing] = useTransition();
  const [isImporting, startImporting] = useTransition();

  const filteredHistory = useMemo(
    () =>
      selectedAccountId
        ? history.filter((row) => row.bankAccountId === selectedAccountId)
        : history,
    [history, selectedAccountId],
  );

  function closeDialog() {
    setError(null);
    setFeedback(null);
    onClose();
  }

  function resetSelectedFile() {
    setSelectedFile(null);
    setPreview(null);
    setError(null);
    setFeedback(null);
  }

  function onPreview() {
    if (!selectedAccountId) {
      setError("Select a Banking account before previewing the statement.");
      return;
    }
    if (!selectedFile && !preview?.fileKey) {
      setError("Choose a CSV statement file before previewing.");
      return;
    }
    setError(null);
    setFeedback(null);

    startPreviewing(async () => {
      const formData = new FormData();
      appendConfig(formData, selectedAccountId, mapping);
      if (selectedFile) {
        formData.set("file", selectedFile);
      }
      if (preview) {
        formData.set("storedFileKey", preview.fileKey);
        formData.set("storedDisplayName", preview.displayName);
        formData.set("storedFileHash", preview.fileHash);
      }

      const result = await previewBankStatementImportAction(formData);
      if (!result.ok) {
        setError(result.error);
        toast.error(result.error);
        return;
      }

      const nextPreview = result.data as StatementPreviewResult;
      if (nextPreview.headers.length > 0 && !mapping.dateColumn && !mapping.descriptionColumn) {
        const suggestions = suggestHeaders(nextPreview.headers);
        setMapping((current) => ({
          ...current,
          ...suggestions,
          headerRowIndex: String(nextPreview.headerRowIndex),
        }));
      }
      setPreview(nextPreview);
      setFeedback(
        nextPreview.requiresMapping
          ? "Map the CSV columns, choose an explicit date format, and preview again."
          : `Preview ready. ${nextPreview.summary.rowsToImport} row(s) can be imported.`,
      );
    });
  }

  function onCommit() {
    if (!preview || preview.requiresMapping) {
      setError("Generate a successful preview before importing.");
      return;
    }
    if (preview.summary.rowsToImport <= 0) {
      setError("There are no importable rows in this statement preview.");
      return;
    }
    setError(null);
    setFeedback(null);

    startImporting(async () => {
      const formData = new FormData();
      appendConfig(formData, preview.bankAccountId, mapping);
      formData.set("storedFileKey", preview.fileKey);
      formData.set("storedDisplayName", preview.displayName);
      formData.set("storedFileHash", preview.fileHash);

      const result = await commitBankStatementImportAction(formData);
      if (!result.ok) {
        setError(result.error);
        toast.error(result.error);
        return;
      }

      setFeedback("Statement imported. Refreshing Banking history.");
      toast.success("Statement imported");
      onRefreshRequested();
      setSelectedFile(null);
      setPreview(null);
    });
  }

  return (
    <AccountingDialog
      open={open}
      onClose={closeDialog}
      title={title}
      description="Manual statement import is currently limited to CSV files. Imports keep Amount in Bank separate from Amount in Books and do not post accounting entries."
      size="wide"
      footer={
        <>
          <AccountingAction onClick={closeDialog} type="button" variant="secondary">
            Close
          </AccountingAction>
          {canManageBankAccounts ? (
            <>
              <AccountingAction
                disabled={isPreviewing || isImporting}
                onClick={onPreview}
                type="button"
                variant="secondary"
              >
                {isPreviewing ? (
                  <Loader2 aria-hidden="true" className="animate-spin" size={16} />
                ) : null}
                Preview statement
              </AccountingAction>
              <AccountingAction
                disabled={
                  isImporting ||
                  !preview ||
                  preview.requiresMapping ||
                  preview.summary.rowsToImport <= 0
                }
                onClick={onCommit}
                type="button"
              >
                {isImporting ? (
                  <Loader2 aria-hidden="true" className="animate-spin" size={16} />
                ) : null}
                Import statement
              </AccountingAction>
            </>
          ) : null}
        </>
      }
    >
      <div className="grid gap-4">
        {feedback ? <AccountingAlert variant="success">{feedback}</AccountingAlert> : null}
        {error ? <AccountingAlert variant="danger">{error}</AccountingAlert> : null}

        <AccountingPanel className="grid gap-4">
          <div className="mnx-accounting-form-grid">
            <AccountingField label="Banking account" required>
              <AccountingSelect
                disabled={!canManageBankAccounts && Boolean(initialAccountId)}
                value={selectedAccountId}
                onChange={(event) => {
                  setSelectedAccountId(event.target.value);
                  setPreview(null);
                }}
              >
                <option value="">Select account</option>
                {accountOptions.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} · {account.bankName} · {account.currencyCode}
                    {account.isActive ? "" : " · Inactive"}
                  </option>
                ))}
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Header row">
              <AccountingInput
                type="number"
                min="1"
                value={mapping.headerRowIndex}
                onChange={(event) =>
                  setMapping((current) => ({
                    ...current,
                    headerRowIndex: event.target.value,
                  }))
                }
              />
            </AccountingField>
          </div>

          {canManageBankAccounts ? (
            <FileUploadField
              accept=".csv,text/csv"
              helperText="CSV only in this Banking phase. Maximum file size: 2 MB."
              id="bank-statement-file"
              label="Statement file"
              onClear={resetSelectedFile}
              onInputChange={(event) => {
                setSelectedFile(event.target.files?.[0] ?? null);
                setPreview(null);
                setError(null);
                setFeedback(null);
              }}
              selectedFile={
                selectedFile
                  ? {
                      file: selectedFile,
                      name: selectedFile.name,
                      sizeBytes: selectedFile.size,
                    }
                  : preview
                    ? {
                        name: preview.displayName,
                        statusLabel: "Preview file stored",
                      }
                    : null
              }
            />
          ) : null}

          <div className="mnx-accounting-form-grid">
            <AccountingField label="Date format" required>
              <AccountingSelect
                value={mapping.dateFormat}
                onChange={(event) =>
                  setMapping((current) => ({
                    ...current,
                    dateFormat: event.target.value,
                  }))
                }
              >
                <option value="">Select format</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </AccountingSelect>
            </AccountingField>
            <AccountingField label="Decimal separator">
              <AccountingSelect
                value={mapping.decimalSeparator}
                onChange={(event) =>
                  setMapping((current) => ({
                    ...current,
                    decimalSeparator: event.target.value === "," ? "," : ".",
                  }))
                }
              >
                <option value=".">Dot (1,234.56)</option>
                <option value=",">Comma (1.234,56)</option>
              </AccountingSelect>
            </AccountingField>
          </div>

          <div className="mnx-accounting-form-grid">
            <AccountingField label="Statement start">
              <AccountingInput
                type="date"
                value={mapping.statementStart}
                onChange={(event) =>
                  setMapping((current) => ({ ...current, statementStart: event.target.value }))
                }
              />
            </AccountingField>
            <AccountingField label="Statement end">
              <AccountingInput
                type="date"
                value={mapping.statementEnd}
                onChange={(event) =>
                  setMapping((current) => ({ ...current, statementEnd: event.target.value }))
                }
              />
            </AccountingField>
          </div>

          <div className="mnx-accounting-form-grid">
            <AccountingField label="Opening balance">
              <AccountingInput
                value={mapping.openingBalance}
                onChange={(event) =>
                  setMapping((current) => ({ ...current, openingBalance: event.target.value }))
                }
                placeholder="Optional"
              />
            </AccountingField>
            <AccountingField label="Closing balance">
              <AccountingInput
                value={mapping.closingBalance}
                onChange={(event) =>
                  setMapping((current) => ({ ...current, closingBalance: event.target.value }))
                }
                placeholder="Optional"
              />
            </AccountingField>
          </div>

          {preview?.headers.length ? (
            <>
              <div className="mnx-accounting-form-grid">
                <AccountingField label="Transaction date column" required>
                  <AccountingSelect
                    value={mapping.dateColumn}
                    onChange={(event) =>
                      setMapping((current) => ({ ...current, dateColumn: event.target.value }))
                    }
                  >
                    <option value="">Select date column</option>
                    {preview.headers.map((header) => (
                      <option key={header} value={header}>
                        {header}
                      </option>
                    ))}
                  </AccountingSelect>
                </AccountingField>
                <AccountingField label="Description column" required>
                  <AccountingSelect
                    value={mapping.descriptionColumn}
                    onChange={(event) =>
                      setMapping((current) => ({
                        ...current,
                        descriptionColumn: event.target.value,
                      }))
                    }
                  >
                    <option value="">Select description column</option>
                    {preview.headers.map((header) => (
                      <option key={header} value={header}>
                        {header}
                      </option>
                    ))}
                  </AccountingSelect>
                </AccountingField>
              </div>

              <div className="mnx-accounting-form-grid">
                <AccountingField label="Reference column">
                  <AccountingSelect
                    value={mapping.referenceColumn}
                    onChange={(event) =>
                      setMapping((current) => ({
                        ...current,
                        referenceColumn: event.target.value,
                      }))
                    }
                  >
                    <option value="">Not used</option>
                    {preview.headers.map((header) => (
                      <option key={header} value={header}>
                        {header}
                      </option>
                    ))}
                  </AccountingSelect>
                </AccountingField>
                <AccountingField label="Currency column">
                  <AccountingSelect
                    value={mapping.currencyColumn}
                    onChange={(event) =>
                      setMapping((current) => ({
                        ...current,
                        currencyColumn: event.target.value,
                      }))
                    }
                  >
                    <option value="">Use account currency</option>
                    {preview.headers.map((header) => (
                      <option key={header} value={header}>
                        {header}
                      </option>
                    ))}
                  </AccountingSelect>
                </AccountingField>
              </div>

              <div className="mnx-accounting-form-grid">
                <AccountingField label="Signed amount column">
                  <AccountingSelect
                    value={mapping.amountColumn}
                    onChange={(event) =>
                      setMapping((current) => ({
                        ...current,
                        amountColumn: event.target.value,
                        debitColumn: event.target.value ? "" : current.debitColumn,
                        creditColumn: event.target.value ? "" : current.creditColumn,
                      }))
                    }
                  >
                    <option value="">Not used</option>
                    {preview.headers.map((header) => (
                      <option key={header} value={header}>
                        {header}
                      </option>
                    ))}
                  </AccountingSelect>
                </AccountingField>
                <AccountingField label="Balance column">
                  <AccountingSelect
                    value={mapping.balanceColumn}
                    onChange={(event) =>
                      setMapping((current) => ({
                        ...current,
                        balanceColumn: event.target.value,
                      }))
                    }
                  >
                    <option value="">Not used</option>
                    {preview.headers.map((header) => (
                      <option key={header} value={header}>
                        {header}
                      </option>
                    ))}
                  </AccountingSelect>
                </AccountingField>
              </div>

              <div className="mnx-accounting-form-grid">
                <AccountingField label="Deposit column">
                  <AccountingSelect
                    value={mapping.debitColumn}
                    onChange={(event) =>
                      setMapping((current) => ({
                        ...current,
                        debitColumn: event.target.value,
                        amountColumn: event.target.value ? "" : current.amountColumn,
                      }))
                    }
                  >
                    <option value="">Not used</option>
                    {preview.headers.map((header) => (
                      <option key={header} value={header}>
                        {header}
                      </option>
                    ))}
                  </AccountingSelect>
                </AccountingField>
                <AccountingField label="Withdrawal column">
                  <AccountingSelect
                    value={mapping.creditColumn}
                    onChange={(event) =>
                      setMapping((current) => ({
                        ...current,
                        creditColumn: event.target.value,
                        amountColumn: event.target.value ? "" : current.amountColumn,
                      }))
                    }
                  >
                    <option value="">Not used</option>
                    {preview.headers.map((header) => (
                      <option key={header} value={header}>
                        {header}
                      </option>
                    ))}
                  </AccountingSelect>
                </AccountingField>
              </div>
            </>
          ) : null}
        </AccountingPanel>

        {preview ? (
          <AccountingPanel className="grid gap-4">
            <div className="grid gap-2 md:grid-cols-3">
              <div>
                <strong>{preview.summary.totalRows}</strong>
                <div>Total source rows</div>
              </div>
              <div>
                <strong>{preview.summary.rowsToImport}</strong>
                <div>Rows to import</div>
              </div>
              <div>
                <strong>{preview.summary.invalidRows}</strong>
                <div>Invalid rows</div>
              </div>
            </div>
            <div className="grid gap-2 md:grid-cols-3">
              <div>
                <AccountingMoney
                  amount={preview.summary.totalDeposits}
                  currencyCode={preview.currencyCode}
                />
                <div>Total deposits</div>
              </div>
              <div>
                <AccountingMoney
                  amount={preview.summary.totalWithdrawals}
                  currencyCode={preview.currencyCode}
                />
                <div>Total withdrawals</div>
              </div>
              <div>
                <strong>{preview.summary.duplicateRows}</strong>
                <div>Exact duplicates skipped</div>
              </div>
            </div>

            {preview.previewRows.length > 0 ? (
              <AccountingTable>
                <thead>
                  <tr>
                    <th>Row</th>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Reference</th>
                    <th>Deposit</th>
                    <th>Withdrawal</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.previewRows.map((row) => (
                    <tr key={`${row.sourceRowNumber}-${row.reference ?? row.description}`}>
                      <td>{row.sourceRowNumber}</td>
                      <td>{row.transactionDate ?? "Invalid"}</td>
                      <td>
                        <div className="flex flex-col gap-1">
                          <span>{row.description || "—"}</span>
                          {row.errors.length > 0 ? (
                            <small>{row.errors.join(" ")}</small>
                          ) : null}
                        </div>
                      </td>
                      <td>{row.reference || "—"}</td>
                      <td>
                        {row.deposit !== "0" ? (
                          <AccountingMoney amount={row.deposit} currencyCode={row.currencyCode} />
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>
                        {row.withdrawal !== "0" ? (
                          <AccountingMoney
                            amount={row.withdrawal}
                            currencyCode={row.currencyCode}
                          />
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>
                        <AccountingStatus
                          status={
                            row.errors.length > 0
                              ? "FAILED"
                              : row.duplicateState === "WITHIN_FILE"
                                ? "DUPLICATE"
                                : row.duplicateState === "EXISTING_DUPLICATE"
                                  ? "DUPLICATE"
                                  : row.duplicateState === "POTENTIAL_DUPLICATE"
                                    ? "PENDING_REVIEW"
                                    : "READY"
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </AccountingTable>
            ) : (
              <AccountingTextarea
                disabled
                rows={4}
                value="Preview rows appear here after the file is mapped successfully."
              />
            )}
          </AccountingPanel>
        ) : null}

        <AccountingPanel className="grid gap-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold">Import history</h3>
              <p className="text-sm text-muted-foreground">
                History is scoped to the current Banking permissions and location rules.
              </p>
            </div>
          </div>
          <AccountingTable>
            <thead>
              <tr>
                <th>File</th>
                <th>Statement period</th>
                <th>Imported</th>
                <th>Status</th>
                <th>Rows</th>
                <th>Closing balance</th>
              </tr>
            </thead>
            <tbody>
              {filteredHistory.length === 0 ? (
                <AccountingEmptyTableRow colSpan={6}>
                  No statement imports are available for the selected Banking account.
                </AccountingEmptyTableRow>
              ) : (
                filteredHistory.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <div className="flex flex-col gap-1">
                        <strong>{row.sourceFileName}</strong>
                        <small>{row.sourceFileKeyLabel ?? row.bankAccountName}</small>
                      </div>
                    </td>
                    <td>
                      {row.statementStart || row.statementEnd
                        ? `${row.statementStart ?? "—"} to ${row.statementEnd ?? "—"}`
                        : "Not supplied"}
                    </td>
                    <td>
                      <div className="flex flex-col gap-1">
                        <span>{new Date(row.importDate).toLocaleDateString("en-IN")}</span>
                        <small>{row.importedBy}</small>
                      </div>
                    </td>
                    <td>
                      <div className="flex flex-col gap-1">
                        <AccountingStatus status={row.status} />
                        {row.failureReason ? <small>{row.failureReason}</small> : null}
                      </div>
                    </td>
                    <td>
                      <div className="flex flex-col gap-1">
                        <span>{row.importedRows} imported</span>
                        <small>
                          {row.invalidRows} invalid · {row.duplicateRows} duplicate
                        </small>
                      </div>
                    </td>
                    <td>
                      {row.closingBalance ? (
                        <AccountingMoney
                          amount={row.closingBalance}
                          currencyCode={row.currencyCode}
                        />
                      ) : (
                        "Unavailable"
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </AccountingTable>
        </AccountingPanel>
      </div>
    </AccountingDialog>
  );
}
