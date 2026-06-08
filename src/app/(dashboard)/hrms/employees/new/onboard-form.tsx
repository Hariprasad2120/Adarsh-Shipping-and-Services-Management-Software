"use client";

import { Children, isValidElement, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DropdownSelect } from "@/components/ui/dropdown-select";
import { Input } from "@/components/ui/input";

type Division = { id: string; name: string };
type Department = { id: string; name: string; code: string; divisions: Division[] };
type Branch = { id: string; name: string };
type Role = { id: string; name: string };
type Manager = { id: string; name: string; designation: string | null };

function optionalString(value: FormDataEntryValue | null) {
  const text = typeof value === "string" ? value.trim() : "";
  return text || undefined;
}

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
      designation: optionalString(fd.get("designation")),
      branchId: optionalString(fd.get("branchId")),
      departmentId: optionalString(fd.get("departmentId")),
      divisionId: optionalString(fd.get("divisionId")),
      managerId: optionalString(fd.get("managerId")),
      tlId: optionalString(fd.get("tlId")),
      joinDate: fd.get("joinDate"),
      grade: optionalString(fd.get("grade")),
      ctc: fd.get("ctc") ? Number(fd.get("ctc")) : undefined,
      priorExperienceYears: fd.get("priorExperienceYears") !== "" ? Number(fd.get("priorExperienceYears")) : 0,
      roleIds: selectedRoles,
      payrollMeta: {
        employeeNumber: optionalString(fd.get("employeeNumber")),
        personalDetails: {
          personalEmail: optionalString(fd.get("personalEmail")),
          fatherName: optionalString(fd.get("fatherName")),
          mobileNumber: optionalString(fd.get("mobileNumber")),
          dateOfBirth: optionalString(fd.get("dateOfBirth")),
          gender: optionalString(fd.get("gender")),
          maritalStatus: optionalString(fd.get("maritalStatus")),
          panNumber: optionalString(fd.get("panNumber")),
          aadhaar: optionalString(fd.get("aadhaar")),
        },
        personalAddress: {
          addressLine1: optionalString(fd.get("presentAddressLine1")),
          addressLine2: optionalString(fd.get("presentAddressLine2")),
          city: optionalString(fd.get("presentCity")),
          stateCode: optionalString(fd.get("presentStateCode")),
          postalCode: optionalString(fd.get("presentPostalCode")),
          country: optionalString(fd.get("presentCountry")),
        },
        workLocation: {
          addressLine1: optionalString(fd.get("permanentAddressLine1")),
          addressLine2: optionalString(fd.get("permanentAddressLine2")),
          city: optionalString(fd.get("permanentCity")),
          stateCode: optionalString(fd.get("permanentStateCode")),
          postalCode: optionalString(fd.get("permanentPostalCode")),
          country: optionalString(fd.get("permanentCountry")),
        },
      },
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-[28px] border border-outline-variant/40 bg-surface p-6 text-on-surface shadow-sm">
      <Section title="Personal Details">
        <Row>
          <Field label="Full Name" name="name" required />
          <Field label="Work Email" name="email" type="email" required />
        </Row>
        <Row>
          <Field label="Password (temporary)" name="password" type="password" required placeholder="Min 8 chars" />
          <Field label="Designation" name="designation" placeholder="e.g. Senior Executive" />
        </Row>
        <Row>
          <Field label="Employee ID" name="employeeNumber" placeholder="e.g. EMP-1024" />
          <Field label="Personal Email" name="personalEmail" type="email" placeholder="e.g. name@gmail.com" />
        </Row>
        <Row>
          <Field label="Mobile Number" name="mobileNumber" placeholder="10-digit mobile number" />
          <Field label="Father Name" name="fatherName" placeholder="Employee's father name" />
        </Row>
        <Row>
          <Field label="Date of Birth" name="dateOfBirth" type="date" />
          <SelectField label="Gender" name="gender">
            <option value="">- Select -</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </SelectField>
        </Row>
        <Row>
          <SelectField label="Marital Status" name="maritalStatus">
            <option value="">- Select -</option>
            <option value="Single">Single</option>
            <option value="Married">Married</option>
            <option value="Other">Other</option>
          </SelectField>
          <Field label="Aadhaar" name="aadhaar" placeholder="12-digit Aadhaar number" />
        </Row>
        <Row>
          <Field label="PAN" name="panNumber" placeholder="e.g. ABCDE1234F" />
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

      <Section title="Present Address">
        <Row>
          <Field label="Address Line 1" name="presentAddressLine1" placeholder="House / flat / street" />
          <Field label="Address Line 2" name="presentAddressLine2" placeholder="Area / landmark" />
        </Row>
        <Row>
          <Field label="City" name="presentCity" placeholder="e.g. Chennai" />
          <Field label="State" name="presentStateCode" placeholder="e.g. TN" />
        </Row>
        <Row>
          <Field label="Postal Code" name="presentPostalCode" placeholder="e.g. 600001" />
          <Field label="Country" name="presentCountry" placeholder="e.g. India" />
        </Row>
      </Section>

      <Section title="Permanent Address">
        <Row>
          <Field label="Address Line 1" name="permanentAddressLine1" placeholder="House / flat / street" />
          <Field label="Address Line 2" name="permanentAddressLine2" placeholder="Area / landmark" />
        </Row>
        <Row>
          <Field label="City" name="permanentCity" placeholder="e.g. Madurai" />
          <Field label="State" name="permanentStateCode" placeholder="e.g. TN" />
        </Row>
        <Row>
          <Field label="Postal Code" name="permanentPostalCode" placeholder="e.g. 625001" />
          <Field label="Country" name="permanentCountry" placeholder="e.g. India" />
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
                  ? "border-[#00cec4] bg-[#00cec4] text-white"
                  : "border-gray-300 bg-white text-gray-700 hover:border-[#00cec4]/50"
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
          className="rounded-lg bg-[#00cec4] px-5 py-2 font-medium text-white transition hover:bg-[#00b5ad] disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create Employee"}
        </button>
        <Link href="/hrms/employees" className="rounded-lg border border-outline-variant/50 bg-surface px-5 py-2 font-medium text-on-surface transition hover:bg-surface-container-low">
          Cancel
        </Link>
      </div>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">{title}</p>
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
      <label className="block text-sm font-medium text-on-surface">{label}</label>
      <Input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
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
      <label className="block text-sm font-medium text-on-surface">{label}</label>
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
