"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { BriefcaseBusiness, CircleUserRound, Landmark, IndianRupee } from "lucide-react";
import { useCan } from "@/lib/caps-context";
import { toDisplayTitleCase } from "@/lib/text-case";
import { DropdownSelect } from "@/components/ui/dropdown-select";
import { Input } from "@/components/ui/input";

type PayrollMeta = {
  employeeNumber?: string;
  monthlyGross?: number | null;
  breakup?: Record<string, number>;
  bankDetails?: {
    holderName?: string | null;
    bankName?: string | null;
    accountNumber?: string | null;
    ifscCode?: string | null;
    accountType?: string | null;
    paymentMode?: string | null;
    stateCode?: string | null;
  };
  personalDetails?: {
    gender?: string | null;
    personalEmail?: string | null;
    fatherName?: string | null;
    mobileNumber?: string | null;
    dateOfBirth?: string | null;
    panNumber?: string | null;
    maritalStatus?: string | null;
    aadhaar?: string | null;
  };
  workLocation?: {
    name?: string | null;
    addressLine1?: string | null;
    addressLine2?: string | null;
    city?: string | null;
    stateCode?: string | null;
    country?: string | null;
    postalCode?: string | null;
  };
  personalAddress?: {
    addressLine1?: string | null;
    addressLine2?: string | null;
    city?: string | null;
    stateCode?: string | null;
    postalCode?: string | null;
    country?: string | null;
  };
  latestSalaryRevision?: {
    ["Revised Gross Amount (per annum)"]?: string | number | null;
    ["Revised CTC (per annum)"]?: string | number | null;
    ["Basic"]?: string | number | null;
    ["House Rent Allowance"]?: string | number | null;
    ["Conveyance Allowance"]?: string | number | null;
    ["Transport Allowance"]?: string | number | null;
    ["Travelling Allowance"]?: string | number | null;
    ["Fixed Allowance"]?: string | number | null;
    ["Stipend"]?: string | number | null;
    ["Effective From"]?: string | null;
  } | null;
  salaryDetails?: {
    ["Gross Amount (per annum)_1"]?: string | number | null;
    ["CTC Per Annum"]?: string | number | null;
    ["Basic"]?: string | number | null;
    ["House Rent Allowance"]?: string | number | null;
    ["Conveyance Allowance"]?: string | number | null;
    ["Transport Allowance"]?: string | number | null;
    ["Travelling Allowance"]?: string | number | null;
    ["Fixed Allowance"]?: string | number | null;
    ["Stipend"]?: string | number | null;
  } | null;
  statutory?: {
    ["UAN Number"]?: string | null;
    parsed?: {
      uanNumber?: string | null;
    };
  } | null;
  rawSheets?: {
    employee?: {
      ["First Name"]?: string | null;
      ["Last Name"]?: string | null;
      ["Employee Status"]?: string | null;
      ["Date of Joining"]?: string | null;
      ["Personal AddressLine1"]?: string | null;
      ["Personal AddressLine2"]?: string | null;
      ["Date of Birth"]?: string | null;
    } | null;
  };
};

type User = {
  id: string;
  name: string;
  email: string;
  designation: string | null;
  active: boolean;
  branch: { id: string; name: string } | null;
  department: { id: string; name: string } | null;
  division: { id: string; name: string } | null;
  manager: { id: string; name: string; email: string } | null;
  tl: { id: string; name: string; email: string } | null;
  reports: { id: string; name: string; designation: string | null }[];
  tlReports: { id: string; name: string; designation: string | null }[];
  roles: { role: { id: string; name: string } }[];
  employmentRecord: {
    joinDate: string;
    grade: string | null;
    ctc: number | null;
    priorExperienceYears: number | null;
    payrollMeta?: PayrollMeta | null;
  } | null;
};

type OrgData = {
  branches: { id: string; name: string }[];
  departments: { id: string; name: string; divisions: { id: string; name: string }[] }[];
} | null;

type StubUser = { id: string; name: string; email: string };

function asCurrency(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "-";
  return `Rs${Number(value).toLocaleString("en-IN")}`;
}

function asDate(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN");
}

function asNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function formatAddress(address?: {
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  stateCode?: string | null;
  postalCode?: string | null;
  country?: string | null;
}) {
  if (!address) return "-";
  const parts = [
    toDisplayTitleCase(address.addressLine1),
    toDisplayTitleCase(address.addressLine2),
    toDisplayTitleCase(address.city),
    address.stateCode,
    address.postalCode,
    toDisplayTitleCase(address.country),
  ].filter((part) => part && part !== "-" && String(part).trim());
  return parts.length > 0 ? parts.join(", ") : "-";
}

