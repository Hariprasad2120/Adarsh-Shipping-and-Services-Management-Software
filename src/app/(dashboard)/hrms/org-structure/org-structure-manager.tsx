"use client";

import { PeopleControlButton as MnxAction } from "@/modules/people/components/people-controls";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WorkspaceDialog } from "@/components/layout/workspace-dialog";

type Division = { id: string; name: string };
type Department = {
  id: string;
  name: string;
  code: string;
  divisions: Division[];
};
type Branch = { id: string; name: string; code: string };
type Org = {
  id: string;
  name: string;
  branches: Branch[];
  departments: Department[];
} | null;
type PromptState =
  | { kind: "department"; name: string; code: string }
  | { kind: "division"; name: string; departmentId: string }
  | null;

export function OrgStructureManager({ org }: { org: Org }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [promptState, setPromptState] = useState<PromptState>(null);

  async function apiFetch(url: string, method: string, body?: object) {
    setLoading(true);
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) throw new Error(await res.text());
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function addBranch() {
    const name = prompt("Branch name:");
    if (!name) return;
    const code = prompt("Branch code (e.g. DEL):");
    if (!code) return;
    await apiFetch("/api/org/branches", "POST", { name, code });
  }

  async function deleteBranch(id: string, name: string) {
    if (!confirm(`Delete branch "${name}"?`)) return;
    await apiFetch(`/api/org/branches/${id}`, "DELETE");
  }

  function openDepartmentPrompt() {
    setPromptState({ kind: "department", name: "", code: "" });
  }

  async function deleteDept(id: string, name: string) {
    if (
      !confirm(`Delete department "${name}"? This also deletes its divisions.`)
    )
      return;
    await apiFetch(`/api/org/departments/${id}`, "DELETE");
  }

  function openDivisionPrompt(departmentId: string) {
    setPromptState({ kind: "division", name: "", departmentId });
  }

  async function deleteDivision(id: string, name: string) {
    if (!confirm(`Delete division "${name}"?`)) return;
    await apiFetch(`/api/org/divisions/${id}`, "DELETE");
  }

  function closePrompt() {
    if (loading) return;
    setPromptState(null);
  }

  function updatePrompt(values: Partial<Exclude<PromptState, null>>) {
    setPromptState((current) =>
      current
        ? ({ ...current, ...values } as Exclude<PromptState, null>)
        : current,
    );
  }

  async function submitPrompt() {
    if (!promptState) return;

    const name = promptState.name.trim();
    if (!name) return;

    if (promptState.kind === "department") {
      const code = promptState.code.trim();
      if (!code) return;
      await apiFetch("/api/org/departments", "POST", { name, code });
    } else {
      await apiFetch(
        `/api/org/departments/${promptState.departmentId}/divisions`,
        "POST",
        { name },
      );
    }

    setPromptState(null);
  }

  if (!org) return <p className="text-mono-muted">No organisation found.</p>;

  return (
    <>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Section title="Branches" onAdd={addBranch} loading={loading}>
          {org.branches.length === 0 ? (
            <EmptyState text="No branches yet." />
          ) : (
            org.branches.map((b) => (
              <Row
                key={b.id}
                primary={b.name}
                secondary={b.code}
                onDelete={() => deleteBranch(b.id, b.name)}
              />
            ))
          )}
        </Section>

        <Section
          title="Departments & Divisions"
          onAdd={openDepartmentPrompt}
          loading={loading}
        >
          {org.departments.length === 0 ? (
            <EmptyState text="No departments yet." />
          ) : (
            org.departments.map((d) => (
              <div key={d.id} className="space-y-1">
                <div className="flex items-center justify-between rounded-lg bg-mono-soft px-3 py-2">
                  <div>
                    <span className="text-sm font-medium text-mono-text">
                      {d.name}
                    </span>
                    <span className="ml-2 text-xs text-mono-muted/60">
                      {d.code}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <MnxAction
                      onClick={() => openDivisionPrompt(d.id)}
                      className="text-xs text-[var(--mnx-info)] hover:underline"
                    >
                      + Division
                    </MnxAction>
                    <MnxAction
                      onClick={() => deleteDept(d.id, d.name)}
                      className="text-xs text-[var(--mnx-danger)] hover:underline"
                    >
                      Delete
                    </MnxAction>
                  </div>
                </div>
                {d.divisions.map((div) => (
                  <div
                    key={div.id}
                    className="flex items-center justify-between py-1 pl-6 text-sm text-mono-muted"
                  >
                    <span>&rarr; {div.name}</span>
                    <MnxAction
                      onClick={() => deleteDivision(div.id, div.name)}
                      className="text-xs text-[var(--mnx-danger)] hover:underline"
                    >
                      Delete
                    </MnxAction>
                  </div>
                ))}
              </div>
            ))
          )}
        </Section>
      </div>

      <MinimalPrompt
        state={promptState}
        loading={loading}
        onClose={closePrompt}
        onChange={updatePrompt}
        onSubmit={submitPrompt}
      />
    </>
  );
}

function Section({
  title,
  onAdd,
  loading,
  children,
}: {
  title: string;
  onAdd: () => void;
  loading: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="mnx-panel mnx-accent-edge space-y-3 rounded-xl border border-mono-border bg-mono-card p-5">
      <div className="flex items-center justify-between">
        <h2 className="mnx-title-2 text-mono-text">{title}</h2>
        <MnxAction
          onClick={onAdd}
          disabled={loading}
          className="text-sm text-[var(--mnx-info)] hover:underline disabled:opacity-50"
        >
          + Add
        </MnxAction>
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Row({
  primary,
  secondary,
  onDelete,
}: {
  primary: string;
  secondary: string;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-mono-soft">
      <div>
        <span className="text-sm text-mono-text">{primary}</span>
        <span className="ml-2 text-xs text-mono-muted/60">{secondary}</span>
      </div>
      <MnxAction
        onClick={onDelete}
        className="text-xs text-[var(--mnx-danger)] hover:underline"
      >
        Delete
      </MnxAction>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="py-2 text-sm text-mono-muted/60">{text}</p>;
}

function MinimalPrompt({
  state,
  loading,
  onClose,
  onChange,
  onSubmit,
}: {
  state: PromptState;
  loading: boolean;
  onClose: () => void;
  onChange: (values: Partial<Exclude<PromptState, null>>) => void;
  onSubmit: () => void;
}) {
  if (!state) return null;

  const isDepartment = state.kind === "department";

  return (
    <WorkspaceDialog
      open
      onClose={onClose}
      eyebrow="Organisation structure"
      title={isDepartment ? "New department" : "New division"}
      description={
        isDepartment
          ? "Add a name and short code."
          : "Add a name for this division."
      }
      className="mnx-people-dialog-compact"
    >
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          void onSubmit();
        }}
      >
        <Input
          autoFocus
          value={state.name}
          placeholder={isDepartment ? "Department name" : "Division name"}
          onChange={(event) => onChange({ name: event.target.value })}
        />
        {isDepartment ? (
          <Input
            value={state.code}
            placeholder="Code"
            maxLength={10}
            onChange={(event) =>
              onChange({ code: event.target.value.toUpperCase() })
            }
          />
        ) : null}

        <div className="flex justify-end gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            type="submit"
            disabled={
              loading ||
              !state.name.trim() ||
              (isDepartment && !state.code.trim())
            }
          >
            {loading ? "Saving..." : "Save"}
          </Button>
        </div>
      </form>
    </WorkspaceDialog>
  );
}
