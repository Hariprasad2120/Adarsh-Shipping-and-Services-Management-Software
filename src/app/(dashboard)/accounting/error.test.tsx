import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import AccountingError from "./error";

describe("AccountingError", () => {
  it("renders a correlation reference without exposing raw diagnostics", () => {
    const unsafeMessage =
      'C:\\workspace\\server.ts: Invalid prisma.accountingDocument invocation; table public."AccountingDocument" does not exist';
    const error = Object.assign(new Error(unsafeMessage), {
      digest: "safe-next-digest",
    });

    const markup = renderToStaticMarkup(
      <AccountingError error={error} reset={vi.fn()} />,
    );

    expect(markup).toContain("Accounting could not be loaded");
    expect(markup).toContain(
      "A database configuration problem was detected.",
    );
    expect(markup).toContain("Reference:");
    expect(markup).toContain("Try again");
    expect(markup).not.toContain(unsafeMessage);
    expect(markup).not.toContain("prisma.accountingDocument");
    expect(markup).not.toContain("AccountingDocument");
    expect(markup).not.toContain("C:\\workspace");
  });
});
