"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Building2,
  LoaderCircle,
  ShieldCheck,
} from "lucide-react";
import { DemoFillButton } from "@/components/demo-fill-button";
import {
  Button,
  Input,
  PublicActions,
  PublicBrand,
  PublicFooter,
  PublicHeader,
  PublicInset,
  PublicMonolithShell,
  PublicPanel,
  PublicStage,
  PublicStatus,
  PublicStatusBadge,
  WorkspaceField,
} from "@/components/monolith";
import { getSetupDemoValues } from "@/lib/demo-fill";

export default function SetupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orgName, setOrgName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const body = {
      orgName: formData.get("orgName"),
      name: formData.get("name"),
      email: formData.get("email"),
      password: formData.get("password"),
    };

    try {
      const response = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(
          typeof data.error === "string" ? data.error : "Setup failed.",
        );
        setLoading(false);
        return;
      }

      router.replace("/login");
    } catch {
      setError("Setup could not reach the server. Please try again.");
      setLoading(false);
    }
  }

  function fillDemoData() {
    const demo = getSetupDemoValues();
    setOrgName(demo.orgName);
    setName(demo.name);
    setEmail(demo.email);
    setPassword(demo.password);
    setError(null);
  }

  return (
    <PublicMonolithShell data-public-route="setup">
      <PublicBrand subtitle="Organisation provisioning" />

      <PublicStage className="mnx-public-stage-compact">
        <PublicPanel className="mnx-public-form-panel">
          <PublicHeader
            badge={<PublicStatusBadge tone="warning">One-time setup</PublicStatusBadge>}
            eyebrow="Platform foundation"
            icon={<Building2 />}
            title="Create your organisation"
            description="Provision the first organisation and its platform administrator account."
          />

          <form className="mnx-public-form" onSubmit={handleSubmit}>
            <div className="mnx-public-form-toolbar">
              <DemoFillButton disabled={loading} onClick={fillDemoData} />
            </div>

            <div className="mnx-public-form-grid">
              <SetupField
                label="Organisation name"
                name="orgName"
                onChange={setOrgName}
                placeholder="Adarsh Shipping"
                required
                value={orgName}
              />
              <SetupField
                label="Administrator name"
                name="name"
                onChange={setName}
                placeholder="Admin"
                required
                value={name}
              />
            </div>

            <SetupField
              label="Work email"
              name="email"
              onChange={setEmail}
              type="email"
              placeholder="admin@company.com"
              required
              value={email}
            />
            <SetupField
              label="Password"
              name="password"
              onChange={setPassword}
              type="password"
              placeholder="Minimum 8 characters"
              required
              value={password}
              hint="Use at least eight characters. The server securely hashes this password before storage."
            />

            {error ? (
              <PublicStatus
                tone="danger"
                eyebrow="Setup error"
                icon={<ShieldCheck />}
                title={error}
              />
            ) : null}

            <PublicActions>
              <Button
                type="submit"
                disabled={loading}
                className="mnx-public-primary-action"
              >
                {loading ? (
                  <>
                    <LoaderCircle className="mnx-public-spinner" />
                    Creating organisation
                  </>
                ) : (
                  <>
                    Create account
                    <ArrowRight />
                  </>
                )}
              </Button>
            </PublicActions>
          </form>

          <PublicInset className="mnx-public-security-note">
            <ShieldCheck />
            <span>
              Setup is blocked after the first platform administrator exists.
            </span>
          </PublicInset>
        </PublicPanel>
      </PublicStage>

      <PublicFooter>
        Initial provisioning creates the organisation, system roles, and
        administrator assignment in one transaction.
      </PublicFooter>
    </PublicMonolithShell>
  );
}

function SetupField({
  hint,
  label,
  name,
  onChange,
  type = "text",
  placeholder,
  required,
  value,
}: {
  hint?: string;
  label: string;
  name: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  value: string;
}) {
  return (
    <WorkspaceField
      htmlFor={`setup-${name}`}
      hint={hint}
      label={label}
      required={required}
    >
      <Input
        id={`setup-${name}`}
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </WorkspaceField>
  );
}
