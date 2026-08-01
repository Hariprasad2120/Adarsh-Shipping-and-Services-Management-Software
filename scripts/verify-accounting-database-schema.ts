import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { config } from "dotenv";
import { Client } from "pg";

const DATABASE_SCHEMA = "public";

const REQUIRED_MODELS = [
  "Account",
  "AccountingAccountControl",
  "AccountingApprovalPolicy",
  "AccountingAuditLog",
  "AccountingCapabilityPolicy",
  "AccountingCounterpartyEntityScope",
  "AccountingCurrency",
  "AccountingDimensionDefinition",
  "AccountingDimensionValue",
  "AccountingDocument",
  "AccountingDocumentLine",
  "AccountingDocumentPolicy",
  "AccountingExchangeRate",
  "AccountingIntegrationInbox",
  "AccountingIntegrationOutbox",
  "AccountingJournalLineDimension",
  "AccountingLegalEntity",
  "AccountingMigrationAttachment",
  "AccountingMigrationBatch",
  "AccountingMigrationCheckpoint",
  "AccountingMigrationException",
  "AccountingMigrationMapping",
  "AccountingMigrationRecord",
  "AccountingNumberSeries",
  "AccountingOrganisationProfile",
  "AccountingPayment",
  "AccountingPaymentAllocation",
  "AccountingPayrollRunSnapshot",
  "AccountingPeriod",
  "AccountingPeriodLockRequest",
  "AccountingPostingAttempt",
  "AccountingRoundingPolicy",
  "AccountingScheduledOccurrence",
  "AccountingSettings",
  "AccountingSourceSnapshot",
  "AccountingTaxRegistration",
  "Asset",
  "AssetDepreciationEntry",
  "Branch",
  "ChaJob",
  "CrmAccount",
  "CrmContact",
  "CrmDeal",
  "CrmInvoice",
  "CrmProduct",
  "CrmVendor",
  "CustomerLedgerEntry",
  "CustomerNote",
  "FiscalYear",
  "GeneralLedgerEntry",
  "JobCosting",
  "JournalEntry",
  "JournalEntryLine",
  "Organisation",
  "PartnerAccount",
  "PaymentEntry",
  "PayrollBatch",
  "Permission",
  "PurchaseInvoice",
  "Quotation",
  "RecurringExpense",
  "RecurringJournal",
  "Role",
  "RolePermission",
  "SalesInvoice",
  "SupplierLedgerEntry",
  "TransactionLock",
  "User",
  "UserRole",
  "VendorNote",
] as const;

const REQUIRED_MIGRATIONS = [
  "20260623144545_create_job_workspace_profile_base",
  "20260623233925_create_cha_document_requirement_catalog",
  "20260625105000_create_cha_filing_workflow_base",
  "20260729235900_reconcile_committed_schema_history",
  "20260730010000_accounting_phase2_foundations",
  "20260730030000_accounting_phase3_canonical_posting",
  "20260730043000_accounting_phase3_tenant_guard_fix",
  "20260730049000_accounting_phase3_prepare_gl_fk_alignment",
  "20260730050000_accounting_phase3_schema_alignment",
  "20260730051500_accounting_phase3_restore_gl_fk",
  "20260730110000_accounting_phase3_hardening",
  "20260730123000_accounting_phase3_contract_guards",
  "20260730190000_accounting_phase4_documents_payments",
  "20260730193000_accounting_phase4_allocation_hardening",
  "20260730194500_accounting_phase4_occurrence_hardening",
  "20260730195500_accounting_phase4_tenant_guard_fix",
  "20260730200500_accounting_phase4_counterparty_scope",
  "20260730230000_accounting_phase6_migration_control",
  "20260731120000_accounting_phase9_capability_policies",
  "20260731143000_accounting_phase9_configuration_row_versions",
  "20260731160000_accounting_phase9_period_row_versions",
  "20260731170000_accounting_phase9_dimension_row_versions",
  "20260731180000_repair_accounting_schema_baseline",
  "20260731190000_align_accounting_schema_metadata",
] as const;

type FieldDefinition = {
  column: string;
  isId: boolean;
  isRelation: boolean;
  isUnique: boolean;
  name: string;
  relation?: {
    fields: string[];
    references: string[];
    targetModel: string;
  };
};

