import { assertStagingOutboundDeliveryDisabled } from "./staging-login-policy";
import { assertExactStagingEnvironment } from "./staging-target";

assertExactStagingEnvironment("Accounting Phase 6 staging preflight");
assertStagingOutboundDeliveryDisabled(process.env);
if (process.env.ACCOUNTING_PROVIDER_MODE !== "disabled") {
  throw new Error("[STAGING_ACCOUNTING_PROVIDER_NOT_DISABLED]");
}
if (
  process.env.ACCOUNTING_PHASE6_EXECUTION &&
  process.env.ACCOUNTING_PHASE6_EXECUTION !== "disabled"
) {
  throw new Error("[STAGING_PHASE6_EXECUTION_MUST_DEFAULT_DISABLED]");
}
process.stdout.write(
  `${JSON.stringify({
    stagingIdentity: "approved",
    databasePort: 56432,
    port5432Rejected: true,
    outboundProviders: "disabled",
    accountingProvider: "disabled",
    phase6Execution: "disabled",
  })}\n`,
);
