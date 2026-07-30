export type ProductionConfigurationIntent =
  | "PROVIDER_DISABLED_STARTUP"
  | "MIGRATION_EXECUTION";

export type ProductionConfigurationIssue = {
  code: string;
  variableName?: string;
  classification: "configuration" | "security";
};

export type ProductionConfigurationReport = {
  ready: boolean;
  intent: ProductionConfigurationIntent;
  checkedVariableNames: string[];
  issues: ProductionConfigurationIssue[];
  providersDisabled: boolean;
  port5432Rejected: boolean;
  valuesDisclosed: false;
};

export type ProductionConfigurationDefinition = {
  name: string;
  purpose: string;
  requiredFor: readonly ProductionConfigurationIntent[];
  secret: boolean;
  rule: string;
};

export const PRODUCTION_CONFIGURATION_CONTRACT: readonly ProductionConfigurationDefinition[] =
  [
    {
      name: "MONOLITH_ENV",
      purpose: "Declares the isolated production runtime.",
      requiredFor: ["PROVIDER_DISABLED_STARTUP", "MIGRATION_EXECUTION"],
      secret: false,
      rule: "Must be exactly production; staging and development markers are rejected.",
    },
    {
      name: "DATABASE_URL",
      purpose: "Supplies the production database endpoint without fallback.",
      requiredFor: ["PROVIDER_DISABLED_STARTUP", "MIGRATION_EXECUTION"],
      secret: true,
      rule: "Must be PostgreSQL, explicit, match the declared identity, and not use port 5432.",
    },
    {
      name: "ACCOUNTING_PRODUCTION_DATABASE_HOST",
      purpose: "Declares the expected database host identity.",
      requiredFor: ["PROVIDER_DISABLED_STARTUP", "MIGRATION_EXECUTION"],
      secret: false,
      rule: "Required stable host label and must match DATABASE_URL.",
    },
    {
      name: "ACCOUNTING_PRODUCTION_DATABASE_PORT",
      purpose: "Declares the expected database port.",
      requiredFor: ["PROVIDER_DISABLED_STARTUP", "MIGRATION_EXECUTION"],
      secret: false,
      rule: "Required integer from 1 to 65535; 5432 is forbidden.",
    },
    {
      name: "ACCOUNTING_PRODUCTION_DATABASE_NAME",
      purpose: "Declares the expected database name.",
      requiredFor: ["PROVIDER_DISABLED_STARTUP", "MIGRATION_EXECUTION"],
      secret: false,
      rule: "Required stable identifier and must match DATABASE_URL.",
    },
    {
      name: "ACCOUNTING_PRODUCTION_DATABASE_USER",
      purpose: "Declares the expected least-privilege database identity.",
      requiredFor: ["PROVIDER_DISABLED_STARTUP", "MIGRATION_EXECUTION"],
      secret: false,
      rule: "Required stable identifier and must match DATABASE_URL.",
    },
    {
      name: "ACCOUNTING_PRODUCTION_DATABASE_MARKER",
      purpose: "Names independently verified production database identity evidence.",
      requiredFor: ["PROVIDER_DISABLED_STARTUP", "MIGRATION_EXECUTION"],
      secret: false,
      rule: "Required stable reference; it must not equal a staging marker.",
    },
    {
      name: "ACCOUNTING_ORGANIZATION_ID",
      purpose: "Pins the authorized organization scope.",
      requiredFor: ["PROVIDER_DISABLED_STARTUP", "MIGRATION_EXECUTION"],
      secret: false,
      rule: "Required single stable identifier.",
    },
    {
      name: "ACCOUNTING_LEGAL_ENTITY_IDS",
      purpose: "Pins the complete authorized legal-entity scope.",
      requiredFor: ["PROVIDER_DISABLED_STARTUP", "MIGRATION_EXECUTION"],
      secret: false,
      rule: "Required non-empty comma-separated unique stable identifiers.",
    },
    {
      name: "ACCOUNTING_PROVIDER_MODE",
      purpose: "Keeps all Accounting providers disabled at startup.",
      requiredFor: ["PROVIDER_DISABLED_STARTUP", "MIGRATION_EXECUTION"],
      secret: false,
      rule: "Must be exactly disabled.",
    },
    {
      name: "ACCOUNTING_OUTBOUND_DELIVERY_MODE",
      purpose: "Keeps email, messaging, webhook, payment, and external delivery disabled.",
      requiredFor: ["PROVIDER_DISABLED_STARTUP", "MIGRATION_EXECUTION"],
      secret: false,
      rule: "Must be exactly disabled.",
    },
    {
      name: "ACCOUNTING_SCHEDULER_MODE",
      purpose: "Declares scheduler ownership without silently starting workers.",
      requiredFor: ["PROVIDER_DISABLED_STARTUP", "MIGRATION_EXECUTION"],
      secret: false,
      rule: "Must be disabled or single-owner.",
    },
    {
      name: "ACCOUNTING_SCHEDULER_OWNER",
      purpose: "Names the single scheduler owner role when enabled.",
      requiredFor: [],
      secret: false,
      rule: "Required stable role when scheduler mode is single-owner; otherwise must be absent.",
    },
    {
      name: "ACCOUNTING_STORAGE_MODE",
      purpose: "Declares approved attachment storage availability.",
      requiredFor: ["PROVIDER_DISABLED_STARTUP", "MIGRATION_EXECUTION"],
      secret: false,
      rule: "Must be disabled or approved; approved still requires attachment policy evidence.",
    },
    {
      name: "ACCOUNTING_OBSERVABILITY_MODE",
      purpose: "Requires redacted operational telemetry.",
      requiredFor: ["PROVIDER_DISABLED_STARTUP", "MIGRATION_EXECUTION"],
      secret: false,
      rule: "Must be exactly redacted.",
    },
    {
      name: "ACCOUNTING_BACKUP_EVIDENCE_REFERENCE",
      purpose: "References accepted backup verification without containing backup data.",
      requiredFor: ["MIGRATION_EXECUTION"],
      secret: false,
      rule: "Required stable approval reference.",
    },
    {
      name: "ACCOUNTING_RESTORE_REHEARSAL_REFERENCE",
      purpose: "References accepted isolated restore-rehearsal evidence.",
      requiredFor: ["MIGRATION_EXECUTION"],
      secret: false,
      rule: "Required stable approval reference.",
    },
    {
      name: "ACCOUNTING_MIGRATION_MODE",
      purpose: "Keeps migration execution disabled unless a future implementation is separately authorized.",
      requiredFor: ["PROVIDER_DISABLED_STARTUP", "MIGRATION_EXECUTION"],
      secret: false,
      rule: "Must remain disabled in Phase 7.",
    },
    {
      name: "ACCOUNTING_MIGRATION_TECHNICAL_APPROVAL",
      purpose: "References technical approval evidence.",
      requiredFor: ["MIGRATION_EXECUTION"],
      secret: false,
      rule: "Required stable approval reference.",
    },
    {
      name: "ACCOUNTING_MIGRATION_BUSINESS_APPROVAL",
      purpose: "References business approval evidence.",
      requiredFor: ["MIGRATION_EXECUTION"],
      secret: false,
      rule: "Required stable approval reference.",
    },
    {
      name: "ACCOUNTING_MIGRATION_SECURITY_APPROVAL",
      purpose: "References security approval evidence.",
      requiredFor: ["MIGRATION_EXECUTION"],
      secret: false,
      rule: "Required stable approval reference.",
    },
    {
      name: "ACCOUNTING_MIGRATION_OPERATOR_ID",
      purpose: "Pins the separately authorized operator identity.",
      requiredFor: ["MIGRATION_EXECUTION"],
      secret: false,
      rule: "Required stable identity and must differ from checker.",
    },
    {
      name: "ACCOUNTING_MIGRATION_CHECKER_ID",
      purpose: "Pins the separately authorized checker identity.",
      requiredFor: ["MIGRATION_EXECUTION"],
      secret: false,
      rule: "Required stable identity and must differ from operator.",
    },
    {
      name: "ACCOUNTING_PRODUCTION_AUTHORIZATION_REFERENCE",
      purpose: "References the final separately issued production authorization.",
      requiredFor: ["MIGRATION_EXECUTION"],
      secret: false,
      rule: "Required stable approval reference.",
    },
    {
      name: "ACCOUNTING_PRODUCTION_AUTHORIZATION_MARKER",
      purpose: "Provides an explicit future execution marker.",
      requiredFor: ["MIGRATION_EXECUTION"],
      secret: false,
      rule: "Must match the separately documented marker; Phase 7 still cannot execute.",
    },
  ] as const;

