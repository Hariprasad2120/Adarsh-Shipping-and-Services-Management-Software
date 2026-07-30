import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  PeopleControlButton,
  PeopleControlInput,
  PeopleControlTable,
  PeopleControlTextarea,
  PeopleToggleButton,
} from "@/modules/people/components/people-controls";
import {
  getPeopleRouteMeta,
  PeopleLinkCard,
  PeopleNotice,
  PeoplePerson,
  PeopleSummary,
  PeopleSummaryGrid,
} from "@/modules/people/components/people-workspace";

describe("People operations production components", () => {
  it("maps exact and dynamic HRMS and Attendance routes", () => {
    expect(getPeopleRouteMeta("/hrms/employees").title).toBe("Employees");
    expect(getPeopleRouteMeta("/hrms/employees/employee-1").title).toBe(
      "Employee profile",
    );
    expect(getPeopleRouteMeta("/hrms/letters/view/letter-1").title).toBe(
      "Employee letter",
    );
    expect(getPeopleRouteMeta("/attendance/ot").title).toBe(
      "Overtime and shifts",
    );
  });

  it("renders shared summary, navigation, person, and state contracts", () => {
    const markup = renderToStaticMarkup(
      <>
        <PeopleSummaryGrid>
          <PeopleSummary label="Employees" value={42} />
        </PeopleSummaryGrid>
        <PeopleLinkCard
          href="/hrms/employees"
          title="Employees"
          description="Open the directory."
        />
        <PeoplePerson name="Asha Rao" secondary="asha@example.com" />
        <PeopleNotice
          eyebrow="Planned"
          title="Coming soon"
          description="This capability is planned."
          icon={<span>i</span>}
        />
      </>,
    );

    expect(markup).toContain("mnx-people-summary-grid");
    expect(markup).toContain("mnx-people-link-card");
    expect(markup).toContain("mnx-people-person");
    expect(markup).toContain("mnx-workspace-state-empty");
  });

  it("renders standard controls through the people production contracts", () => {
    const markup = renderToStaticMarkup(
      <>
        <PeopleControlButton>Review</PeopleControlButton>
        <PeopleControlInput aria-label="Employee" />
        <PeopleControlInput type="checkbox" aria-label="Select employee" />
        <PeopleControlTextarea aria-label="Notes" />
        <PeopleToggleButton active aria-label="Login enabled" />
        <PeopleControlTable>
          <tbody>
            <tr>
              <td>Record</td>
            </tr>
          </tbody>
        </PeopleControlTable>
      </>,
    );

    expect(markup).toContain("mnx-button-secondary");
    expect(markup).toContain("mnx-field-control");
    expect(markup).toContain("mnx-choice-control");
    expect(markup).toContain("mnx-field-textarea");
    expect(markup).toContain("mnx-people-toggle is-active");
    expect(markup).toContain('aria-pressed="true"');
    expect(markup).toContain("mnx-workspace-table");
  });
});
