"use client";

import { useState } from "react";
import {
  DateInput,
  DropdownSelect,
  Input,
  Label,
  NeonCheckbox,
} from "@/components/monolith";

const genderOptions = [
  { value: "female", label: "Female" },
  { value: "genderqueer", label: "Genderqueer" },
  { value: "male", label: "Male" },
  { value: "non-conforming", label: "Non-Conforming" },
  { value: "other", label: "Other" },
  { value: "prefer-not", label: "Prefer not to say" },
  { value: "transgender", label: "Transgender" },
] as const;

const employeeOptions = [
  { value: "", label: "Select employee range" },
  { value: "1-10", label: "1-10" },
  { value: "11-50", label: "11-50" },
  { value: "51-200", label: "51-200" },
  { value: "201-500", label: "201-500" },
  { value: "500+", label: "500+" },
] as const;

export function InputFieldSpecimen() {
  const [calendarDate, setCalendarDate] = useState("2026-08-10");
  const [employees, setEmployees] = useState("1-10");
  const [gender, setGender] = useState("female");
  const [checkboxes, setCheckboxes] = useState({
    disabled: true,
    unsubscribed: false,
    blogSubscriber: false,
  });

  return (
    <section className="ds-input-specimen" aria-label="Input field variants">
      <div className="ds-control-section">
        <div className="ds-control-heading">
          <h3 className="ds-type-heading">Inputs</h3>
          <p className="ds-font-family">
            Shared field geometry, soft neutral surface, restrained focus ring,
            and the same label primitive used across text, select, and date controls.
          </p>
        </div>

        <div className="ds-input-grid">
          <div className="ds-input-field">
            <Label htmlFor="ds-input-website">Website</Label>
            <Input id="ds-input-website" placeholder="" />
          </div>

          <div className="ds-input-field">
            <Label htmlFor="ds-input-whatsapp">WhatsApp</Label>
            <Input id="ds-input-whatsapp" defaultValue="+91 98765 43210" />
          </div>

          <div className="ds-input-field">
            <Label htmlFor="ds-input-status" required>
              Status
            </Label>
            <Input id="ds-input-status" value="Qualified" readOnly />
          </div>

          <div className="ds-input-field">
            <Label htmlFor="ds-input-disabled">Disabled</Label>
            <Input id="ds-input-disabled" value="Read only snapshot" disabled />
          </div>
        </div>
      </div>

      <div className="ds-control-section">
        <div className="ds-control-heading">
          <h3 className="ds-type-heading">Dropdowns / Combobox</h3>
          <p className="ds-font-family">
            The rebuilt dropdown uses the same control shape as the input and supports
            long lists, create actions, and searchable selection.
          </p>
        </div>

        <div className="ds-input-grid">
          <div className="ds-input-field">
            <Label htmlFor="ds-input-employees">No of Employees</Label>
            <DropdownSelect
              id="ds-input-employees"
              options={employeeOptions.map((option) => ({ ...option }))}
              value={employees}
              onValueChange={setEmployees}
            />
          </div>

          <div className="ds-input-field">
            <Label htmlFor="ds-dropdown-gender">Gender</Label>
            <DropdownSelect
              id="ds-dropdown-gender"
              defaultOpen
              searchable
              createLabel="Create a new Gender"
              options={genderOptions.map((option) => ({ ...option }))}
              value={gender}
              onCreate={() => undefined}
              onValueChange={setGender}
            />
          </div>
        </div>
      </div>

      <div className="ds-control-section">
        <div className="ds-control-heading">
          <h3 className="ds-type-heading">Date Picker / Calendar</h3>
          <p className="ds-font-family">
            The calendar overlay uses the same floating infrastructure as the dropdown and
            includes the August 2026 comparison state from the request.
          </p>
        </div>

        <div className="ds-input-grid">
          <div className="ds-input-field">
            <Label htmlFor="ds-input-calendar">Start Date</Label>
            <DateInput
              id="ds-input-calendar"
              defaultOpen
              value={calendarDate}
              onChange={(event) => setCalendarDate(event.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="ds-control-section">
        <div className="ds-control-heading">
          <h3 className="ds-type-heading">Checkboxes</h3>
          <p className="ds-font-family">
            Checked, unchecked, indeterminate, and disabled states share one compact checkbox
            shape with a dark fill and crisp white mark.
          </p>
        </div>

        <div className="ds-input-checkboxes">
          <NeonCheckbox
            checked={checkboxes.disabled}
            label="Disabled"
            onChange={(event) =>
              setCheckboxes((current) => ({
                ...current,
                disabled: event.target.checked,
              }))
            }
          />
          <NeonCheckbox
            checked={checkboxes.unsubscribed}
            label="Unsubscribed"
            onChange={(event) =>
              setCheckboxes((current) => ({
                ...current,
                unsubscribed: event.target.checked,
              }))
            }
          />
          <NeonCheckbox
            checked={checkboxes.blogSubscriber}
            label="Blog Subscriber"
            onChange={(event) =>
              setCheckboxes((current) => ({
                ...current,
                blogSubscriber: event.target.checked,
              }))
            }
          />
          <NeonCheckbox
            checked
            indeterminate
            label="Partially subscribed"
            onChange={() => undefined}
          />
        </div>
      </div>
    </section>
  );
}
