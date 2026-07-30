import { describe, expect, it } from "vitest";
import {
  assertAllowedStagingFixtureIdentities,
  assertStagingMakerAuthorization,
  assertStagingOutboundDeliveryDisabled,
  STAGING_CHECKER_ROLE_ID,
  STAGING_CHECKER_USER_ID,
  STAGING_LOGIN_IDENTITY,
  STAGING_MAKER_PERMISSION_KEYS,
  STAGING_MAKER_ROLE_ID,
  STAGING_MAKER_ROLE_NAME,
} from "../staging-login-policy";

function validAuthorization() {
  return {
    ...STAGING_LOGIN_IDENTITY,
    isPlatformAdmin: false,
    roleIds: [STAGING_MAKER_ROLE_ID],
    roleNames: [STAGING_MAKER_ROLE_NAME],
    permissionKeys: [...STAGING_MAKER_PERMISSION_KEYS],
    checkerUserId: STAGING_CHECKER_USER_ID,
    checkerRoleIds: [STAGING_CHECKER_ROLE_ID],
  };
}

describe("guarded staging-login identity policy", () => {
  it("accepts the exact maker pair and synthetic fixture identities", () => {
    expect(() =>
      assertAllowedStagingFixtureIdentities([
        STAGING_LOGIN_IDENTITY,
        {
          id: "stg_user_accounting_checker",
          email: "accounting-checker@staging.example.com",
        },
      ]),
    ).not.toThrow();
  });

  it("rejects any other non-synthetic identity", () => {
    expect(() =>
      assertAllowedStagingFixtureIdentities([
        { id: "stg_other", email: "other@example.org" },
      ]),
    ).toThrow("[STAGING_NON_SYNTHETIC_IDENTITY_REJECTED]");
  });

  it("rejects the approved email under another ID", () => {
    expect(() =>
      assertAllowedStagingFixtureIdentities([
        { id: "stg_other", email: STAGING_LOGIN_IDENTITY.email },
      ]),
    ).toThrow("[STAGING_LOGIN_EMAIL_OWNER_MISMATCH]");
  });

  it("rejects the approved ID with another real-domain email", () => {
    expect(() =>
      assertAllowedStagingFixtureIdentities([
        {
          id: STAGING_LOGIN_IDENTITY.id,
          email: "another@adarshshipping.in",
        },
      ]),
    ).toThrow("[STAGING_LOGIN_IDENTITY_MISMATCH]");
  });

  it("rejects other corporate-domain identities", () => {
    expect(() =>
      assertAllowedStagingFixtureIdentities([
        { id: "stg_other", email: "accounts@adarshshipping.in" },
      ]),
    ).toThrow("[STAGING_NON_SYNTHETIC_IDENTITY_REJECTED]");
  });

  it.each([
    "HR@adarshshipping.in",
    " hr@adarshshipping.in",
    "hr@adarshshipping.in ",
    "checker@STAGING.EXAMPLE.COM",
  ])("rejects uncontrolled case or whitespace normalization: %s", (email) => {
    expect(() =>
      assertAllowedStagingFixtureIdentities([
        { id: STAGING_LOGIN_IDENTITY.id, email },
      ]),
    ).toThrow();
  });
});

describe("guarded staging outbound-delivery policy", () => {
  it.each([undefined, "", "resend", "smtp"])(
    "rejects a missing or non-disabled EMAIL_PROVIDER",
    (provider) => {
      expect(() =>
        assertStagingOutboundDeliveryDisabled({
          EMAIL_PROVIDER: provider,
        }),
      ).toThrow("[STAGING_OUTBOUND_PROVIDER_NOT_DISABLED]");
    },
  );

  it("accepts disabled delivery with no external configuration", () => {
    expect(() =>
      assertStagingOutboundDeliveryDisabled({
        EMAIL_PROVIDER: "disabled",
      }),
    ).not.toThrow();
  });

  it("rejects active external configuration without exposing its value", () => {
    const secretValue = "must-not-appear-in-diagnostics";
    let message = "";
    try {
      assertStagingOutboundDeliveryDisabled({
        EMAIL_PROVIDER: "disabled",
        RESEND_API_KEY: secretValue,
      });
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }
    expect(message).toContain(
      "[STAGING_EXTERNAL_DELIVERY_CONFIGURATION_PRESENT]",
    );
    expect(message).toContain("RESEND_API_KEY");
    expect(message).not.toContain(secretValue);
  });
});

describe("guarded staging maker authorization policy", () => {
  it("accepts only the intended maker authorization", () => {
    expect(() =>
      assertStagingMakerAuthorization(validAuthorization()),
    ).not.toThrow();
  });

  it("rejects platform administrator authority", () => {
    expect(() =>
      assertStagingMakerAuthorization({
        ...validAuthorization(),
        isPlatformAdmin: true,
      }),
    ).toThrow("[STAGING_MAKER_PLATFORM_ADMIN_FORBIDDEN]");
  });

  it.each(["Admin", "HR"])("rejects an inherited %s role", (roleName) => {
    expect(() =>
      assertStagingMakerAuthorization({
        ...validAuthorization(),
        roleIds: [STAGING_MAKER_ROLE_ID, `stg_role_${roleName}`],
        roleNames: [STAGING_MAKER_ROLE_NAME, roleName],
      }),
    ).toThrow("[STAGING_MAKER_ROLE_SCOPE_INVALID]");
  });

  it("rejects a missing expected maker permission", () => {
    expect(() =>
      assertStagingMakerAuthorization({
        ...validAuthorization(),
        permissionKeys: STAGING_MAKER_PERMISSION_KEYS.slice(1),
      }),
    ).toThrow("[STAGING_MAKER_PERMISSION_SCOPE_INVALID]");
  });

  it("rejects a checker that is missing or shares the maker identity", () => {
    expect(() =>
      assertStagingMakerAuthorization({
        ...validAuthorization(),
        checkerUserId: STAGING_LOGIN_IDENTITY.id,
      }),
    ).toThrow("[STAGING_MAKER_CHECKER_SEPARATION_INVALID]");
  });
});
