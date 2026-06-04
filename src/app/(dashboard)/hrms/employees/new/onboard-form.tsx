"use client";

import { Children, isValidElement, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DemoFillButton } from "@/components/demo-fill-button";
import { DropdownSelect } from "@/components/ui/dropdown-select";
import { applyDemoFieldValues, getOnboardingDemoValues } from "@/lib/demo-fill";

type Division = { id: string; name: string };
type Department = { id: string; name: string; code: string; divisions: Division[] };
type Branch = { id: string; name: string };
type Role = { id: string; name: string };
type Manager = { id: string; name: string; designation: string | null };

export function OnboardForm({
  org,
  roles,
  managers,
}: {
  org: { branches: Branch[]; departments: Department[] } | null;
  roles: Role[];
  managers: Manager[];
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [branchId, setBranchId] = useState("");
  const [deptId, setDeptId] = useState("");
  const [divisionId, setDivisionId] = useState("");
  const [managerId, setManagerId] = useState("");
  const [tlId, setTlId] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

  const divisions = org?.departments.find((department) => department.id === deptId)?.divisions ?? [];

  function toggleRole(id: string) {
    setSelectedRoles((prev) =>
      prev.includes(id) ? prev.filter((roleId) => roleId !== id) : [...prev, id],
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const fd = new FormData(e.currentTarget);
    const body = {
      name: fd.get("name"),
      email: fd.get("email"),
      password: fd.get("password"),
      designation: fd.get("designation") || undefined,
      branchId: fd.get("branchId") || undefined,
      departmentId: fd.get("departmentId") || undefined,
      divisionId: fd.get("divisionId") || undefined,
      managerId: fd.get("managerId") || undefined,
      tlId: fd.get("tlId") || undefined,
      joinDate: fd.get("joinDate"),
      grade: fd.get("grade") || undefined,
      ctc: fd.get("ctc") ? Number(fd.get("ctc")) : undefined,
      priorExperienceYears: fd.get("priorExperienceYears") !== "" ? Number(fd.get("priorExperienceYears")) : 0,
      roleIds: selectedRoles,
    };

    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to create employee.");
      setLoading(false);
      return;
    }

    router.push("/hrms/employees");
  }

  function fillDemoData() {
    const demo = getOnboardingDemoValues({ org, roles, managers });
    setBranchId(demo.dropdowns.branchId);
    setDeptId(demo.dropdowns.departmentId);
    setDivisionId(demo.dropdowns.divisionId);
    setManagerId(demo.dropdowns.managerId);
    setTlId(demo.dropdowns.tlId);
    setSelectedRoles(demo.roleIds);
    setError(null);

    if (formRef.current) {
      applyDemoFieldValues(formRef.current, demo.fields);
    }
  }

  return (
    <form onSubmit={handleSubmit} ref={formRef} className="space-y-5 rounded-xl border border-gray-200 bg-white p-6">
      <div className="flex justify-end">
        <DemoFillButton disabled={loading} onClick={fillDemoData} />
      </div>

      <Section title="Personal Details">
        <Row>
          <Field label="Full Name" name="name" required />
          <Field label="Email" name="email" type="email" required />
        </Row>
        <Row>
          <Field label="Password (temporary)" name="password" type="password" required placeholder="Min 8 chars" />
          <Field label="Designation" name="designation" placeholder="e.g. Senior Executive" />
        </Row>
      </Section>

      <Section title="Organisation Placement">
        <Row>
          <SelectField label="Branch" name="branchId" onChange={setBranchId} value={branchId}>
            <option value="">- None -</option>
            {org?.branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </SelectField>
          <SelectField label="Department" name="departmentId" onChange={setDeptId} value={deptId}>
            <option value="">- None -</option>
            {org?.departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </SelectField>
        </Row>
        <Row>
          <SelectField label="Division" name="divisionId" onChange={setDivisionId} value={divisionId}>
            <option value="">- None -</option>
            {divisions.map((division) => (
              <option key={division.id} value={division.id}>
                {division.name}
              </option>
            ))}
          </SelectField>
        </Row>
      </Section>

      <Section title="Hierarchy">
        <Row>
          <SelectField label="Manager" name="managerId" onChange={setManagerId} value={managerId}>
            <option value="">- None -</option>
            {managers.map((manager) => (
              <option key={manager.id} value={manager.id}>
                {manager.name}
                {manager.designation ? ` (${manager.designation})` : ""}
              </option>
            ))}
          </SelectField>
          <SelectField label="Team Lead" name="tlId" onChange={setTlId} value={tlId}>
            <option value="">- None -</option>
            {managers.map((manager) => (
              <option key={manager.id} value={manager.id}>
                {manager.name}
              </option>
            ))}
          </SelectField>
        </Row>
      </Section>

      <Section title="Employment">
        <Row>
          <Field label="Join Date" name="joinDate" type="date" required />
          <Field label="Grade" name="grade" placeholder="e.g. L3" />
        </Row>
        <Row>
          <Field label="CTC (annual)" name="ctc" type="number" placeholder="e.g. 500000" />
          <Field label="Prior Experience (years)" name="priorExperienceYears" type="number" placeholder="0 = fresher" />
        </Row>
      </Section>

      <Section title="Roles">
        <div className="flex flex-wrap gap-2">
          {roles.map((role) => (
            <button
              key={role.id}
              type="button"
              onClick={() => toggleRole(role.id)}
              className={`rounded-full border px-3 py-1.5 text-sm transition ${
                selectedRoles.includes(role.id)
                  ? "border-indigo-600 bg-indigo-600 text-white"
                  : "border-gray-300 bg-white text-gray-700 hover:border-indigo-400"
              }`}
            >
              {role.name}
            </button>
          ))}
        </div>
      </Section>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-indigo-600 px-5 py-2 font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create Employee"}
        </button>
        <Link href="/hrms/employees" className="rounded-lg border border-gray-300 px-5 py-2 font-medium text-gray-700 transition hover:bg-gray-50">
          Cancel
        </Link>
      </div>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</p>
      {children}
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>;
}

function Field({
  label,
  name,
  type = "text",
  required,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
    </div>
  );
}

function SelectField({
  label,
  name,
  children,
  onChange,
  value,
}: {
  label: string;
  name: string;
  children: React.ReactNode;
  onChange?: (value: string) => void;
  value?: string;
}) {
  const options = Array.from(Children.toArray(children)).flatMap((child) => {
    if (!isValidElement(child) || child.type !== "option") {
      return [];
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const props = child.props as any;
    const optionValue = typeof props.value === "string" ? props.value : "";
    const optionLabel = typeof props.children === "string" ? props.children : String(props.children ?? "");

    return [
      {
        disabled: Boolean(props.disabled),
        label: optionLabel,
        value: optionValue,
      },
    ];
  });

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <DropdownSelect
        ariaLabel={label}
        name={name}
        onValueChange={onChange}
        options={options}
        value={value}
      />
    </div>
  );
}
