"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Permission = { id: string; key: string; label: string; group: string };
type RolePermission = { permission: Permission };
type Role = { id: string; name: string; isSystem: boolean; permissions: RolePermission[] };

export function RolesManager({
  roles: initialRoles,
  permissions,
}: {
  roles: Role[];
  permissions: Permission[];
}) {
  const router = useRouter();
  const [roles, setRoles] = useState(initialRoles);
  const [selected, setSelected] = useState<Role | null>(null);
  const [saving, setSaving] = useState(false);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());

  function selectRole(role: Role) {
    setSelected(role);
    setCheckedIds(new Set(role.permissions.map((rp) => rp.permission.id)));
  }

  function togglePerm(id: string) {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function savePermissions() {
    if (!selected) return;
    setSaving(true);
    await fetch(`/api/roles/${selected.id}/permissions`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ permissionIds: [...checkedIds] }),
    });
    setSaving(false);
    router.refresh();
  }

  async function addRole() {
    const name = prompt("Role name:");
    if (!name) return;
    const res = await fetch("/api/roles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) router.refresh();
  }

  // Group permissions by group
  const groups = permissions.reduce<Record<string, Permission[]>>((acc, p) => {
    (acc[p.group] ??= []).push(p);
    return acc;
  }, {});

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Role list */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
        <div className="flex items-center justify-between mb-2">
          <h2 className="ds-h2 text-gray-900">Roles</h2>
          <button onClick={addRole} className="text-xs text-indigo-600 hover:underline">+ New</button>
        </div>
        {roles.map((r) => (
          <button
            key={r.id}
            onClick={() => selectRole(r)}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
              selected?.id === r.id
                ? "bg-indigo-50 text-indigo-700 font-medium"
                : "hover:bg-gray-50 text-gray-700"
            }`}
          >
            {r.name}
            {r.isSystem && <span className="ml-2 text-xs text-gray-400">system</span>}
          </button>
        ))}
      </div>

      {/* Permission matrix */}
      <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        {!selected ? (
          <p className="text-sm text-gray-400">Select a role to edit permissions.</p>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <h2 className="ds-h2 text-gray-900">{selected.name} — Permissions</h2>
              <button
                onClick={savePermissions}
                disabled={saving}
                className="px-4 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>

            {Object.entries(groups).map(([group, perms]) => (
              <div key={group}>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{group}</p>
                <div className="space-y-1">
                  {perms.map((p) => (
                    <label key={p.id} className="flex items-center gap-3 py-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={checkedIds.has(p.id)}
                        onChange={() => togglePerm(p.id)}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600"
                      />
                      <span className="text-sm text-gray-800">{p.label}</span>
                      <span className="text-xs text-gray-400 font-mono">{p.key}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
