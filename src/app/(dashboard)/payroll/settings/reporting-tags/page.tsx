import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getSession } from "@/lib/auth";
import { WorkspaceAlert, WorkspacePanel, WorkspaceSectionHeading, WorkspaceTable } from "@/components/layout/workspace";
import { Button } from "@/components/ui/button";
import {
  createPayrollReportingTagAction,
  listPayrollReportingTags,
  toggleReportingTagActiveAction,
} from "@/modules/payroll/reporting-tags";

// Zoho reference settings_advanced-reportingtags. Reuses
// AccountingReportingTag (org-wide tag registry) instead of a payroll-only
// duplicate — see reporting-tags.ts for why.
export default async function PayrollReportingTagsSettingsPage() {
  const session = await getSession();
  if (!session?.user?.orgId) redirect("/login");

  const tags = await listPayrollReportingTags(session.user.orgId);

  async function createAction(formData: FormData) {
    "use server";
    const result = await createPayrollReportingTagAction({
      code: String(formData.get("code") ?? ""),
      name: String(formData.get("name") ?? ""),
      description: String(formData.get("description") ?? ""),
      active: formData.get("active") === "on",
    });
    if (!result.ok) throw new Error(result.error);
  }

  async function toggleAction(formData: FormData) {
    "use server";
    const id = String(formData.get("id") ?? "");
    const active = String(formData.get("nextActive") ?? "") === "true";
    const result = await toggleReportingTagActiveAction(id, active);
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
          title="Advanced Reporting Tags"
          description="Free-form tags for categorising payroll transactions in reports. Shared with Accounting's reporting-tag registry — the same tag applies across both modules."
          actions={
            <Link className="mnx-button mnx-button-secondary" href="/accounting/customization">
              Open Accounting customization
            </Link>
          }
        />
        <WorkspaceAlert variant="info">
          Tags are registered here; nothing in payroll transaction entry
          applies them to a line item yet. That wiring is a follow-up once
          this registry has tags your org actually wants.
        </WorkspaceAlert>
        <form action={createAction} className="grid gap-3 md:grid-cols-4">
          <label className="mnx-field md:col-span-1">
            <span>Code</span>
            <input name="code" required placeholder="e.g. COST_CENTER_A" />
          </label>
          <label className="mnx-field md:col-span-1">
            <span>Name</span>
            <input name="name" required placeholder="e.g. Cost Centre A" />
          </label>
          <label className="mnx-field md:col-span-2">
            <span>Description</span>
            <input name="description" />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input defaultChecked name="active" type="checkbox" />
            Active
          </label>
          <div className="md:col-span-4">
            <Button type="submit">Add tag</Button>
          </div>
        </form>

        {tags.length === 0 ? (
          <p className="text-sm text-[var(--mnx-muted)]">No reporting tags configured yet.</p>
        ) : (
          <WorkspaceTable scrollLabel="Reporting tags">
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Description</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {tags.map((tag) => (
                <tr key={tag.id}>
                  <td>{tag.code}</td>
                  <td>{tag.name}</td>
                  <td>{tag.description ?? ""}</td>
                  <td>{tag.isActive ? "Active" : "Inactive"}</td>
                  <td className="flex justify-end">
                    <form action={toggleAction}>
                      <input name="id" type="hidden" value={tag.id} />
                      <input name="nextActive" type="hidden" value={(!tag.isActive).toString()} />
                      <Button size="sm" type="submit" variant="inverse">
                        {tag.isActive ? "Deactivate" : "Activate"}
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
