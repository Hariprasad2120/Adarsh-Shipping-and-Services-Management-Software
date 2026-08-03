import { hash } from "bcryptjs";
import { db } from "@/lib/db";
import { approveAndPostAccountingDocument, approveAndPostAccountingPayment, prepareLegacyPayment, prepareLegacyPurchaseInvoice, prepareLegacySalesInvoice } from "./document-adapters";
import { ensureLegacyAccountingOperationalBootstrap, ensureLegacyCounterpartyEntityScope } from "./legacy-bootstrap";
import { createJournalEntry, createPaymentEntry, createPurchaseInvoice, createSalesInvoice, getAccountingSettings, seedChartOfAccounts, submitJournalDraftForApproval, submitJournalEntry } from "./service";

const DEMO_PASSWORD = "Demo@12345";
const DEMO_ROLE_NAME = "Accounting Demo Automation";
const DEMO_PERIOD_START = new Date("2026-07-01T00:00:00.000Z");
const DEMO_PERIOD_END = new Date("2026-07-31T23:59:59.999Z");

type DemoUser = {
  id: string;
  email: string;
  name: string;
};

type DemoCounterpartySet = {
  customerId: string;
  vendorId: string;
};

async function hasApprovableInbox(orgId: string, requestId: string) {
  const inbox = await db.accountingIntegrationInbox.findFirst({
    where: { orgId, requestId },
    select: { status: true },
    orderBy: { createdAt: "desc" },
  });
  return inbox?.status === "PENDING" || inbox?.status === "RETRYABLE";
}

export type AccountingDemoRunResult = {
  organisationName: string;
  seededForMonth: string;
  demoUsers: {
    makerEmail: string;
    approverEmail: string;
  };
  createdOrReused: {
    customers: number;
    vendors: number;
    bankAccounts: number;
    postedDocuments: number;
    postedPayments: number;
    postedManualJournals: number;
  };
  checks: Array<{
    label: string;
    status: "passed" | "warning";
    detail: string;
  }>;
};

function demoEmail(orgSlug: string, kind: "maker" | "approver") {
  return `accounting.demo.${kind}+${orgSlug}@monolith.local`;
}

async function ensureDemoRole(orgId: string) {
  const role =
    await db.role.findFirst({
      where: { orgId, name: DEMO_ROLE_NAME },
      select: { id: true },
    }) ??
    await db.role.create({
      data: {
        orgId,
        name: DEMO_ROLE_NAME,
        isSystem: false,
      },
      select: { id: true },
    });

  const permissions = await db.permission.findMany({
    where: { key: { startsWith: "accounting." } },
    select: { id: true },
  });

  if (permissions.length > 0) {
    await db.rolePermission.createMany({
      data: permissions.map((permission) => ({
        roleId: role.id,
        permissionId: permission.id,
      })),
      skipDuplicates: true,
    });
  }

  return role.id;
}

async function ensureDemoUser(input: {
  orgId: string;
  orgSlug: string;
  name: string;
  kind: "maker" | "approver";
  roleId: string;
}) {
  const email = demoEmail(input.orgSlug, input.kind);
  const existing = await db.user.findUnique({
    where: { email },
    select: { id: true, orgId: true, email: true, name: true },
  });

  if (existing && existing.orgId && existing.orgId !== input.orgId) {
    throw new Error(`Demo user ${email} already belongs to another organisation`);
  }

  const passwordHash = await hash(DEMO_PASSWORD, 10);
  const user =
    existing ??
    await db.user.create({
      data: {
        orgId: input.orgId,
        email,
        passwordHash,
        name: input.name,
        active: true,
        designation: "Accounting Demo User",
        emailVerifiedAt: new Date(),
        activatedAt: new Date(),
      },
      select: { id: true, orgId: true, email: true, name: true },
    });

  if (existing?.orgId !== input.orgId || existing.name !== input.name) {
    await db.user.update({
      where: { id: user.id },
      data: {
        orgId: input.orgId,
        name: input.name,
        active: true,
        designation: "Accounting Demo User",
        emailVerifiedAt: new Date(),
        activatedAt: new Date(),
      },
    });
  }

  await db.userRole.createMany({
    data: [{ userId: user.id, roleId: input.roleId }],
    skipDuplicates: true,
  });

  return {
    id: user.id,
    email,
    name: input.name,
  } satisfies DemoUser;
}