type ModelDefinition = {
  fields: Map<string, FieldDefinition>;
  indexes: string[][];
  name: string;
  primaryKey: string[];
  table: string;
  uniques: string[][];
};

function parseFieldList(raw: string) {
  return raw
    .split(",")
    .map((entry) => entry.trim().replace(/\(.*$/, ""))
    .filter(Boolean);
}

function parseSchema(source: string) {
  const blocks = [
    ...source.matchAll(/^model\s+([A-Za-z0-9_]+)\s+\{([\s\S]*?)^\}/gm),
  ];
  const modelNames = new Set(blocks.map((match) => match[1]));
  const models = new Map<string, ModelDefinition>();

  for (const match of blocks) {
    const name = match[1]!;
    const body = match[2]!;
    const table = body.match(/@@map\("([^"]+)"\)/)?.[1] ?? name;
    const fields = new Map<string, FieldDefinition>();

    for (const rawLine of body.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("//") || line.startsWith("@@")) continue;
      const fieldMatch = line.match(/^([A-Za-z0-9_]+)\s+([^\s]+)(.*)$/);
      if (!fieldMatch) continue;
      const [, fieldName, rawType, attributes] = fieldMatch;
      const targetType = rawType!.replace(/[?\[\]]/g, "");
      const column = attributes!.match(/@map\("([^"]+)"\)/)?.[1] ?? fieldName!;
      const relationFields = attributes!.match(/fields:\s*\[([^\]]+)\]/)?.[1];
      const relationReferences = attributes!.match(
        /references:\s*\[([^\]]+)\]/,
      )?.[1];
      const field: FieldDefinition = {
        column,
        isId: /(?:^|\s)@id(?:\s|$)/.test(attributes!),
        isRelation: modelNames.has(targetType),
        isUnique: /(?:^|\s)@unique(?:\s|$|\()/.test(attributes!),
        name: fieldName!,
      };
      if (
        modelNames.has(targetType) &&
        relationFields &&
        relationReferences
      ) {
        field.relation = {
          fields: parseFieldList(relationFields),
          references: parseFieldList(relationReferences),
          targetModel: targetType,
        };
      }
      fields.set(fieldName!, field);
    }

    const mapFields = (entries: string[]) =>
      entries.map((field) => fields.get(field)?.column ?? field);
    const indexes = [
      ...body.matchAll(/@@index\(\[([^\]]+)\]/g),
    ].map((index) => mapFields(parseFieldList(index[1]!)));
    const uniques = [
      ...body.matchAll(/@@unique\(\[([^\]]+)\]/g),
    ].map((unique) => mapFields(parseFieldList(unique[1]!)));
    for (const field of fields.values()) {
      if (field.isUnique) uniques.push([field.column]);
    }
    const compoundId = body.match(/@@id\(\[([^\]]+)\]/)?.[1];
    const primaryKey = compoundId
      ? mapFields(parseFieldList(compoundId))
      : [...fields.values()]
          .filter((field) => field.isId)
          .map((field) => field.column);

    models.set(name, {
      fields,
      indexes,
      name,
      primaryKey,
      table,
      uniques,
    });
  }

  return models;
}

function sameColumns(left: string[], right: string[]) {
  return (
    left.length === right.length &&
    left.every((column, index) => column === right[index])
  );
}

function redactError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(
    /postgres(?:ql)?:\/\/[^\s]+/gi,
    "postgresql://[redacted]",
  );
}

config({
  path: resolve(process.cwd(), ".env"),
  override: false,
  quiet: true,
});

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("Accounting schema verification failed: DATABASE_URL is absent.");
  process.exit(1);
}

