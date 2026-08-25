import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/auth";
import { WorkspacePanel, WorkspaceSectionHeading, WorkspaceTable } from "@/components/layout/workspace";
import { Button } from "@/components/ui/button";
import {
  createLoanCustomFieldAction,
  deleteLoanCustomFieldAction,
  listLoanCustomFields,
  toggleLoanCustomFieldActiveAction,
} from "@/modules/payroll/loan-custom-fields";

const DATA_TYPES = ["TEXT", "TEXTAREA", "NUMBER", "DATE", "SELECT", "BOOLEAN"] as const;

// Zoho reference settings_loan_custom-field_list. Reuses the existing
// AccountingCustomFieldDefinition table (scope="PAYROLL_LOAN") rather than a
// new model — see src/modules/payroll/loan-custom-fields.ts for why that
// needs no schema migration.
export default async function PayrollLoanCustomFieldsSettingsPage() {
  const session = await getSession();
  if (!session?.user?.orgId) redirect("/login");

  const fields = await listLoanCustomFields(session.user.orgId);

  async function createAction(formData: FormData) {
    "use server";
    const result = await createLoanCustomFieldAction({
      label: String(formData.get("label") ?? ""),
      dataType: String(formData.get("dataType") ?? "TEXT") as
        | "TEXT"
        | "TEXTAREA"
        | "NUMBER"
        | "DATE"
        | "SELECT"
        | "BOOLEAN",
      helpText: String(formData.get("helpText") ?? ""),
      required: formData.get("required") === "on",
      active: formData.get("active") === "on",
      options: String(formData.get("options") ?? "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    });
    if (!result.ok) throw new Error(result.error);
  }

  async function toggleAction(formData: FormData) {
    "use server";
    const id = String(formData.get("id") ?? "");
    const active = String(formData.get("nextActive") ?? "") === "true";
    const result = await toggleLoanCustomFieldActiveAction(id, active);
    if (!result.ok) throw new Error(result.error);
  }

  async function deleteAction(formData: FormData) {
    "use server";
    const result = await deleteLoanCustomFieldAction(String(formData.get("id") ?? ""));
    if (!result.ok) throw new Error(result.error);
  }

  return (
    <div className="space-y-6">
      <Link
        href="/payroll/settings"
        className="inline-flex items-center gap-1 text-sm text-[var(--mnx-muted)] hover:text-[var(--mnx-text)]"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to Settings
      </Link>
      <WorkspacePanel className="space-y-4 p-5">
        <WorkspaceSectionHeading
          index="01"
          title="Loan Custom Fields"
          description="Define additional fields captured on employee loans. Field definitions are stored here; entry-side capture on the loan form is a follow-up once this list has data your org actually wants."
        />

        <form action={createAction} className="grid gap-3 md:grid-cols-4">
          <label className="mnx-field md:col-span-1">
            <span>Label</span>
            <input name="label" required placeholder="e.g. Guarantor Name" />
          </label>
          <label className="mnx-field md:col-span-1">
            <span>Type</span>
            <select name="dataType" defaultValue="TEXT">
              {DATA_TYPES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label className="mnx-field md:col-span-2">
            <span>Help text</span>
            <input name="helpText" placeholder="Shown under the field on the loan form" />
          </label>
          <label className="mnx-field md:col-span-2">
            <span>Options (for Select type)</span>
            <input name="options" placeholder="Comma-separated" />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input name="required" type="checkbox" />
            Required
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input defaultChecked name="active" type="checkbox" />
            Active
          </label>
          <div className="md:col-span-4">
            <Button type="submit">Add field</Button>
          </div>
        </form>

        {fields.length === 0 ? (
          <p className="text-sm text-[var(--mnx-muted)]">No loan custom fields configured yet.</p>
        ) : (
          <WorkspaceTable scrollLabel="Loan custom fields">
            <thead>
              <tr>
                <th>Label</th>
                <th>Key</th>
                <th>Type</th>
                <th>Required</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {fields.map((field) => (
                <tr key={field.id}>
                  <td>{field.label}</td>
                  <td>{field.key}</td>
                  <td>{field.dataType}</td>
                  <td>{field.required ? "Yes" : "No"}</td>
                  <td>{field.isActive ? "Active" : "Inactive"}</td>
                  <td className="flex justify-end gap-2">
                    <form action={toggleAction}>
                      <input name="id" type="hidden" value={field.id} />
                      <input name="nextActive" type="hidden" value={(!field.isActive).toString()} />
                      <Button size="sm" type="submit" variant="inverse">
                        {field.isActive ? "Deactivate" : "Activate"}
                      </Button>
                    </form>
                    <form action={deleteAction}>
                      <input name="id" type="hidden" value={field.id} />
                      <Button size="sm" type="submit" variant="destructive">
                        Delete
                      </Button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </WorkspaceTable>
        )}
      </WorkspacePanel>
    </div>
  );
}