async function ensureDemoUsers(orgId: string) {
  const organisation = await db.organisation.findUnique({
    where: { id: orgId },
    select: { id: true, name: true, slug: true },
  });
  if (!organisation) throw new Error("Organisation not found");

  const roleId = await ensureDemoRole(orgId);
  const [maker, approver] = await Promise.all([
    ensureDemoUser({
      orgId,
      orgSlug: organisation.slug,
      name: "Accounting Demo Maker",
      kind: "maker",
      roleId,
    }),
    ensureDemoUser({
      orgId,
      orgSlug: organisation.slug,
      name: "Accounting Demo Approver",
      kind: "approver",
      roleId,
    }),
  ]);

  return {
    organisation,
    maker,
    approver,
  };
}

async function resolveCoreAccounts(orgId: string) {
  const settings = await getAccountingSettings(orgId);
  if (!settings) throw new Error("Accounting settings are unavailable");

  const ownerEquity = await db.account.findFirst({
    where: { orgId, accountCode: "3100", isActive: true, isGroup: false },
    select: { id: true },
  });
  const bankCharges = await db.account.findFirst({
    where: { orgId, accountCode: "5800", isActive: true, isGroup: false },
    select: { id: true },
  });

  if (!settings.defaultBankAccountId) {
    throw new Error("Default bank account mapping is missing");
  }
  if (!settings.defaultReceivableAccountId || !settings.defaultPayableAccountId) {
    throw new Error("Default receivable or payable mapping is missing");
  }
  if (!settings.defaultSalaryExpenseAccountId || !settings.defaultSalaryPayableAccountId) {
    throw new Error("Default salary mappings are missing");
  }
  if (!ownerEquity?.id || !bankCharges?.id) {
    throw new Error("Required standard chart accounts are missing");
  }

  return {
    bankAccountId: settings.defaultBankAccountId,
    receivableAccountId: settings.defaultReceivableAccountId,
    payableAccountId: settings.defaultPayableAccountId,
    salaryExpenseAccountId: settings.defaultSalaryExpenseAccountId,
    salaryPayableAccountId: settings.defaultSalaryPayableAccountId,
    ownerEquityAccountId: ownerEquity.id,
    bankChargesAccountId: bankCharges.id,
  };
}

async function ensurePrimaryBankAccountMetadata(input: {
  orgId: string;
  legalEntityId: string;
  taxRegistrationId: string | null;
  ledgerAccountId: string;
}) {
  const existing = await db.accountingBankAccount.findFirst({
    where: {
      orgId: input.orgId,
      ledgerAccountId: input.ledgerAccountId,
    },
    select: { id: true },
  });
  if (existing) return false;

  await db.accountingBankAccount.create({
    data: {
      orgId: input.orgId,
      legalEntityId: input.legalEntityId,
      taxRegistrationId: input.taxRegistrationId,
      ledgerAccountId: input.ledgerAccountId,
      code: "DEMO_BANK_MAIN",
      name: "Main Operating Bank",
      bankName: "Monolith Demo Bank",
      branchName: "Chennai Harbour Branch",
      accountNumberMasked: "XXXXXX2607",
      ifsc: "MONO0002607",
      currencyCode: "INR",
      isPrimary: true,
      configuration: {
        source: "accounting-demo",
        month: "2026-07",
      },
      statutoryValidated: true,
      effectiveFrom: DEMO_PERIOD_START,
      isActive: true,
    },
  });
  return true;
}