const parsedUrl = new URL(databaseUrl);
const target = {
  database: decodeURIComponent(parsedUrl.pathname.replace(/^\//, "")),
  host: parsedUrl.hostname,
  port: parsedUrl.port || "default",
  sslmode: parsedUrl.searchParams.get("sslmode") || "not specified",
};

const schemaSource = readFileSync(
  resolve(process.cwd(), "prisma/schema.prisma"),
  "utf8",
);
const models = parseSchema(schemaSource);
const failures: string[] = [];

for (const modelName of REQUIRED_MODELS) {
  if (!models.has(modelName)) {
    failures.push(`Prisma model is missing: ${modelName}`);
  }
}

async function main() {
  const client = new Client({ connectionString: databaseUrl });

  try {
    await client.connect();
    await client.query("BEGIN TRANSACTION READ ONLY");

    const tableResult = await client.query<{ table_name: string }>(
      `SELECT table_name
         FROM information_schema.tables
        WHERE table_schema = $1
          AND table_type = 'BASE TABLE'`,
      [DATABASE_SCHEMA],
    );
    const columnResult = await client.query<{
      column_name: string;
      table_name: string;
    }>(
      `SELECT table_name, column_name
         FROM information_schema.columns
        WHERE table_schema = $1`,
      [DATABASE_SCHEMA],
    );
    const indexResult = await client.query<{
      columns: string[];
      index_name: string;
      is_primary: boolean;
      is_unique: boolean;
      table_name: string;
    }>(
      `SELECT table_class.relname AS table_name,
              index_class.relname AS index_name,
              index_meta.indisunique AS is_unique,
              index_meta.indisprimary AS is_primary,
              to_json(array_agg(attribute.attname ORDER BY key_column.ordinality)) AS columns
         FROM pg_catalog.pg_index AS index_meta
         JOIN pg_catalog.pg_class AS table_class
           ON table_class.oid = index_meta.indrelid
         JOIN pg_catalog.pg_namespace AS namespace
           ON namespace.oid = table_class.relnamespace
         JOIN pg_catalog.pg_class AS index_class
           ON index_class.oid = index_meta.indexrelid
         CROSS JOIN LATERAL unnest(index_meta.indkey)
           WITH ORDINALITY AS key_column(attnum, ordinality)
         JOIN pg_catalog.pg_attribute AS attribute
           ON attribute.attrelid = table_class.oid
          AND attribute.attnum = key_column.attnum
        WHERE namespace.nspname = $1
          AND key_column.ordinality <= index_meta.indnkeyatts
        GROUP BY table_class.relname,
                 index_class.relname,
                 index_meta.indisunique,
                 index_meta.indisprimary`,
      [DATABASE_SCHEMA],
    );
    const foreignKeyResult = await client.query<{
      columns: string[];
      constraint_name: string;
      referenced_columns: string[];
      referenced_table: string;
      table_name: string;
    }>(
      `SELECT constraint_meta.conname AS constraint_name,
              child_table.relname AS table_name,
              parent_table.relname AS referenced_table,
              to_json(ARRAY(
                SELECT child_attribute.attname
                  FROM unnest(constraint_meta.conkey)
                    WITH ORDINALITY AS child_key(attnum, ordinality)
                  JOIN pg_catalog.pg_attribute AS child_attribute
                    ON child_attribute.attrelid = child_table.oid
                   AND child_attribute.attnum = child_key.attnum
                 ORDER BY child_key.ordinality
              )) AS columns,
              to_json(ARRAY(
                SELECT parent_attribute.attname
                  FROM unnest(constraint_meta.confkey)
                    WITH ORDINALITY AS parent_key(attnum, ordinality)
                  JOIN pg_catalog.pg_attribute AS parent_attribute
                    ON parent_attribute.attrelid = parent_table.oid
                   AND parent_attribute.attnum = parent_key.attnum
                 ORDER BY parent_key.ordinality
              )) AS referenced_columns
         FROM pg_catalog.pg_constraint AS constraint_meta
         JOIN pg_catalog.pg_class AS child_table
           ON child_table.oid = constraint_meta.conrelid
         JOIN pg_catalog.pg_namespace AS namespace
           ON namespace.oid = child_table.relnamespace
         JOIN pg_catalog.pg_class AS parent_table
           ON parent_table.oid = constraint_meta.confrelid
        WHERE constraint_meta.contype = 'f'
          AND namespace.nspname = $1`,
      [DATABASE_SCHEMA],
    );
    const migrationResult = await client.query<{
      applied: boolean;
      migration_name: string;
    }>(
      `SELECT migration_name,
              bool_or(finished_at IS NOT NULL AND rolled_back_at IS NULL) AS applied
         FROM "_prisma_migrations"
        GROUP BY migration_name`,
    );

    const tables = new Set(tableResult.rows.map((row) => row.table_name));
    const columns = new Map<string, Set<string>>();
    for (const row of columnResult.rows) {
      const tableColumns = columns.get(row.table_name) ?? new Set<string>();
      tableColumns.add(row.column_name);
      columns.set(row.table_name, tableColumns);
    }
    const indexesByTable = new Map<string, typeof indexResult.rows>();
    for (const row of indexResult.rows) {
      const tableIndexes = indexesByTable.get(row.table_name) ?? [];
      tableIndexes.push(row);
      indexesByTable.set(row.table_name, tableIndexes);
    }
    const foreignKeysByTable = new Map<string, typeof foreignKeyResult.rows>();
    for (const row of foreignKeyResult.rows) {
      const tableForeignKeys = foreignKeysByTable.get(row.table_name) ?? [];
      tableForeignKeys.push(row);
      foreignKeysByTable.set(row.table_name, tableForeignKeys);
    }

    for (const modelName of REQUIRED_MODELS) {
      const model = models.get(modelName);
      if (!model) continue;
      if (!tables.has(model.table)) {
        failures.push(
          `Required table is missing: ${DATABASE_SCHEMA}.${model.table}`,
        );
        continue;
      }

      const tableColumns = columns.get(model.table) ?? new Set<string>();
      for (const field of model.fields.values()) {
        if (!field.isRelation && !tableColumns.has(field.column)) {
          failures.push(
            `Required column is missing: ${model.table}.${field.column}`,
          );
        }
      }

      const tableIndexes = indexesByTable.get(model.table) ?? [];
      if (
        model.primaryKey.length > 0 &&
        !tableIndexes.some(
          (index) =>
            index.is_primary && sameColumns(index.columns, model.primaryKey),
        )
      ) {
        failures.push(
          `Required primary key is missing: ${model.table}(${model.primaryKey.join(",")})`,
        );
      }
      for (const expectedIndex of model.indexes) {
        if (
          !tableIndexes.some((index) =>
            sameColumns(index.columns, expectedIndex),
          )
        ) {
          failures.push(
            `Required index is missing: ${model.table}(${expectedIndex.join(",")})`,
          );
        }
      }
      for (const expectedUnique of model.uniques) {
        if (
          !tableIndexes.some(
            (index) =>
              index.is_unique && sameColumns(index.columns, expectedUnique),
          )
        ) {
          failures.push(
            `Required unique constraint is missing: ${model.table}(${expectedUnique.join(",")})`,
          );
        }
      }

      for (const field of model.fields.values()) {
        if (!field.relation) continue;
        const targetModel = models.get(field.relation.targetModel);
        if (!targetModel) continue;
        const sourceColumns = field.relation.fields.map(
          (sourceField) =>
            model.fields.get(sourceField)?.column ?? sourceField,
        );
        const referencedColumns = field.relation.references.map(
          (referencedField) =>
            targetModel.fields.get(referencedField)?.column ?? referencedField,
        );
        const tableForeignKeys = foreignKeysByTable.get(model.table) ?? [];
        if (
          !tableForeignKeys.some(
            (foreignKey) =>
              foreignKey.referenced_table === targetModel.table &&
              sameColumns(foreignKey.columns, sourceColumns) &&
              sameColumns(foreignKey.referenced_columns, referencedColumns),
          )
        ) {
          failures.push(
            `Required foreign key is missing: ${model.table}(${sourceColumns.join(
              ",",
            )}) -> ${targetModel.table}(${referencedColumns.join(",")})`,
          );
        }
      }
    }

    const migrationState = new Map(
      migrationResult.rows.map((row) => [row.migration_name, row.applied]),
    );
    for (const migration of REQUIRED_MIGRATIONS) {
      if (migrationState.get(migration) !== true) {
        failures.push(`Required migration is not applied: ${migration}`);
      }
    }

    await client.query("COMMIT");

    const summary = {
      checkedForeignKeys: foreignKeyResult.rowCount,
      checkedIndexes: indexResult.rowCount,
      checkedMigrations: REQUIRED_MIGRATIONS.length,
      checkedModels: REQUIRED_MODELS.length,
      failureCount: failures.length,
      ok: failures.length === 0,
      target,
    };
    console.log(JSON.stringify(summary, null, 2));
    if (failures.length > 0) {
      for (const failure of failures) console.error(`- ${failure}`);
      process.exitCode = 1;
    }
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // The connection may already be closed.
    }
    console.error(
      `Accounting schema verification failed: ${redactError(error)}`,
    );
    process.exitCode = 1;
  } finally {
    await client.end().catch(() => undefined);
  }
}

void main();
