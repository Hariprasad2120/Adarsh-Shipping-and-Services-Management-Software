import "dotenv/config";
import * as path from "path";
import * as fs from "fs";
import * as XLSX from "xlsx";
import { db } from "../src/lib/db";
import { Prisma } from "../src/generated/prisma/client";
import { seedChartOfAccounts } from "../src/modules/accounting/service";

const ORG_ID = "cmp4cw6gu0000gkbwxbrjb8oz";
const USER_ID = "cmp4cw6ig0001gkbwqg230chv";
const DATA_DIR = "C:\\Users\\Purushothaman\\Downloads\\zohotoerpmigration";

// Excel Serial Date Converter
function excelDateToJSDate(serial: any): Date {
  if (serial instanceof Date) return serial;
  if (typeof serial === "string") {
    const d = new Date(serial);
    if (!isNaN(d.getTime())) return d;
    const num = Number(serial);
    if (isNaN(num)) return new Date();
    serial = num;
  }
  if (typeof serial === "number") {
    const utcDays = serial - 25569;
    const utValue = utcDays * 86400;
    return new Date(utValue * 1000);
  }
  return new Date();
}

// Resilient Account Finder/Creator
async function getOrCreateAccount(name: string, code?: string): Promise<string> {
  const cleanName = (name || "Uncategorized").trim();
  const cleanCode = (code || "").trim();

  // Try lookup by code if present
  if (cleanCode) {
    const existing = await db.account.findUnique({
      where: { orgId_accountCode: { orgId: ORG_ID, accountCode: cleanCode } },
    });
    if (existing) return existing.id;
  }

  // Try lookup by name
  const existingByName = await db.account.findFirst({
    where: { orgId: ORG_ID, accountName: { equals: cleanName, mode: "insensitive" } },
  });
  if (existingByName) return existingByName.id;

  // Deduce RootType & AccountType from name/code
  let rootType = "EXPENSE";
  let accountType = "EXPENSE";
  const upperName = cleanName.toUpperCase();

  if (cleanCode.startsWith("1") || upperName.includes("ASSET") || upperName.includes("BANK") || upperName.includes("CASH") || upperName.includes("RECEIVABLE")) {
    rootType = "ASSET";
    accountType = upperName.includes("BANK") ? "BANK" : upperName.includes("CASH") ? "CASH" : upperName.includes("RECEIVABLE") ? "RECEIVABLE" : "OTHER";
  } else if (cleanCode.startsWith("2") || upperName.includes("LIABILITY") || upperName.includes("PAYABLE") || upperName.includes("TAX") || upperName.includes("DUTY")) {
    rootType = "LIABILITY";
    accountType = upperName.includes("PAYABLE") ? "PAYABLE" : upperName.includes("TAX") || upperName.includes("DUTY") ? "TAX" : "OTHER";
  } else if (cleanCode.startsWith("3") || upperName.includes("EQUITY") || upperName.includes("CAPITAL") || upperName.includes("RETAINED")) {
    rootType = "EQUITY";
    accountType = "EQUITY";
  } else if (cleanCode.startsWith("4") || upperName.includes("INCOME") || upperName.includes("SALES") || upperName.includes("REVENUE")) {
    rootType = "INCOME";
    accountType = "SALES";
  } else if (cleanCode.startsWith("5") || upperName.includes("EXPENSE") || upperName.includes("PURCHASE") || upperName.includes("RENT") || upperName.includes("SALARY")) {
    rootType = "EXPENSE";
    accountType = upperName.includes("PURCHASE") ? "PURCHASE" : "EXPENSE";
  }

  // Generate a code if missing
  let finalCode = cleanCode;
  if (!finalCode) {
    const base = rootType === "ASSET" ? "1900" : rootType === "LIABILITY" ? "2900" : rootType === "EQUITY" ? "3900" : rootType === "INCOME" ? "4900" : "5900";
    const count = await db.account.count({ where: { orgId: ORG_ID, accountCode: { startsWith: base.slice(0, 2) } } });
    finalCode = `${base.slice(0, 3)}${count + 1}`;
  }

  // Find parent account group
  const parent = await db.account.findFirst({
    where: { orgId: ORG_ID, rootType, isGroup: true },
    orderBy: { accountCode: "asc" },
  });

  const created = await db.account.create({
    data: {
      orgId: ORG_ID,
      accountCode: finalCode,
      accountName: cleanName,
      rootType,
      accountType,
      isGroup: false,
      parentAccountId: parent?.id || null,
    },
  });
  console.log(`Created account: ${cleanName} (${finalCode})`);
  return created.id;
}

