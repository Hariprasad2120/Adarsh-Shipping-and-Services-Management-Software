export const STAGING_LOGIN_IDENTITY = Object.freeze({
  id: "stg_user_accounting_maker",
  email: "hr@adarshshipping.in",
});

export const STAGING_SYNTHETIC_EMAIL_SUFFIX = "@staging.example.com";
export const STAGING_MAKER_ROLE_ID = "stg_role_accounting_maker";
export const STAGING_MAKER_ROLE_NAME = "STAGING Accounting Maker";
export const STAGING_CHECKER_USER_ID = "stg_user_accounting_checker";
export const STAGING_CHECKER_ROLE_ID = "stg_role_accounting_checker";
export const STAGING_CHECKER_ROLE_NAME = "STAGING Accounting Checker";

export const STAGING_MAKER_PERMISSION_KEYS = Object.freeze([
  "accounting.read",
  "accounting.create",
  "accounting.draft.create",
  "accounting.journal.prepare",
  "accounting.invoice.create",
  "accounting.period_lock.request",
  "accounting.ledger.read",
  "accounting.audit.read",
  "accounting.document.read",
  "accounting.payment.read",
  "accounting.sales-invoice.prepare",
  "accounting.purchase-invoice.prepare",
  "accounting.receipt.prepare",
  "accounting.payment.prepare",
  "accounting.payment.allocate",
  "accounting.credit-note.prepare",
  "accounting.debit-note.prepare",
  "accounting.recurring-occurrence.process",
  "accounting.migration.read",
  "accounting.migration.execute",
  "accounting.readiness.read",
  "crm.invoice.manage",
]);

export const STAGING_CHECKER_PERMISSION_KEYS = Object.freeze([
  "accounting.read",
  "accounting.approve",
  "accounting.post",
  "accounting.reverse",
  "accounting.replace",
  "accounting.journal.approve",
  "accounting.period_lock.approve",
  "accounting.exchange_rate.maintain",
  "accounting.rounding_policy.admin",
  "accounting.approval_policy.admin",
  "accounting.number_series.admin",
  "accounting.integration.post",
  "accounting.integration.retry",
  "accounting.integration.manual-review",
  "accounting.ledger.read",
  "accounting.audit.read",
  "accounting.document.read",
  "accounting.document.approve",
  "accounting.payment.read",
  "accounting.sales-invoice.approve",
  "accounting.purchase-invoice.approve",
  "accounting.payment.approve",
  "accounting.payment.post",
  "accounting.payment.reverse",
  "accounting.correction.approve",
  "accounting.outbox.retry",
  "accounting.outbox.manual-review",
  "accounting.migration.read",
  "accounting.migration.mapping.manage",
  "accounting.migration.exception.manage",
  "accounting.readiness.read",
]);

export const STAGING_EXTERNAL_DELIVERY_ENV_KEYS = Object.freeze([
  "RESEND_API_KEY",
  "SMTP_HOST",
  "SMTP_USER",
  "SMTP_PASS",
  "AUTH_GOOGLE_ID",
  "AUTH_GOOGLE_SECRET",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GOOGLE_CHAT_SA_EMAIL",
  "GOOGLE_CHAT_SA_PRIVATE_KEY",
]);

type StagingFixtureIdentity = {
  id: string;
  email: string;
};

type StagingMakerAuthorization = StagingFixtureIdentity & {
  isPlatformAdmin: boolean;
  roleIds: readonly string[];
  roleNames: readonly string[];
  permissionKeys: readonly string[];
  checkerUserId: string | null;
  checkerRoleIds: readonly string[];
};

function policyError(code: string, safeVariableNames: readonly string[] = []) {
  const variables = safeVariableNames.length
    ? ` variables=${[...safeVariableNames].sort().join(",")}`
    : "";
  return new Error(`[${code}]${variables}`);
}

function hasConfiguredValue(value: string | undefined) {
  return typeof value === "string" && value.trim().length > 0;
}