const STABLE_VALUE = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$/;
const AUTHORIZATION_MARKER = "SEPARATE_PRODUCTION_AUTHORIZATION_GRANTED";
const NON_PRODUCTION_IDENTITY_TOKEN =
  /(^|[._:/-])(stg|staging|synthetic|dev|development|test|testing|local)(?=$|[._:/-])/i;

function present(value: string | undefined) {
  return typeof value === "string" && value.trim().length > 0;
}

export function validateProductionConfiguration(
  environment: Readonly<Record<string, string | undefined>>,
  intent: ProductionConfigurationIntent = "PROVIDER_DISABLED_STARTUP",
): ProductionConfigurationReport {
  const issues: ProductionConfigurationIssue[] = [];
  const required = PRODUCTION_CONFIGURATION_CONTRACT.filter((definition) =>
    definition.requiredFor.includes(intent),
  );
  const issue = (
    code: string,
    variableName?: string,
    classification: "configuration" | "security" = "configuration",
  ) => issues.push({ code, variableName, classification });

  for (const definition of required) {
    if (!present(environment[definition.name])) {
      issue("REQUIRED_VARIABLE_MISSING", definition.name);
    }
  }
  if (environment.MONOLITH_ENV !== "production") {
    issue("PRODUCTION_ENVIRONMENT_IDENTITY_INVALID", "MONOLITH_ENV", "security");
  }
  if (
    present(environment.STAGING_MARKER) ||
    present(environment.STAGING_DATABASE_HOST) ||
    present(environment.STAGING_DATABASE_NAME)
  ) {
    issue("STAGING_FALLBACK_FORBIDDEN", undefined, "security");
  }
  if (environment.ACCOUNTING_PROVIDER_MODE !== "disabled") {
    issue("PROVIDER_MODE_MUST_BE_DISABLED", "ACCOUNTING_PROVIDER_MODE", "security");
  }
  if (environment.ACCOUNTING_OUTBOUND_DELIVERY_MODE !== "disabled") {
    issue(
      "OUTBOUND_DELIVERY_MUST_BE_DISABLED",
      "ACCOUNTING_OUTBOUND_DELIVERY_MODE",
      "security",
    );
  }
  if (environment.ACCOUNTING_OBSERVABILITY_MODE !== "redacted") {
    issue("OBSERVABILITY_MUST_BE_REDACTED", "ACCOUNTING_OBSERVABILITY_MODE");
  }
  if (!["disabled", "single-owner"].includes(environment.ACCOUNTING_SCHEDULER_MODE ?? "")) {
    issue("SCHEDULER_MODE_INVALID", "ACCOUNTING_SCHEDULER_MODE");
  }
  if (
    environment.ACCOUNTING_SCHEDULER_MODE === "single-owner" &&
    !present(environment.ACCOUNTING_SCHEDULER_OWNER)
  ) {
    issue("SCHEDULER_OWNER_REQUIRED", "ACCOUNTING_SCHEDULER_OWNER");
  }
  if (
    environment.ACCOUNTING_SCHEDULER_MODE === "disabled" &&
    present(environment.ACCOUNTING_SCHEDULER_OWNER)
  ) {
    issue("SCHEDULER_OWNER_AMBIGUOUS", "ACCOUNTING_SCHEDULER_OWNER");
  }
  if (!["disabled", "approved"].includes(environment.ACCOUNTING_STORAGE_MODE ?? "")) {
    issue("STORAGE_MODE_INVALID", "ACCOUNTING_STORAGE_MODE");
  }
  if (environment.ACCOUNTING_MIGRATION_MODE !== "disabled") {
    issue("PHASE7_MIGRATION_MODE_MUST_REMAIN_DISABLED", "ACCOUNTING_MIGRATION_MODE", "security");
  }

  const declaredPort = environment.ACCOUNTING_PRODUCTION_DATABASE_PORT;
  const portNumber = Number(declaredPort);
  if (
    !present(declaredPort) ||
    !Number.isSafeInteger(portNumber) ||
    portNumber < 1 ||
    portNumber > 65_535
  ) {
    issue("DATABASE_PORT_INVALID", "ACCOUNTING_PRODUCTION_DATABASE_PORT");
  } else if (portNumber === 5_432) {
    issue("DATABASE_PORT_5432_FORBIDDEN", "ACCOUNTING_PRODUCTION_DATABASE_PORT", "security");
  }

  if (present(environment.DATABASE_URL)) {
    try {
      const url = new URL(environment.DATABASE_URL!);
      const databaseName = url.pathname.replace(/^\/+/, "");
      if (!["postgres:", "postgresql:"].includes(url.protocol)) {
        issue("DATABASE_PROTOCOL_INVALID", "DATABASE_URL");
      }
      if (!url.port || Number(url.port) === 5_432) {
        issue("DATABASE_URL_PORT_5432_OR_IMPLICIT_FORBIDDEN", "DATABASE_URL", "security");
      }
      if (
        url.hostname === "localhost" ||
        url.hostname === "::1" ||
        /^127(?:\.\d{1,3}){3}$/.test(url.hostname)
      ) {
        issue(
          "LOOPBACK_DATABASE_IDENTITY_FORBIDDEN",
          "DATABASE_URL",
          "security",
        );
      }
      if (url.hostname !== environment.ACCOUNTING_PRODUCTION_DATABASE_HOST) {
        issue("DATABASE_HOST_IDENTITY_MISMATCH", "DATABASE_URL", "security");
      }
      if (url.port !== declaredPort) {
        issue("DATABASE_PORT_IDENTITY_MISMATCH", "DATABASE_URL", "security");
      }
      if (databaseName !== environment.ACCOUNTING_PRODUCTION_DATABASE_NAME) {
        issue("DATABASE_NAME_IDENTITY_MISMATCH", "DATABASE_URL", "security");
      }
      if (url.username !== environment.ACCOUNTING_PRODUCTION_DATABASE_USER) {
        issue("DATABASE_USER_IDENTITY_MISMATCH", "DATABASE_URL", "security");
      }
    } catch {
      issue("DATABASE_URL_INVALID", "DATABASE_URL", "security");
    }
  }

  const stableVariables = [
    "ACCOUNTING_PRODUCTION_DATABASE_HOST",
    "ACCOUNTING_PRODUCTION_DATABASE_NAME",
    "ACCOUNTING_PRODUCTION_DATABASE_USER",
    "ACCOUNTING_PRODUCTION_DATABASE_MARKER",
    "ACCOUNTING_ORGANIZATION_ID",
  ] as const;
  for (const name of stableVariables) {
    if (present(environment[name]) && !STABLE_VALUE.test(environment[name]!.trim())) {
      issue("STABLE_IDENTIFIER_INVALID", name);
    }
    if (
      present(environment[name]) &&
      NON_PRODUCTION_IDENTITY_TOKEN.test(environment[name]!.trim())
    ) {
      issue("NON_PRODUCTION_IDENTITY_FORBIDDEN", name, "security");
    }
  }
  const legalEntities = (environment.ACCOUNTING_LEGAL_ENTITY_IDS ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (
    legalEntities.length === 0 ||
    new Set(legalEntities).size !== legalEntities.length ||
    legalEntities.some((entry) => !STABLE_VALUE.test(entry))
  ) {
    issue("LEGAL_ENTITY_SCOPE_INVALID", "ACCOUNTING_LEGAL_ENTITY_IDS");
  }
  if (legalEntities.some((entry) => NON_PRODUCTION_IDENTITY_TOKEN.test(entry))) {
    issue(
      "NON_PRODUCTION_IDENTITY_FORBIDDEN",
      "ACCOUNTING_LEGAL_ENTITY_IDS",
      "security",
    );
  }
  if (
    environment.ACCOUNTING_PRODUCTION_DATABASE_MARKER &&
    NON_PRODUCTION_IDENTITY_TOKEN.test(
      environment.ACCOUNTING_PRODUCTION_DATABASE_MARKER,
    )
  ) {
    issue(
      "PRODUCTION_DATABASE_MARKER_AMBIGUOUS",
      "ACCOUNTING_PRODUCTION_DATABASE_MARKER",
      "security",
    );
  }

  if (intent === "MIGRATION_EXECUTION") {
    for (const name of [
      "ACCOUNTING_BACKUP_EVIDENCE_REFERENCE",
      "ACCOUNTING_RESTORE_REHEARSAL_REFERENCE",
      "ACCOUNTING_MIGRATION_TECHNICAL_APPROVAL",
      "ACCOUNTING_MIGRATION_BUSINESS_APPROVAL",
      "ACCOUNTING_MIGRATION_SECURITY_APPROVAL",
      "ACCOUNTING_MIGRATION_OPERATOR_ID",
      "ACCOUNTING_MIGRATION_CHECKER_ID",
      "ACCOUNTING_PRODUCTION_AUTHORIZATION_REFERENCE",
    ] as const) {
      if (present(environment[name]) && !STABLE_VALUE.test(environment[name]!.trim())) {
        issue("AUTHORIZATION_REFERENCE_INVALID", name, "security");
      }
    }
    if (
      present(environment.ACCOUNTING_MIGRATION_OPERATOR_ID) &&
      environment.ACCOUNTING_MIGRATION_OPERATOR_ID ===
        environment.ACCOUNTING_MIGRATION_CHECKER_ID
    ) {
      issue("MAKER_CHECKER_SEPARATION_REQUIRED", undefined, "security");
    }
    if (
      environment.ACCOUNTING_PRODUCTION_AUTHORIZATION_MARKER !==
      AUTHORIZATION_MARKER
    ) {
      issue(
        "PRODUCTION_AUTHORIZATION_MARKER_INVALID",
        "ACCOUNTING_PRODUCTION_AUTHORIZATION_MARKER",
        "security",
      );
    }
    issue("PHASE7_PRODUCTION_EXECUTION_DISABLED", undefined, "security");
  }

  return {
    ready: issues.length === 0,
    intent,
    checkedVariableNames: required.map((definition) => definition.name).sort(),
    issues,
    providersDisabled:
      environment.ACCOUNTING_PROVIDER_MODE === "disabled" &&
      environment.ACCOUNTING_OUTBOUND_DELIVERY_MODE === "disabled",
    port5432Rejected: !issues.some(
      (entry) =>
        entry.code === "DATABASE_PORT_INVALID" ||
        entry.code === "DATABASE_URL_INVALID",
    ),
    valuesDisclosed: false,
  };
}
