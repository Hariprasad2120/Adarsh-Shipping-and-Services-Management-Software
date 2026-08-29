import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  AccountingNoteReasonSelect,
  noteReasonsFor,
} from "./accounting-note-reason-select";

describe("Accounting note reason selection", () => {
  it("uses customer-liability increase reasons for sales debit notes", () => {
    const reasons = noteReasonsFor("sales-debit");

    expect(reasons).toContain("Additional Charges or Underbilling");
    expect(reasons).toContain("Tax Short Charged");
    expect(reasons).toContain("Interest or Late Payment Charges");
    expect(reasons).not.toContain("Purchase Return");
  });

  it("uses vendor-liability reduction reasons for purchase debit notes", () => {
    const reasons = noteReasonsFor("purchase-debit");

    expect(reasons).toContain("Purchase Return");
    expect(reasons).toContain("Vendor Overbilling or Rate Difference");
    expect(reasons).toContain("Post-Purchase Discount or Rebate");
    expect(reasons).not.toContain("Additional Charges or Underbilling");
  });

  it("uses vendor-liability increase reasons for purchase credit notes", () => {
    const reasons = noteReasonsFor("purchase-credit");
    const markup = renderToStaticMarkup(
      <AccountingNoteReasonSelect
        kind="purchase-credit"
        value=""
        onChange={() => undefined}
      />,
    );

    expect(reasons).toContain("Additional Vendor Charges or Underbilling");
    expect(reasons).toContain("Quantity Received but Not Billed");
    expect(reasons).toContain("Tax Short Charged by Vendor");
    expect(reasons).toContain("Reversal of Purchase Return or Debit Note");
    expect(reasons).not.toContain("Sales Return");
    expect(reasons).not.toContain("Vendor Overbilling or Rate Difference");
    expect(markup).toContain("Additional Vendor Charges or Underbilling");
    expect(markup).not.toContain("Sales Return");
  });

  it("renders only the reasons for the selected note kind", () => {
    const markup = renderToStaticMarkup(
      <AccountingNoteReasonSelect
        kind="purchase-debit"
        value=""
        onChange={() => undefined}
      />,
    );

    expect(markup).toContain("Vendor Overbilling or Rate Difference");
    expect(markup).not.toContain("Interest or Late Payment Charges");
  });
});