function extractFirstName(user: User, meta: PayrollMeta | null) {
  return toDisplayTitleCase(meta?.rawSheets?.employee?.["First Name"] ?? user.name.split(" ")[0] ?? "-");
}

function extractLastName(meta: PayrollMeta | null) {
  return toDisplayTitleCase(meta?.rawSheets?.employee?.["Last Name"] ?? "-");
}

function salaryValue(meta: PayrollMeta | null, key: string, fallbackKey?: string) {
  const fromBreakup = meta?.breakup?.[key];
  if (typeof fromBreakup === "number") return fromBreakup;
  if (fallbackKey) {
    const fromBreakupFallback = meta?.breakup?.[fallbackKey];
    if (typeof fromBreakupFallback === "number") return fromBreakupFallback;
  }

  const latest = meta?.latestSalaryRevision;
  if (latest && key in latest) {
    return asNumber((latest as Record<string, unknown>)[key]);
  }

  if (fallbackKey && latest && fallbackKey in latest) {
    return asNumber((latest as Record<string, unknown>)[fallbackKey]);
  }

  const details = meta?.salaryDetails;
  if (details && key in details) {
    return asNumber((details as Record<string, unknown>)[key]);
  }

  if (fallbackKey && details && fallbackKey in details) {
    return asNumber((details as Record<string, unknown>)[fallbackKey]);
  }

  return null;
}

