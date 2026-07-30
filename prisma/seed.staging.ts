import { hash } from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import {
  assertExactStagingEnvironment,
  verifyExactStagingDatabaseIdentity,
} from "../scripts/staging-target";
import {
  assertStagingLoginEmailOwner,
  STAGING_CHECKER_PERMISSION_KEYS,
  STAGING_CHECKER_ROLE_ID,
  STAGING_CHECKER_ROLE_NAME,
  STAGING_LOGIN_IDENTITY,
  STAGING_MAKER_PERMISSION_KEYS,
  STAGING_MAKER_ROLE_ID,
  STAGING_MAKER_ROLE_NAME,
} from "../scripts/staging-login-policy";

const STAGING_ORG_ID = "stg_org_monolith_accounting";
const STAGING_ORG_SLUG = "staging-monolith-accounting";

function assertSafeStagingTarget() {
  if (!process.env.STAGING_TEST_PASSWORD) {
    throw new Error("Staging seed refused: STAGING_TEST_PASSWORD is missing.");
  }

  return assertExactStagingEnvironment("Staging seed").connectionString;
}

const connectionString = assertSafeStagingTarget();
const adapter = new PrismaPg({ connectionString });
const db = new PrismaClient({
  adapter,
} as ConstructorParameters<typeof PrismaClient>[0]);

const ids = {
  branch: "stg_branch_demo",
  makerRole: STAGING_MAKER_ROLE_ID,
  checkerRole: STAGING_CHECKER_ROLE_ID,
  makerUser: STAGING_LOGIN_IDENTITY.id,
  checkerUser: "stg_user_accounting_checker",
  employeeUser: "stg_user_employee",
  customer: "stg_crm_customer",
  customerContact: "stg_crm_customer_contact",
  customerPortal: "stg_customer_portal_user",
  vendor: "stg_crm_vendor",
  serviceInr: "stg_service_inr",
  serviceUsd: "stg_service_usd",
  fiscalYear: "stg_fy_2027_28",
  job: "stg_job_costing_demo",
  draftJournal: "stg_journal_draft",
  submittedJournal: "stg_journal_submitted",
  salesInvoice: "stg_sales_invoice",
  usdInvoice: "stg_sales_invoice_usd",
  purchaseInvoice: "stg_purchase_invoice",
  receipt: "stg_receipt",
  payment: "stg_payment",
  customerNote: "stg_customer_debit_note",
  vendorNote: "stg_vendor_debit_note",
  accountingProfile: "stg_accounting_profile",
  legalEntity: "stg_accounting_legal_entity",
  taxRegistration: "stg_accounting_tax_registration",
  currencyInr: "stg_currency_inr",
  currencyUsd: "stg_currency_usd",
  roundingPolicy: "stg_rounding_policy_non_statutory",
  approvalPolicy: "stg_approval_policy_journal",
  branchDimension: "stg_dimension_branch",
  costCentreDimension: "stg_dimension_cost_centre",
  legacyLetterTemplate: "stg_legacy_letter_template",
  legacyLetterRequest: "stg_legacy_letter_request",
} as const;

const accounts = [
  {
    id: "stg_account_cash",
    accountCode: "STG-1000",
    accountName: "STAGING Demo Cash",
    rootType: "ASSET",
    accountType: "CASH",
  },
  {
    id: "stg_account_bank",
    accountCode: "STG-1010",
    accountName: "STAGING Demo Bank Clearing",
    rootType: "ASSET",
    accountType: "BANK",
  },
  {
    id: "stg_account_receivable",
    accountCode: "STG-1100",
    accountName: "STAGING Trade Receivables",
    rootType: "ASSET",
    accountType: "RECEIVABLE",
  },
  {
    id: "stg_account_payable",
    accountCode: "STG-2000",
    accountName: "STAGING Trade Payables",
    rootType: "LIABILITY",
    accountType: "PAYABLE",
  },
  {
    id: "stg_account_tax",
    accountCode: "STG-2100",
    accountName: "STAGING Demo Tax Control",
    rootType: "LIABILITY",
    accountType: "TAX",
  },
  {
    id: "stg_account_sales",
    accountCode: "STG-4000",
    accountName: "STAGING Service Revenue",
    rootType: "INCOME",
    accountType: "SALES",
  },
  {
    id: "stg_account_purchase",
    accountCode: "STG-5000",
    accountName: "STAGING Service Costs",
    rootType: "EXPENSE",
    accountType: "PURCHASE",
  },
  {
    id: "stg_account_expense",
    accountCode: "STG-5100",
    accountName: "STAGING Operating Expense",
    rootType: "EXPENSE",
    accountType: "EXPENSE",
  },
  {
    id: "stg_account_roundoff",
    accountCode: "STG-5900",
    accountName: "STAGING Round Off",
    rootType: "EXPENSE",
    accountType: "ROUND_OFF",
  },
] as const;

