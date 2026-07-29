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

  it("provides readable theme-tinted glass to every floating Monolith surface", () => {
    const tokens = source("src/styles/monolith-tokens.css");
    const styles = source("src/styles/monolith-system.css");
    const dialogSource = source(
      "src/components/monolith/workspace-dialog.tsx",
    );
    const menuSource = source("src/components/monolith/dropdown-menu.tsx");
    const warningSource = source(
      "src/components/monolith/warning-indicator-popover.tsx",
    );
    const monaSource = source("src/components/mona/mona-chat.tsx");

    expect(tokens.match(/--mn-color-glass-surface:/g)).toHaveLength(4);
    expect(tokens.match(/--mn-color-glass-surface-strong:/g)).toHaveLength(4);
    expect(tokens.match(/--mn-color-glass-border:/g)).toHaveLength(4);
    expect(tokens.match(/--mn-color-overlay:/g)).toHaveLength(4);
    expect(tokens.match(/--mn-shadow-floating:/g)).toHaveLength(4);
    expect(tokens.match(/--mn-gradient-glass:/g)).toHaveLength(4);

    expect(styles).toContain(".mnx-floating-surface");
    expect(styles).toContain("background-image: var(--mnx-glass-gradient)");
    expect(styles).toContain("backdrop-filter: var(--mnx-glass-filter)");
    expect(styles).toContain('[data-sonner-toast]');
    expect(styles).toContain(".mnx-profile-popover");
    expect(styles).toContain(".mnx-command-dialog");
    expect(styles).toContain(".mnx-select-content");

    expect(dialogSource).toContain('"mnx-floating-surface"');
    expect(menuSource).toContain(
      "mnx-floating-surface mnx-floating-menu",
    );
    expect(menuSource).not.toContain("bg-[var(--card)]");
    expect(warningSource).toContain(
      "mnx-floating-surface mnx-warning-popover",
    );
    expect(monaSource).toContain(
      "mnx-floating-surface mnx-floating-tooltip",
    );
    expect(monaSource).toContain("mnx-floating-surface mnx-mona-panel");
  });

  it("routes every CHA dialog and dropdown through the reference surface contract", () => {
    const chaSource = source("src/components/monolith/cha-workspace.tsx");
    const createJobSource = source(
      "src/components/cha/create-job-dialog.tsx",
    );
    const styles = source("src/styles/monolith-system.css");

    expect(chaSource).toContain("export function ChaModal");
    expect(chaSource).toContain("export function ChaDropdownSelect");
    expect(chaSource).toContain("export function ChaNativeSelect");
    expect(chaSource).toContain("export function ChaFilterMenu");
    expect(chaSource).toContain(
      "export function ChaWarningIndicatorPopover",
    );
    expect(createJobSource).toContain("mnx-dialog mnx-cha-create-dialog");
    expect(createJobSource).toContain(
      "mnx-dialog-content mnx-cha-create-dialog-content",
    );
    expect(createJobSource).toContain(
      "mnx-floating-surface mnx-cha-menu mnx-cha-autocomplete",
    );
    expect(createJobSource).not.toContain("CreateJobBenefit");
    expect(styles).toContain(".mnx-cha-dialog-control");
    expect(styles).toContain(".mnx-cha-native-select");
    expect(styles).toContain(".mnx-cha-menu");
    expect(styles).toContain(".mnx-cha-popover");
    expect(styles).toContain(".mnx-cha-success-dialog");
  });
});
