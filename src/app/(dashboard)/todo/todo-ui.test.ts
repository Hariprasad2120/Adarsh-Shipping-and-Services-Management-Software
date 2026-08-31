import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function source(path: string) {
  return readFileSync(join(root, path), "utf8");
}

describe("To-Do Monolith presentation", () => {
  it("uses a right-side page header graphic instead of the legacy icon tile", () => {
    const todoClient = source("src/app/(dashboard)/todo/todo-client.tsx");
    const workspace = source("src/components/layout/workspace.tsx");
    const styles = source("src/app/globals.css");

    expect(todoClient).toContain("graphic={<TodoHeaderGraphic />}");
    expect(todoClient).not.toContain("ClipboardCheck");
    expect(workspace).toContain("graphic?: React.ReactNode");
    expect(workspace).toContain("mnx-page-header-graphic");
    expect(styles).toContain(".mnx-page-header-graphic");
    expect(styles).toContain(".mnx-todo-header-graphic");
  });
});