async function ensureDemoCounterparties(input: {
  orgId: string;
  legalEntityId: string;
  receivableAccountId: string;
  payableAccountId: string;
  ownerId: string;
}) {
  const [customer, vendor] = await Promise.all([
    db.crmAccount.findFirst({
      where: {
        orgId: input.orgId,
        name: "Monolith Demo Customer - July 2026",
      },
      select: { id: true },
    }),
    db.crmVendor.findFirst({
      where: {
        orgId: input.orgId,
        name: "Monolith Demo Vendor - July 2026",
      },
      select: { id: true },
    }),
  ]);

  const resolvedCustomer =
    customer ??
    await db.crmAccount.create({
      data: {
        orgId: input.orgId,
        ownerId: input.ownerId,
        name: "Monolith Demo Customer - July 2026",
        type: "Customer",
        status: "ACTIVE",
        email: "finance.customer.demo@monolith.local",
        phone: "+91 44 4000 2607",
        billingAddress: "Chennai Port Road, Chennai, Tamil Nadu",
        shippingAddress: "Warehouse Gate 4, Chennai, Tamil Nadu",
        creditLimit: 750000,
        paymentTerms: "Net 30",
        customerSubType: "Business",
        currency: "INR",
        gstTreatment: "Consumer",
        taxPreference: "Taxable",
        createdById: input.ownerId,
        updatedById: input.ownerId,
      },
      select: { id: true },
    });

  const resolvedVendor =
    vendor ??
    await db.crmVendor.create({
      data: {
        orgId: input.orgId,
        ownerId: input.ownerId,
        name: "Monolith Demo Vendor - July 2026",
        email: "finance.vendor.demo@monolith.local",
        phone: "+91 44 4555 2607",
        address: "Tondiarpet Yard, Chennai, Tamil Nadu",
        services: "Transport and dock support",
        status: "ACTIVE",
        createdById: input.ownerId,
        updatedById: input.ownerId,
      },
      select: { id: true },
    });

  await db.accountingCustomerProfile.upsert({
    where: { crmAccountId: resolvedCustomer.id },
    update: {
      receivableAccountId: input.receivableAccountId,
      currencyCode: "INR",
      creditLimit: "750000.00",
      paymentTermsDays: 30,
      collectionPolicyVersion: 1,
      creditHold: false,
      statementDeliveryMode: "EMAIL",
      isActive: true,
    },
    create: {
      orgId: input.orgId,
      crmAccountId: resolvedCustomer.id,
      receivableAccountId: input.receivableAccountId,
      currencyCode: "INR",
      creditLimit: "750000.00",
      paymentTermsDays: 30,
      collectionPolicyVersion: 1,
      creditHold: false,
      statementDeliveryMode: "EMAIL",
      isActive: true,
    },
  });

  await db.accountingVendorProfile.upsert({
    where: { crmVendorId: resolvedVendor.id },
    update: {
      payableAccountId: input.payableAccountId,
      currencyCode: "INR",
      paymentTermsDays: 21,
      paymentPolicyVersion: 1,
      paymentHold: false,
      paymentMethod: "BANK_PAYMENT",
      isActive: true,
    },
    create: {
      orgId: input.orgId,
      crmVendorId: resolvedVendor.id,
      payableAccountId: input.payableAccountId,
      currencyCode: "INR",
      paymentTermsDays: 21,
      paymentPolicyVersion: 1,
      paymentHold: false,
      paymentMethod: "BANK_PAYMENT",
      isActive: true,
    },
  });

  await Promise.all([
    ensureLegacyCounterpartyEntityScope({
      orgId: input.orgId,
      legalEntityId: input.legalEntityId,
      partyType: "CUSTOMER",
      partyId: resolvedCustomer.id,
      date: DEMO_PERIOD_START,
    }),
    ensureLegacyCounterpartyEntityScope({
      orgId: input.orgId,
      legalEntityId: input.legalEntityId,
      partyType: "SUPPLIER",
      partyId: resolvedVendor.id,
      date: DEMO_PERIOD_START,
    }),
  ]);

  return {
    counterparties: {
      customerId: resolvedCustomer.id,
      vendorId: resolvedVendor.id,
    } satisfies DemoCounterpartySet,
    createdCustomers: customer ? 0 : 1,
    createdVendors: vendor ? 0 : 1,
  };
}