async function migrate() {
  console.log("=== STARTING ACCOUNTING MIGRATION ===");

  // Seed default Chart of Accounts and settings first
  await seedChartOfAccounts(ORG_ID);
  const settings = await db.accountingSettings.findUnique({ where: { orgId: ORG_ID } });
  if (!settings) throw new Error("Default settings seeding failed.");

  // Maps for references
  const customerIdMap = new Map<string, string>();
  const vendorIdMap = new Map<string, string>();
  const invoiceIdMap = new Map<string, string>();
  const billIdMap = new Map<string, string>();

  // 1. INGEST CUSTOMERS (Contacts.xlsx)
  const contactsPath = path.join(DATA_DIR, "Contacts.xlsx");
  if (fs.existsSync(contactsPath)) {
    const workbook = XLSX.readFile(contactsPath);
    const sheetName = workbook.SheetNames[0];
    const rows: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
    console.log(`Loaded ${rows.length} contacts from Contacts.xlsx`);

    for (const r of rows) {
      const displayName = String(r["Display Name"] || "").trim();
      const contactId = String(r["Contact ID"] || "").trim();
      if (!displayName) continue;

      let customer = await db.crmAccount.findFirst({
        where: { orgId: ORG_ID, name: displayName }
      });

      if (!customer) {
        customer = await db.crmAccount.create({
          data: {
            orgId: ORG_ID,
            ownerId: USER_ID,
            name: displayName,
            type: "Customer",
            email: r["EmailID"] ? String(r["EmailID"]).trim() : null,
            phone: r["Phone"] ? String(r["Phone"]).trim() : null,
            gstin: r["GST Identification Number (GSTIN)"] ? String(r["GST Identification Number (GSTIN)"]).trim() : null,
            billingAddress: r["Billing Address"] ? String(r["Billing Address"]).trim() : null,
            shippingAddress: r["Shipping Address"] ? String(r["Shipping Address"]).trim() : null,
            creditLimit: r["Credit Limit"] ? parseFloat(r["Credit Limit"]) : 0,
            paymentTerms: r["Payment Terms Label"] ? String(r["Payment Terms Label"]).trim() : null,
            createdById: USER_ID,
            updatedById: USER_ID,
          }
        });
      }
      customerIdMap.set(contactId, customer.id);
      customerIdMap.set(displayName, customer.id);
    }
  }

  // 2. INGEST VENDORS (Vendors (2).xlsx)
  const vendorsPath = path.join(DATA_DIR, "Vendors (2).xlsx");
  if (fs.existsSync(vendorsPath)) {
    const workbook = XLSX.readFile(vendorsPath);
    const sheetName = workbook.SheetNames[0];
    const rows: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
    console.log(`Loaded ${rows.length} vendors from Vendors (2).xlsx`);

    for (const r of rows) {
      const name = String(r["Contact Name"] || r["Display Name"] || r["Company Name"] || "").trim();
      const contactId = String(r["Contact ID"] || "").trim();
      if (!name) continue;

      let vendor = await db.crmVendor.findFirst({
        where: { orgId: ORG_ID, name }
      });

      if (!vendor) {
        vendor = await db.crmVendor.create({
          data: {
            orgId: ORG_ID,
            ownerId: USER_ID,
            name,
            contactName: r["Contact Name"] ? String(r["Contact Name"]).trim() : null,
            phone: r["Phone"] ? String(r["Phone"]).trim() : null,
            email: r["EmailID"] ? String(r["EmailID"]).trim() : null,
            address: r["Billing Address"] ? String(r["Billing Address"]).trim() : null,
            gstin: r["GST Identification Number (GSTIN)"] ? String(r["GST Identification Number (GSTIN)"]).trim() : null,
            createdById: USER_ID,
            updatedById: USER_ID,
          }
        });
      }
      vendorIdMap.set(contactId, vendor.id);
      vendorIdMap.set(name, vendor.id);
    }
  }

  // 3. INGEST SALES INVOICES (Sales.xlsx)
  const salesPath = path.join(DATA_DIR, "Sales.xlsx");
  if (fs.existsSync(salesPath)) {
    const workbook = XLSX.readFile(salesPath);
    const sheetName = workbook.SheetNames[0];
    const rows: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
    console.log(`Loaded ${rows.length} sales rows from Sales.xlsx`);

    // Group rows by Invoice Number
    const grouped = new Map<string, any[]>();
    for (const r of rows) {
      const invNum = String(r["Invoice Number"] || "").trim();
      if (!invNum) continue;
      if (!grouped.has(invNum)) grouped.set(invNum, []);
      grouped.get(invNum)!.push(r);
    }

    console.log(`Grouped into ${grouped.size} unique invoices`);

    for (const [invNum, items] of grouped.entries()) {
      const header = items[0];
      const customerName = String(header["Customer Name"] || "").trim();
      const customerId = customerIdMap.get(customerName) || customerIdMap.get(String(header["Customer ID"])) || null;

      if (!customerId) {
        console.warn(`Customer ${customerName} not found for invoice ${invNum}. Skipping.`);
        continue;
      }

      // Check if invoice exists
      let invoice = await db.salesInvoice.findFirst({
        where: { orgId: ORG_ID, invoiceNumber: invNum }
      });

      if (!invoice) {
        const postingDate = excelDateToJSDate(header["Invoice Date"]);
        const dueDate = header["Due Date"] ? excelDateToJSDate(header["Due Date"]) : postingDate;
        const grandTotal = parseFloat(header["Total"] || 0);
        const discountAmount = parseFloat(header["Entity Discount Amount"] || 0);
        const taxAmount = parseFloat(header["Tax Amount"] || header["Item Tax Amount"] || 0);
        const outstandingAmount = parseFloat(header["Balance"] || grandTotal);
        const remarks = header["Notes"] ? String(header["Notes"]).trim() : null;

        invoice = await db.salesInvoice.create({
          data: {
            orgId: ORG_ID,
            invoiceNumber: invNum,
            customerId,
            postingDate,
            dueDate,
            status: outstandingAmount === 0 ? "PAID" : outstandingAmount < grandTotal ? "PARTLY_PAID" : "UNPAID",
            grandTotal: new Prisma.Decimal(grandTotal),
            paidAmount: new Prisma.Decimal(grandTotal - outstandingAmount),
            outstandingAmount: new Prisma.Decimal(outstandingAmount),
            discountAmount: new Prisma.Decimal(discountAmount),
            taxAmount: new Prisma.Decimal(taxAmount),
            remarks,
            createdById: USER_ID,
            items: {
              create: items.map(it => ({
                itemName: String(it["Item Name"] || "Service Charge").trim(),
                qty: parseFloat(it["Quantity"] || 1),
                rate: new Prisma.Decimal(parseFloat(it["Item Price"] || it["Rate"] || 0)),
                amount: new Prisma.Decimal(parseFloat(it["Item Total"] || 0)),
              }))
            }
          }
        });

        // Post to GL
        const salesAccId = await getOrCreateAccount("Sales Income", "4100");
        const recAccId = await getOrCreateAccount("Accounts Receivable", "1130");
        const taxAccId = await getOrCreateAccount("Output Tax Payable (GST)", "2120");

        const glLines = [
          {
            accountId: recAccId,
            debit: grandTotal,
            credit: 0,
            partyType: "CUSTOMER",
            partyId: customerId,
            remarks: `Sales Invoice ${invNum}`,
          },
          {
            accountId: salesAccId,
            debit: 0,
            credit: grandTotal - taxAmount,
            remarks: `Sales Revenue from ${invNum}`,
          }
        ];

        if (taxAmount > 0) {
          glLines.push({
            accountId: taxAccId,
            debit: 0,
            credit: taxAmount,
            remarks: `Output GST for ${invNum}`,
          });
        }

        // Post GL Entries
        for (const line of glLines) {
          await db.generalLedgerEntry.create({
            data: {
              orgId: ORG_ID,
              postingDate,
              accountId: line.accountId,
              partyType: line.partyType || null,
              partyId: line.partyId || null,
              voucherType: "SALES_INVOICE",
              voucherId: invoice.id,
              debit: new Prisma.Decimal(line.debit),
              credit: new Prisma.Decimal(line.credit),
              remarks: line.remarks || null,
              createdById: USER_ID,
            }
          });
        }

        // Customer Ledger Entry
        await db.customerLedgerEntry.create({
          data: {
            orgId: ORG_ID,
            customerId,
            postingDate,
            voucherType: "SALES_INVOICE",
            voucherId: invoice.id,
            debit: new Prisma.Decimal(grandTotal),
            credit: new Prisma.Decimal(0),
            remarks: `Invoice ${invNum}`,
          }
        });
      }
      invoiceIdMap.set(invNum, invoice.id);
      invoiceIdMap.set(String(header["Invoice ID"]), invoice.id);
    }
  }

  // 4. INGEST PURCHASE INVOICES (Bill.xlsx)
  const billPath = path.join(DATA_DIR, "Bill.xlsx");
  if (fs.existsSync(billPath)) {
    const workbook = XLSX.readFile(billPath);
    const sheetName = workbook.SheetNames[0];
    const rows: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
    console.log(`Loaded ${rows.length} bill rows from Bill.xlsx`);

    const grouped = new Map<string, any[]>();
    for (const r of rows) {
      const billNum = String(r["Bill Number"] || "").trim();
      if (!billNum) continue;
      if (!grouped.has(billNum)) grouped.set(billNum, []);
      grouped.get(billNum)!.push(r);
    }

    console.log(`Grouped into ${grouped.size} unique bills`);

    for (const [billNum, items] of grouped.entries()) {
      const header = items[0];
      const vendorName = String(header["Vendor Name"] || "").trim();
      const vendorId = vendorIdMap.get(vendorName) || vendorIdMap.get(String(header["Vendor ID"])) || null;

      if (!vendorId) {
        console.warn(`Vendor ${vendorName} not found for bill ${billNum}. Skipping.`);
        continue;
      }

      let bill = await db.purchaseInvoice.findFirst({
        where: { orgId: ORG_ID, invoiceNumber: billNum }
      });

      if (!bill) {
        const postingDate = excelDateToJSDate(header["Bill Date"]);
        const dueDate = header["Due Date"] ? excelDateToJSDate(header["Due Date"]) : postingDate;
        const grandTotal = parseFloat(header["Total"] || 0);
        const taxAmount = parseFloat(header["Tax Amount"] || 0);
        const outstandingAmount = parseFloat(header["Balance"] || grandTotal);

        bill = await db.purchaseInvoice.create({
          data: {
            orgId: ORG_ID,
            invoiceNumber: billNum,
            supplierId: vendorId,
            postingDate,
            dueDate,
            status: outstandingAmount === 0 ? "PAID" : outstandingAmount < grandTotal ? "PARTLY_PAID" : "UNPAID",
            grandTotal: new Prisma.Decimal(grandTotal),
            paidAmount: new Prisma.Decimal(grandTotal - outstandingAmount),
            outstandingAmount: new Prisma.Decimal(outstandingAmount),
            discountAmount: new Prisma.Decimal(0),
            taxAmount: new Prisma.Decimal(taxAmount),
            remarks: header["Vendor Notes"] ? String(header["Vendor Notes"]).trim() : null,
            createdById: USER_ID,
            items: {
              create: items.map(it => ({
                itemName: String(it["Item Name"] || "Office Purchases").trim(),
                qty: parseFloat(it["Quantity"] || 1),
                rate: new Prisma.Decimal(parseFloat(it["Rate"] || it["Item Price"] || 0)),
                amount: new Prisma.Decimal(parseFloat(it["Item Total"] || 0)),
              }))
            }
          }
        });

        // GL Posting
        const payAccId = await getOrCreateAccount("Accounts Payable", "2110");
        const expAccId = await getOrCreateAccount("Purchase Expense", "5700");
        const taxAccId = await getOrCreateAccount("Input Tax Receivable (GST)", "1140");

        const glLines = [
          {
            accountId: payAccId,
            debit: 0,
            credit: grandTotal,
            partyType: "SUPPLIER",
            partyId: vendorId,
            remarks: `Purchase Bill ${billNum}`,
          },
          {
            accountId: expAccId,
            debit: grandTotal - taxAmount,
            credit: 0,
            remarks: `Expense from Purchase ${billNum}`,
          }
        ];

        if (taxAmount > 0) {
          glLines.push({
            accountId: taxAccId,
            debit: taxAmount,
            credit: 0,
            remarks: `Input GST for ${billNum}`,
          });
        }

        for (const line of glLines) {
          await db.generalLedgerEntry.create({
            data: {
              orgId: ORG_ID,
              postingDate,
              accountId: line.accountId,
              partyType: line.partyType || null,
              partyId: line.partyId || null,
              voucherType: "PURCHASE_INVOICE",
              voucherId: bill.id,
              debit: new Prisma.Decimal(line.debit),
              credit: new Prisma.Decimal(line.credit),
              remarks: line.remarks || null,
              createdById: USER_ID,
            }
          });
        }

        // Supplier Ledger Entry
        await db.supplierLedgerEntry.create({
          data: {
            orgId: ORG_ID,
            supplierId: vendorId,
            postingDate,
            voucherType: "PURCHASE_INVOICE",
            voucherId: bill.id,
            debit: new Prisma.Decimal(0),
            credit: new Prisma.Decimal(grandTotal),
            remarks: `Bill ${billNum}`,
          }
        });
      }
      billIdMap.set(billNum, bill.id);
      billIdMap.set(String(header["Bill ID"]), bill.id);
    }
  }

  // 5. INGEST CUSTOMER PAYMENTS (Customer_Payment.xlsx)
  const custPayPath = path.join(DATA_DIR, "Customer_Payment.xlsx");
  if (fs.existsSync(custPayPath)) {
    const workbook = XLSX.readFile(custPayPath);
    const sheetName = workbook.SheetNames[0];
    const rows: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
    console.log(`Loaded ${rows.length} payment rows from Customer_Payment.xlsx`);

    const grouped = new Map<string, any[]>();
    for (const r of rows) {
      const payNum = String(r["Payment Number"] || "").trim();
      if (!payNum) continue;
      if (!grouped.has(payNum)) grouped.set(payNum, []);
      grouped.get(payNum)!.push(r);
    }

    console.log(`Grouped into ${grouped.size} customer payments`);

    for (const [payNum, items] of grouped.entries()) {
      const header = items[0];
      const customerName = String(header["Customer Name"] || "").trim();
      const customerId = customerIdMap.get(customerName) || customerIdMap.get(String(header["CustomerID"])) || null;

      if (!customerId) continue;

      const postingDate = excelDateToJSDate(header["Date"]);
      const amount = parseFloat(header["Amount"] || 0);

      // Bank account setup
      const bankName = header["Deposit To"] ? String(header["Deposit To"]).trim() : "BANK";
      const bankCode = header["Deposit To Account Code"] ? String(header["Deposit To Account Code"]).trim() : "1120";
      const paidToAccountId = await getOrCreateAccount(bankName, bankCode);
      const paidFromAccountId = await getOrCreateAccount("Accounts Receivable", "1130");

      let payment = await db.paymentEntry.findFirst({
        where: { orgId: ORG_ID, referenceNo: payNum, paymentType: "RECEIVE" }
      });

      if (!payment) {
        payment = await db.paymentEntry.create({
          data: {
            orgId: ORG_ID,
            paymentType: "RECEIVE",
            postingDate,
            partyType: "CUSTOMER",
            partyId: customerId,
            paidFromAccountId,
            paidToAccountId,
            amount: new Prisma.Decimal(amount),
            referenceNo: payNum,
            status: "SUBMITTED",
            remarks: header["Description"] ? String(header["Description"]).trim() : "Customer Payment",
            createdById: USER_ID,
          }
        });

        // GL Posting: Bank (Dr) to Receivables (Cr)
        const glLines = [
          {
            accountId: paidToAccountId,
            debit: amount,
            credit: 0,
            remarks: `Payment received ${payNum}`,
          },
          {
            accountId: paidFromAccountId,
            debit: 0,
            credit: amount,
            partyType: "CUSTOMER",
            partyId: customerId,
            remarks: `Payment clearance ${payNum}`,
          }
        ];

        for (const line of glLines) {
          await db.generalLedgerEntry.create({
            data: {
              orgId: ORG_ID,
              postingDate,
              accountId: line.accountId,
              partyType: line.partyType || null,
              partyId: line.partyId || null,
              voucherType: "PAYMENT_ENTRY",
              voucherId: payment.id,
              debit: new Prisma.Decimal(line.debit),
              credit: new Prisma.Decimal(line.credit),
              remarks: line.remarks || null,
              createdById: USER_ID,
            }
          });
        }

        // Customer Ledger clearance (Credit Customer Account)
        await db.customerLedgerEntry.create({
          data: {
            orgId: ORG_ID,
            customerId,
            postingDate,
            voucherType: "PAYMENT_ENTRY",
            voucherId: payment.id,
            debit: new Prisma.Decimal(0),
            credit: new Prisma.Decimal(amount),
            remarks: `Payment received ${payNum}`,
          }
        });

        // Link allocations
        for (const it of items) {
          const invNum = String(it["Invoice Number"] || "").trim();
          const applyAmt = parseFloat(it["Amount Applied to Invoice"] || 0);
          if (!invNum || applyAmt <= 0) continue;

          const invoiceId = invoiceIdMap.get(invNum) || null;
          if (invoiceId) {
            await db.paymentAllocation.create({
              data: {
                paymentEntryId: payment.id,
                salesInvoiceId: invoiceId,
                allocatedAmount: new Prisma.Decimal(applyAmt),
              }
            });

            // Adjust invoice balance
            const inv = await db.salesInvoice.findUnique({ where: { id: invoiceId } });
            if (inv) {
              const outstanding = Math.max(0, Number(inv.outstandingAmount) - applyAmt);
              const paid = Number(inv.paidAmount) + applyAmt;
              const status = outstanding <= 0 ? "PAID" : outstanding < Number(inv.grandTotal) ? "PARTLY_PAID" : "UNPAID";

              await db.salesInvoice.update({
                where: { id: invoiceId },
                data: {
                  paidAmount: new Prisma.Decimal(paid),
                  outstandingAmount: new Prisma.Decimal(outstanding),
                  status,
                }
              });
            }
          }
        }
      }
    }
  }

  // 6. INGEST VENDOR PAYMENTS (Vendor_Payment.xlsx)
  const vendPayPath = path.join(DATA_DIR, "Vendor_Payment.xlsx");
  if (fs.existsSync(vendPayPath)) {
    const workbook = XLSX.readFile(vendPayPath);
    const sheetName = workbook.SheetNames[0];
    const rows: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
    console.log(`Loaded ${rows.length} payment rows from Vendor_Payment.xlsx`);

    const grouped = new Map<string, any[]>();
    for (const r of rows) {
      const payNum = String(r["Payment Number"] || "").trim();
      if (!payNum) continue;
      if (!grouped.has(payNum)) grouped.set(payNum, []);
      grouped.get(payNum)!.push(r);
    }

    console.log(`Grouped into ${grouped.size} vendor payments`);

    for (const [payNum, items] of grouped.entries()) {
      const header = items[0];
      const vendorName = String(header["Vendor Name"] || "").trim();
      const vendorId = vendorIdMap.get(vendorName) || vendorIdMap.get(String(header["Vendor ID"])) || null;

      if (!vendorId) continue;

      const postingDate = excelDateToJSDate(header["Date"]);
      const amount = parseFloat(header["Amount"] || 0);

      const bankName = header["Paid Through"] ? String(header["Paid Through"]).trim() : "BANK";
      const bankCode = header["Paid Through Account Code"] ? String(header["Paid Through Account Code"]).trim() : "1120";
      const paidFromAccountId = await getOrCreateAccount(bankName, bankCode);
      const paidToAccountId = await getOrCreateAccount("Accounts Payable", "2110");

      let payment = await db.paymentEntry.findFirst({
        where: { orgId: ORG_ID, referenceNo: payNum, paymentType: "PAY" }
      });

      if (!payment) {
        payment = await db.paymentEntry.create({
          data: {
            orgId: ORG_ID,
            paymentType: "PAY",
            postingDate,
            partyType: "SUPPLIER",
            partyId: vendorId,
            paidFromAccountId,
            paidToAccountId,
            amount: new Prisma.Decimal(amount),
            referenceNo: payNum,
            status: "SUBMITTED",
            remarks: header["Description"] ? String(header["Description"]).trim() : "Vendor Payment",
            createdById: USER_ID,
          }
        });

        // GL Posting: Payables (Dr) to Bank (Cr)
        const glLines = [
          {
            accountId: paidToAccountId,
            debit: amount,
            credit: 0,
            partyType: "SUPPLIER",
            partyId: vendorId,
            remarks: `Payment to Supplier ${payNum}`,
          },
          {
            accountId: paidFromAccountId,
            debit: 0,
            credit: amount,
            remarks: `Payment from bank ${payNum}`,
          }
        ];

        for (const line of glLines) {
          await db.generalLedgerEntry.create({
            data: {
              orgId: ORG_ID,
              postingDate,
              accountId: line.accountId,
              partyType: line.partyType || null,
              partyId: line.partyId || null,
              voucherType: "PAYMENT_ENTRY",
              voucherId: payment.id,
              debit: new Prisma.Decimal(line.debit),
              credit: new Prisma.Decimal(line.credit),
              remarks: line.remarks || null,
              createdById: USER_ID,
            }
          });
        }

        // Supplier Ledger clearance (Debit Supplier Account)
        await db.supplierLedgerEntry.create({
          data: {
            orgId: ORG_ID,
            supplierId: vendorId,
            postingDate,
            voucherType: "PAYMENT_ENTRY",
            voucherId: payment.id,
            debit: new Prisma.Decimal(amount),
            credit: new Prisma.Decimal(0),
            remarks: `Payment made ${payNum}`,
          }
        });

        // Link allocations
        for (const it of items) {
          const billNum = String(it["Bill Number"] || "").trim();
          const applyAmt = parseFloat(it["Bill Amount"] || 0); // fallback or allocation field
          if (!billNum || applyAmt <= 0) continue;

          const billId = billIdMap.get(billNum) || null;
          if (billId) {
            await db.paymentAllocation.create({
              data: {
                paymentEntryId: payment.id,
                purchaseInvoiceId: billId,
                allocatedAmount: new Prisma.Decimal(applyAmt),
              }
            });

            // Adjust bill balance
            const bill = await db.purchaseInvoice.findUnique({ where: { id: billId } });
            if (bill) {
              const outstanding = Math.max(0, Number(bill.outstandingAmount) - applyAmt);
              const paid = Number(bill.paidAmount) + applyAmt;
              const status = outstanding <= 0 ? "PAID" : outstanding < Number(bill.grandTotal) ? "PARTLY_PAID" : "UNPAID";

              await db.purchaseInvoice.update({
                where: { id: billId },
                data: {
                  paidAmount: new Prisma.Decimal(paid),
                  outstandingAmount: new Prisma.Decimal(outstanding),
                  status,
                }
              });
            }
          }
        }
      }
    }
  }

  // 7. INGEST JOURNALS (Journal (1).xlsx)
  const journalPath = path.join(DATA_DIR, "Journal (1).xlsx");
  if (fs.existsSync(journalPath)) {
    const workbook = XLSX.readFile(journalPath);
    const sheetName = workbook.SheetNames[0];
    const rows: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
    console.log(`Loaded ${rows.length} journal lines from Journal (1).xlsx`);

    const grouped = new Map<string, any[]>();
    for (const r of rows) {
      const jvNum = String(r["Journal Number"] || "").trim();
      if (!jvNum) continue;
      if (!grouped.has(jvNum)) grouped.set(jvNum, []);
      grouped.get(jvNum)!.push(r);
    }

    console.log(`Grouped into ${grouped.size} journal entries`);

    for (const [jvNum, items] of grouped.entries()) {
      const header = items[0];
      const postingDate = excelDateToJSDate(header["Journal Date"]);
      const remarks = header["Notes"] ? String(header["Notes"]).trim() : "Journal Voucher";

      let journal = await db.journalEntry.findFirst({
        where: { orgId: ORG_ID, voucherNo: jvNum }
      });

      if (!journal) {
        let totalDebit = 0;
        let totalCredit = 0;

        const linesData = [];
        for (const it of items) {
          const deb = parseFloat(it["Debit"] || 0);
          const cred = parseFloat(it["Credit"] || 0);
          const accName = String(it["Account"] || "").trim();
          const accCode = String(it["Account Code"] || "").trim();
          if (!accName) continue;

          const accountId = await getOrCreateAccount(accName, accCode);
          totalDebit += deb;
          totalCredit += cred;

          linesData.push({
            accountId,
            debit: new Prisma.Decimal(deb),
            credit: new Prisma.Decimal(cred),
            partyType: it["Contact Name"] ? "CUSTOMER" : null,
            partyId: it["Contact Name"] ? customerIdMap.get(String(it["Contact Name"])) || null : null,
            remarks: it["Description"] ? String(it["Description"]).trim() : null,
          });
        }

        journal = await db.journalEntry.create({
          data: {
            orgId: ORG_ID,
            voucherNo: jvNum,
            postingDate,
            remarks,
            status: "SUBMITTED",
            totalDebit: new Prisma.Decimal(totalDebit),
            totalCredit: new Prisma.Decimal(totalCredit),
            createdById: USER_ID,
            lines: {
              create: linesData
            }
          }
        });

        // GL Postings for Journal Entry
        for (const line of linesData) {
          await db.generalLedgerEntry.create({
            data: {
              orgId: ORG_ID,
              postingDate,
              accountId: line.accountId,
              partyType: line.partyType,
              partyId: line.partyId,
              voucherType: "JOURNAL_ENTRY",
              voucherId: journal.id,
              journalEntryId: journal.id,
              debit: line.debit,
              credit: line.credit,
              remarks: line.remarks,
              createdById: USER_ID,
            }
          });
        }
      }
    }
  }

  console.log("=== FINANCIAL MIGRATION COMPLETED SUCCESSFULLY ===");
}

migrate()
  .catch(err => {
    console.error("Migration crashed:", err);
  })
  .finally(async () => {
    await db.$disconnect();
  });