export function EmployeeProfile({
  user,
  roles,
  org,
  currentUserId,
  allUsers,
}: {
  user: User;
  roles: { id: string; name: string }[];
  org: OrgData;
  currentUserId: string;
  allUsers: StubUser[];
}) {
  const router = useRouter();
  const canEdit = useCan("hrms.employee.edit");
  const canEditRoles = useCan("admin.roles.manage");
  const canDeactivate = useCan("hrms.employee.deactivate") && user.id !== currentUserId;
  const canResetPassword = useCan("admin.users.manage");

  const [saving, setSaving] = useState(false);
  const [editDetails, setEditDetails] = useState(false);
  const [editRoles, setEditRoles] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<string[]>(user.roles.map((r) => r.role.id));
  const [newPassword, setNewPassword] = useState("");
  const [showPwReset, setShowPwReset] = useState(false);

  const [form, setForm] = useState({
    name: user.name,
    designation: user.designation ?? "",
    branchId: user.branch?.id ?? "",
    departmentId: user.department?.id ?? "",
    divisionId: user.division?.id ?? "",
    managerId: user.manager?.id ?? "",
    tlId: user.tl?.id ?? "",
    joinDate: user.employmentRecord?.joinDate
      ? new Date(user.employmentRecord.joinDate).toISOString().slice(0, 10)
      : "",
    grade: user.employmentRecord?.grade ?? "",
    ctc: user.employmentRecord?.ctc?.toString() ?? "",
    priorExperienceYears: user.employmentRecord?.priorExperienceYears?.toString() ?? "0",
  });

  function set(field: keyof typeof form, value: string) {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "departmentId") next.divisionId = "";
      return next;
    });
  }

  const activeDivisions =
    org?.departments.find((department) => department.id === form.departmentId)?.divisions ?? [];
  const otherUsers = allUsers.filter((item) => item.id !== user.id);
  const payrollMeta = (user.employmentRecord?.payrollMeta ?? null) as PayrollMeta | null;

  async function patch(data: object) {
    setSaving(true);
    await fetch(`/api/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setSaving(false);
    router.refresh();
  }

  async function saveDetails() {
    await patch({
      name: form.name || undefined,
      designation: form.designation || undefined,
      branchId: form.branchId || null,
      departmentId: form.departmentId || null,
      divisionId: form.divisionId || null,
      managerId: form.managerId || null,
      tlId: form.tlId || null,
      joinDate: form.joinDate || undefined,
      grade: form.grade || undefined,
      ctc: form.ctc ? Number(form.ctc) : null,
      priorExperienceYears: form.priorExperienceYears !== "" ? Number(form.priorExperienceYears) : 0,
    });
    setEditDetails(false);
  }

  async function saveRoles() {
    setSaving(true);
    await fetch(`/api/users/${user.id}/roles`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roleIds: selectedRoles }),
    });
    setSaving(false);
    setEditRoles(false);
    router.refresh();
  }

  async function resetPassword() {
    if (newPassword.length < 8) return;
    setSaving(true);
    await fetch(`/api/users/${user.id}/password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: newPassword }),
    });
    setSaving(false);
    setNewPassword("");
    setShowPwReset(false);
  }

  async function toggleActive() {
    if (!confirm(`${user.active ? "Deactivate" : "Activate"} ${user.name}?`)) return;
    await patch({ active: !user.active });
  }

  const salaryBreakup = [
    { label: "Gross (Annual)", value: salaryValue(payrollMeta, "Revised Gross Amount (per annum)", "Gross Amount (per annum)_1") },
    { label: "Gross (Monthly)", value: payrollMeta?.monthlyGross ?? null },
    { label: "CTC (Annual)", value: user.employmentRecord?.ctc ?? salaryValue(payrollMeta, "Revised CTC (per annum)", "CTC Per Annum") },
    { label: "Basic", value: salaryValue(payrollMeta, "Basic") },
    { label: "HRA", value: salaryValue(payrollMeta, "House Rent Allowance", "hra") },
    { label: "Conveyance", value: salaryValue(payrollMeta, "Conveyance Allowance") },
    { label: "Transport", value: salaryValue(payrollMeta, "Transport Allowance") },
    { label: "Travelling", value: salaryValue(payrollMeta, "Travelling Allowance") },
    { label: "Fixed Allowance", value: salaryValue(payrollMeta, "Fixed Allowance", "specialAllowance") },
    { label: "Stipend", value: salaryValue(payrollMeta, "Stipend", "monthlyIncentive") },
  ];

  return (
    <div className="space-y-6">
      {canEdit && !editDetails ? (
        <div className="flex justify-end">
          <button
            onClick={() => setEditDetails(true)}
            className="rounded-lg border border-[#00cec4]/30 bg-[#00cec4] px-3 py-1.5 text-xs font-medium text-white transition hover:bg-[#00b5ad]"
          >
            Edit Details
          </button>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <InfoCard icon={<CircleUserRound className="h-5 w-5" />} title="Personal Details">
          {editDetails ? (
            <EditableIdentitySection form={form} set={set} saveDetails={saveDetails} saving={saving} setEditDetails={setEditDetails} />
          ) : (
            <KeyValueGrid
              items={[
                { label: "First Name", value: extractFirstName(user, payrollMeta) },
                { label: "Last Name", value: extractLastName(payrollMeta) },
                { label: "Father Name", value: toDisplayTitleCase(payrollMeta?.personalDetails?.fatherName) },
                { label: "DOB", value: asDate(payrollMeta?.personalDetails?.dateOfBirth ?? payrollMeta?.rawSheets?.employee?.["Date of Birth"]) },
                { label: "Gender", value: toDisplayTitleCase(payrollMeta?.personalDetails?.gender) },
                { label: "Marital Status", value: toDisplayTitleCase(payrollMeta?.personalDetails?.maritalStatus) },
                { label: "Personal Email", value: payrollMeta?.personalDetails?.personalEmail ?? "-" },
                { label: "Personal Phone", value: payrollMeta?.personalDetails?.mobileNumber ?? "-" },
                { label: "Aadhaar", value: payrollMeta?.personalDetails?.aadhaar ?? "-" },
                { label: "PAN", value: payrollMeta?.personalDetails?.panNumber ?? "-" },
                { label: "UAN", value: payrollMeta?.statutory?.parsed?.uanNumber ?? payrollMeta?.statutory?.["UAN Number"] ?? "-" },
              ]}
            />
          )}
        </InfoCard>

        <InfoCard icon={<BriefcaseBusiness className="h-5 w-5" />} title="Employment">
          {editDetails ? (
            <EditableEmploymentSection
              form={form}
              set={set}
              org={org}
              activeDivisions={activeDivisions}
              otherUsers={otherUsers}
            />
          ) : (
            <KeyValueGrid
              items={[
                { label: "Joining Date", value: asDate(user.employmentRecord?.joinDate ?? payrollMeta?.rawSheets?.employee?.["Date of Joining"]) },
                { label: "Employment Type", value: "-" },
                { label: "Employee Status", value: user.active ? "Active" : "Inactive" },
                { label: "Source of Hire", value: "-" },
                { label: "Designation", value: toDisplayTitleCase(user.designation) },
                { label: "Reporting TL / Manager", value: toDisplayTitleCase(user.manager?.name ?? user.tl?.name) },
                { label: "Branch", value: toDisplayTitleCase(user.branch?.name) },
                { label: "Department", value: toDisplayTitleCase(user.department?.name) },
                { label: "Division", value: toDisplayTitleCase(user.division?.name) },
                { label: "Present Address", value: formatAddress(payrollMeta?.personalAddress), span: 2 },
                { label: "Permanent Address", value: formatAddress(payrollMeta?.workLocation), span: 2 },
              ]}
            />
          )}
        </InfoCard>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <InfoCard icon={<IndianRupee className="h-5 w-5" />} title="Salary Details">
          <KeyValueGrid
            items={salaryBreakup.map((item) => ({
              label: item.label,
              value: asCurrency(item.value),
              accent: ["Gross (Annual)", "Gross (Monthly)", "CTC (Annual)"].includes(item.label),
            }))}
          />
        </InfoCard>

        <div className="space-y-6">
          <InfoCard icon={<Landmark className="h-5 w-5" />} title="Bank Details">
            <KeyValueGrid
              items={[
                { label: "Bank", value: toDisplayTitleCase(payrollMeta?.bankDetails?.bankName) },
                { label: "Account #", value: payrollMeta?.bankDetails?.accountNumber ?? "-" },
                { label: "IFSC", value: payrollMeta?.bankDetails?.ifscCode ?? "-" },
                { label: "Account Type", value: toDisplayTitleCase(payrollMeta?.bankDetails?.accountType) },
                { label: "State Code", value: payrollMeta?.bankDetails?.stateCode ?? payrollMeta?.workLocation?.stateCode ?? "-" },
                { label: "Payment Mode", value: toDisplayTitleCase(payrollMeta?.bankDetails?.paymentMode) },
              ]}
            />
          </InfoCard>

          <Card title="Roles">
            {canEditRoles && editRoles ? (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {roles.map((role) => (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() =>
                        setSelectedRoles((prev) =>
                          prev.includes(role.id) ? prev.filter((id) => id !== role.id) : [...prev, role.id],
                        )
                      }
                      className={`rounded-full border px-3 py-1 text-xs transition ${
                        selectedRoles.includes(role.id)
                          ? "border-indigo-600 bg-indigo-600 text-white"
                          : "border-outline-variant/50 bg-surface text-on-surface"
                      }`}
                    >
                      {role.name}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={saveRoles} disabled={saving} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs text-white">
                    Save
                  </button>
                  <button onClick={() => setEditRoles(false)} className="rounded-lg border px-3 py-1.5 text-xs">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-1">
                  {user.roles.map((role) => (
                    <span key={role.role.id} className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-200">
                      {role.role.name}
                    </span>
                  ))}
                  {user.roles.length === 0 && <span className="text-sm text-on-surface-variant">No roles</span>}
                </div>
                {canEditRoles && (
                  <button onClick={() => setEditRoles(true)} className="text-xs text-indigo-600 hover:underline">Edit roles</button>
                )}
              </div>
            )}
          </Card>

          {(canDeactivate || canResetPassword) && (
            <Card title="Actions">
              <div className="space-y-2">
                {canDeactivate && (
                  <button
                    onClick={toggleActive}
                    disabled={saving}
                    className={`w-full rounded-lg border py-2 text-sm transition ${
                      user.active
                        ? "border-red-300 text-red-600 hover:bg-red-50"
                        : "border-green-300 text-green-600 hover:bg-green-50"
                    }`}
                  >
                    {user.active ? "Deactivate" : "Reactivate"} Employee
                  </button>
                )}

                {canResetPassword && (
                  showPwReset ? (
                    <div className="space-y-2">
                      <Input
                        type="password"
                        value={newPassword}
                        onChange={(event) => setNewPassword(event.target.value)}
                        placeholder="New password (min 8)"
                        className="w-full"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={resetPassword}
                          disabled={saving || newPassword.length < 8}
                          className="flex-1 rounded-lg bg-gray-800 py-1.5 text-sm text-white disabled:opacity-50"
                        >
                          Reset
                        </button>
                        <button onClick={() => setShowPwReset(false)} className="flex-1 rounded-lg border py-1.5 text-sm">
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowPwReset(true)}
                      className="w-full rounded-lg border border-outline-variant/50 bg-surface py-2 text-sm text-on-surface transition hover:bg-surface-container-low"
                    >
                      Reset Password
                    </button>
                  )
                )}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function EditableIdentitySection({
  form,
  set,
  saveDetails,
  saving,
  setEditDetails,
}: {
  form: {
    name: string;
    designation: string;
    joinDate: string;
    grade: string;
    ctc: string;
    priorExperienceYears: string;
  };
  set: (field: "name" | "designation" | "joinDate" | "grade" | "ctc" | "priorExperienceYears", value: string) => void;
  saveDetails: () => Promise<void>;
  saving: boolean;
  setEditDetails: (value: boolean) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <Field label="Name">
        <Input value={form.name} onChange={(event) => set("name", event.target.value)} className="w-full" />
      </Field>
      <Field label="Designation">
        <Input value={form.designation} onChange={(event) => set("designation", event.target.value)} className="w-full" />
      </Field>
      <Field label="Join Date">
        <Input type="date" value={form.joinDate} onChange={(event) => set("joinDate", event.target.value)} className="w-full" />
      </Field>
      <Field label="Grade">
        <Input value={form.grade} onChange={(event) => set("grade", event.target.value)} className="w-full" />
      </Field>
      <Field label="CTC (Rs)">
        <Input type="number" value={form.ctc} onChange={(event) => set("ctc", event.target.value)} className="w-full" />
      </Field>
      <Field label="Prior Experience (years)">
        <Input type="number" min="0" value={form.priorExperienceYears} onChange={(event) => set("priorExperienceYears", event.target.value)} className="w-full" />
      </Field>
      <div className="md:col-span-2 flex gap-2 pt-1">
        <button onClick={saveDetails} disabled={saving} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs text-white disabled:opacity-50">
          Save
        </button>
        <button onClick={() => setEditDetails(false)} className="rounded-lg border px-3 py-1.5 text-xs">
          Cancel
        </button>
      </div>
    </div>
  );
}

function EditableEmploymentSection({
  form,
  set,
  org,
  activeDivisions,
  otherUsers,
}: {
  form: {
    branchId: string;
    departmentId: string;
    divisionId: string;
    managerId: string;
    tlId: string;
  };
  set: (field: "branchId" | "departmentId" | "divisionId" | "managerId" | "tlId", value: string) => void;
  org: OrgData;
  activeDivisions: { id: string; name: string }[];
  otherUsers: StubUser[];
}) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <Field label="Branch">
        <Select value={form.branchId} onChange={(value) => set("branchId", value)} options={org?.branches ?? []} placeholder="No branch" />
      </Field>
      <Field label="Department">
        <Select value={form.departmentId} onChange={(value) => set("departmentId", value)} options={org?.departments ?? []} placeholder="No department" />
      </Field>
      <Field label="Division">
        <Select value={form.divisionId} onChange={(value) => set("divisionId", value)} options={activeDivisions} placeholder="No division" disabled={!form.departmentId} />
      </Field>
      <Field label="Manager">
        <Select value={form.managerId} onChange={(value) => set("managerId", value)} options={otherUsers} placeholder="No manager" />
      </Field>
      <Field label="Team Lead">
        <Select value={form.tlId} onChange={(value) => set("tlId", value)} options={otherUsers} placeholder="No TL" />
      </Field>
    </div>
  );
}

function InfoCard({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-[28px] border border-outline-variant/40 bg-surface p-6 shadow-[0_1px_3px_rgba(15,23,42,0.08)]">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="text-on-surface">{icon}</div>
          <h2 className="ds-h2 text-on-surface">{title}</h2>
        </div>
      </div>
      {children}
    </div>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-[28px] border border-outline-variant/40 bg-surface p-6 shadow-[0_1px_3px_rgba(15,23,42,0.08)]">
      <h2 className="ds-h2 mb-4 text-on-surface">{title}</h2>
      {children}
    </div>
  );
}

function KeyValueGrid({
  items,
}: {
  items: Array<{ label: string; value: ReactNode; span?: 1 | 2; accent?: boolean }>;
}) {
  return (
    <div className="grid grid-cols-1 gap-x-10 gap-y-4 md:grid-cols-2">
      {items.map((item) => (
        <div key={item.label} className={item.span === 2 ? "md:col-span-2" : undefined}>
          <div className="text-[13px] font-medium text-on-surface-variant">{item.label}</div>
          <div className={`mt-1 text-[15px] ${item.accent ? "font-semibold text-on-surface" : "text-on-surface-variant"}`}>
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-on-surface-variant">{label}</label>
      {children}
    </div>
  );
}

function Select({
  value,
  onChange,
  options,
  placeholder,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { id: string; name: string }[];
  placeholder: string;
  disabled?: boolean;
}) {
  return (
    <DropdownSelect
      ariaLabel={placeholder}
      disabled={disabled}
      onValueChange={onChange}
      options={[
        { value: "", label: placeholder },
        ...options.map((option) => ({ value: option.id, label: option.name })),
      ]}
      triggerClassName="w-full px-2 py-1.5"
      value={value}
    />
  );
}
