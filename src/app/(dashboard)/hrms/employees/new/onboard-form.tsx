"use client";

import { PeopleControlButton as MnxAction } from "@/modules/people/components/people-controls";

import { Children, isValidElement, type ReactNode, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BriefcaseBusiness,
  CircleUserRound,
  Landmark,
  MailCheck,
  MapPinned,
  Send,
  ShieldCheck,
  Users,
} from "lucide-react";
import { DropdownSelect } from "@/components/ui/dropdown-select";
import { Input } from "@/components/ui/input";
import { toast } from "@/modules/notifications/client";

type Division = { id: string; name: string };
type Department = {
  id: string;
  name: string;
  code: string;
  divisions: Division[];
};
type Branch = { id: string; name: string };
type Role = { id: string; name: string };
type Manager = { id: string; name: string; designation: string | null };

function optionalString(value: FormDataEntryValue | null) {
  const text = typeof value === "string" ? value.trim() : "";
  return text || undefined;
}

function responseError(value: unknown, fallback: string) {
  if (typeof value === "string") return value;
  if (
    value &&
    typeof value === "object" &&
    "message" in value &&
    typeof value.message === "string"
  ) {
    return value.message;
  }
  return fallback;
}

function joinedAddress(
  ...values: Array<FormDataEntryValue | null>
) {
  return values
    .map(optionalString)
    .filter((value): value is string => Boolean(value))
    .join(", ");
}

