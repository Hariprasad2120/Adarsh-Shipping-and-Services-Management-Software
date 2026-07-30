import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import {
  PublicActions,
  PublicBrand,
  PublicFooter,
  PublicHeader,
  PublicMonolithShell,
  PublicPanel,
  PublicStage,
  PublicStatusBadge,
} from "@/components/monolith";

export default function EmployeeWorkspaceReadyPage() {
  return (
    <PublicMonolithShell data-public-route="employee-invitation-ready">
      <PublicBrand subtitle="Employee onboarding" />
      <PublicStage>
        <PublicPanel>
          <PublicHeader
            badge={
              <PublicStatusBadge tone="success">
                Invitation accepted
              </PublicStatusBadge>
            }
            eyebrow="Workspace access"
            icon={<CheckCircle2 />}
            title="Your workspace is ready"
            description="Sign in with your work email and the password you just created, then complete your employee profile from My Profile."
          />
          <PublicActions>
            <Link
              className="mnx-button mnx-button-primary mnx-public-primary-action"
              href="/login"
            >
              Continue to sign in
            </Link>
          </PublicActions>
        </PublicPanel>
      </PublicStage>
      <PublicFooter>
        Secure employee onboarding · Monolith identity services
      </PublicFooter>
    </PublicMonolithShell>
  );
}