async function ensurePostedManualJournal(input: {
  orgId: string;
  makerId: string;
  approverId: string;
  postingDate: string;
  remarks: string;
  lines: Array<{
    accountId: string;
    debit: string;
    credit: string;
    partyType?: string | null;
    partyId?: string | null;
    remarks?: string | null;
  }>;
}) {
  const posted = await db.journalEntry.findFirst({
    where: {
      orgId: input.orgId,
      postingDate: new Date(input.postingDate),
      remarks: input.remarks,
      status: "POSTED",
    },
    select: { id: true },
  });
  if (posted) return false;

  let draft = await db.journalEntry.findFirst({
    where: {
      orgId: input.orgId,
      postingDate: new Date(input.postingDate),
      remarks: input.remarks,
      createdById: input.makerId,
      status: "DRAFT",
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, rowVersion: true, status: true },
  });

  if (!draft) {
    const created = await createJournalEntry(input.orgId, input.makerId, {
      postingDate: input.postingDate,
      remarks: input.remarks,
      lines: input.lines,
    });
    draft = {
      id: created.id,
      rowVersion: created.rowVersion,
      status: created.status,
    };
  }

  if (draft.status === "DRAFT") {
    const submitted = await submitJournalDraftForApproval(
      input.orgId,
      draft.id,
      input.makerId,
      draft.rowVersion,
    );
    draft = {
      id: submitted.id,
      rowVersion: submitted.rowVersion,
      status: submitted.status,
    };
  }

  if (draft.status === "SUBMITTED") {
    await submitJournalEntry(
      input.orgId,
      draft.id,
      input.approverId,
      draft.rowVersion,
    );
  }

  return true;
}

async function ensurePostedSalesInvoice(input: {
  orgId: string;
  makerId: string;
  approverId: string;
  customerId: string;
  postingDate: string;
  dueDate: string;
  invoiceNumber: string;
  itemName: string;
  qty: number;
  rate: number;
  taxRate: number;
  remarks: string;
}) {
  let invoice = await db.salesInvoice.findFirst({
    where: {
      orgId: input.orgId,
      invoiceNumber: input.invoiceNumber,
    },
    select: { id: true, status: true },
  });

  if (!invoice) {
    const created = await createSalesInvoice(input.orgId, input.makerId, {
      customerId: input.customerId,
      postingDate: input.postingDate,
      dueDate: input.dueDate,
      invoiceNumber: input.invoiceNumber,
      taxRate: input.taxRate,
      remarks: input.remarks,
      items: [
        {
          itemName: input.itemName,
          qty: input.qty,
          rate: input.rate,
          currency: "INR",
          exchangeRate: 1,
        },
      ],
    });
    invoice = { id: created.id, status: created.status };
  }

  let document = await db.accountingDocument.findFirst({
    where: {
      orgId: input.orgId,
      legacyRecordType: "SalesInvoice",
      legacyRecordId: invoice.id,
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, status: true, rowVersion: true, requestId: true },
  });

  if (
    document?.status === "PENDING_APPROVAL" &&
    !(await hasApprovableInbox(input.orgId, document.requestId))
  ) {
    await db.salesInvoice.update({
      where: { id: invoice.id },
      data: {
        manualNotes: `Accounting demo re-prepared on ${new Date().toISOString()}`,
      },
    });
    document = null;
  }

  if (!document && invoice.status === "DRAFT") {
    const prepared = await prepareLegacySalesInvoice({
      orgId: input.orgId,
      invoiceId: invoice.id,
      makerId: input.makerId,
    });
    document = {
      id: prepared.id,
      status: prepared.status,
      rowVersion: prepared.rowVersion,
      requestId: prepared.requestId,
    };
  }

  if (document?.status === "PENDING_APPROVAL") {
    await approveAndPostAccountingDocument({
      orgId: input.orgId,
      documentId: document.id,
      approverId: input.approverId,
      expectedVersion: document.rowVersion,
    });
    return true;
  }

  return document?.status !== "POSTED";
}