function sectionCardClass(extra = "") {
  return `mnx-panel mnx-accent-edge mnx-content-wide border border-mono-border/40 bg-mono-card p-5 shadow-sm sm:p-6 ${extra}`.trim();
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

  const divisions =
    org?.departments.find((department) => department.id === deptId)
      ?.divisions ?? [];

  function toggleRole(id: string) {
    setSelectedRoles((prev) =>
      prev.includes(id)
        ? prev.filter((roleId) => roleId !== id)
        : [...prev, id],
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const fd = new FormData(e.currentTarget);
    const body = {
      firstName: optionalString(fd.get("firstName")),
      lastName: optionalString(fd.get("lastName")) ?? "",
      email: optionalString(fd.get("email")),
      employeeNumber: fd.get("employeeNumber")
        ? Number(fd.get("employeeNumber"))
        : null,
      designation: optionalString(fd.get("designation")),
      employmentType: optionalString(fd.get("employmentType")),
      branchId: optionalString(fd.get("branchId")),
      departmentId: optionalString(fd.get("departmentId")),
      divisionId: optionalString(fd.get("divisionId")),
      managerId: optionalString(fd.get("managerId")),
      tlId: optionalString(fd.get("tlId")),
      joinDate: fd.get("joinDate"),
      grade: optionalString(fd.get("grade")),
      ctc: fd.get("ctc") ? Number(fd.get("ctc")) : undefined,
      priorExperienceYears:
        fd.get("priorExperienceYears") !== ""
          ? Number(fd.get("priorExperienceYears"))
          : 0,
      roleIds: selectedRoles,
      personalEmail: optionalString(fd.get("personalEmail")),
      fatherName: optionalString(fd.get("fatherName")),
      personalPhone: optionalString(fd.get("mobileNumber")),
      dob: optionalString(fd.get("dateOfBirth")),
      gender: optionalString(fd.get("gender")),
      maritalStatus: optionalString(fd.get("maritalStatus")),
      pan: optionalString(fd.get("panNumber")),
      aadhaar: optionalString(fd.get("aadhaar")),
      bankHolderName: optionalString(fd.get("bankHolderName")),
      bankName: optionalString(fd.get("bankName")),
      bankAccount: optionalString(fd.get("bankAccountNumber")),
      ifsc: optionalString(fd.get("ifscCode")),
      accountType: optionalString(fd.get("accountType")),
      paymentMode: optionalString(fd.get("paymentMode")),
      presentAddress: joinedAddress(
        fd.get("presentAddressLine1"),
        fd.get("presentAddressLine2"),
        fd.get("presentCity"),
        fd.get("presentStateCode"),
        fd.get("presentPostalCode"),
        fd.get("presentCountry"),
      ),
      presentStateCode: optionalString(fd.get("presentStateCode")),
      permanentAddress: joinedAddress(
        fd.get("permanentAddressLine1"),
        fd.get("permanentAddressLine2"),
        fd.get("permanentCity"),
        fd.get("permanentStateCode"),
        fd.get("permanentPostalCode"),
        fd.get("permanentCountry"),
      ),
    };

    const res = await fetch("/api/hrms/invitations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(
        responseError(data.error, "Failed to create employee invitation."),
      );
      setLoading(false);
      return;
    }

    if (data.invitation?.deliveryStatus === "FAILED") {
      toast.warning(
        "Employee created, but email delivery failed. You can resend the invitation from the employee profile.",
      );
    } else {
      toast.success("Employee invitation sent.");
    }
    router.push(`/hrms/employees/${data.user.id}`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className="mnx-panel mnx-accent-edge mnx-content-wide flex flex-col gap-4 border border-mono-border/40 bg-mono-card p-5 shadow-sm sm:flex-row sm:items-center sm:p-6">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[var(--mnx-accent)]/15 text-[var(--mnx-accent-text)]">
          <MailCheck className="size-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-base font-semibold text-mono-text">
            Invite an employee
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-mono-muted">
            Create the pending employee record and send a secure, single-use
            invitation. The employee chooses their own password before login is
            enabled.
          </p>
        </div>
      </section>

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="space-y-6">
          <InfoCard
            icon={<CircleUserRound className="h-5 w-5" />}
            title="Personal Details"
            description="Basic identity and contact information for the employee record."
          >
            <FormGrid>
              <Field label="First Name" name="firstName" required />
              <Field label="Last Name" name="lastName" />
              <Field label="Work Email" name="email" type="email" required />
              <Field
                label="Designation"
                name="designation"
                placeholder="e.g. Senior Executive"
              />
              <Field
                label="Employee ID"
                name="employeeNumber"
                type="number"
                placeholder="e.g. 194"
              />
              <Field
                label="Personal Email"
                name="personalEmail"
                type="email"
                placeholder="e.g. name@gmail.com"
              />
              <Field
                label="Mobile Number"
                name="mobileNumber"
                placeholder="10-digit mobile number"
              />
              <Field
                label="Father Name"
                name="fatherName"
                placeholder="Employee's father name"
              />
              <Field label="Date of Birth" name="dateOfBirth" type="date" />
              <SelectField label="Gender" name="gender">
                <option value="">- Select -</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </SelectField>
              <SelectField label="Marital Status" name="maritalStatus">
                <option value="">- Select -</option>
                <option value="Single">Single</option>
                <option value="Married">Married</option>
                <option value="Other">Other</option>
              </SelectField>
              <Field
                label="Aadhaar"
                name="aadhaar"
                placeholder="12-digit Aadhaar number"
              />
              <Field
                label="PAN"
                name="panNumber"
                placeholder="e.g. ABCDE1234F"
              />
            </FormGrid>
          </InfoCard>

          <InfoCard
            icon={<BriefcaseBusiness className="h-5 w-5" />}
            title="Salary Details"
            description="Employment, compensation, and joining information used during onboarding."
          >
            <FormGrid>
              <Field label="Join Date" name="joinDate" type="date" required />
              <SelectField label="Employment Type" name="employmentType">
                <option value="">- Select -</option>
                <option value="Permanent">Permanent</option>
                <option value="Temporary">Temporary</option>
                <option value="Contract">Contract</option>
                <option value="Intern">Intern</option>
                <option value="Trainee">Trainee</option>
                <option value="Probation">Probation</option>
              </SelectField>
              <Field label="Grade" name="grade" placeholder="e.g. L3" />
              <Field
                label="CTC (annual)"
                name="ctc"
                type="number"
                placeholder="e.g. 500000"
              />
              <Field
                label="Prior Experience (years)"
                name="priorExperienceYears"
                type="number"
                placeholder="0 = fresher"
              />
            </FormGrid>
          </InfoCard>

          <InfoCard
            icon={<MapPinned className="h-5 w-5" />}
            title="Present Address"
            description="Current residential address used for communication and employee records."
          >
            <FormGrid>
              <Field
                label="Address Line 1"
                name="presentAddressLine1"
                placeholder="House / flat / street"
              />
              <Field
                label="Address Line 2"
                name="presentAddressLine2"
                placeholder="Area / landmark"
              />
              <Field
                label="City"
                name="presentCity"
                placeholder="e.g. Chennai"
              />
              <Field
                label="State"
                name="presentStateCode"
                placeholder="e.g. TN"
              />
              <Field
                label="Postal Code"
                name="presentPostalCode"
                placeholder="e.g. 600001"
              />
              <Field
                label="Country"
                name="presentCountry"
                placeholder="e.g. India"
              />
            </FormGrid>
          </InfoCard>
        </div>

        <div className="space-y-6">
          <InfoCard
            icon={<ShieldCheck className="h-5 w-5" />}
            title="Organisation & Roles"
            description="Placement inside the org chart and access roles for the new employee."
          >
            <div className="space-y-5">
              <FormGrid>
                <SelectField
                  label="Branch"
                  name="branchId"
                  onChange={setBranchId}
                  value={branchId}
                >
                  <option value="">- None -</option>
                  {org?.branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </SelectField>
                <SelectField
                  label="Department"
                  name="departmentId"
                  onChange={setDeptId}
                  value={deptId}
                >
                  <option value="">- None -</option>
                  {org?.departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))}
                </SelectField>
                <SelectField
                  label="Division"
                  name="divisionId"
                  onChange={setDivisionId}
                  value={divisionId}
                >
                  <option value="">- None -</option>
                  {divisions.map((division) => (
                    <option key={division.id} value={division.id}>
                      {division.name}
                    </option>
                  ))}
                </SelectField>
                <SelectField
                  label="Manager"
                  name="managerId"
                  onChange={setManagerId}
                  value={managerId}
                >
                  <option value="">- None -</option>
                  {managers.map((manager) => (
                    <option key={manager.id} value={manager.id}>
                      {manager.name}
                      {manager.designation ? ` (${manager.designation})` : ""}
                    </option>
                  ))}
                </SelectField>
                <SelectField
                  label="Team Lead"
                  name="tlId"
                  onChange={setTlId}
                  value={tlId}
                >
                  <option value="">- None -</option>
                  {managers.map((manager) => (
                    <option key={manager.id} value={manager.id}>
                      {manager.name}
                    </option>
                  ))}
                </SelectField>
              </FormGrid>

              <div className="space-y-3">
                <p className="text-sm font-medium text-mono-text">Roles</p>
                <div className="flex flex-wrap gap-2">
                  {roles.map((role) => (
                    <MnxAction
                      key={role.id}
                      type="button"
                      onClick={() => toggleRole(role.id)}
                      className={`rounded-full border px-3 py-1.5 text-sm transition ${
                        selectedRoles.includes(role.id)
                          ? "border-[var(--mnx-accent)] bg-[var(--mnx-accent)] text-[var(--mnx-text)]"
                          : "border-mono-border/50 bg-mono-card text-mono-text hover:border-[var(--mnx-accent)]/50"
                      }`}
                    >
                      {role.name}
                    </MnxAction>
                  ))}
                </div>
              </div>
            </div>
          </InfoCard>

          <InfoCard
            icon={<Landmark className="h-5 w-5" />}
            title="Bank Details"
            description="Optional payout details for payroll and finance processing."
          >
            <FormGrid>
              <Field
                label="Account Holder Name"
                name="bankHolderName"
                placeholder="As per bank account"
              />
              <Field
                label="Bank Name"
                name="bankName"
                placeholder="e.g. HDFC Bank"
              />
              <Field
                label="Account Number"
                name="bankAccountNumber"
                placeholder="Enter account number"
              />
              <Field
                label="IFSC Code"
                name="ifscCode"
                placeholder="e.g. HDFC0001234"
              />
              <SelectField label="Account Type" name="accountType">
                <option value="">- Select -</option>
                <option value="Savings">Savings</option>
                <option value="Current">Current</option>
                <option value="Salary">Salary</option>
              </SelectField>
              <SelectField label="Payment Mode" name="paymentMode">
                <option value="">- Select -</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Cheque">Cheque</option>
                <option value="Cash">Cash</option>
              </SelectField>
              <Field
                label="Bank State Code"
                name="bankStateCode"
                placeholder="e.g. TN"
              />
            </FormGrid>
          </InfoCard>

          <InfoCard
            icon={<Users className="h-5 w-5" />}
            title="Permanent Address"
            description="Permanent address information for statutory and HR documentation."
          >
            <FormGrid>
              <Field
                label="Address Line 1"
                name="permanentAddressLine1"
                placeholder="House / flat / street"
              />
              <Field
                label="Address Line 2"
                name="permanentAddressLine2"
                placeholder="Area / landmark"
              />
              <Field
                label="City"
                name="permanentCity"
                placeholder="e.g. Madurai"
              />
              <Field
                label="State"
                name="permanentStateCode"
                placeholder="e.g. TN"
              />
              <Field
                label="Postal Code"
                name="permanentPostalCode"
                placeholder="e.g. 625001"
              />
              <Field
                label="Country"
                name="permanentCountry"
                placeholder="e.g. India"
              />
            </FormGrid>
          </InfoCard>

          {error ? (
            <p className="rounded-2xl border border-[var(--mnx-danger)] bg-[var(--mnx-danger-bg)] px-4 py-3 text-sm text-[var(--mnx-danger)]">
              {error}
            </p>
          ) : null}
        </div>
      </div>

      <div
        className={sectionCardClass(
          "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
        )}
      >
        <div>
          <h2 className="text-base font-semibold text-mono-text">
            Send employee invitation
          </h2>
          <p className="mt-1 text-sm text-mono-muted">
            The employee will appear immediately with an Invited status and can
            activate login from the email link.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <MnxAction
            type="submit"
            disabled={loading}
            className="rounded-lg bg-[var(--mnx-accent)] px-5 py-2 font-medium text-[var(--mnx-text)] transition hover:bg-[var(--mnx-accent)] disabled:opacity-50"
          >
            <Send className="size-4" aria-hidden="true" />
            {loading ? "Sending invitation…" : "Create and send invitation"}
          </MnxAction>
          <Link
            href="/hrms/employees"
            className="rounded-lg border border-mono-border/50 bg-mono-card px-5 py-2 font-medium text-mono-text transition hover:bg-mono-soft"
          >
            Cancel
          </Link>
        </div>
      </div>
    </form>
  );
}

function InfoCard({
  icon,
  title,
  description,
  children,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className={sectionCardClass()}>
      <div className="flex items-start gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--mnx-accent)]/10 text-[var(--mnx-accent)]">
          {icon}
        </span>
        <div>
          <h2 className="mnx-title-2 text-mono-text">{title}</h2>
          {description ? (
            <p className="mt-1 text-sm text-mono-muted">{description}</p>
          ) : null}
        </div>
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function FormGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">{children}</div>
  );
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
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-mono-text">
        {label}
      </label>
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
  children: ReactNode;
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
    const optionLabel =
      typeof props.children === "string"
        ? props.children
        : String(props.children ?? "");

    return [
      {
        disabled: Boolean(props.disabled),
        label: optionLabel,
        value: optionValue,
      },
    ];
  });

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-mono-text">
        {label}
      </label>
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
