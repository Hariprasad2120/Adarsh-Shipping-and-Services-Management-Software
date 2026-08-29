import { revalidatePath } from "next/cache";
import {
  AccountingActionLink,
  AccountingRoutePageHeader,
  AccountingSection,
  AccountingTable,
} from "@/components/monolith";
import { requireAccountingRouteAccess } from "@/modules/accounting/operational-auth";
import {
  accountingAutomationRuleInputSchema,
  accountingCustomFieldInputSchema,
  accountingWorkspaceModuleInputSchema,
  createAccountingAutomationRule,
  createAccountingCustomFieldDefinition,
  createAccountingWorkspaceModule,
  deleteAccountingAutomationRule,
  deleteAccountingCustomFieldDefinition,
  deleteAccountingWorkspaceModule,
} from "@/modules/accounting/customization";
import { getAccountingCustomizationWorkspace } from "@/modules/accounting/phase9-workspaces";
import { Button } from "@/components/ui/button";

function checkboxValue(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

function numberValue(formData: FormData, key: string) {
  const raw = Number(formData.get(key) ?? 0);
  return Number.isFinite(raw) ? raw : 0;
}

export default async function AccountingCustomizationPage() {
  const { orgId } = await requireAccountingRouteAccess("/accounting/customization", [
    "accounting.settings.manage",
    "accounting.capability-policy.manage",
  ]);
  const workspace = await getAccountingCustomizationWorkspace(orgId);

  async function createCustomFieldAction(formData: FormData) {
    "use server";
    const { orgId: actionOrgId } = await requireAccountingRouteAccess(
      "/accounting/customization",
      ["accounting.settings.manage"],
    );
    const parsed = accountingCustomFieldInputSchema.parse({
      scope: String(formData.get("scope") ?? ""),
      label: String(formData.get("label") ?? ""),
      dataType: String(formData.get("dataType") ?? "TEXT"),
      helpText: String(formData.get("helpText") ?? ""),
      required: checkboxValue(formData, "required"),
      active: checkboxValue(formData, "active"),
      position: numberValue(formData, "position"),
      options: String(formData.get("options") ?? "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    });
    await createAccountingCustomFieldDefinition(actionOrgId, parsed);
    revalidatePath("/accounting/customization");
  }

  async function createAutomationRuleAction(formData: FormData) {
    "use server";
    const { orgId: actionOrgId } = await requireAccountingRouteAccess(
      "/accounting/customization",
      ["accounting.settings.manage"],
    );
    const parsed = accountingAutomationRuleInputSchema.parse({
      name: String(formData.get("name") ?? ""),
      triggerType: String(formData.get("triggerType") ?? ""),
      targetScope: String(formData.get("targetScope") ?? ""),
      actionType: String(formData.get("actionType") ?? ""),
      conditionsJson: String(formData.get("conditionsJson") ?? ""),
      configurationJson: String(formData.get("configurationJson") ?? ""),
      active: checkboxValue(formData, "active"),
    });
    await createAccountingAutomationRule(actionOrgId, parsed);
    revalidatePath("/accounting/customization");
  }

  async function createWorkspaceModuleAction(formData: FormData) {
    "use server";
    const { orgId: actionOrgId } = await requireAccountingRouteAccess(
      "/accounting/customization",
      ["accounting.settings.manage"],
    );
    const parsed = accountingWorkspaceModuleInputSchema.parse({
      code: String(formData.get("code") ?? ""),
      name: String(formData.get("name") ?? ""),
      routePath: String(formData.get("routePath") ?? ""),
      description: String(formData.get("description") ?? ""),
      configurationJson: String(formData.get("configurationJson") ?? ""),
      active: checkboxValue(formData, "active"),
    });
    await createAccountingWorkspaceModule(actionOrgId, parsed);
    revalidatePath("/accounting/customization");
  }

  async function deleteFieldAction(formData: FormData) {
    "use server";
    const { orgId: actionOrgId } = await requireAccountingRouteAccess(
      "/accounting/customization",
      ["accounting.settings.manage"],
    );
    await deleteAccountingCustomFieldDefinition(
      actionOrgId,
      String(formData.get("id") ?? ""),
    );
    revalidatePath("/accounting/customization");
  }

  async function deleteAutomationAction(formData: FormData) {
    "use server";
    const { orgId: actionOrgId } = await requireAccountingRouteAccess(
      "/accounting/customization",
      ["accounting.settings.manage"],
    );
    await deleteAccountingAutomationRule(
      actionOrgId,
      String(formData.get("id") ?? ""),
    );
    revalidatePath("/accounting/customization");
  }

  async function deleteModuleAction(formData: FormData) {
    "use server";
    const { orgId: actionOrgId } = await requireAccountingRouteAccess(
      "/accounting/customization",
      ["accounting.settings.manage"],
    );
    await deleteAccountingWorkspaceModule(
      actionOrgId,
      String(formData.get("id") ?? ""),
    );
    revalidatePath("/accounting/customization");
  }

  return (
    <>
      <AccountingRoutePageHeader />
      <AccountingSection
        eyebrow="Custom fields"
        title="Accounting metadata registry"
        description="Define reusable custom fields for customers, vendors, items, documents, and payments without changing posting behavior."
        actions={
          <AccountingActionLink href="/api/accounting/custom-fields">
            API
          </AccountingActionLink>
        }
      >
        <form action={createCustomFieldAction} className="mnx-accounting-form">
          <div className="mnx-accounting-form-grid">
            <label className="mnx-field">
              <span>Scope</span>
              <select name="scope" defaultValue="SALES_INVOICE">
                {["CUSTOMER", "VENDOR", "ITEM", "SALES_INVOICE", "PURCHASE_INVOICE", "PAYMENT", "JOURNAL_ENTRY", "QUOTATION"].map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
            </label>
            <label className="mnx-field">
              <span>Label</span>
              <input name="label" required />
            </label>
            <label className="mnx-field">
              <span>Data type</span>
              <select name="dataType" defaultValue="TEXT">
                {["TEXT", "TEXTAREA", "NUMBER", "DATE", "SELECT", "BOOLEAN"].map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
            </label>
            <label className="mnx-field">
              <span>Position</span>
              <input defaultValue={0} min={0} name="position" type="number" />
            </label>
            <label className="mnx-field mnx-accounting-field-span">
              <span>Help text</span>
              <input name="helpText" />
            </label>
            <label className="mnx-field mnx-accounting-field-span">
              <span>Options</span>
              <input name="options" placeholder="Comma-separated select options" />
            </label>
            <label className="mnx-inline-flex items-center gap-2">
              <input defaultChecked name="active" type="checkbox" />
              Active
            </label>
            <label className="mnx-inline-flex items-center gap-2">
              <input name="required" type="checkbox" />
              Required
            </label>
            <Button type="submit">
              Add custom field
            </Button>
          </div>
        </form>
        <AccountingTable>
          <thead>
            <tr>
              <th>Scope</th>
              <th>Label</th>
              <th>Key</th>
              <th>Type</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {workspace.customFields.map((field) => (
              <tr key={field.id}>
                <td>{field.scope}</td>
                <td>{field.label}</td>
                <td>{field.key}</td>
                <td>{field.dataType}</td>
                <td>{field.isActive ? "Active" : "Inactive"}</td>
                <td>
                  <form action={deleteFieldAction}>
                    <input name="id" type="hidden" value={field.id} />
                    <Button variant="inverse" type="submit">
                      Delete
                    </Button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </AccountingTable>
      </AccountingSection>
      <AccountingSection
        eyebrow="Automation"
        title="Accounting automation rules"
        description="Register trigger and action intent for notifications, exports, outbox recovery, and manual-review routing."
        actions={
          <AccountingActionLink href="/api/accounting/automation-rules">
            API
          </AccountingActionLink>
        }
      >
        <form action={createAutomationRuleAction} className="mnx-accounting-form">
          <div className="mnx-accounting-form-grid">
            <label className="mnx-field"><span>Name</span><input name="name" required /></label>
            <label className="mnx-field"><span>Trigger</span><select defaultValue="DOCUMENT_APPROVED" name="triggerType">{["DOCUMENT_APPROVED", "PAYMENT_APPROVED", "REPORT_SCHEDULED", "PORTAL_PUBLISHED", "OUTBOX_FAILED", "PERIOD_CLOSED"].map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
            <label className="mnx-field"><span>Scope</span><select defaultValue="DOCUMENT" name="targetScope">{["DOCUMENT", "PAYMENT", "REPORT", "PORTAL", "OUTBOX", "PERIOD"].map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
            <label className="mnx-field"><span>Action</span><select defaultValue="QUEUE_EMAIL" name="actionType">{["QUEUE_EMAIL", "QUEUE_PORTAL_NOTIFICATION", "QUEUE_OUTBOX_RETRY", "FLAG_MANUAL_REVIEW", "GENERATE_REPORT_EXPORT"].map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
            <label className="mnx-field mnx-accounting-field-span"><span>Conditions JSON</span><textarea name="conditionsJson" rows={4} /></label>
            <label className="mnx-field mnx-accounting-field-span"><span>Configuration JSON</span><textarea name="configurationJson" rows={4} /></label>
            <label className="mnx-inline-flex items-center gap-2"><input defaultChecked name="active" type="checkbox" />Active</label>
            <Button type="submit">Add automation rule</Button>
          </div>
        </form>
        <AccountingTable>
          <thead>
            <tr>
              <th>Name</th>
              <th>Trigger</th>
              <th>Scope</th>
              <th>Action</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {workspace.automationRules.map((rule) => (
              <tr key={rule.id}>
                <td>{rule.name}</td>
                <td>{rule.triggerType}</td>
                <td>{rule.targetScope}</td>
                <td>{rule.actionType}</td>
                <td>{rule.isActive ? "Active" : "Inactive"}</td>
                <td>
                  <form action={deleteAutomationAction}>
                    <input name="id" type="hidden" value={rule.id} />
                    <Button variant="inverse" type="submit">Delete</Button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </AccountingTable>
      </AccountingSection>
      <AccountingSection
        eyebrow="Workspace modules"
        title="Accounting module registry"
        description="Track optional Accounting workspaces and owned route paths without enabling legacy posting paths."
        actions={
          <AccountingActionLink href="/api/accounting/workspace-modules">
            API
          </AccountingActionLink>
        }
      >
        <form action={createWorkspaceModuleAction} className="mnx-accounting-form">
          <div className="mnx-accounting-form-grid">
            <label className="mnx-field"><span>Code</span><input name="code" required /></label>
            <label className="mnx-field"><span>Name</span><input name="name" required /></label>
            <label className="mnx-field mnx-accounting-field-span"><span>Route path</span><input defaultValue="/accounting/" name="routePath" required /></label>
            <label className="mnx-field mnx-accounting-field-span"><span>Description</span><input name="description" /></label>
            <label className="mnx-field mnx-accounting-field-span"><span>Configuration JSON</span><textarea name="configurationJson" rows={4} /></label>
            <label className="mnx-inline-flex items-center gap-2"><input defaultChecked name="active" type="checkbox" />Active</label>
            <Button type="submit">Add workspace module</Button>
          </div>
        </form>
        <AccountingTable>
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Route</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {workspace.workspaceModules.map((module) => (
              <tr key={module.id}>
                <td>{module.code}</td>
                <td>{module.name}</td>
                <td>{module.routePath}</td>
                <td>{module.isActive ? "Active" : "Inactive"}</td>
                <td>
                  <form action={deleteModuleAction}>
                    <input name="id" type="hidden" value={module.id} />
                    <Button variant="inverse" type="submit">Delete</Button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </AccountingTable>
      </AccountingSection>
    </>
  );
}
