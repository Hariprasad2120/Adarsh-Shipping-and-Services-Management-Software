"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCan } from "@/lib/caps-context";
import { DropdownSelect } from "@/components/ui/dropdown-select";

type User = {
  id: string; name: string; email: string; designation: string | null; active: boolean;
  branch: { id: string; name: string } | null;
  department: { id: string; name: string } | null;
  division: { id: string; name: string } | null;
  manager: { id: string; name: string; email: string } | null;
  tl: { id: string; name: string; email: string } | null;
  reports: { id: string; name: string; designation: string | null }[];
  tlReports: { id: string; name: string; designation: string | null }[];
  roles: { role: { id: string; name: string } }[];
  employmentRecord: { joinDate: string; grade: string | null; ctc: number | null; priorExperienceYears: number | null } | null;
};

type OrgData = {
  branches: { id: string; name: string }[];
  departments: { id: string; name: string; divisions: { id: string; name: string }[] }[];
} | null;

type StubUser = { id: string; name: string; email: string };

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
      // clear division when department changes
      if (field === "departmentId") next.divisionId = "";
      return next;
    });
  }

  const activeDivisions =
    org?.departments.find((d) => d.id === form.departmentId)?.divisions ?? [];

  const otherUsers = allUsers.filter((u) => u.id !== user.id);

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

  const joinDateDisplay = user.employmentRecord?.joinDate
    ? new Date(user.employmentRecord.joinDate).toLocaleDateString("en-IN")
    : "—";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left col — info / edit */}
      <div className="lg:col-span-2 space-y-4">

        {/* Personal & Employment */}
        <Card
          title="Personal & Employment"
          action={canEdit && !editDetails ? (
            <button onClick={() => setEditDetails(true)} className="text-xs text-indigo-600 hover:underline">Edit</button>
          ) : undefined}
        >
          {editDetails ? (
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <Field label="Name">
                <input value={form.name} onChange={(e) => set("name", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm" placeholder="Full name" />
              </Field>
              <Field label="Designation">
                <input value={form.designation} onChange={(e) => set("designation", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm" placeholder="e.g. Senior Executive" />
              </Field>
              <Field label="Join Date">
                <input type="date" value={form.joinDate} onChange={(e) => set("joinDate", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
              </Field>
              <Field label="Grade">
                <input value={form.grade} onChange={(e) => set("grade", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm" placeholder="e.g. L3" />
              </Field>
              <Field label="CTC (₹)">
                <input type="number" value={form.ctc} onChange={(e) => set("ctc", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm" placeholder="Annual CTC" />
              </Field>
              <Field label="Prior Experience (years)">
                <input type="number" min="0" value={form.priorExperienceYears} onChange={(e) => set("priorExperienceYears", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm" placeholder="0 = fresher" />
              </Field>
              <div className="col-span-2 flex gap-2 pt-1">
                <button onClick={saveDetails} disabled={saving}
                  className="text-xs px-3 py-1.5 bg-indigo-600 text-white rounded-lg disabled:opacity-50">
                  Save
                </button>
                <button onClick={() => setEditDetails(false)}
                  className="text-xs px-3 py-1.5 border rounded-lg">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <Dt label="Name">{user.name}</Dt>
              <Dt label="Email">{user.email}</Dt>
              <Dt label="Designation">{user.designation ?? "—"}</Dt>
              <Dt label="Join Date">{joinDateDisplay}</Dt>
              <Dt label="Grade">{user.employmentRecord?.grade ?? "—"}</Dt>
              <Dt label="CTC">
                {user.employmentRecord?.ctc
                  ? `₹${Number(user.employmentRecord.ctc).toLocaleString("en-IN")}`
                  : "—"}
              </Dt>
              <Dt label="Status">
                <span className={`font-medium ${user.active ? "text-green-600" : "text-red-500"}`}>
                  {user.active ? "Active" : "Inactive"}
                </span>
              </Dt>
            </dl>
          )}
        </Card>

        {/* Organisation Placement */}
        <Card title="Organisation Placement">
          {editDetails ? (
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <Field label="Branch">
                <Select value={form.branchId} onChange={(v) => set("branchId", v)}
                  options={org?.branches ?? []} placeholder="No branch" />
              </Field>
              <Field label="Department">
                <Select value={form.departmentId} onChange={(v) => set("departmentId", v)}
                  options={org?.departments ?? []} placeholder="No department" />
              </Field>
              <Field label="Division">
                <Select value={form.divisionId} onChange={(v) => set("divisionId", v)}
                  options={activeDivisions} placeholder="No division"
                  disabled={!form.departmentId} />
              </Field>
            </div>
          ) : (
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <Dt label="Branch">{user.branch?.name ?? "—"}</Dt>
              <Dt label="Department">{user.department?.name ?? "—"}</Dt>
              <Dt label="Division">{user.division?.name ?? "—"}</Dt>
            </dl>
          )}
        </Card>

        {/* Hierarchy */}
        <Card title="Hierarchy">
          {editDetails ? (
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <Field label="Manager">
                <Select value={form.managerId} onChange={(v) => set("managerId", v)}
                  options={otherUsers} placeholder="No manager" />
              </Field>
              <Field label="Team Lead">
                <Select value={form.tlId} onChange={(v) => set("tlId", v)}
                  options={otherUsers} placeholder="No TL" />
              </Field>
            </div>
          ) : (
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <Dt label="Manager">{user.manager?.name ?? "—"}</Dt>
              <Dt label="Team Lead">{user.tl?.name ?? "—"}</Dt>
              <Dt label="Direct Reports">
                {user.reports.length === 0 ? "None" : user.reports.map((r) => r.name).join(", ")}
              </Dt>
              <Dt label="TL Reports">
                {user.tlReports.length === 0 ? "None" : user.tlReports.map((r) => r.name).join(", ")}
              </Dt>
            </dl>
          )}
        </Card>
      </div>

      {/* Right col — actions */}
      <div className="space-y-4">
        {/* Roles */}
        <Card title="Roles">
          {canEditRoles && editRoles ? (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {roles.map((r) => (
                  <button key={r.id} type="button"
                    onClick={() =>
                      setSelectedRoles((prev) =>
                        prev.includes(r.id) ? prev.filter((x) => x !== r.id) : [...prev, r.id]
                      )
                    }
                    className={`px-3 py-1 rounded-full text-xs border transition ${
                      selectedRoles.includes(r.id)
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-white text-gray-700 border-gray-300"
                    }`}
                  >
                    {r.name}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={saveRoles} disabled={saving}
                  className="text-xs px-3 py-1.5 bg-indigo-600 text-white rounded-lg">Save</button>
                <button onClick={() => setEditRoles(false)}
                  className="text-xs px-3 py-1.5 border rounded-lg">Cancel</button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-1">
                {user.roles.map((r) => (
                  <span key={r.role.id}
                    className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full text-xs">
                    {r.role.name}
                  </span>
                ))}
                {user.roles.length === 0 && <span className="text-sm text-gray-400">No roles</span>}
              </div>
              {canEditRoles && (
                <button onClick={() => setEditRoles(true)}
                  className="text-xs text-indigo-600 hover:underline">Edit roles</button>
              )}
            </div>
          )}
        </Card>

        {/* Actions */}
        {(canDeactivate || canResetPassword) && (
          <Card title="Actions">
            <div className="space-y-2">
              {canDeactivate && (
                <button onClick={toggleActive} disabled={saving}
                  className={`w-full text-sm py-2 rounded-lg border transition ${
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
                    <input type="password" value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="New password (min 8)"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                    <div className="flex gap-2">
                      <button onClick={resetPassword}
                        disabled={saving || newPassword.length < 8}
                        className="flex-1 text-sm py-1.5 bg-gray-800 text-white rounded-lg disabled:opacity-50">
                        Reset
                      </button>
                      <button onClick={() => setShowPwReset(false)}
                        className="flex-1 text-sm py-1.5 border rounded-lg">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setShowPwReset(true)}
                    className="w-full text-sm py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition">
                    Reset Password
                  </button>
                )
              )}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function Card({ title, children, action }: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-900 text-sm">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

function Dt({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-gray-400">{label}</dt>
      <dd className="text-gray-900 mt-0.5">{children}</dd>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-gray-400">{label}</label>
      {children}
    </div>
  );
}

function Select({ value, onChange, options, placeholder, disabled }: {
  value: string;
  onChange: (v: string) => void;
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