async function seed() {
  await verifyExactStagingDatabaseIdentity("Staging seed");
  const passwordHash = await hash(process.env.STAGING_TEST_PASSWORD!, 12);

  await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT set_config('monolith.accounting_seed_fixture', 'on', true)`;
    const stagingLoginOwner = await tx.user.findUnique({
      where: { email: STAGING_LOGIN_IDENTITY.email },
      select: { id: true },
    });
    assertStagingLoginEmailOwner(stagingLoginOwner?.id ?? null);

    await tx.organisation.upsert({
      where: { slug: STAGING_ORG_SLUG },
      update: {
        name: "STAGING Monolith Accounting Demo Organisation",
        active: true,
      },
      create: {
        id: STAGING_ORG_ID,
        slug: STAGING_ORG_SLUG,
        name: "STAGING Monolith Accounting Demo Organisation",
      },
    });

    await tx.branch.upsert({
      where: {
        orgId_code: { orgId: STAGING_ORG_ID, code: "STG-DEMO" },
      },
      update: { name: "STAGING Demo Branch" },
      create: {
        id: ids.branch,
        orgId: STAGING_ORG_ID,
        code: "STG-DEMO",
        name: "STAGING Demo Branch",
      },
    });

    const permissions = [
      {
        key: "accounting.read",
        label: "Read accounting records",
        group: "Accounting",
      },
      {
        key: "accounting.create",
        label: "Create accounting drafts",
        group: "Accounting",
      },
      {
        key: "accounting.approve",
        label: "Approve accounting drafts",
        group: "Accounting",
      },
      {
        key: "accounting.post",
        label: "Post approved accounting requests",
        group: "Accounting",
      },
      {
        key: "accounting.reverse",
        label: "Reverse posted accounting journals",
        group: "Accounting",
      },
      {
        key: "accounting.replace",
        label: "Replace reversed accounting journals",
        group: "Accounting",
      },
      {
        key: "accounting.integration.post",
        label: "Post through a trusted accounting integration",
        group: "Accounting",
      },
      {
        key: "accounting.integration.retry",
        label: "Retry or review accounting integration requests",
        group: "Accounting",
      },
      { key: "accounting.draft.create", label: "Create Accounting drafts", group: "Accounting" },
      { key: "accounting.journal.prepare", label: "Prepare journal entries", group: "Accounting" },
      { key: "accounting.journal.approve", label: "Approve journal entries", group: "Accounting" },
      { key: "accounting.invoice.create", label: "Create Accounting invoice requests", group: "Accounting" },
      { key: "accounting.period_lock.request", label: "Request Accounting period locks", group: "Accounting" },
      { key: "accounting.period_lock.approve", label: "Approve Accounting period locks", group: "Accounting" },
      { key: "accounting.exchange_rate.maintain", label: "Maintain Accounting exchange rates", group: "Accounting" },
      { key: "accounting.rounding_policy.admin", label: "Administer Accounting rounding policies", group: "Accounting" },
      { key: "accounting.approval_policy.admin", label: "Administer Accounting approval policies", group: "Accounting" },
      { key: "accounting.number_series.admin", label: "Administer Accounting number series", group: "Accounting" },
      { key: "accounting.integration.manual-review", label: "Review Accounting integration failures", group: "Accounting" },
      { key: "accounting.ledger.read", label: "Read Accounting ledger", group: "Accounting" },
      { key: "accounting.audit.read", label: "Read Accounting audit", group: "Accounting" },
      { key: "accounting.document.read", label: "Read canonical Accounting documents", group: "Accounting" },
      { key: "accounting.document.approve", label: "Approve canonical Accounting documents", group: "Accounting" },
      { key: "accounting.payment.read", label: "Read canonical Accounting payments", group: "Accounting" },
      { key: "accounting.sales-invoice.prepare", label: "Prepare sales invoices", group: "Accounting" },
      { key: "accounting.sales-invoice.approve", label: "Approve sales invoices", group: "Accounting" },
      { key: "accounting.purchase-invoice.prepare", label: "Prepare purchase invoices", group: "Accounting" },
      { key: "accounting.purchase-invoice.approve", label: "Approve purchase invoices", group: "Accounting" },
      { key: "accounting.receipt.prepare", label: "Prepare customer receipts", group: "Accounting" },
      { key: "accounting.payment.prepare", label: "Prepare Accounting payments", group: "Accounting" },
      { key: "accounting.payment.approve", label: "Approve Accounting payments", group: "Accounting" },
      { key: "accounting.payment.post", label: "Post approved Accounting payments", group: "Accounting" },
      { key: "accounting.payment.allocate", label: "Allocate Accounting payments", group: "Accounting" },
      { key: "accounting.payment.reverse", label: "Reverse posted Accounting payments", group: "Accounting" },
      { key: "accounting.credit-note.prepare", label: "Prepare Accounting credit notes", group: "Accounting" },
      { key: "accounting.debit-note.prepare", label: "Prepare Accounting debit notes", group: "Accounting" },
      { key: "accounting.correction.approve", label: "Approve Accounting corrections", group: "Accounting" },
      { key: "accounting.recurring-occurrence.process", label: "Process recurring Accounting occurrences", group: "Accounting" },
      { key: "accounting.outbox.retry", label: "Retry Accounting outbox publication", group: "Accounting" },
      { key: "accounting.outbox.manual-review", label: "Review Accounting outbox publication", group: "Accounting" },
      { key: "crm.invoice.manage", label: "Manage CRM invoice requests", group: "CRM" },
    ];
    for (const permission of permissions) {
      await tx.permission.upsert({
        where: { key: permission.key },
        update: permission,
        create: permission,
      });
    }

    const makerRole = await tx.role.upsert({
      where: {
        orgId_name: {
          orgId: STAGING_ORG_ID,
          name: STAGING_MAKER_ROLE_NAME,
        },
      },
      update: { isSystem: false },
      create: {
        id: ids.makerRole,
        orgId: STAGING_ORG_ID,
        name: STAGING_MAKER_ROLE_NAME,
      },
    });
    const checkerRole = await tx.role.upsert({
      where: {
        orgId_name: {
          orgId: STAGING_ORG_ID,
          name: STAGING_CHECKER_ROLE_NAME,
        },
      },
      update: { isSystem: false },
      create: {
        id: ids.checkerRole,
        orgId: STAGING_ORG_ID,
        name: STAGING_CHECKER_ROLE_NAME,
      },
    });
    const storedPermissions = await tx.permission.findMany({
      where: { key: { in: permissions.map(({ key }) => key) } },
    });
    await tx.rolePermission.deleteMany({
      where: {
        roleId: makerRole.id,
        permission: { key: { notIn: [...STAGING_MAKER_PERMISSION_KEYS] } },
      },
    });
    await tx.rolePermission.deleteMany({
      where: {
        roleId: checkerRole.id,
        permission: { key: { notIn: [...STAGING_CHECKER_PERMISSION_KEYS] } },
      },
    });
    const makerPermissionKeys = new Set<string>(
      STAGING_MAKER_PERMISSION_KEYS,
    );
    const checkerPermissionKeys = new Set<string>(
      STAGING_CHECKER_PERMISSION_KEYS,
    );
    for (const permission of storedPermissions) {
      for (const [roleId, permissionKeys] of [
        [makerRole.id, makerPermissionKeys],
        [checkerRole.id, checkerPermissionKeys],
      ] as const) {
        if (!permissionKeys.has(permission.key)) {
          continue;
        }
        await tx.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId,
              permissionId: permission.id,
            },
          },
          update: {},
          create: {
            roleId,
            permissionId: permission.id,
          },
        });
      }
    }

    const users = [
      {
        id: ids.makerUser,
        email: STAGING_LOGIN_IDENTITY.email,
        name: "STAGING Accounting Maker",
        designation: "TEST Maker",
        employeeNumber: 990001,
      },
      {
        id: ids.checkerUser,
        email: "accounting-checker@staging.example.com",
        name: "STAGING Accounting Checker",
        designation: "TEST Checker",
        employeeNumber: 990002,
      },
      {
        id: ids.employeeUser,
        email: "employee@staging.example.com",
        name: "STAGING Demo Employee",
        designation: "TEST Employee",
        employeeNumber: 990003,
      },
    ];
    for (const user of users) {
      await tx.user.upsert({
        where: { id: user.id },
        update: {
          email: user.email,
          name: user.name,
          designation: user.designation,
          passwordHash,
          active: true,
          isPlatformAdmin: false,
          orgId: STAGING_ORG_ID,
          branchId: ids.branch,
        },
        create: {
          ...user,
          passwordHash,
          active: true,
          isPlatformAdmin: false,
          activatedAt: new Date("2027-04-01T00:00:00.000Z"),
          orgId: STAGING_ORG_ID,
          branchId: ids.branch,
        },
      });
    }
    await tx.userRole.upsert({
      where: {
        userId_roleId: { userId: ids.makerUser, roleId: makerRole.id },
      },
      update: {},
      create: { userId: ids.makerUser, roleId: makerRole.id },
    });
    await tx.userRole.upsert({
      where: {
        userId_roleId: { userId: ids.checkerUser, roleId: checkerRole.id },
      },
      update: {},
      create: { userId: ids.checkerUser, roleId: checkerRole.id },
    });
    await tx.userRole.deleteMany({
      where: {
        userId: ids.makerUser,
        roleId: { not: makerRole.id },
      },
    });
    await tx.userRole.deleteMany({
      where: {
        userId: ids.checkerUser,
        roleId: { not: checkerRole.id },
      },
    });
    await tx.employmentRecord.upsert({
      where: { userId: ids.employeeUser },
      update: { grade: "STAGING-DEMO" },
      create: {
        id: "stg_employment_record",
        userId: ids.employeeUser,
        joinDate: new Date("2027-04-01T00:00:00.000Z"),
        grade: "STAGING-DEMO",
      },
    });

    await tx.crmAccount.upsert({
      where: { id: ids.customer },
      update: {
        name: "STAGING Example Customer",
        email: "customer@staging.example.com",
        gstin: "INVALID-STAGING-GSTIN",
      },
      create: {
        id: ids.customer,
        orgId: STAGING_ORG_ID,
        ownerId: ids.makerUser,
        name: "STAGING Example Customer",
        type: "Customer",
        email: "customer@staging.example.com",
        website: "https://customer.staging.example.com",
        gstin: "INVALID-STAGING-GSTIN",
        currency: "INR",
        isPortalEnabled: true,
        createdById: ids.makerUser,
        updatedById: ids.makerUser,
      },
    });
    await tx.crmContact.upsert({
      where: { id: ids.customerContact },
      update: {
        lastName: "Customer",
        email: "portal-customer@staging.example.com",
      },
      create: {
        id: ids.customerContact,
        orgId: STAGING_ORG_ID,
        ownerId: ids.makerUser,
        accountId: ids.customer,
        firstName: "STAGING",
        lastName: "Customer",
        email: "portal-customer@staging.example.com",
        isPrimary: true,
        createdById: ids.makerUser,
        updatedById: ids.makerUser,
        tags: ["STAGING", "TEST"],
      },
    });
    await tx.customerPortalUser.upsert({
      where: { contactId: ids.customerContact },
      update: {
        email: "portal-customer@staging.example.com",
        name: "STAGING Portal Customer",
        status: "ACTIVE",
        passwordHash,
      },
      create: {
        id: ids.customerPortal,
        orgId: STAGING_ORG_ID,
        customerId: ids.customer,
        contactId: ids.customerContact,
        email: "portal-customer@staging.example.com",
        name: "STAGING Portal Customer",
        status: "ACTIVE",
        passwordHash,
        activatedAt: new Date("2027-04-01T00:00:00.000Z"),
        createdById: ids.checkerUser,
        updatedById: ids.checkerUser,
      },
    });
    await tx.crmVendor.upsert({
      where: { id: ids.vendor },
      update: {
        name: "STAGING Example Vendor",
        email: "vendor@staging.example.com",
        gstin: "INVALID-STAGING-GSTIN",
      },
      create: {
        id: ids.vendor,
        orgId: STAGING_ORG_ID,
        ownerId: ids.makerUser,
        name: "STAGING Example Vendor",
        email: "vendor@staging.example.com",
        gstin: "INVALID-STAGING-GSTIN",
        services: "STAGING demo services only",
        createdById: ids.makerUser,
        updatedById: ids.makerUser,
      },
    });

    for (const product of [
      {
        id: ids.serviceInr,
        sku: "STG-SERVICE-INR",
        name: "STAGING INR Service",
        price: 1000,
      },
      {
        id: ids.serviceUsd,
        sku: "STG-SERVICE-USD",
        name: "STAGING USD Service",
        price: 100,
      },
    ]) {
      await tx.crmProduct.upsert({
        where: { sku: product.sku },
        update: {
          name: product.name,
          active: true,
          description: "STAGING synthetic service item",
        },
        create: {
          ...product,
          orgId: STAGING_ORG_ID,
          category: "STAGING",
          taxPercent: 0,
          description: "STAGING synthetic service item",
        },
      });
    }

    for (const account of accounts) {
      await tx.account.upsert({
        where: {
          orgId_accountCode: {
            orgId: STAGING_ORG_ID,
            accountCode: account.accountCode,
          },
        },
        update: {
          accountName: account.accountName,
          rootType: account.rootType,
          accountType: account.accountType,
          isActive: true,
        },
        create: {
          ...account,
          orgId: STAGING_ORG_ID,
          branchId: ids.branch,
        },
      });
    }
    await tx.accountingSettings.upsert({
      where: { orgId: STAGING_ORG_ID },
      update: {
        defaultReceivableAccountId: "stg_account_receivable",
        defaultPayableAccountId: "stg_account_payable",
        defaultCashAccountId: "stg_account_cash",
        defaultBankAccountId: "stg_account_bank",
        defaultSalesAccountId: "stg_account_sales",
        defaultPurchaseAccountId: "stg_account_purchase",
        defaultTaxAccountId: "stg_account_tax",
        defaultRoundOffAccountId: "stg_account_roundoff",
      },
      create: {
        id: "stg_accounting_settings",
        orgId: STAGING_ORG_ID,
        defaultReceivableAccountId: "stg_account_receivable",
        defaultPayableAccountId: "stg_account_payable",
        defaultCashAccountId: "stg_account_cash",
        defaultBankAccountId: "stg_account_bank",
        defaultSalesAccountId: "stg_account_sales",
        defaultPurchaseAccountId: "stg_account_purchase",
        defaultTaxAccountId: "stg_account_tax",
        defaultRoundOffAccountId: "stg_account_roundoff",
      },
    });
    await tx.fiscalYear.upsert({
      where: {
        orgId_name: { orgId: STAGING_ORG_ID, name: "STAGING FY 2027-28" },
      },
      update: { closed: false },
      create: {
        id: ids.fiscalYear,
        orgId: STAGING_ORG_ID,
        name: "STAGING FY 2027-28",
        startDate: new Date("2027-04-01T00:00:00.000Z"),
        endDate: new Date("2028-03-31T00:00:00.000Z"),
      },
    });

    await tx.accountingOrganisationProfile.upsert({
      where: { id: ids.accountingProfile },
      update: {
        functionalCurrencyCode: "INR",
        fiscalYearStartMonth: 4,
        fiscalYearStartDay: 1,
        inventoryMode: "SERVICE_ONLY",
        moneyScale: 4,
        quantityScale: 6,
        exchangeRateScale: 10,
        percentageScale: 6,
        roundingMode: "HALF_UP",
        correctionPolicy: {
          nextOpenPeriod: true,
          synthetic: true,
        },
        correctionPolicyVersion: 1,
      },
      create: {
        id: ids.accountingProfile,
        orgId: STAGING_ORG_ID,
        functionalCurrencyCode: "INR",
        fiscalYearStartMonth: 4,
        fiscalYearStartDay: 1,
        inventoryMode: "SERVICE_ONLY",
        moneyScale: 4,
        quantityScale: 6,
        exchangeRateScale: 10,
        percentageScale: 6,
        roundingMode: "HALF_UP",
        correctionPolicy: {
          nextOpenPeriod: true,
          synthetic: true,
        },
        correctionPolicyVersion: 1,
      },
    });
    await tx.accountingLegalEntity.upsert({
      where: { id: ids.legalEntity },
      update: {
        legalName: "STAGING Fictional Shipping Partnership",
        entityType: "PARTNERSHIP",
        status: "ACTIVE",
        isDefault: true,
      },
      create: {
        id: ids.legalEntity,
        orgId: STAGING_ORG_ID,
        code: "STG-ENTITY",
        legalName: "STAGING Fictional Shipping Partnership",
        entityType: "PARTNERSHIP",
        status: "ACTIVE",
        isDefault: true,
        effectiveFrom: new Date("2027-04-01T00:00:00.000Z"),
      },
    });
    await tx.account.updateMany({
      where: {
        orgId: STAGING_ORG_ID,
        id: { in: accounts.map((account) => account.id) },
      },
      data: { legalEntityId: ids.legalEntity },
    });
    await tx.accountingTaxRegistration.upsert({
      where: { id: ids.taxRegistration },
      update: {
        registrationType: "GST",
        gstin: null,
        stateCode: null,
        isActive: false,
      },
      create: {
        id: ids.taxRegistration,
        orgId: STAGING_ORG_ID,
        legalEntityId: ids.legalEntity,
        registrationCode: "STG-GST-PENDING",
        registrationType: "GST",
        gstin: null,
        stateCode: null,
        legalName: "STAGING Fictional Shipping Partnership",
        isActive: false,
        configuration: {
          synthetic: true,
          pendingBusinessConfiguration: true,
        },
      },
    });
    for (const currency of [
      {
        id: ids.currencyInr,
        code: "INR",
        name: "Indian Rupee",
        symbol: "₹",
        decimalPlaces: 2,
        isFunctional: true,
      },
      {
        id: ids.currencyUsd,
        code: "USD",
        name: "US Dollar",
        symbol: "$",
        decimalPlaces: 2,
        isFunctional: false,
      },
    ]) {
      await tx.accountingCurrency.upsert({
        where: { id: currency.id },
        update: { ...currency, isEnabled: true },
        create: {
          ...currency,
          orgId: STAGING_ORG_ID,
          isEnabled: true,
        },
      });
    }
    await tx.accountingExchangeRate.upsert({
      where: { id: "stg_exchange_rate_usd_inr_draft" },
      update: {
        rate: "83.5000000000",
        status: "DRAFT",
        approvedById: null,
        approvedAt: null,
      },
      create: {
        id: "stg_exchange_rate_usd_inr_draft",
        orgId: STAGING_ORG_ID,
        fromCurrencyId: ids.currencyUsd,
        toCurrencyId: ids.currencyInr,
        rateDate: new Date("2027-04-01T00:00:00.000Z"),
        rate: "83.5000000000",
        source: "SYNTHETIC_MANUAL",
        status: "DRAFT",
      },
    });
    await tx.accountingExchangeRate.upsert({
      where: { id: "stg_exchange_rate_usd_inr_approved" },
      update: {
        rate: "83.5000000000",
        status: "APPROVED",
        approvedById: ids.checkerUser,
        approvedAt: new Date("2027-04-01T00:00:00.000Z"),
      },
      create: {
        id: "stg_exchange_rate_usd_inr_approved",
        orgId: STAGING_ORG_ID,
        fromCurrencyId: ids.currencyUsd,
        toCurrencyId: ids.currencyInr,
        rateDate: new Date("2027-04-01T00:00:00.000Z"),
        rate: "83.5000000000",
        source: "SYNTHETIC_APPROVED",
        status: "APPROVED",
        approvedById: ids.checkerUser,
        approvedAt: new Date("2027-04-01T00:00:00.000Z"),
      },
    });

    const periodStarts = [
      "2027-04-01",
      "2027-05-01",
      "2027-06-01",
      "2027-07-01",
      "2027-08-01",
      "2027-09-01",
      "2027-10-01",
      "2027-11-01",
      "2027-12-01",
      "2028-01-01",
      "2028-02-01",
      "2028-03-01",
    ];
    const periodEnds = [
      "2027-04-30",
      "2027-05-31",
      "2027-06-30",
      "2027-07-31",
      "2027-08-31",
      "2027-09-30",
      "2027-10-31",
      "2027-11-30",
      "2027-12-31",
      "2028-01-31",
      "2028-02-29",
      "2028-03-31",
    ];
    for (let index = 0; index < periodStarts.length; index += 1) {
      const periodNumber = index + 1;
      await tx.accountingPeriod.upsert({
        where: { id: `stg_period_2027_28_${periodNumber}` },
        update: {
          name: `STAGING Period ${periodNumber}`,
          status: "OPEN",
        },
        create: {
          id: `stg_period_2027_28_${periodNumber}`,
          orgId: STAGING_ORG_ID,
          fiscalYearId: ids.fiscalYear,
          periodNumber,
          name: `STAGING Period ${periodNumber}`,
          startDate: new Date(`${periodStarts[index]}T00:00:00.000Z`),
          endDate: new Date(`${periodEnds[index]}T00:00:00.000Z`),
          status: "OPEN",
        },
      });
    }

    for (const account of accounts) {
      await tx.accountingAccountControl.upsert({
        where: { accountId: account.id },
        update: {
          defaultCurrencyId: ids.currencyInr,
          isSystemLocked: [
            "stg_account_receivable",
            "stg_account_payable",
            "stg_account_tax",
            "stg_account_roundoff",
          ].includes(account.id),
          allowDirectPosting: ![
            "stg_account_receivable",
            "stg_account_payable",
          ].includes(account.id),
        },
        create: {
          id: `stg_control_${account.id}`,
          orgId: STAGING_ORG_ID,
          accountId: account.id,
          defaultCurrencyId: ids.currencyInr,
          systemRole: account.accountType,
          isSystemLocked: [
            "stg_account_receivable",
            "stg_account_payable",
            "stg_account_tax",
            "stg_account_roundoff",
          ].includes(account.id),
          allowDirectPosting: ![
            "stg_account_receivable",
            "stg_account_payable",
          ].includes(account.id),
        },
      });
    }

    for (const definition of [
      {
        id: ids.branchDimension,
        code: "BRANCH",
        name: "Branch",
        valueSource: "ORGANISATION_BRANCH",
      },
      {
        id: ids.costCentreDimension,
        code: "COST_CENTRE",
        name: "Cost Centre",
        valueSource: "ACCOUNTING",
      },
    ]) {
      await tx.accountingDimensionDefinition.upsert({
        where: { id: definition.id },
        update: { ...definition, isActive: true },
        create: {
          ...definition,
          orgId: STAGING_ORG_ID,
          isActive: true,
        },
      });
    }
    await tx.accountingDimensionValue.upsert({
      where: { id: "stg_dimension_value_branch_demo" },
      update: {
        name: "STAGING Demo Branch",
        canonicalType: "BRANCH",
        canonicalId: ids.branch,
      },
      create: {
        id: "stg_dimension_value_branch_demo",
        orgId: STAGING_ORG_ID,
        definitionId: ids.branchDimension,
        code: "STG-DEMO",
        name: "STAGING Demo Branch",
        canonicalType: "BRANCH",
        canonicalId: ids.branch,
      },
    });
    await tx.accountingDimensionValue.upsert({
      where: { id: "stg_dimension_value_cost_centre" },
      update: { name: "STAGING Synthetic Cost Centre" },
      create: {
        id: "stg_dimension_value_cost_centre",
        orgId: STAGING_ORG_ID,
        definitionId: ids.costCentreDimension,
        code: "STG-COST",
        name: "STAGING Synthetic Cost Centre",
      },
    });
    await tx.accountingApprovalPolicy.upsert({
      where: { id: ids.approvalPolicy },
      update: {
        configuration: {
          selfApprovalAllowed: false,
          makerPermission: "accounting.create",
          checkerPermission: "accounting.approve",
          synthetic: true,
        },
      },
      create: {
        id: ids.approvalPolicy,
        orgId: STAGING_ORG_ID,
        code: "STG-JOURNAL-MAKER-CHECKER",
        documentType: "JOURNAL_ENTRY",
        version: 1,
        configuration: {
          selfApprovalAllowed: false,
          makerPermission: "accounting.create",
          checkerPermission: "accounting.approve",
          synthetic: true,
        },
        isActive: true,
        effectiveFrom: new Date("2027-04-01T00:00:00.000Z"),
      },
    });
    await tx.accountingRoundingPolicy.upsert({
      where: { id: ids.roundingPolicy },
      update: {
        scale: 2,
        configuration: {
          allowRounding: false,
          syntheticNonStatutory: true,
        },
        isActive: true,
      },
      create: {
        id: ids.roundingPolicy,
        orgId: STAGING_ORG_ID,
        code: "STG-NON-STATUTORY-MONEY",
        version: 1,
        purpose: "SYNTHETIC_NON_STATUTORY_POSTING",
        currencyCode: "INR",
        scale: 2,
        roundingMode: "HALF_UP",
        statutoryValidated: false,
        configuration: {
          allowRounding: false,
          syntheticNonStatutory: true,
        },
        effectiveFrom: new Date("2027-04-01T00:00:00.000Z"),
        isActive: true,
      },
    });
    await tx.accountingNumberSeries.upsert({
      where: { id: "stg_number_series_journal" },
      update: {
        prefixTemplate: "STG/{FY}/JV/",
        nextNumber: BigInt(1),
      },
      create: {
        id: "stg_number_series_journal",
        orgId: STAGING_ORG_ID,
        documentType: "JOURNAL_ENTRY",
        prefixTemplate: "STG/{FY}/JV/",
        nextNumber: BigInt(1),
        padding: 4,
        effectiveFrom: new Date("2027-04-01T00:00:00.000Z"),
      },
    });

    await tx.jobCosting.upsert({
      where: {
        orgId_jobCode: {
          orgId: STAGING_ORG_ID,
          jobCode: "STG-CHA-JOB-0001",
        },
      },
      update: {
        jobName: "STAGING CHA Job-Costing Fixture",
        costCentre: "STG-CHA-COST-CENTRE",
      },
      create: {
        id: ids.job,
        orgId: STAGING_ORG_ID,
        branchId: ids.branch,
        jobCode: "STG-CHA-JOB-0001",
        jobName: "STAGING CHA Job-Costing Fixture",
        customerId: ids.customer,
        startDate: new Date("2027-04-01T00:00:00.000Z"),
        contractValue: "1180.0000",
        status: "IN_PROGRESS",
        costCentre: "STG-CHA-COST-CENTRE",
      },
    });

    await tx.journalEntry.upsert({
      where: {
        orgId_voucherNo: {
          orgId: STAGING_ORG_ID,
          voucherNo: "STG-JV-DRAFT-0001",
        },
      },
      update: {
        accountingPeriodId: "stg_period_2027_28_1",
        sourceSystem: "STAGING_SEED",
        sourceType: "SYNTHETIC_JOURNAL",
        sourceId: ids.draftJournal,
        sourceVersion: 1,
        idempotencyKey: "staging:journal:draft:1",
        functionalCurrencyCode: "INR",
      },
      create: {
        id: ids.draftJournal,
        orgId: STAGING_ORG_ID,
        branchId: ids.branch,
        voucherNo: "STG-JV-DRAFT-0001",
        postingDate: new Date("2027-04-02T00:00:00.000Z"),
        status: "DRAFT",
        totalDebit: "250.0000",
        totalCredit: "250.0000",
        remarks: "STAGING maker draft",
        createdById: ids.makerUser,
        accountingPeriodId: "stg_period_2027_28_1",
        sourceSystem: "STAGING_SEED",
        sourceType: "SYNTHETIC_JOURNAL",
        sourceId: ids.draftJournal,
        sourceVersion: 1,
        idempotencyKey: "staging:journal:draft:1",
        functionalCurrencyCode: "INR",
      },
    });
    await tx.journalEntry.upsert({
      where: {
        orgId_voucherNo: {
          orgId: STAGING_ORG_ID,
          voucherNo: "STG-JV-SUBMITTED-0001",
        },
      },
      update: {
        accountingPeriodId: "stg_period_2027_28_1",
        sourceSystem: "STAGING_SEED",
        sourceType: "SYNTHETIC_JOURNAL",
        sourceId: ids.submittedJournal,
        sourceVersion: 1,
        idempotencyKey: "staging:journal:submitted:1",
        functionalCurrencyCode: "INR",
        postedAt: new Date("2027-04-03T12:00:00.000Z"),
        postedById: ids.checkerUser,
      },
      create: {
        id: ids.submittedJournal,
        orgId: STAGING_ORG_ID,
        branchId: ids.branch,
        voucherNo: "STG-JV-SUBMITTED-0001",
        postingDate: new Date("2027-04-03T00:00:00.000Z"),
        status: "SUBMITTED",
        totalDebit: "500.0000",
        totalCredit: "500.0000",
        remarks: "STAGING checker-submitted balanced journal",
        createdById: ids.makerUser,
        accountingPeriodId: "stg_period_2027_28_1",
        sourceSystem: "STAGING_SEED",
        sourceType: "SYNTHETIC_JOURNAL",
        sourceId: ids.submittedJournal,
        sourceVersion: 1,
        idempotencyKey: "staging:journal:submitted:1",
        functionalCurrencyCode: "INR",
        postedAt: new Date("2027-04-03T12:00:00.000Z"),
        postedById: ids.checkerUser,
      },
    });
    for (const line of [
      {
        id: "stg_journal_draft_debit",
        journalEntryId: ids.draftJournal,
        accountId: "stg_account_expense",
        debit: "250.0000",
        credit: "0.0000",
        transactionCurrencyCode: "INR",
        transactionDebit: "250.0000",
        transactionCredit: "0.0000",
        exchangeRate: "1.0000000000",
      },
      {
        id: "stg_journal_draft_credit",
        journalEntryId: ids.draftJournal,
        accountId: "stg_account_payable",
        debit: "0.0000",
        credit: "250.0000",
        transactionCurrencyCode: "INR",
        transactionDebit: "0.0000",
        transactionCredit: "250.0000",
        exchangeRate: "1.0000000000",
      },
      {
        id: "stg_journal_submitted_debit",
        journalEntryId: ids.submittedJournal,
        accountId: "stg_account_expense",
        debit: "500.0000",
        credit: "0.0000",
        transactionCurrencyCode: "INR",
        transactionDebit: "500.0000",
        transactionCredit: "0.0000",
        exchangeRate: "1.0000000000",
      },
      {
        id: "stg_journal_submitted_credit",
        journalEntryId: ids.submittedJournal,
        accountId: "stg_account_bank",
        debit: "0.0000",
        credit: "500.0000",
        transactionCurrencyCode: "INR",
        transactionDebit: "0.0000",
        transactionCredit: "500.0000",
        exchangeRate: "1.0000000000",
      },
    ]) {
      await tx.journalEntryLine.upsert({
        where: { id: line.id },
        update: {
          transactionCurrencyCode: line.transactionCurrencyCode,
          transactionDebit: line.transactionDebit,
          transactionCredit: line.transactionCredit,
          exchangeRate: line.exchangeRate,
        },
        create: line,
      });
    }
    await tx.accountingJournalLineDimension.upsert({
      where: { id: "stg_journal_dimension_branch" },
      update: {
        dimensionValueId: "stg_dimension_value_branch_demo",
      },
      create: {
        id: "stg_journal_dimension_branch",
        orgId: STAGING_ORG_ID,
        journalEntryLineId: "stg_journal_submitted_debit",
        definitionId: ids.branchDimension,
        dimensionValueId: "stg_dimension_value_branch_demo",
      },
    });
    for (const gl of [
      {
        id: "stg_gl_submitted_debit",
        accountId: "stg_account_expense",
        debit: "500.0000",
        credit: "0.0000",
      },
      {
        id: "stg_gl_submitted_credit",
        accountId: "stg_account_bank",
        debit: "0.0000",
        credit: "500.0000",
      },
    ]) {
      await tx.generalLedgerEntry.upsert({
        where: { id: gl.id },
        update: {},
        create: {
          ...gl,
          orgId: STAGING_ORG_ID,
          branchId: ids.branch,
          postingDate: new Date("2027-04-03T00:00:00.000Z"),
          voucherType: "JOURNAL_ENTRY",
          voucherId: ids.submittedJournal,
          journalEntryId: ids.submittedJournal,
          jobId: ids.job,
          remarks: "STAGING submitted journal",
          createdById: ids.checkerUser,
        },
      });
    }

    await tx.salesInvoice.upsert({
      where: {
        orgId_invoiceNumber: {
          orgId: STAGING_ORG_ID,
          invoiceNumber: "STG-SI-0001",
        },
      },
      update: {},
      create: {
        id: ids.salesInvoice,
        orgId: STAGING_ORG_ID,
        branchId: ids.branch,
        invoiceNumber: "STG-SI-0001",
        customerId: ids.customer,
        postingDate: new Date("2027-04-04T00:00:00.000Z"),
        dueDate: new Date("2027-05-04T00:00:00.000Z"),
        status: "UNPAID",
        grandTotal: "1180.0000",
        outstandingAmount: "1180.0000",
        taxAmount: "180.0000",
        remarks: "STAGING approved-state invoice fixture",
        createdById: ids.makerUser,
        jobId: ids.job,
      },
    });
    await tx.salesInvoiceItem.upsert({
      where: { id: "stg_sales_invoice_item" },
      update: {},
      create: {
        id: "stg_sales_invoice_item",
        invoiceId: ids.salesInvoice,
        itemName: "STAGING INR Service",
        qty: 1,
        rate: "1000.0000",
        amount: "1000.0000",
        currency: "INR",
        exchangeRate: 1,
      },
    });
    await tx.taxLine.upsert({
      where: { id: "stg_sales_tax_line" },
      update: {},
      create: {
        id: "stg_sales_tax_line",
        salesInvoiceId: ids.salesInvoice,
        accountId: "stg_account_tax",
        taxRate: 18,
        taxAmount: "180.0000",
      },
    });
    await tx.salesInvoice.upsert({
      where: {
        orgId_invoiceNumber: {
          orgId: STAGING_ORG_ID,
          invoiceNumber: "STG-SI-USD-DRAFT-0001",
        },
      },
      update: {},
      create: {
        id: ids.usdInvoice,
        orgId: STAGING_ORG_ID,
        branchId: ids.branch,
        invoiceNumber: "STG-SI-USD-DRAFT-0001",
        customerId: ids.customer,
        postingDate: new Date("2027-04-05T00:00:00.000Z"),
        dueDate: new Date("2027-05-05T00:00:00.000Z"),
        status: "DRAFT",
        grandTotal: "100.0000",
        outstandingAmount: "100.0000",
        remarks: "STAGING USD schema fixture",
        createdById: ids.makerUser,
      },
    });
    await tx.salesInvoiceItem.upsert({
      where: { id: "stg_sales_invoice_item_usd" },
      update: {},
      create: {
        id: "stg_sales_invoice_item_usd",
        invoiceId: ids.usdInvoice,
        itemName: "STAGING USD Service",
        qty: 1,
        rate: "100.0000",
        amount: "100.0000",
        currency: "USD",
        exchangeRate: 83.5,
      },
    });

    await tx.purchaseInvoice.upsert({
      where: {
        orgId_invoiceNumber: {
          orgId: STAGING_ORG_ID,
          invoiceNumber: "STG-PI-0001",
        },
      },
      update: {},
      create: {
        id: ids.purchaseInvoice,
        orgId: STAGING_ORG_ID,
        branchId: ids.branch,
        invoiceNumber: "STG-PI-0001",
        supplierId: ids.vendor,
        postingDate: new Date("2027-04-06T00:00:00.000Z"),
        dueDate: new Date("2027-05-06T00:00:00.000Z"),
        status: "UNPAID",
        grandTotal: "590.0000",
        outstandingAmount: "590.0000",
        taxAmount: "90.0000",
        remarks: "STAGING approved-state bill fixture",
        createdById: ids.makerUser,
        jobId: ids.job,
      },
    });
    await tx.purchaseInvoiceItem.upsert({
      where: { id: "stg_purchase_invoice_item" },
      update: {},
      create: {
        id: "stg_purchase_invoice_item",
        invoiceId: ids.purchaseInvoice,
        itemName: "STAGING Vendor Service",
        qty: 1,
        rate: "500.0000",
        amount: "500.0000",
      },
    });
    await tx.taxLine.upsert({
      where: { id: "stg_purchase_tax_line" },
      update: {},
      create: {
        id: "stg_purchase_tax_line",
        purchaseInvoiceId: ids.purchaseInvoice,
        accountId: "stg_account_tax",
        taxRate: 18,
        taxAmount: "90.0000",
      },
    });

    await tx.paymentEntry.upsert({
      where: { id: ids.receipt },
      update: {},
      create: {
        id: ids.receipt,
        orgId: STAGING_ORG_ID,
        branchId: ids.branch,
        paymentType: "RECEIVE",
        postingDate: new Date("2027-04-07T00:00:00.000Z"),
        partyType: "CUSTOMER",
        partyId: ids.customer,
        paidFromAccountId: "stg_account_receivable",
        paidToAccountId: "stg_account_bank",
        amount: "500.0000",
        referenceNo: "STAGING-RECEIPT-REF",
        status: "SUBMITTED",
        createdById: ids.makerUser,
      },
    });
    await tx.paymentAllocation.upsert({
      where: { id: "stg_receipt_allocation" },
      update: {},
      create: {
        id: "stg_receipt_allocation",
        paymentEntryId: ids.receipt,
        salesInvoiceId: ids.salesInvoice,
        allocatedAmount: "500.0000",
      },
    });
    await tx.paymentEntry.upsert({
      where: { id: ids.payment },
      update: {},
      create: {
        id: ids.payment,
        orgId: STAGING_ORG_ID,
        branchId: ids.branch,
        paymentType: "PAY",
        postingDate: new Date("2027-04-08T00:00:00.000Z"),
        partyType: "SUPPLIER",
        partyId: ids.vendor,
        paidFromAccountId: "stg_account_bank",
        paidToAccountId: "stg_account_payable",
        amount: "250.0000",
        referenceNo: "STAGING-PAYMENT-REF",
        status: "SUBMITTED",
        createdById: ids.makerUser,
      },
    });
    await tx.paymentAllocation.upsert({
      where: { id: "stg_payment_allocation" },
      update: {},
      create: {
        id: "stg_payment_allocation",
        paymentEntryId: ids.payment,
        purchaseInvoiceId: ids.purchaseInvoice,
        allocatedAmount: "250.0000",
      },
    });

    await tx.customerNote.upsert({
      where: {
        orgId_noteNumber: {
          orgId: STAGING_ORG_ID,
          noteNumber: "STG-CDN-0001",
        },
      },
      update: {},
      create: {
        id: ids.customerNote,
        orgId: STAGING_ORG_ID,
        branchId: ids.branch,
        noteNumber: "STG-CDN-0001",
        noteType: "DEBIT",
        customerId: ids.customer,
        originalInvoiceId: ids.salesInvoice,
        postingDate: new Date("2027-04-09T00:00:00.000Z"),
        reason: "STAGING synthetic adjustment",
        taxableAmount: "100.0000",
        taxAmount: "18.0000",
        grandTotal: "118.0000",
        status: "DRAFT",
        createdById: ids.makerUser,
      },
    });
    await tx.customerNoteItem.upsert({
      where: { id: "stg_customer_note_item" },
      update: {},
      create: {
        id: "stg_customer_note_item",
        customerNoteId: ids.customerNote,
        itemName: "STAGING customer adjustment",
        qty: 1,
        rate: "100.0000",
        amount: "100.0000",
        taxRate: 18,
        taxAmount: "18.0000",
      },
    });
    await tx.vendorNote.upsert({
      where: {
        orgId_noteNumber: {
          orgId: STAGING_ORG_ID,
          noteNumber: "STG-VDN-0001",
        },
      },
      update: {},
      create: {
        id: ids.vendorNote,
        orgId: STAGING_ORG_ID,
        branchId: ids.branch,
        noteNumber: "STG-VDN-0001",
        noteType: "DEBIT",
        vendorId: ids.vendor,
        originalInvoiceId: ids.purchaseInvoice,
        postingDate: new Date("2027-04-10T00:00:00.000Z"),
        reason: "STAGING synthetic adjustment",
        taxableAmount: "50.0000",
        taxAmount: "9.0000",
        grandTotal: "59.0000",
        status: "DRAFT",
        createdById: ids.makerUser,
      },
    });
    await tx.vendorNoteItem.upsert({
      where: { id: "stg_vendor_note_item" },
      update: {},
      create: {
        id: "stg_vendor_note_item",
        vendorNoteId: ids.vendorNote,
        itemName: "STAGING vendor adjustment",
        qty: 1,
        rate: "50.0000",
        amount: "50.0000",
        taxRate: 18,
        taxAmount: "9.0000",
      },
    });

    await tx.hRLetterTemplate.upsert({
      where: { id: ids.legacyLetterTemplate },
      update: {
        name: "STAGING Legacy Letter Preservation Fixture",
        content: "Synthetic legacy letter fixture.",
      },
      create: {
        id: ids.legacyLetterTemplate,
        orgId: STAGING_ORG_ID,
        name: "STAGING Legacy Letter Preservation Fixture",
        type: "STAGING_LEGACY",
        content: "Synthetic legacy letter fixture.",
        isActive: false,
      },
    });
    await tx.hRLetterRequest.upsert({
      where: { letterNumber: "STG-LEGACY-LETTER-0001" },
      update: {
        legacyFileKey: "legacy/staging/preserved-letter-artifact.pdf",
      },
      create: {
        id: ids.legacyLetterRequest,
        orgId: STAGING_ORG_ID,
        userId: ids.employeeUser,
        templateId: ids.legacyLetterTemplate,
        letterNumber: "STG-LEGACY-LETTER-0001",
        status: "ISSUED",
        legacyFileKey: "legacy/staging/preserved-letter-artifact.pdf",
        issuedById: ids.makerUser,
        issuedAt: new Date("2027-04-01T00:00:00.000Z"),
      },
    });

    await tx.accountingIntegrationInbox.upsert({
      where: { id: "stg_inbox_crm_invoice_request" },
      update: {
        payloadHash: "staging-sha256-placeholder-not-production-data",
        status: "PROCESSED",
      },
      create: {
        id: "stg_inbox_crm_invoice_request",
        orgId: STAGING_ORG_ID,
        sourceSystem: "CRM",
        messageType: "invoice-request.approved",
        messageVersion: 1,
        idempotencyKey: "staging:crm:invoice-request:1",
        payload: {
          synthetic: true,
          canonicalCustomerId: ids.customer,
          requestVersion: 1,
        },
        payloadHash: "staging-sha256-placeholder-not-production-data",
        status: "PROCESSED",
        processedAt: new Date("2027-04-02T00:00:00.000Z"),
      },
    });
    await tx.accountingIntegrationOutbox.upsert({
      where: { id: "stg_outbox_accounting_status" },
      update: { status: "PENDING" },
      create: {
        id: "stg_outbox_accounting_status",
        orgId: STAGING_ORG_ID,
        destination: "CRM",
        eventType: "accounting-document.status-changed",
        eventVersion: 1,
        aggregateType: "SALES_INVOICE",
        aggregateId: ids.salesInvoice,
        idempotencyKey: "staging:accounting:sales-invoice:status:1",
        payload: {
          synthetic: true,
          accountingDocumentId: ids.salesInvoice,
          status: "UNPAID",
        },
        status: "PENDING",
      },
    });

    for (const audit of [
      {
        id: "stg_audit_maker",
        userId: ids.makerUser,
        action: "STAGING_MAKER_DRAFT_CREATED",
      },
      {
        id: "stg_audit_checker",
        userId: ids.checkerUser,
        action: "STAGING_CHECKER_SUBMITTED",
      },
    ]) {
      await tx.accountingAuditLog.upsert({
        where: { id: audit.id },
        update: {},
        create: {
          ...audit,
          orgId: STAGING_ORG_ID,
          entityType: "JournalEntry",
          entityId: ids.submittedJournal,
          afterValues: {
            staging: true,
            makerCheckerFixture: true,
          },
        },
      });
    }
  });

  console.log(
    "Synthetic staging fixtures are present and idempotent for the STAGING organisation.",
  );
}

seed()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