async function ensurePostedPurchaseInvoice(input: {
  orgId: string;
  makerId: string;
  approverId: string;
  vendorId: string;
  postingDate: string;
  dueDate: string;
  invoiceNumber: string;
  itemName: string;
  qty: number;
  rate: number;
  remarks: string;
}) {
  let invoice = await db.purchaseInvoice.findFirst({
    where: {
      orgId: input.orgId,
      invoiceNumber: input.invoiceNumber,
    },
    select: { id: true, status: true },
  });

  if (!invoice) {
    const created = await createPurchaseInvoice(input.orgId, input.makerId, {
      supplierId: input.vendorId,
      postingDate: input.postingDate,
      dueDate: input.dueDate,
      invoiceNumber: input.invoiceNumber,
      taxRate: 0,
      remarks: input.remarks,
      items: [
        {
          itemName: input.itemName,
          qty: input.qty,
          rate: input.rate,
        },
      ],
    });
    invoice = { id: created.id, status: created.status };
  }

  let document = await db.accountingDocument.findFirst({
    where: {
      orgId: input.orgId,
      legacyRecordType: "PurchaseInvoice",
      legacyRecordId: invoice.id,
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, status: true, rowVersion: true, requestId: true },
  });

  if (
    document?.status === "PENDING_APPROVAL" &&
    !(await hasApprovableInbox(input.orgId, document.requestId))
  ) {
    await db.purchaseInvoice.update({
      where: { id: invoice.id },
      data: {
        terms: `Accounting demo re-prepared on ${new Date().toISOString()}`,
      },
    });
    document = null;
  }

  if (!document && invoice.status === "DRAFT") {
    const prepared = await prepareLegacyPurchaseInvoice({
      orgId: input.orgId,
      invoiceId: invoice.id,
      makerId: input.makerId,
    });
    document = {
      id: prepared.id,
      status: prepared.status,
      rowVersion: prepared.rowVersion,
      requestId: prepared.requestId,
    };
  }

  if (document?.status === "PENDING_APPROVAL") {
    await approveAndPostAccountingDocument({
      orgId: input.orgId,
      documentId: document.id,
      approverId: input.approverId,
      expectedVersion: document.rowVersion,
    });
    return true;
  }

  return document?.status !== "POSTED";
}

async function ensurePostedPayment(input: {
  orgId: string;
  makerId: string;
  approverId: string;
  referenceNo: string;
  paymentType: "RECEIVE" | "PAY";
  partyType: "CUSTOMER" | "SUPPLIER";
  partyId: string;
  paidFromAccountId: string;
  paidToAccountId: string;
  amount: string;
  postingDate: string;
  remarks: string;
  allocations: Array<{
    salesInvoiceId?: string;
    purchaseInvoiceId?: string;
    allocatedAmount: string;
  }>;
}) {
  let entry = await db.paymentEntry.findFirst({
    where: {
      orgId: input.orgId,
      referenceNo: input.referenceNo,
    },
    select: { id: true, status: true },
  });

  if (!entry) {
    const created = await createPaymentEntry(input.orgId, input.makerId, {
      referenceNo: input.referenceNo,
      paymentType: input.paymentType,
      partyType: input.partyType,
      partyId: input.partyId,
      paidFromAccountId: input.paidFromAccountId,
      paidToAccountId: input.paidToAccountId,
      amount: input.amount,
      postingDate: input.postingDate,
      remarks: input.remarks,
      allocations: input.allocations,
    });
    entry = { id: created.id, status: created.status };
  }

  let payment = await db.accountingPayment.findFirst({
    where: {
      orgId: input.orgId,
      legacyPaymentEntryId: entry.id,
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, status: true, rowVersion: true, requestId: true },
  });

  if (
    payment?.status === "PENDING_APPROVAL" &&
    !(await hasApprovableInbox(input.orgId, payment.requestId))
  ) {
    await db.paymentEntry.update({
      where: { id: entry.id },
      data: {
        remarks: `${input.remarks} · demo re-prepared ${new Date().toISOString()}`,
      },
    });
    payment = null;
  }

  if (!payment && entry.status === "DRAFT") {
    const prepared = await prepareLegacyPayment({
      orgId: input.orgId,
      paymentEntryId: entry.id,
      makerId: input.makerId,
    });
    payment = {
      id: prepared.id,
      status: prepared.status,
      rowVersion: prepared.rowVersion,
      requestId: prepared.requestId,
    };
  }

  if (payment?.status === "PENDING_APPROVAL") {
    await approveAndPostAccountingPayment({
      orgId: input.orgId,
      paymentId: payment.id,
      approverId: input.approverId,
      expectedVersion: payment.rowVersion,
    });
    return true;
  }

  return payment?.status !== "POSTED";
}

