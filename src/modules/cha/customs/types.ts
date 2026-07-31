export type ChaCustomsFilingDirection = "IMPORT" | "EXPORT";

export type ChaCustomsFeatureBoundaryState =
  | { status: "disabled"; reason: "FEATURE_FLAG_DISABLED" }
  | { status: "enabled" };

