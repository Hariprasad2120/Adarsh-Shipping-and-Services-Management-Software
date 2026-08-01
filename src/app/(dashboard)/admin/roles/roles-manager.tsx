"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminButton, AdminInput, AdminPanel, AdminPanelHeader } from "@/modules/admin/components/admin-workspace";
import { WorkspaceState } from "@/components/layout/workspace";

type Permission = { id: string; key: string; label: string; group: string };
type RolePermission = { permission: Permission };
type Role = {
  id: string;
  name: string;
  isSystem: boolean;
  permissions: RolePermission[];
};

export function RolesManager({
  roles: initialRoles,
  permissions,
}: {
  roles: Role[];
  permissions: Permission[];
}) {
  const router = useRouter();
  const [roles] = useState(initialRoles);
  const [selected, setSelected] = useState<Role | null>(null);
  const [saving, setSaving] = useState(false);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());

  function selectRole(role: Role) {
    setSelected(role);
    setCheckedIds(new Set(role.permissions.map((entry) => entry.permission.id)));
  }

  function togglePerm(id: string) {
    setCheckedIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
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
    const response = await fetch("/api/roles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (response.ok) router.refresh();
  }

  const groups = permissions.reduce<Record<string, Permission[]>>(
    (result, permission) => {
      (result[permission.group] ??= []).push(permission);
      return result;
    },
    {},
  );

  return (
    <div className="mnx-admin-role-layout">
      <AdminPanel>
        <AdminPanelHeader
          eyebrow="Access profiles"
          title="Roles"
          actions={
            <AdminButton onClick={addRole} size="compact">
              New role
            </AdminButton>
          }
        />
        <div className="mnx-admin-role-list">
          {roles.map((role) => (
            <AdminButton
              key={role.id}
              onClick={() => selectRole(role)}
              variant="secondary"
              className={`mnx-admin-role-option ${
                selected?.id === role.id ? "is-selected" : ""
              }`}
            >
              <span>{role.name}</span>
              {role.isSystem ? <small>system</small> : null}
            </AdminButton>
          ))}
        </div>
      </AdminPanel>

      <AdminPanel>
        {!selected ? (
          <WorkspaceState
            variant="empty"
            eyebrow="Permissions"
            title="Select a role"
            description="Choose an access profile to review and edit its assigned permissions."
            icon={<span aria-hidden="true">—</span>}
          />
        ) : (
          <>
            <AdminPanelHeader
              eyebrow="Permission matrix"
              title={`${selected.name} — permissions`}
              actions={
                <AdminButton
                  onClick={savePermissions}
                  disabled={saving}
                  variant="primary"
                >
                  {saving ? "Saving…" : "Save permissions"}
                </AdminButton>
              }
            />
            <div className="mnx-admin-permission-groups">
              {Object.entries(groups).map(([group, groupPermissions]) => (
                <section key={group}>
                  <h3>{group}</h3>
                  <div className="mnx-admin-permission-list">
                    {groupPermissions.map((permission) => (
                      <label
                        key={permission.id}
                        className="mnx-admin-permission"
                      >
                        <AdminInput
                          type="checkbox"
                          checked={checkedIds.has(permission.id)}
                          onChange={() => togglePerm(permission.id)}
                        />
                        <span>{permission.label}</span>
                        <code>{permission.key}</code>
                      </label>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </>
        )}
      </AdminPanel>
    </div>
  );
}
