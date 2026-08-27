import { describe, expect, it } from "vitest";
import {
  evaluateMonaAvailability,
  getEffectiveMonaModelId,
  type MonaGovernanceSettings,
} from "@/modules/mona/governance";

const baseSettings: MonaGovernanceSettings = {
  allowUserModelSwitching: true,
  allowedModelIds: [
    "models/gemini-2.0-flash",
    "models/gemini-2.0-flash-lite",
  ],
  defaultModelId: "models/gemini-2.0-flash",
  defaultProactivity: "balanced",
  enabledName: "Mona",
  pilotUserIds: ["pilot-user"],
  rolloutMode: "ENABLED",
};

describe("Mona governance behavior", () => {
  it("prefers the user model only when it is allowed and switching is enabled", () => {
    expect(
      getEffectiveMonaModelId({
        preferredModelId: "models/gemini-2.0-flash-lite",
        settings: baseSettings,
      }),
    ).toBe("models/gemini-2.0-flash-lite");

    expect(
      getEffectiveMonaModelId({
        preferredModelId: "models/gemini-1.5-flash",
        settings: baseSettings,
      }),
    ).toBe("models/gemini-2.0-flash");

    expect(
      getEffectiveMonaModelId({
        preferredModelId: "models/gemini-2.0-flash-lite",
        settings: {
          ...baseSettings,
          allowUserModelSwitching: false,
        },
      }),
    ).toBe("models/gemini-2.0-flash");
  });

  it("enables pilot rollout only for pilot users and admins", () => {
    const pilotSettings: MonaGovernanceSettings = {
      ...baseSettings,
      rolloutMode: "PILOT",
    };

    const availabilityForPilot = evaluateMonaAvailability({
      isAdmin: false,
      settings: pilotSettings,
      userId: "pilot-user",
    });
    const availabilityForAdmin = evaluateMonaAvailability({
      isAdmin: true,
      settings: pilotSettings,
      userId: "regular-user",
    });
    const availabilityForRegular = evaluateMonaAvailability({
      isAdmin: false,
      settings: pilotSettings,
      userId: "regular-user",
    });

    expect(availabilityForPilot.allowed).toBe(true);
    expect(availabilityForAdmin.allowed).toBe(true);
    expect(availabilityForRegular.allowed).toBe(false);
  });
});
