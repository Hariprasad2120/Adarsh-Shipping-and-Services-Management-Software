import { describe, expect, it } from "vitest";
import { getAvailableTools } from "@/modules/mona/tools";

describe("Mona tool isolation", () => {
  it("omits sensitive accounting and communication tools without permission", () => {
    const toolNames = getAvailableTools(["attendance.punch.self"]).map((tool) => tool.name);

    expect(toolNames).not.toContain("getAccountingSummary");
    expect(toolNames).not.toContain("proposeDraftEmail");
    expect(toolNames).not.toContain("getLetterTemplates");
  });

  it("exposes accounting summary only when the finance permission is present", () => {
    const toolNames = getAvailableTools(["accounting.journal.read"]).map((tool) => tool.name);

    expect(toolNames).toContain("getAccountingSummary");
  });
});