async function collectVerification(orgId: string) {
  const [postedDocuments, postedPayments, postedManualJournals, totals] =
    await Promise.all([
      db.accountingDocument.count({
        where: {
          orgId,
          status: "POSTED",
          postingDate: {
            gte: DEMO_PERIOD_START,
            lte: DEMO_PERIOD_END,
          },
        },
      }),
      db.accountingPayment.count({
        where: {
          orgId,
          status: "POSTED",
          transactionDate: {
            gte: DEMO_PERIOD_START,
            lte: DEMO_PERIOD_END,
          },
        },
      }),
      db.journalEntry.count({
        where: {
          orgId,
          status: "POSTED",
          postingDate: {
            gte: DEMO_PERIOD_START,
            lte: DEMO_PERIOD_END,
          },
          sourceType: "MANUAL_JOURNAL_DRAFT",
        },
      }),
      db.journalEntry.aggregate({
        where: {
          orgId,
          status: "POSTED",
          postingDate: {
            gte: DEMO_PERIOD_START,
            lte: DEMO_PERIOD_END,
          },
        },
        _sum: {
          totalDebit: true,
          totalCredit: true,
        },
      }),
    ]);

  const totalDebit = Number(totals._sum.totalDebit ?? 0);
  const totalCredit = Number(totals._sum.totalCredit ?? 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.0001;

  return {
    postedDocuments,
    postedPayments,
    postedManualJournals,
    checks: [
      {
        label: "Canonical documents posted",
        status: postedDocuments >= 2 ? ("passed" as const) : ("warning" as const),
        detail: `${postedDocuments} posted Accounting documents exist for July 2026.`,
      },
      {
        label: "Canonical payments posted",
        status: postedPayments >= 2 ? ("passed" as const) : ("warning" as const),
        detail: `${postedPayments} posted Accounting payments exist for July 2026.`,
      },
      {
        label: "Manual journals posted",
        status:
          postedManualJournals >= 3 ? ("passed" as const) : ("warning" as const),
        detail: `${postedManualJournals} posted manual journals exist for July 2026.`,
      },
      {
        label: "July ledger is balanced",
        status: isBalanced ? ("passed" as const) : ("warning" as const),
        detail: `Posted July totals are debit ${totalDebit.toFixed(2)} and credit ${totalCredit.toFixed(2)}.`,
      },
    ],
  };
}

export async function seedAccountingDemoMonth(input: {
  orgId: string;
  requestedById: string;
}) {
  void input.requestedById;

  const { organisation, maker, approver } = await ensureDemoUsers(input.orgId);

  await seedChartOfAccounts(input.orgId);
  const bootstrap = await ensureLegacyAccountingOperationalBootstrap(
    input.orgId,
    DEMO_PERIOD_START,
  );
  const accounts = await resolveCoreAccounts(input.orgId);
  const bankAccountCreated = await ensurePrimaryBankAccountMetadata({
    orgId: input.orgId,
    legalEntityId: bootstrap.legalEntityId,
    taxRegistrationId: bootstrap.taxRegistrationId,
    ledgerAccountId: accounts.bankAccountId,
  });
  const counterpartyResult = await ensureDemoCounterparties({
    orgId: input.orgId,
    legalEntityId: bootstrap.legalEntityId,
    receivableAccountId: accounts.receivableAccountId,
    payableAccountId: accounts.payableAccountId,
    ownerId: maker.id,
  });

  const postedSalesDocument = await ensurePostedSalesInvoice({
    orgId: input.orgId,
    makerId: maker.id,
    approverId: approver.id,
    customerId: counterpartyResult.counterparties.customerId,
    postingDate: "2026-07-03",
    dueDate: "2026-08-02",
    invoiceNumber: "DEMO-SINV-260703",
    itemName: "Ocean freight booking and documentation",
    qty: 1,
    rate: 120000,
    taxRate: 18,
    remarks: "July demo sales invoice for logistics services",
  });

  const postedPurchaseDocument = await ensurePostedPurchaseInvoice({
    orgId: input.orgId,
    makerId: maker.id,
    approverId: approver.id,
    vendorId: counterpartyResult.counterparties.vendorId,
    postingDate: "2026-07-06",
    dueDate: "2026-07-27",
    invoiceNumber: "DEMO-PINV-260706",
    itemName: "Local transport support for shipment handling",
    qty: 1,
    rate: 45000,
    remarks: "July demo purchase invoice for transport support",
  });

  const salesInvoice = await db.salesInvoice.findFirstOrThrow({
    where: { orgId: input.orgId, invoiceNumber: "DEMO-SINV-260703" },
    select: { id: true },
  });
  const purchaseInvoice = await db.purchaseInvoice.findFirstOrThrow({
    where: { orgId: input.orgId, invoiceNumber: "DEMO-PINV-260706" },
    select: { id: true },
  });

  const postedCustomerPayment = await ensurePostedPayment({
    orgId: input.orgId,
    makerId: maker.id,
    approverId: approver.id,
    referenceNo: "DEMO-REC-260710",
    paymentType: "RECEIVE",
    partyType: "CUSTOMER",
    partyId: counterpartyResult.counterparties.customerId,
    paidFromAccountId: accounts.receivableAccountId,
    paidToAccountId: accounts.bankAccountId,
    amount: "90000.00",
    postingDate: "2026-07-10",
    remarks: "July demo customer collection",
    allocations: [
      {
        salesInvoiceId: salesInvoice.id,
        allocatedAmount: "90000.00",
      },
    ],
  });

  const postedVendorPayment = await ensurePostedPayment({
    orgId: input.orgId,
    makerId: maker.id,
    approverId: approver.id,
    referenceNo: "DEMO-PAY-260714",
    paymentType: "PAY",
    partyType: "SUPPLIER",
    partyId: counterpartyResult.counterparties.vendorId,
    paidFromAccountId: accounts.bankAccountId,
    paidToAccountId: accounts.payableAccountId,
    amount: "30000.00",
    postingDate: "2026-07-14",
    remarks: "July demo vendor payment",
    allocations: [
      {
        purchaseInvoiceId: purchaseInvoice.id,
        allocatedAmount: "30000.00",
      },
    ],
  });

  const postedOpeningJournal = await ensurePostedManualJournal({
    orgId: input.orgId,
    makerId: maker.id,
    approverId: approver.id,
    postingDate: "2026-07-01",
    remarks: "Accounting demo opening capital for July 2026",
    lines: [
      {
        accountId: accounts.bankAccountId,
        debit: "500000.00",
        credit: "0",
      },
      {
        accountId: accounts.ownerEquityAccountId,
        debit: "0",
        credit: "500000.00",
      },
    ],
  });

  const postedSalaryJournal = await ensurePostedManualJournal({
    orgId: input.orgId,
    makerId: maker.id,
    approverId: approver.id,
    postingDate: "2026-07-25",
    remarks: "Accounting demo July payroll accrual",
    lines: [
      {
        accountId: accounts.salaryExpenseAccountId,
        debit: "85000.00",
        credit: "0",
      },
      {
        accountId: accounts.salaryPayableAccountId,
        debit: "0",
        credit: "85000.00",
      },
    ],
  });

  const postedBankChargeJournal = await ensurePostedManualJournal({
    orgId: input.orgId,
    makerId: maker.id,
    approverId: approver.id,
    postingDate: "2026-07-30",
    remarks: "Accounting demo bank charges for July 2026",
    lines: [
      {
        accountId: accounts.bankChargesAccountId,
        debit: "1250.00",
        credit: "0",
      },
      {
        accountId: accounts.bankAccountId,
        debit: "0",
        credit: "1250.00",
      },
    ],
  });

  const verification = await collectVerification(input.orgId);

  return {
    organisationName: organisation.name,
    seededForMonth: "July 2026",
    demoUsers: {
      makerEmail: maker.email,
      approverEmail: approver.email,
    },
    createdOrReused: {
      customers: counterpartyResult.createdCustomers,
      vendors: counterpartyResult.createdVendors,
      bankAccounts: bankAccountCreated ? 1 : 0,
      postedDocuments:
        Number(postedSalesDocument) + Number(postedPurchaseDocument),
      postedPayments:
        Number(postedCustomerPayment) + Number(postedVendorPayment),
      postedManualJournals:
        Number(postedOpeningJournal) +
        Number(postedSalaryJournal) +
        Number(postedBankChargeJournal),
    },
    checks: verification.checks,
  } satisfies AccountingDemoRunResult;
}
