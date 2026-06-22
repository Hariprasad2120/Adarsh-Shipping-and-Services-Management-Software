"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateSettingsAction, createJobTypeAction, deleteJobTypeAction, createTeamGroupAction, deleteTeamGroupAction } from "@/modules/cha/actions";

interface SettingsFormProps {
  initialSettings: {
    id: string;
    selfApprovalAllowed: boolean;
    managerApprovalPolicy: "ANY" | "ALL";
    jobCreatorRoles: string[];
    jobCreatorUsers: string[];
    expenseCategories: string[];
    jobNumberPrefix?: string;
    jobNumberNextNum?: number;
  };
  availableRoles: string[];
  availableEmployees: { id: string; name: string }[];
  jobTypes: { id: string; name: string }[];
  teamGroups: {
    id: string;
    name: string;
    memberIds: any;
  }[];
}

export function SettingsForm({
  initialSettings,
  availableRoles,
  availableEmployees,
  jobTypes,
  teamGroups,
}: SettingsFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selfApprovalAllowed, setSelfApprovalAllowed] = useState(initialSettings.selfApprovalAllowed);
  const [managerApprovalPolicy, setManagerApprovalPolicy] = useState(initialSettings.managerApprovalPolicy);
  const [jobCreatorRoles, setJobCreatorRoles] = useState<string[]>(initialSettings.jobCreatorRoles);
  const [jobCreatorUsers, setJobCreatorUsers] = useState<string[]>(initialSettings.jobCreatorUsers);
  const [expenseCategories, setExpenseCategories] = useState<string[]>(initialSettings.expenseCategories);
  const [categoryInput, setCategoryInput] = useState("");
  const [employeeSearch, setEmployeeSearch] = useState("");

  const [jobNumberPrefix, setJobNumberPrefix] = useState(initialSettings.jobNumberPrefix || "CHA");
  const [jobNumberNextNum, setJobNumberNextNum] = useState(initialSettings.jobNumberNextNum || 1);
  const [jobTypesList, setJobTypesList] = useState(jobTypes || []);
  const [newJobTypeName, setNewJobTypeName] = useState("");
  const [addingJobType, setAddingJobType] = useState(false);

  // Team Groups state and handlers
  const [teamGroupsList, setTeamGroupsList] = useState(teamGroups || []);
  const [newGroupName, setNewGroupName] = useState("");
  const [groupMembers, setGroupMembers] = useState<string[]>([]);
  const [addingGroup, setAddingGroup] = useState(false);
  const [groupMemberSearch, setGroupMemberSearch] = useState("");

  const parseJsonArray = (value: any): string[] => {
    if (!value) return [];
    if (typeof value === "string") {
      try {
        return JSON.parse(value);
      } catch {
        return [];
      }
    }
    if (Array.isArray(value)) {
      return value as string[];
    }
    return [];
  };

  const handleAddTeamGroup = async () => {
    const trimmed = newGroupName.trim();
    if (!trimmed) {
      toast.error("Please enter a group name.");
      return;
    }
    if (groupMembers.length === 0) {
      toast.error("Please select at least one team member.");
      return;
    }
    setAddingGroup(true);
    try {
      const res = await createTeamGroupAction(trimmed, groupMembers);
      if (res.ok) {
        setTeamGroupsList((prev) => [...prev, res.data]);
        setNewGroupName("");
        setGroupMembers([]);
        setGroupMemberSearch("");
        toast.success(`Team group '${trimmed}' added successfully.`);
      } else {
        toast.error(res.error || "Failed to add team group.");
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred.");
    } finally {
      setAddingGroup(false);
    }
  };

  const handleDeleteTeamGroup = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete the team group '${name}'?`)) return;
    try {
      const res = await deleteTeamGroupAction(id);
      if (res.ok) {
        setTeamGroupsList((prev) => prev.filter((g) => g.id !== id));
        toast.success(`Team group '${name}' deleted.`);
      } else {
        toast.error(res.error || "Failed to delete team group.");
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred.");
    }
  };

  const handleGroupMemberToggle = (userId: string) => {
    setGroupMembers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleAddJobType = async () => {
    const trimmed = newJobTypeName.trim();
    if (!trimmed) return;
    setAddingJobType(true);
    try {
      const res = await createJobTypeAction(trimmed);
      if (res.ok) {
        setJobTypesList((prev) => [...prev, res.data]);
        setNewJobTypeName("");
        toast.success(`Clearance job type '${trimmed}' added.`);
      } else {
        toast.error(res.error || "Failed to add job type.");
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred.");
    } finally {
      setAddingJobType(false);
    }
  };

  const handleDeleteJobType = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete clearance job type '${name}'?`)) return;
    try {
      const res = await deleteJobTypeAction(id);
      if (res.ok) {
        setJobTypesList((prev) => prev.filter((jt) => jt.id !== id));
        toast.success(`Clearance job type '${name}' deleted.`);
      } else {
        toast.error(res.error || "Failed to delete job type.");
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred.");
    }
  };

  const handleRoleToggle = (role: string) => {
    setJobCreatorRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const handleUserToggle = (userId: string) => {
    setJobCreatorUsers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (expenseCategories.length === 0) {
      toast.error("At least one expense category is required.");
      setLoading(false);
      return;
    }

    try {
      const res = await updateSettingsAction({
        jobCreatorRoles,
        jobCreatorUsers,
        selfApprovalAllowed,
        managerApprovalPolicy,
        expenseCategories,
        jobNumberPrefix,
        jobNumberNextNum,
      });

      if (res.ok) {
        toast.success("CHA operational settings updated successfully.");
        router.push("/cha");
      } else {
        toast.error(res.error || "Failed to update settings.");
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const filteredEmployees = availableEmployees.filter((emp) =>
    emp.name.toLowerCase().includes(employeeSearch.toLowerCase())
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-8 bg-[var(--color-surface)] p-6 rounded-xl border border-outline-variant/30 shadow-sm">
      {/* Job Number Configuration Section */}
      <div className="ds-form-section space-y-4">
        <h3 className="ds-h3 text-on-surface">Job Number Configuration</h3>
        <p className="text-xs text-on-surface-variant">
          Define the automatic serial numbering rules when new Clearance Jobs are initialized.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="ds-label mb-1.5 block">Job Number Prefix *</label>
            <input
              type="text"
              required
              value={jobNumberPrefix}
              onChange={(e) => setJobNumberPrefix(e.target.value)}
              className="w-full text-sm py-2 px-3 bg-[var(--color-surface)] border border-outline-variant/50 rounded-xl"
              placeholder="e.g. CHA"
            />
          </div>
          <div>
            <label className="ds-label mb-1.5 block">Next Serial Number *</label>
            <input
              type="number"
              required
              min={1}
              value={jobNumberNextNum}
              onChange={(e) => setJobNumberNextNum(parseInt(e.target.value, 10) || 1)}
              className="w-full text-sm py-2 px-3 bg-[var(--color-surface)] border border-outline-variant/50 rounded-xl"
              placeholder="e.g. 1"
            />
          </div>
        </div>
      </div>

      {/* Job Creator Roles Section */}
      <div className="ds-form-section space-y-4">
        <h3 className="ds-h3 text-on-surface">Job Creator Roles</h3>
        <p className="text-xs text-on-surface-variant">
          Select which user roles inside the organization are authorized to initiate new Customs House Agent jobs.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
          {availableRoles.map((role) => {
            const checked = jobCreatorRoles.includes(role);
            return (
              <label
                key={role}
                className={`flex items-center space-x-3 p-3 rounded-xl border transition-all cursor-pointer ${
                  checked
                    ? "border-[#00cec4] bg-[#00cec4]/5 text-[#00cec4]"
                    : "border-outline-variant/50 hover:bg-surface-container-low"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => handleRoleToggle(role)}
                  className="w-4 h-4 rounded text-[#00cec4] focus:ring-[#00cec4]/30"
                />
                <span className="text-sm font-medium">{role}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Job Creator Specific Employees Section */}
      <div className="ds-form-section space-y-4">
        <h3 className="ds-h3 text-on-surface">Job Creator Specific Employees</h3>
        <p className="text-xs text-on-surface-variant">
          Authorize specific employees to initiate new Customs House Agent jobs, regardless of their role.
        </p>

        <div className="space-y-3 pt-2">
          <input
            type="text"
            placeholder="Search employees by name..."
            value={employeeSearch}
            onChange={(e) => setEmployeeSearch(e.target.value)}
            className="w-full text-sm py-2 px-3 bg-[var(--color-surface)] border border-outline-variant/50 rounded-xl"
          />

          {/* Selected Employees Badges */}
          {jobCreatorUsers.length > 0 && (
            <div className="flex flex-wrap gap-2 p-2.5 bg-surface-container-low rounded-xl border border-outline-variant/20">
              <span className="text-xs ds-label mr-1 py-1 font-semibold text-on-surface-variant">Authorized:</span>
              {jobCreatorUsers.map((userId) => {
                const emp = availableEmployees.find((e) => e.id === userId);
                return (
                  <span
                    key={userId}
                    className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-[#00cec4]/15 text-[#00cec4] text-xs font-semibold"
                  >
                    <span>{emp?.name || "Unknown User"}</span>
                    <button
                      type="button"
                      onClick={() => handleUserToggle(userId)}
                      className="hover:text-red-500 font-bold ml-1 transition-colors focus:outline-none"
                    >
                      &times;
                    </button>
                  </span>
                );
              })}
            </div>
          )}

          {/* Scrollable Employees Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-60 overflow-y-auto p-2 border border-outline-variant/30 rounded-xl bg-surface-container-low/40">
            {filteredEmployees.length === 0 ? (
              <p className="text-xs text-on-surface-variant p-3 italic">No matching employees found.</p>
            ) : (
              filteredEmployees.map((emp) => {
                const checked = jobCreatorUsers.includes(emp.id);
                return (
                  <label
                    key={emp.id}
                    className={`flex items-center space-x-3 p-2.5 rounded-xl border transition-all cursor-pointer ${
                      checked
                        ? "border-[#00cec4] bg-[#00cec4]/5 text-[#00cec4]"
                        : "border-outline-variant/40 hover:bg-[var(--color-surface)]"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleUserToggle(emp.id)}
                      className="w-4 h-4 rounded text-[#00cec4] focus:ring-[#00cec4]/30"
                    />
                    <span className="text-sm font-medium text-on-surface">{emp.name}</span>
                  </label>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Approval Workflows Section */}
      <div className="ds-form-section space-y-4">
        <h3 className="ds-h3 text-on-surface">Checklist Approval Workflows</h3>
        <p className="text-xs text-on-surface-variant">
          Define constraints for checklist audits prior to custom bill of entry/shipping bill filings.
        </p>
        <div className="space-y-4 pt-2">
          {/* Self Approval */}
          <label className="flex items-start space-x-3 p-4 rounded-xl border border-outline-variant/50 hover:bg-surface-container-low cursor-pointer">
            <input
              type="checkbox"
              checked={selfApprovalAllowed}
              onChange={(e) => setSelfApprovalAllowed(e.target.checked)}
              className="mt-1 w-4 h-4 rounded text-[#00cec4] focus:ring-[#00cec4]/30"
            />
            <div>
              <span className="text-sm font-semibold text-on-surface block">Allow Self-Approval</span>
              <span className="text-xs text-on-surface-variant">
                If checked, job owners with appropriate permissions can directly self-approve checklists without manager routing.
              </span>
            </div>
          </label>

          {/* Manager Approval Policy */}
          <div className="p-4 rounded-xl border border-outline-variant/50 space-y-3">
            <span className="text-sm font-semibold text-on-surface block">Manager Approval Policy</span>
            <span className="text-xs text-on-surface-variant block">
              Specify approval logic when multiple managers are assigned to a CHA job.
            </span>
            <div className="flex items-center space-x-6 pt-2">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="approvalPolicy"
                  value="ANY"
                  checked={managerApprovalPolicy === "ANY"}
                  onChange={() => setManagerApprovalPolicy("ANY")}
                  className="w-4 h-4 text-[#00cec4] focus:ring-[#00cec4]/30"
                />
                <span className="text-sm">ANY Assigned Manager (Single Approval Passes)</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="approvalPolicy"
                  value="ALL"
                  checked={managerApprovalPolicy === "ALL"}
                  onChange={() => setManagerApprovalPolicy("ALL")}
                  className="w-4 h-4 text-[#00cec4] focus:ring-[#00cec4]/30"
                />
                <span className="text-sm">ALL Assigned Managers (Unanimous Approval Required)</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Expense Categories Section */}
      <div className="ds-form-section space-y-4">
        <h3 className="ds-h3 text-on-surface">Job Expense Categories</h3>
        <p className="text-xs text-on-surface-variant">
          Type a category name and press **Enter** to add it. These categories are used for operational disbursements.
        </p>

        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Type category and press Enter (e.g. Port Handling Charges)"
              value={categoryInput}
              onChange={(e) => setCategoryInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  const trimmed = categoryInput.trim();
                  if (trimmed && !expenseCategories.includes(trimmed)) {
                    setExpenseCategories((prev) => [...prev, trimmed]);
                    setCategoryInput("");
                  }
                }
              }}
              className="w-full text-sm py-2.5 px-3 bg-[var(--color-surface)] border border-outline-variant/50 rounded-xl focus:outline-none focus:border-[#00cec4]"
            />
            <Button
              type="button"
              onClick={() => {
                const trimmed = categoryInput.trim();
                if (trimmed && !expenseCategories.includes(trimmed)) {
                  setExpenseCategories((prev) => [...prev, trimmed]);
                  setCategoryInput("");
                }
              }}
              className="px-4 text-xs uppercase"
            >
              Add
            </Button>
          </div>

          {/* Render Categories as Cards */}
          <div className="flex flex-wrap gap-2.5 p-3 min-h-[80px] bg-surface-container-low rounded-xl border border-outline-variant/20">
            {expenseCategories.length === 0 ? (
              <p className="text-xs text-on-surface-variant italic self-center">No categories added yet. Add at least one.</p>
            ) : (
              expenseCategories.map((category) => (
                <div
                  key={category}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[var(--color-surface)] border border-outline-variant/30 text-on-surface text-xs font-semibold shadow-sm hover:border-[#00cec4] transition-all"
                >
                  <span>{category}</span>
                  <button
                    type="button"
                    onClick={() => setExpenseCategories((prev) => prev.filter((c) => c !== category))}
                    className="text-on-surface-variant hover:text-red-500 font-bold ml-1.5 transition-colors focus:outline-none text-sm"
                  >
                    &times;
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Clearance Job Types Configuration */}
      <div className="ds-form-section space-y-4">
        <h3 className="ds-h3 text-on-surface">Clearance Job Types</h3>
        <p className="text-xs text-on-surface-variant">
          Configure the active customs clearance categories (e.g. Import Clearance, Export Clearance).
        </p>

        <div className="space-y-3 pt-2">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Type new Clearance Job Type (e.g. Transit Clearance)"
              value={newJobTypeName}
              onChange={(e) => setNewJobTypeName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddJobType();
                }
              }}
              className="w-full text-sm py-2.5 px-3 bg-[var(--color-surface)] border border-outline-variant/50 rounded-xl focus:outline-none focus:border-[#00cec4]"
            />
            <Button
              type="button"
              disabled={addingJobType}
              onClick={handleAddJobType}
              className="px-4 text-xs uppercase"
            >
              Add Type
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 min-h-[80px] bg-surface-container-low rounded-xl border border-outline-variant/20">
            {jobTypesList.length === 0 ? (
              <p className="text-xs text-on-surface-variant italic col-span-2 self-center text-center">No clearance job types added yet.</p>
            ) : (
              jobTypesList.map((jt) => (
                <div
                  key={jt.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-[var(--color-surface)] border border-outline-variant/30 text-on-surface text-sm font-semibold shadow-sm hover:border-[#00cec4] transition-all"
                >
                  <span className="uppercase tracking-wide text-xs">{jt.name}</span>
                  <button
                    type="button"
                    onClick={() => handleDeleteJobType(jt.id, jt.name)}
                    className="text-on-surface-variant hover:text-red-500 transition-colors focus:outline-none p-1"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Team Groups Configuration */}
      <div className="ds-form-section space-y-4">
        <h3 className="ds-h3 text-on-surface">Team Groups Configuration</h3>
        <p className="text-xs text-on-surface-variant">
          Create operational teams or groups of people that can be assigned quickly to clearance jobs.
        </p>

        <div className="space-y-4 pt-2">
          {/* New Group form */}
          <div className="p-4 rounded-xl border border-outline-variant/50 space-y-4 bg-surface-container-low/20">
            <div>
              <label className="ds-label mb-1.5 block">Group Name *</label>
              <input
                type="text"
                placeholder="e.g. Documentation Team"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                className="w-full text-sm py-2 px-3 bg-[var(--color-surface)] border border-outline-variant/50 rounded-xl focus:outline-none focus:border-[#00cec4]"
              />
            </div>

            <div className="space-y-2">
              <label className="ds-label mb-1 block">Group Members (Select at least one) *</label>
              <input
                type="text"
                placeholder="Search employees to add..."
                value={groupMemberSearch}
                onChange={(e) => setGroupMemberSearch(e.target.value)}
                className="w-full text-sm py-2 px-3 bg-[var(--color-surface)] border border-outline-variant/50 rounded-xl focus:outline-none focus:border-[#00cec4]"
              />

              {/* Scrollable Members List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 border border-outline-variant/30 rounded-xl bg-[var(--color-surface)]">
                {availableEmployees
                  .filter((emp) => emp.name.toLowerCase().includes(groupMemberSearch.toLowerCase()))
                  .map((emp) => {
                    const checked = groupMembers.includes(emp.id);
                    return (
                      <label
                        key={emp.id}
                        className={`flex items-center space-x-3 p-2 rounded-lg border transition-all cursor-pointer ${
                          checked
                            ? "border-[#00cec4] bg-[#00cec4]/5 text-[#00cec4]"
                            : "border-outline-variant/20 hover:bg-surface-container-low/40"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => handleGroupMemberToggle(emp.id)}
                          className="w-4 h-4 rounded text-[#00cec4] focus:ring-[#00cec4]/30"
                        />
                        <span className="text-xs font-medium text-on-surface">{emp.name}</span>
                      </label>
                    );
                  })}
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                type="button"
                disabled={addingGroup}
                onClick={handleAddTeamGroup}
                className="w-full sm:w-auto px-4 py-2 text-xs uppercase"
              >
                {addingGroup ? "Creating Group..." : "Create Team Group"}
              </Button>
            </div>
          </div>

          {/* Configured Groups List */}
          <div className="space-y-2.5">
            <label className="ds-label block">Configured Team Groups</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {teamGroupsList.length === 0 ? (
                <div className="col-span-2 p-6 rounded-xl border border-dashed border-outline-variant/30 text-center">
                  <p className="text-xs text-on-surface-variant italic">No team groups configured yet.</p>
                </div>
              ) : (
                teamGroupsList.map((group) => {
                  const memberIds = parseJsonArray(group.memberIds);
                  const memberNames = memberIds
                    .map((id) => availableEmployees.find((emp) => emp.id === id)?.name)
                    .filter(Boolean);

                  return (
                    <div
                      key={group.id}
                      className="card-left-accent flex flex-col justify-between p-4 bg-[var(--color-surface)] border border-outline-variant/30 rounded-xl shadow-sm hover-cyan transition-all"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="ds-h3 text-xs text-on-surface font-semibold uppercase">{group.name}</h4>
                          <span className="text-[10px] text-[#00cec4] font-medium tracking-wide">
                            {memberNames.length} {memberNames.length === 1 ? "Member" : "Members"}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteTeamGroup(group.id, group.name)}
                          className="text-on-surface-variant hover:text-red-500 transition-colors focus:outline-none p-1"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-1">
                        {memberNames.map((name, index) => (
                          <span
                            key={index}
                            className="inline-block px-2 py-0.5 rounded bg-surface-container-low text-on-surface-variant text-[10px]"
                          >
                            {name}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Form Submission */}
      <div className="flex items-center justify-end pt-4 border-t border-outline-variant/30">
        <Button type="submit" disabled={loading} className="w-full sm:w-auto">
          {loading ? "Saving Changes..." : "Save Configuration"}
        </Button>
      </div>
    </form>
  );
}
