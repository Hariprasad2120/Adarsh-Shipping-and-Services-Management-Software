import { describe, expect, it } from "vitest";
import {
  employeeInvitationInputSchema,
  employeeInvitationPasswordSchema,
} from "../employee-invitation";

describe("employee invitations", () => {
  it("normalizes a valid HR invitation payload", () => {
    const invitation = employeeInvitationInputSchema.parse({
      firstName: " Sham ",
      lastName: " Christo ",
      email: " SHAM@example.com ",
      employeeNumber: 193,
      joinDate: "2026-06-16",
    });

    expect(invitation).toMatchObject({
      firstName: "Sham",
      lastName: "Christo",
      email: "sham@example.com",
      employeeNumber: 193,
      joinDate: "2026-06-16",
      roleIds: [],
      priorExperienceYears: 0,
    });
  });

  it.each([
    "Short1A",
    "alllowercase123",
    "ALLUPPERCASE123",
    "NoNumbersHere",
  ])("rejects an unsafe invitation password: %s", (password) => {
    expect(employeeInvitationPasswordSchema.safeParse(password).success).toBe(
      false,
    );
  });

  it("accepts a strong invitation password", () => {
    expect(
      employeeInvitationPasswordSchema.safeParse("ReadyToJoin2026").success,
    ).toBe(true);
  });
});
