import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function source(relativePath: string) {
  return readFileSync(join(root, relativePath), "utf8");
}

describe("Monolith popup contract", () => {
  it("centralizes portals, focus containment, scroll locking, and accessible naming", () => {
    const dialogSource = source(
      "src/components/monolith/workspace-dialog.tsx",
    );
    const chaSource = source("src/components/monolith/cha-workspace.tsx");

    expect(dialogSource).toContain("export function WorkspaceDialogLayer");
    expect(dialogSource).toContain("FOCUSABLE_SELECTOR");
    expect(dialogSource).toContain("bodyLockDepth");
    expect(dialogSource).toContain("onCloseRef.current");
    expect(dialogSource).toContain('event.key === "Escape"');
    expect(dialogSource).toContain('event.key !== "Tab"');
    expect(dialogSource).toContain("previouslyFocused?.focus");
    expect(dialogSource).toContain("aria-labelledby={labelledBy}");
    expect(dialogSource).toContain("aria-describedby={describedBy}");

    expect(chaSource).toContain("<WorkspaceDialogLayer");
    expect(chaSource).not.toContain("createPortal");
    expect(chaSource).not.toContain("mnx-cha-dialog-layer");
  });

  it("keeps popup surfaces inset on desktop and usable as mobile bottom sheets", () => {
    const styles = source("src/styles/monolith-system.css");

    expect(styles).toContain(".mnx-dialog-surface-compact");
    expect(styles).toContain(".mnx-dialog-surface-wide");
    expect(styles).toContain(".mnx-dialog-surface-workspace");
    expect(styles).toContain("height: min(52rem, 88dvh)");
    expect(styles).toContain("overscroll-behavior: contain");
    expect(styles).toContain("env(safe-area-inset-top)");
    expect(styles).toContain("border-radius: 24px 24px 0 0");
    expect(styles).not.toContain(".mnx-cha-dialog-layer");
    expect(styles).not.toContain(".mnx-cha-dialog-workspace");
  });
});
