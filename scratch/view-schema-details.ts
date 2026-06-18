import * as fs from "fs";

const content = fs.readFileSync("prisma/schema.prisma", "utf8");
const models = [
  "SalesInvoiceItem",
  "PurchaseInvoiceItem",
  "TaxLine",
  "CustomerLedgerEntry",
  "SupplierLedgerEntry",
  "PaymentAllocation",
  "AccountingSettings",
  "Asset",
  "AssetDepreciationEntry",
  "PayrollBatch"
];

models.forEach((model) => {
  const regex = new RegExp(`model\\s+${model}\\s+\\{([\\s\\S]*?)\\}`, "g");
  const match = regex.exec(content);
  if (match) {
    console.log(`\n=================== ${model} ===================`);
    console.log(match[1].trim());
  } else {
    console.log(`Model not found: ${model}`);
  }
});
