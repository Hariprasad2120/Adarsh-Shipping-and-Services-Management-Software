import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/rbac";
import { redirect } from "next/navigation";
import { WorkbookImportForm } from "./workbook-import-form";
import { Database, FileSpreadsheet } from "lucide-react";
import {
  AdminPanel,
  AdminPanelHeader,
  WorkspaceSectionHeading,
} from "@/components/monolith";

export const metadata = {
  title: "Data Tools | Admin | Adarsh Shipping",
};

export default async function DataToolsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  await requirePermission(session.user.id, "admin.org.manage");

  return (
    <>
      <WorkspaceSectionHeading
        index="01"
        title="Controlled data operations"
        description="Use validated, permission-gated tools and review the reset procedure before changing organisation data."
      />
      <div className="mnx-admin-split">
        <AdminPanel>
          <AdminPanelHeader
            eyebrow="Procedure"
            title="Safe database reset"
            description="Run resets only in the intended local environment with explicit confirmation."
            actions={<Database aria-hidden="true" />}
          />
          <div className="mnx-admin-panel-body">
            <p>
            To reset system data and clear transactional appraisal data while preserving main organisation admins, run the standard reset command in the local environment:
          </p>
          <pre className="mnx-admin-code-block">
{`$env:CONFIRM_RESET="KEEP_ONLY_ADMIN"
$env:RESET_ADMIN_PASSWORD="strong-temp-password"
npm run db:reset:keep-admin`}
          </pre>
          </div>
        </AdminPanel>

        <AdminPanel>
          <AdminPanelHeader
            eyebrow="Workbook import"
            title="Fresh import workbook"
            description="Prepare the required Users and Login Access sheets before import."
            actions={<FileSpreadsheet aria-hidden="true" />}
          />
          <div className="mnx-admin-panel-body">
          <p>
            Prepare the company onboarding workbook with the required sheets (Users, Login Access) and column headers before importing fresh data.
          </p>
          <WorkbookImportForm />
          </div>
        </AdminPanel>
      </div>
    </>
  );
}
