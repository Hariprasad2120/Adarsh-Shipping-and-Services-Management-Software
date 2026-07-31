import { describe, expect, it } from "vitest";

import {
  CHA_CUSTOMS_FEATURE_FLAG_KEYS,
  DEFAULT_CHA_CUSTOMS_FEATURE_FLAGS,
  getChaCustomsFeatureFlagsSettingKey,
  isChaCustomsFeatureEnabled,
  parseChaCustomsFeatureFlags,
} from "../feature-flags";
import { evaluateIcegateCapability } from "../icegate/types";
import { getEnabledChaCustomsRouteMetadata } from "../routes";

describe("CHA customs feature flags", () => {
  it("defaults every Phase 1 customs flag to disabled", () => {
    expect(DEFAULT_CHA_CUSTOMS_FEATURE_FLAGS).toEqual({
      CHA_CUSTOMS_MASTER_DATA: false,
      CHA_IMPORT_FILING_WORKSPACE: false,
      CHA_EXPORT_FILING_WORKSPACE: false,
      CHA_ICEGATE_INTEGRATION: false,
      CHA_ICEGATE_LIVE_SUBMISSION: false,
    });

    for (const key of CHA_CUSTOMS_FEATURE_FLAG_KEYS) {
      expect(isChaCustomsFeatureEnabled(DEFAULT_CHA_CUSTOMS_FEATURE_FLAGS, key)).toBe(false);
    }
  });

  it("uses an organisation-scoped SystemSetting key", () => {
    expect(getChaCustomsFeatureFlagsSettingKey("org_123")).toBe(
      "org:org_123:cha_customs_feature_flags",
    );
  });

  it("parses only explicit true values as enabled", () => {
    const flags = parseChaCustomsFeatureFlags(JSON.stringify({
      CHA_CUSTOMS_MASTER_DATA: true,
      CHA_IMPORT_FILING_WORKSPACE: "true",
      CHA_EXPORT_FILING_WORKSPACE: false,
      CHA_ICEGATE_INTEGRATION: true,
      CHA_ICEGATE_LIVE_SUBMISSION: true,
    }));

    expect(flags.CHA_CUSTOMS_MASTER_DATA).toBe(true);
    expect(flags.CHA_IMPORT_FILING_WORKSPACE).toBe(false);
    expect(flags.CHA_EXPORT_FILING_WORKSPACE).toBe(false);
    expect(flags.CHA_ICEGATE_INTEGRATION).toBe(true);
    expect(flags.CHA_ICEGATE_LIVE_SUBMISSION).toBe(true);
  });

  it("keeps ICEGATE live submission disabled unless integration is enabled", () => {
    const flags = {
      ...DEFAULT_CHA_CUSTOMS_FEATURE_FLAGS,
      CHA_ICEGATE_LIVE_SUBMISSION: true,
    };

    expect(isChaCustomsFeatureEnabled(flags, "CHA_ICEGATE_LIVE_SUBMISSION")).toBe(false);
  });

  it("returns disabled/not-configured ICEGATE states without network calls", () => {
    expect(evaluateIcegateCapability(DEFAULT_CHA_CUSTOMS_FEATURE_FLAGS, "test_submission")).toEqual({
      status: "disabled",
      reason: "FEATURE_FLAG_DISABLED",
    });

    expect(evaluateIcegateCapability({
      ...DEFAULT_CHA_CUSTOMS_FEATURE_FLAGS,
      CHA_ICEGATE_INTEGRATION: true,
    }, "test_submission")).toEqual({
      status: "not_configured",
      reason: "ICEGATE_CONFIGURATION_MISSING",
    });
  });

  it("preserves current navigation by exposing no customs route metadata while disabled", () => {
    expect(getEnabledChaCustomsRouteMetadata(DEFAULT_CHA_CUSTOMS_FEATURE_FLAGS)).toEqual([]);
  });
});