function exactSorted(values: readonly string[]) {
  return [...new Set(values)].sort();
}

function hasExactValues(
  actual: readonly string[],
  expected: readonly string[],
) {
  const actualSorted = exactSorted(actual);
  const expectedSorted = exactSorted(expected);
  return (
    actualSorted.length === expectedSorted.length &&
    actualSorted.every((value, index) => value === expectedSorted[index])
  );
}

export function isSyntheticStagingFixtureEmail(email: string) {
  return (
    email === email.trim() &&
    email === email.toLowerCase() &&
    email.length > STAGING_SYNTHETIC_EMAIL_SUFFIX.length &&
    email.endsWith(STAGING_SYNTHETIC_EMAIL_SUFFIX)
  );
}

export function assertAllowedStagingFixtureIdentities(
  identities: readonly StagingFixtureIdentity[],
) {
  for (const identity of identities) {
    if (isSyntheticStagingFixtureEmail(identity.email)) {
      continue;
    }
    if (
      identity.id === STAGING_LOGIN_IDENTITY.id &&
      identity.email === STAGING_LOGIN_IDENTITY.email
    ) {
      continue;
    }
    if (identity.email === STAGING_LOGIN_IDENTITY.email) {
      throw policyError("STAGING_LOGIN_EMAIL_OWNER_MISMATCH");
    }
    if (identity.id === STAGING_LOGIN_IDENTITY.id) {
      throw policyError("STAGING_LOGIN_IDENTITY_MISMATCH");
    }
    throw policyError("STAGING_NON_SYNTHETIC_IDENTITY_REJECTED");
  }
}

export function assertStagingLoginEmailOwner(ownerId: string | null) {
  if (ownerId !== null && ownerId !== STAGING_LOGIN_IDENTITY.id) {
    throw policyError("STAGING_LOGIN_EMAIL_OWNER_CONFLICT");
  }
}

export function assertStagingOutboundDeliveryDisabled(
  environment: Record<string, string | undefined>,
) {
  if (environment.EMAIL_PROVIDER !== "disabled") {
    throw policyError("STAGING_OUTBOUND_PROVIDER_NOT_DISABLED", [
      "EMAIL_PROVIDER",
    ]);
  }

  const activeKeys = STAGING_EXTERNAL_DELIVERY_ENV_KEYS.filter((key) =>
    hasConfiguredValue(environment[key]),
  );
  if (activeKeys.length) {
    throw policyError(
      "STAGING_EXTERNAL_DELIVERY_CONFIGURATION_PRESENT",
      activeKeys,
    );
  }
}

export function assertStagingMakerAuthorization(
  authorization: StagingMakerAuthorization,
) {
  if (
    authorization.id !== STAGING_LOGIN_IDENTITY.id ||
    authorization.email !== STAGING_LOGIN_IDENTITY.email
  ) {
    throw policyError("STAGING_MAKER_IDENTITY_INVALID");
  }
  if (authorization.isPlatformAdmin) {
    throw policyError("STAGING_MAKER_PLATFORM_ADMIN_FORBIDDEN");
  }
  if (
    !hasExactValues(authorization.roleIds, [STAGING_MAKER_ROLE_ID]) ||
    !hasExactValues(authorization.roleNames, [STAGING_MAKER_ROLE_NAME])
  ) {
    throw policyError("STAGING_MAKER_ROLE_SCOPE_INVALID");
  }
  if (
    !hasExactValues(
      authorization.permissionKeys,
      STAGING_MAKER_PERMISSION_KEYS,
    )
  ) {
    throw policyError("STAGING_MAKER_PERMISSION_SCOPE_INVALID");
  }
  if (
    authorization.checkerUserId !== STAGING_CHECKER_USER_ID ||
    !hasExactValues(authorization.checkerRoleIds, [STAGING_CHECKER_ROLE_ID])
  ) {
    throw policyError("STAGING_MAKER_CHECKER_SEPARATION_INVALID");
  }
}
