"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, Edit, Plus, X, Check, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  updateSettingsAction,
  createJobTypeAction,
  updateJobTypeManifestConfigAction,
  deleteJobTypeAction,
  createShipmentTypeAction,
  deleteShipmentTypeAction,
  createTeamGroupAction,
  deleteTeamGroupAction,
  upsertDocumentCategoryAction,
  deleteDocumentCategoryAction,
  upsertDocumentItemAction,
  deleteDocumentItemAction,
} from "@/modules/cha/actions";

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
  branches: { id: string; name: string; code: string }[];
  branchNumberingRules: {
    id: string;
    branchId: string;
    prefix: string;
    suffix: string | null;
    startingSequence: number;
    currentSequence: number;
    numberPadding: number;
    useFinancialYear: boolean;
    financialYearFormat: string | null;
    isActive: boolean;
  }[];
  jobTypes: {
    id: string;
    name: string;
    movementDirection: "IMPORT" | "EXPORT" | "BOTH" | "OTHER" | null;
    manifestRequirement: "IGM" | "EGM" | "BOTH" | "NONE" | "CUSTOM" | null;
    customManifestLabel: string | null;
    isManifestMandatory: boolean;
    manifestHelpText: string | null;
    isActive: boolean;
  }[];
  shipmentTypes: { id: string; name: string; isActive: boolean }[];
  teamGroups: {
    id: string;
    name: string;
    memberIds: any;
  }[];
  documentCategories: {
    id: string;
    name: string;
    description: string | null;
    sortOrder: number;
    isActive: boolean;
    items: {
      id: string;
      categoryId: string;
      name: string;
      description: string | null;
      sortOrder: number;
      isRequiredDefault: boolean;
      isActive: boolean;
    }[];
  }[];
}

export function SettingsForm({
  initialSettings,
  availableRoles,
  availableEmployees,
  branches,
  branchNumberingRules,
  jobTypes,
  shipmentTypes,
  teamGroups,
  documentCategories,
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

  // Document Requirements State
  const [docCategories, setDocCategories] = useState(documentCategories || []);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryDesc, setNewCategoryDesc] = useState("");
  const [newCategorySort, setNewCategorySort] = useState(1);
  const [newCategoryActive, setNewCategoryActive] = useState(true);

  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");
  const [editingCategoryDesc, setEditingCategoryDesc] = useState("");
  const [editingCategorySort, setEditingCategorySort] = useState(1);
  const [editingCategoryActive, setEditingCategoryActive] = useState(true);

  const [addingItemCategoryId, setAddingItemCategoryId] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState("");
  const [newItemDesc, setNewItemDesc] = useState("");
  const [newItemSort, setNewItemSort] = useState(1);
  const [newItemRequired, setNewItemRequired] = useState(false);
  const [newItemActive, setNewItemActive] = useState(true);

  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemName, setEditingItemName] = useState("");
  const [editingItemDesc, setEditingItemDesc] = useState("");
  const [editingItemSort, setEditingItemSort] = useState(1);
  const [editingItemRequired, setEditingItemRequired] = useState(false);
  const [editingItemActive, setEditingItemActive] = useState(true);

  const [jobNumberPrefix, setJobNumberPrefix] = useState(initialSettings.jobNumberPrefix || "CHA");
  const [jobNumberNextNum, setJobNumberNextNum] = useState(initialSettings.jobNumberNextNum || 1);
  const [jobTypesList, setJobTypesList] = useState(jobTypes || []);
  const [newJobTypeName, setNewJobTypeName] = useState("");
  const [newJobTypeMovementDirection, setNewJobTypeMovementDirection] = useState<"IMPORT" | "EXPORT" | "BOTH" | "OTHER">("IMPORT");
  const [newJobTypeManifestRequirement, setNewJobTypeManifestRequirement] = useState<"IGM" | "EGM" | "BOTH" | "NONE" | "CUSTOM">("IGM");
  const [newJobTypeCustomManifestLabel, setNewJobTypeCustomManifestLabel] = useState("");
  const [newJobTypeManifestMandatory, setNewJobTypeManifestMandatory] = useState(true);
  const [newJobTypeManifestHelpText, setNewJobTypeManifestHelpText] = useState("");
  const [addingJobType, setAddingJobType] = useState(false);
  const [savingJobTypeId, setSavingJobTypeId] = useState<string | null>(null);
  const [shipmentTypesList, setShipmentTypesList] = useState(shipmentTypes || []);
  const [newShipmentTypeName, setNewShipmentTypeName] = useState("");
  const [addingShipmentType, setAddingShipmentType] = useState(false);
  const [branchRules, setBranchRules] = useState(
    branches.map((branch) => {
      const existingRule = branchNumberingRules.find((rule) => rule.branchId === branch.id);
      return {
        branchId: branch.id,
        branchName: branch.name,
        branchCode: branch.code,
        prefix: existingRule?.prefix || `CHA-${branch.code.toUpperCase()}`,
        suffix: existingRule?.suffix || "",
        startingSequence: existingRule?.startingSequence || 1,
        currentSequence: existingRule?.currentSequence || 0,
        numberPadding: existingRule?.numberPadding || 4,
        useFinancialYear: existingRule?.useFinancialYear || false,
        financialYearFormat: existingRule?.financialYearFormat || "YYYY-YY",
        isActive: existingRule?.isActive ?? true,
      };
    }),
  );

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

  const buildFinancialYearLabel = (format?: string | null) => {
    const now = new Date();
    const startYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    const endYear = startYear + 1;
    const normalized = (format || "YYYY-YY").toUpperCase();

    switch (normalized) {
      case "YYYY-YYYY":
        return `${startYear}-${endYear}`;
      case "YY-YY":
        return `${String(startYear).slice(-2)}-${String(endYear).slice(-2)}`;
      case "YYYYYY":
        return `${startYear}${String(endYear).slice(-2)}`;
      case "YYYY-YY":
      default:
        return `${startYear}-${String(endYear).slice(-2)}`;
    }
  };

  const updateBranchRule = (
    branchId: string,
    updates: Partial<(typeof branchRules)[number]>,
  ) => {
    setBranchRules((prev) =>
      prev.map((rule) => (rule.branchId === branchId ? { ...rule, ...updates } : rule)),
    );
  };

  const getBranchRulePreview = (rule: (typeof branchRules)[number]) => {
    const parts = [rule.prefix.trim()];
    if (rule.useFinancialYear) {
      parts.push(buildFinancialYearLabel(rule.financialYearFormat));
    }
    parts.push(String(Math.max(rule.currentSequence + 1, rule.startingSequence, 1)).padStart(Math.max(rule.numberPadding, 1), "0"));
    if (rule.suffix.trim()) {
      parts.push(rule.suffix.trim());
    }
    return parts.filter(Boolean).join("-");
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
      const res = await createJobTypeAction({
        name: trimmed,
        movementDirection: newJobTypeMovementDirection,
        manifestRequirement: newJobTypeManifestRequirement,
        customManifestLabel: newJobTypeManifestRequirement === "CUSTOM" ? newJobTypeCustomManifestLabel : null,
        isManifestMandatory: newJobTypeManifestMandatory,
        manifestHelpText: newJobTypeManifestHelpText || null,
        isActive: true,
      });
      if (res.ok) {
        setJobTypesList((prev) => [...prev, res.data]);
        setNewJobTypeName("");
        setNewJobTypeMovementDirection("IMPORT");
        setNewJobTypeManifestRequirement("IGM");
        setNewJobTypeCustomManifestLabel("");
        setNewJobTypeManifestMandatory(true);
        setNewJobTypeManifestHelpText("");
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

  const handleJobTypeFieldChange = (
    id: string,
    field:
      | "name"
      | "movementDirection"
      | "manifestRequirement"
      | "customManifestLabel"
      | "manifestHelpText"
      | "isManifestMandatory"
      | "isActive",
    value: string | boolean | null,
  ) => {
    setJobTypesList((prev) =>
      prev.map((jt) =>
        jt.id === id
          ? {
              ...jt,
              [field]: value,
              ...(field === "manifestRequirement" && value !== "CUSTOM" ? { customManifestLabel: null } : {}),
            }
          : jt,
      ),
    );
  };

  const handleSaveJobType = async (jobType: (typeof jobTypesList)[number]) => {
    setSavingJobTypeId(jobType.id);
    try {
      const res = await updateJobTypeManifestConfigAction(jobType.id, {
        name: jobType.name,
        movementDirection: (jobType.movementDirection || "OTHER") as "IMPORT" | "EXPORT" | "BOTH" | "OTHER",
        manifestRequirement: (jobType.manifestRequirement || "NONE") as "IGM" | "EGM" | "BOTH" | "NONE" | "CUSTOM",
        customManifestLabel: jobType.customManifestLabel,
        isManifestMandatory: jobType.isManifestMandatory,
        manifestHelpText: jobType.manifestHelpText,
        isActive: jobType.isActive,
      });
      if (res.ok) {
        setJobTypesList((prev) => prev.map((jt) => (jt.id === jobType.id ? res.data : jt)));
        toast.success(`Clearance job type '${jobType.name}' updated.`);
      } else {
        toast.error(res.error || "Failed to update clearance job type.");
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred.");
    } finally {
      setSavingJobTypeId(null);
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

  const handleAddShipmentType = async () => {
    const trimmed = newShipmentTypeName.trim();
    if (!trimmed) return;
    setAddingShipmentType(true);
    try {
      const res = await createShipmentTypeAction(trimmed);
      if (res.ok) {
        setShipmentTypesList((prev) => [...prev, res.data]);
        setNewShipmentTypeName("");
        toast.success(`Shipment type '${trimmed}' added.`);
      } else {
        toast.error(res.error || "Failed to add shipment type.");
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred.");
    } finally {
      setAddingShipmentType(false);
    }
  };

  const handleDeleteShipmentType = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete shipment type '${name}'?`)) return;
    try {
      const res = await deleteShipmentTypeAction(id);
      if (res.ok) {
        setShipmentTypesList((prev) => prev.filter((shipmentType) => shipmentType.id !== id));
        toast.success(`Shipment type '${name}' deleted.`);
      } else {
        toast.error(res.error || "Failed to delete shipment type.");
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
        branchNumberingRules: branchRules.map((rule) => ({
          branchId: rule.branchId,
          prefix: rule.prefix,
          suffix: rule.suffix,
          startingSequence: rule.startingSequence,
          currentSequence: rule.currentSequence,
          numberPadding: rule.numberPadding,
          useFinancialYear: rule.useFinancialYear,
          financialYearFormat: rule.financialYearFormat,
          isActive: rule.isActive,
        })),
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

  const handleSaveCategory = async (id?: string) => {
    const name = id ? editingCategoryName.trim() : newCategoryName.trim();
    const description = id ? editingCategoryDesc.trim() : newCategoryDesc.trim();
    const sortOrder = id ? editingCategorySort : newCategorySort;
    const isActive = id ? editingCategoryActive : newCategoryActive;

    if (!name) {
      toast.error("Category name is required");
      return;
    }

    try {
      const res = await upsertDocumentCategoryAction({
        id,
        name,
        description: description || undefined,
        sortOrder,
        isActive,
      });

      if (res.ok) {
        toast.success(id ? "Category updated" : "Category created");
        if (id) {
          setDocCategories((prev) =>
            prev.map((cat) =>
              cat.id === id
                ? { ...cat, name, description: description || null, sortOrder, isActive }
                : cat
            )
          );
          setEditingCategoryId(null);
        } else {
          setDocCategories((prev) => [
            ...prev,
            { ...res.data, items: [] },
          ]);
          setNewCategoryName("");
          setNewCategoryDesc("");
          setNewCategorySort(docCategories.length + 2);
          setNewCategoryActive(true);
          setIsAddingCategory(false);
        }
        router.refresh();
      } else {
        toast.error(res.error || "Failed to save category");
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred");
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm("Are you sure you want to delete this category? All its requirement items will be deleted as well.")) {
      return;
    }
    try {
      const res = await deleteDocumentCategoryAction(id);
      if (res.ok) {
        toast.success("Category deleted");
        setDocCategories((prev) => prev.filter((cat) => cat.id !== id));
        router.refresh();
      } else {
        toast.error(res.error || "Failed to delete category");
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred");
    }
  };

  const handleSaveItem = async (categoryId: string, id?: string) => {
    const name = id ? editingItemName.trim() : newItemName.trim();
    const description = id ? editingItemDesc.trim() : newItemDesc.trim();
    const sortOrder = id ? editingItemSort : newItemSort;
    const isRequiredDefault = id ? editingItemRequired : newItemRequired;
    const isActive = id ? editingItemActive : newItemActive;

    if (!name) {
      toast.error("Item name is required");
      return;
    }

    try {
      const res = await upsertDocumentItemAction({
        id,
        categoryId,
        name,
        description: description || undefined,
        sortOrder,
        isRequiredDefault,
        isActive,
      });

      if (res.ok) {
        toast.success(id ? "Requirement updated" : "Requirement added");
        setDocCategories((prev) =>
          prev.map((cat) => {
            if (cat.id !== categoryId) return cat;
            if (id) {
              return {
                ...cat,
                items: cat.items.map((item) =>
                  item.id === id
                    ? { ...item, name, description: description || null, sortOrder, isRequiredDefault, isActive }
                    : item
                ),
              };
            } else {
              return {
                ...cat,
                items: [...cat.items, res.data].sort((a, b) => a.sortOrder - b.sortOrder),
              };
            }
          })
        );
        if (id) {
          setEditingItemId(null);
        } else {
          setNewItemName("");
          setNewItemDesc("");
          setNewItemSort(1);
          setNewItemRequired(false);
          setNewItemActive(true);
          setAddingItemCategoryId(null);
        }
        router.refresh();
      } else {
        toast.error(res.error || "Failed to save requirement");
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred");
    }
  };

  const handleDeleteItem = async (categoryId: string, id: string) => {
    if (!confirm("Are you sure you want to delete this requirement item?")) {
      return;
    }
    try {
      const res = await deleteDocumentItemAction(id);
      if (res.ok) {
        toast.success("Requirement item deleted");
        setDocCategories((prev) =>
          prev.map((cat) =>
            cat.id === categoryId
              ? { ...cat, items: cat.items.filter((item) => item.id !== id) }
              : cat
          )
        );
        router.refresh();
      } else {
        toast.error(res.error || "Failed to delete item");
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 bg-[var(--color-surface)] p-6 rounded-xl border border-outline-variant/30 shadow-sm">
      {/* Job Number Configuration Section */}
      <div className="ds-form-section space-y-4">
        <h3 className="ds-h3 text-on-surface">Job Number Configuration</h3>
        <p className="text-xs text-on-surface-variant">
          Configure numbering rules per branch. Each branch keeps its own sequence and preview.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="ds-label mb-1.5 block">Legacy Default Prefix</label>
            <input
              type="text"
              value={jobNumberPrefix}
              onChange={(e) => setJobNumberPrefix(e.target.value)}
              className="w-full text-sm py-2 px-3 bg-[var(--color-surface)] border border-outline-variant/50 rounded-xl"
              placeholder="e.g. CHA"
            />
          </div>
          <div>
            <label className="ds-label mb-1.5 block">Legacy Default Next Number</label>
            <input
              type="number"
              min={1}
              value={jobNumberNextNum}
              onChange={(e) => setJobNumberNextNum(parseInt(e.target.value, 10) || 1)}
              className="w-full text-sm py-2 px-3 bg-[var(--color-surface)] border border-outline-variant/50 rounded-xl"
              placeholder="e.g. 1"
            />
          </div>
        </div>
        <div className="space-y-4 pt-2">
          {branchRules.map((rule) => (
            <div key={rule.branchId} className="rounded-xl border border-outline-variant/40 bg-surface-container-low/40 p-4 space-y-4">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h4 className="ds-h3 text-xs text-on-surface">{rule.branchName}</h4>
                  <p className="text-xs text-on-surface-variant">{rule.branchCode}</p>
                </div>
                <label className="flex items-center gap-2 text-xs text-on-surface">
                  <input
                    type="checkbox"
                    checked={rule.isActive}
                    onChange={(e) => updateBranchRule(rule.branchId, { isActive: e.target.checked })}
                    className="w-4 h-4 rounded text-[#00cec4] focus:ring-[#00cec4]/30"
                  />
                  <span>Rule Active</span>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="ds-label mb-1.5 block">Prefix</label>
                  <input
                    type="text"
                    value={rule.prefix}
                    onChange={(e) => updateBranchRule(rule.branchId, { prefix: e.target.value })}
                    className="w-full text-sm"
                  />
                </div>
                <div>
                  <label className="ds-label mb-1.5 block">Suffix</label>
                  <input
                    type="text"
                    value={rule.suffix}
                    onChange={(e) => updateBranchRule(rule.branchId, { suffix: e.target.value })}
                    className="w-full text-sm"
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className="ds-label mb-1.5 block">Padding</label>
                  <input
                    type="number"
                    min={1}
                    value={rule.numberPadding}
                    onChange={(e) => updateBranchRule(rule.branchId, { numberPadding: parseInt(e.target.value, 10) || 1 })}
                    className="w-full text-sm"
                  />
                </div>
                <div>
                  <label className="ds-label mb-1.5 block">Starting Sequence</label>
                  <input
                    type="number"
                    min={1}
                    value={rule.startingSequence}
                    onChange={(e) => updateBranchRule(rule.branchId, { startingSequence: parseInt(e.target.value, 10) || 1 })}
                    className="w-full text-sm"
                  />
                </div>
                <div>
                  <label className="ds-label mb-1.5 block">Current Sequence</label>
                  <input
                    type="number"
                    min={0}
                    value={rule.currentSequence}
                    onChange={(e) => updateBranchRule(rule.branchId, { currentSequence: parseInt(e.target.value, 10) || 0 })}
                    className="w-full text-sm"
                  />
                </div>
                <div className="rounded-xl border border-outline-variant/40 bg-surface p-3">
                  <span className="ds-label block">Preview</span>
                  <p className="mt-1 text-sm ds-numeric text-on-surface break-all">{getBranchRulePreview(rule)}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="flex items-center gap-2 text-xs text-on-surface">
                  <input
                    type="checkbox"
                    checked={rule.useFinancialYear}
                    onChange={(e) => updateBranchRule(rule.branchId, { useFinancialYear: e.target.checked })}
                    className="w-4 h-4 rounded text-[#00cec4] focus:ring-[#00cec4]/30"
                  />
                  <span>Include Financial Year</span>
                </label>
                <div>
                  <label className="ds-label mb-1.5 block">Financial Year Format</label>
                  <select
                    value={rule.financialYearFormat}
                    onChange={(e) => updateBranchRule(rule.branchId, { financialYearFormat: e.target.value })}
                    className="w-full text-sm py-2 px-3 bg-[var(--color-surface)] border border-outline-variant/50 rounded-xl"
                    disabled={!rule.useFinancialYear}
                  >
                    <option value="YYYY-YY">YYYY-YY</option>
                    <option value="YYYY-YYYY">YYYY-YYYY</option>
                    <option value="YY-YY">YY-YY</option>
                    <option value="YYYYYY">YYYYYY</option>
                  </select>
                </div>
              </div>
            </div>
          ))}
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

      {/* Filing Workflows Section */}
      <div className="ds-form-section space-y-4">
        <h3 className="ds-h3 text-on-surface">Configurable Filing Workflows</h3>
        <p className="text-xs text-on-surface-variant">
          Configure a non-linear, node-based blueprint filing workflow for Customs submissions.
        </p>
        <div className="pt-2">
          <Button
            type="button"
            variant="outline"
            className="border-[#00cec4] text-[#00cec4] hover:bg-[#00cec4]/10"
            onClick={() => router.push("/cha/settings/filing-workflows")}
          >
            Manage Filing Workflows →
          </Button>
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
          <div className="rounded-xl border border-outline-variant/30 bg-surface-container-low p-4 space-y-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="space-y-1.5 md:col-span-2">
                <span className="ds-label">Clearance Type Name</span>
                <input
                  type="text"
                  placeholder="Type new Clearance Job Type (e.g. Re-Export)"
                  value={newJobTypeName}
                  onChange={(e) => setNewJobTypeName(e.target.value)}
                  className="w-full text-sm py-2.5 px-3 bg-[var(--color-surface)] border border-outline-variant/50 rounded-xl focus:outline-none focus:border-[#00cec4]"
                />
              </label>
              <label className="space-y-1.5">
                <span className="ds-label">Movement Direction</span>
                <select
                  value={newJobTypeMovementDirection}
                  onChange={(e) => setNewJobTypeMovementDirection(e.target.value as "IMPORT" | "EXPORT" | "BOTH" | "OTHER")}
                  className="w-full text-sm py-2.5 px-3 bg-[var(--color-surface)] border border-outline-variant/50 rounded-xl"
                >
                  <option value="IMPORT">Import</option>
                  <option value="EXPORT">Export</option>
                  <option value="BOTH">Both</option>
                  <option value="OTHER">Other / Custom</option>
                </select>
              </label>
              <label className="space-y-1.5">
                <span className="ds-label">Manifest Requirement</span>
                <select
                  value={newJobTypeManifestRequirement}
                  onChange={(e) => setNewJobTypeManifestRequirement(e.target.value as "IGM" | "EGM" | "BOTH" | "NONE" | "CUSTOM")}
                  className="w-full text-sm py-2.5 px-3 bg-[var(--color-surface)] border border-outline-variant/50 rounded-xl"
                >
                  <option value="IGM">IGM</option>
                  <option value="EGM">EGM</option>
                  <option value="BOTH">Both</option>
                  <option value="NONE">None</option>
                  <option value="CUSTOM">Custom</option>
                </select>
              </label>
              {newJobTypeManifestRequirement === "CUSTOM" ? (
                <label className="space-y-1.5 md:col-span-2">
                  <span className="ds-label">Custom Manifest Label</span>
                  <input
                    type="text"
                    placeholder="e.g. Transshipment Manifest Number"
                    value={newJobTypeCustomManifestLabel}
                    onChange={(e) => setNewJobTypeCustomManifestLabel(e.target.value)}
                    className="w-full text-sm py-2.5 px-3 bg-[var(--color-surface)] border border-outline-variant/50 rounded-xl"
                  />
                </label>
              ) : null}
              <label className="space-y-1.5 md:col-span-2">
                <span className="ds-label">Help Text / Placeholder</span>
                <input
                  type="text"
                  placeholder="Guidance shown on the checklist page"
                  value={newJobTypeManifestHelpText}
                  onChange={(e) => setNewJobTypeManifestHelpText(e.target.value)}
                  className="w-full text-sm py-2.5 px-3 bg-[var(--color-surface)] border border-outline-variant/50 rounded-xl"
                />
              </label>
              <label className="flex items-center gap-2 text-xs text-on-surface-variant md:col-span-2">
                <input
                  type="checkbox"
                  checked={newJobTypeManifestMandatory}
                  onChange={(e) => setNewJobTypeManifestMandatory(e.target.checked)}
                />
                Manifest field is mandatory
              </label>
            </div>
            <div className="flex justify-end">
              <Button
                type="button"
                disabled={addingJobType}
                onClick={handleAddJobType}
                className="px-4 text-xs uppercase"
              >
                Add Type
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 p-3 min-h-[80px] bg-surface-container-low rounded-xl border border-outline-variant/20">
            {jobTypesList.length === 0 ? (
              <p className="text-xs text-on-surface-variant italic self-center text-center">No clearance job types added yet.</p>
            ) : (
              jobTypesList.map((jt) => (
                <div
                  key={jt.id}
                  className="rounded-xl bg-[var(--color-surface)] border border-outline-variant/30 p-4 shadow-sm space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <span className="ds-label">Clearance Type</span>
                      <input
                        type="text"
                        value={jt.name}
                        onChange={(e) => handleJobTypeFieldChange(jt.id, "name", e.target.value)}
                        className="w-full text-sm py-2 px-3 bg-surface border border-outline-variant/50 rounded-xl"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteJobType(jt.id, jt.name)}
                      className="text-on-surface-variant hover:text-red-500 transition-colors focus:outline-none p-1"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <label className="space-y-1">
                      <span className="ds-label">Movement Direction</span>
                      <select
                        value={jt.movementDirection || "OTHER"}
                        onChange={(e) => handleJobTypeFieldChange(jt.id, "movementDirection", e.target.value)}
                        className="w-full text-sm py-2 px-3 bg-surface border border-outline-variant/50 rounded-xl"
                      >
                        <option value="IMPORT">Import</option>
                        <option value="EXPORT">Export</option>
                        <option value="BOTH">Both</option>
                        <option value="OTHER">Other / Custom</option>
                      </select>
                    </label>
                    <label className="space-y-1">
                      <span className="ds-label">Manifest Requirement</span>
                      <select
                        value={jt.manifestRequirement || "NONE"}
                        onChange={(e) => handleJobTypeFieldChange(jt.id, "manifestRequirement", e.target.value)}
                        className="w-full text-sm py-2 px-3 bg-surface border border-outline-variant/50 rounded-xl"
                      >
                        <option value="IGM">IGM</option>
                        <option value="EGM">EGM</option>
                        <option value="BOTH">Both</option>
                        <option value="NONE">None</option>
                        <option value="CUSTOM">Custom</option>
                      </select>
                    </label>
                    {jt.manifestRequirement === "CUSTOM" ? (
                      <label className="space-y-1 md:col-span-2">
                        <span className="ds-label">Custom Manifest Label</span>
                        <input
                          type="text"
                          value={jt.customManifestLabel || ""}
                          onChange={(e) => handleJobTypeFieldChange(jt.id, "customManifestLabel", e.target.value)}
                          className="w-full text-sm py-2 px-3 bg-surface border border-outline-variant/50 rounded-xl"
                        />
                      </label>
                    ) : null}
                    <label className="space-y-1 md:col-span-2">
                      <span className="ds-label">Help Text / Placeholder</span>
                      <input
                        type="text"
                        value={jt.manifestHelpText || ""}
                        onChange={(e) => handleJobTypeFieldChange(jt.id, "manifestHelpText", e.target.value)}
                        className="w-full text-sm py-2 px-3 bg-surface border border-outline-variant/50 rounded-xl"
                      />
                    </label>
                    <label className="flex items-center gap-2 text-xs text-on-surface-variant">
                      <input
                        type="checkbox"
                        checked={jt.isManifestMandatory}
                        onChange={(e) => handleJobTypeFieldChange(jt.id, "isManifestMandatory", e.target.checked)}
                      />
                      Manifest field is mandatory
                    </label>
                    <label className="flex items-center gap-2 text-xs text-on-surface-variant">
                      <input
                        type="checkbox"
                        checked={jt.isActive}
                        onChange={(e) => handleJobTypeFieldChange(jt.id, "isActive", e.target.checked)}
                      />
                      Active
                    </label>
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-outline-variant/20 bg-surface-container-low px-3 py-2">
                    <div className="text-xs text-on-surface-variant">
                      Required Manifest: <span className="font-medium text-on-surface">{jt.manifestRequirement === "CUSTOM" ? jt.customManifestLabel || "Custom Manifest" : jt.manifestRequirement || "Not Configured"}</span>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleSaveJobType(jt)}
                      disabled={savingJobTypeId === jt.id}
                      className="text-xs uppercase"
                    >
                      {savingJobTypeId === jt.id ? "Saving..." : "Save Config"}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="ds-form-section space-y-4">
        <h3 className="ds-h3 text-on-surface">Shipment Types</h3>
        <p className="text-xs text-on-surface-variant">
          Maintain reusable shipment modes for CHA job creation.
        </p>

        <div className="space-y-3 pt-2">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Type new Shipment Type (e.g. Rail)"
              value={newShipmentTypeName}
              onChange={(e) => setNewShipmentTypeName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddShipmentType();
                }
              }}
              className="w-full text-sm py-2.5 px-3 bg-[var(--color-surface)] border border-outline-variant/50 rounded-xl focus:outline-none focus:border-[#00cec4]"
            />
            <Button
              type="button"
              disabled={addingShipmentType}
              onClick={handleAddShipmentType}
              className="px-4 text-xs uppercase"
            >
              Add Type
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 min-h-[80px] bg-surface-container-low rounded-xl border border-outline-variant/20">
            {shipmentTypesList.length === 0 ? (
              <p className="text-xs text-on-surface-variant italic col-span-2 self-center text-center">No shipment types added yet.</p>
            ) : (
              shipmentTypesList.map((shipmentType) => (
                <div
                  key={shipmentType.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-[var(--color-surface)] border border-outline-variant/30 text-on-surface text-sm font-semibold shadow-sm hover:border-[#00cec4] transition-all"
                >
                  <span className="uppercase tracking-wide text-xs">{shipmentType.name}</span>
                  <button
                    type="button"
                    onClick={() => handleDeleteShipmentType(shipmentType.id, shipmentType.name)}
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

      {/* Document Requirements Configurator */}
      <div className="ds-form-section space-y-4">
        <h3 className="ds-h3 text-on-surface">Document Requirements</h3>
        <p className="text-xs text-on-surface-variant">
          Configure document category headings and individual required document items.
        </p>

        <div className="space-y-4 pt-2">
          {/* Add Category Section */}
          <div className="p-4 rounded-xl border border-outline-variant/50 bg-surface-container-low/20 space-y-4">
            {!isAddingCategory ? (
              <Button
                type="button"
                variant="outline"
                className="flex items-center gap-2 text-xs uppercase"
                onClick={() => {
                  setNewCategoryName("");
                  setNewCategoryDesc("");
                  setNewCategorySort(docCategories.length + 1);
                  setNewCategoryActive(true);
                  setIsAddingCategory(true);
                }}
              >
                <Plus size={14} />
                Add Document Category
              </Button>
            ) : (
              <div className="space-y-4">
                <h4 className="ds-h3 text-xs font-semibold text-on-surface">New Category</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="ds-label mb-1.5 block">Category Name *</label>
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      className="w-full text-sm py-2 px-3 bg-[var(--color-surface)] border border-outline-variant/50 rounded-xl"
                      placeholder="e.g. KYC Documents"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="ds-label mb-1.5 block">Description</label>
                    <input
                      type="text"
                      value={newCategoryDesc}
                      onChange={(e) => setNewCategoryDesc(e.target.value)}
                      className="w-full text-sm py-2 px-3 bg-[var(--color-surface)] border border-outline-variant/50 rounded-xl"
                      placeholder="Category description"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="ds-label mb-1.5 block">Sort Order</label>
                    <input
                      type="number"
                      value={newCategorySort}
                      onChange={(e) => setNewCategorySort(parseInt(e.target.value, 10) || 1)}
                      className="w-full text-sm py-2 px-3 bg-[var(--color-surface)] border border-outline-variant/50 rounded-xl"
                    />
                  </div>
                  <div className="flex items-end pb-3">
                    <label className="flex items-center gap-2 text-xs text-on-surface cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newCategoryActive}
                        onChange={(e) => setNewCategoryActive(e.target.checked)}
                        className="w-4 h-4 rounded text-[#00cec4] focus:ring-[#00cec4]/30"
                      />
                      <span>Active</span>
                    </label>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="px-3 py-1.5 text-xs uppercase"
                    onClick={() => setIsAddingCategory(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    className="px-3 py-1.5 text-xs uppercase"
                    onClick={() => handleSaveCategory()}
                  >
                    Save Category
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Categories & Items List */}
          <div className="space-y-4">
            {docCategories.length === 0 ? (
              <div className="p-6 rounded-xl border border-dashed border-outline-variant/30 text-center bg-surface-container-low/10">
                <p className="text-xs text-on-surface-variant italic">No document requirements categories configured yet.</p>
              </div>
            ) : (
              docCategories
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map((cat) => (
                  <div
                    key={cat.id}
                    className="card-left-accent p-4 bg-[var(--color-surface)] border border-outline-variant/30 rounded-xl shadow-sm hover-cyan transition-all space-y-4"
                  >
                    {/* Category Details / Edit Form */}
                    {editingCategoryId === cat.id ? (
                      <div className="space-y-4 p-2 bg-surface-container-low/20 rounded-xl border border-outline-variant/20">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <label className="ds-label mb-1 block">Category Name *</label>
                            <input
                              type="text"
                              value={editingCategoryName}
                              onChange={(e) => setEditingCategoryName(e.target.value)}
                              className="w-full text-sm"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="ds-label mb-1 block">Description</label>
                            <input
                              type="text"
                              value={editingCategoryDesc}
                              onChange={(e) => setEditingCategoryDesc(e.target.value)}
                              className="w-full text-sm"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="ds-label mb-1 block">Sort Order</label>
                            <input
                              type="number"
                              value={editingCategorySort}
                              onChange={(e) => setEditingCategorySort(parseInt(e.target.value, 10) || 1)}
                              className="w-full text-sm"
                            />
                          </div>
                          <div className="flex items-end pb-2">
                            <label className="flex items-center gap-2 text-xs text-on-surface cursor-pointer">
                              <input
                                type="checkbox"
                                checked={editingCategoryActive}
                                onChange={(e) => setEditingCategoryActive(e.target.checked)}
                                className="w-4 h-4 rounded text-[#00cec4] focus:ring-[#00cec4]/30"
                              />
                              <span>Active</span>
                            </label>
                          </div>
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            className="px-3 py-1.5 text-xs uppercase"
                            onClick={() => setEditingCategoryId(null)}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="button"
                            className="px-3 py-1.5 text-xs uppercase"
                            onClick={() => handleSaveCategory(cat.id)}
                          >
                            Save
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="ds-h3 text-xs text-on-surface font-semibold uppercase">{cat.name}</h4>
                            <span
                              className={`text-[9px] px-1.5 py-0.5 rounded font-semibold tracking-wide uppercase ${
                                cat.isActive
                                  ? "bg-[#00cec4]/10 text-[#00cec4]"
                                  : "bg-orange-500/10 text-orange-500"
                              }`}
                            >
                              {cat.isActive ? "Active" : "Inactive"}
                            </span>
                            <span className="text-[10px] text-on-surface-variant font-medium ds-numeric">
                              Order: {cat.sortOrder}
                            </span>
                          </div>
                          {cat.description && (
                            <p className="text-xs text-on-surface-variant mt-1">{cat.description}</p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCategoryId(cat.id);
                              setEditingCategoryName(cat.name);
                              setEditingCategoryDesc(cat.description || "");
                              setEditingCategorySort(cat.sortOrder);
                              setEditingCategoryActive(cat.isActive);
                            }}
                            className="text-on-surface-variant hover:text-[#00cec4] transition-colors p-1"
                            title="Edit Category"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCategory(cat.id)}
                            className="text-on-surface-variant hover:text-red-500 transition-colors p-1"
                            title="Delete Category"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Items Section inside Category */}
                    <div className="border-t border-outline-variant/30 pt-3 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="ds-label block text-[11px] font-semibold text-on-surface-variant uppercase">
                          Requirement Items ({cat.items.length})
                        </span>
                        {addingItemCategoryId !== cat.id ? (
                          <Button
                            type="button"
                            variant="outline"
                            className="flex items-center gap-1 px-2.5 py-1 text-[10px] uppercase font-bold tracking-wide"
                            onClick={() => {
                              setAddingItemCategoryId(cat.id);
                              setNewItemName("");
                              setNewItemDesc("");
                              setNewItemSort(cat.items.length + 1);
                              setNewItemRequired(false);
                              setNewItemActive(true);
                            }}
                          >
                            <Plus size={10} />
                            Add Item
                          </Button>
                        ) : null}
                      </div>

                      {/* Add Item form */}
                      {addingItemCategoryId === cat.id && (
                        <div className="p-3.5 rounded-xl border border-outline-variant/40 bg-surface-container-low/40 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-on-surface block">Add Requirement Item</span>
                            <button
                              type="button"
                              onClick={() => setAddingItemCategoryId(null)}
                              className="text-on-surface-variant hover:text-red-500 p-0.5"
                            >
                              <X size={14} />
                            </button>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="ds-label mb-1 block">Item Name *</label>
                              <input
                                type="text"
                                value={newItemName}
                                onChange={(e) => setNewItemName(e.target.value)}
                                className="w-full text-sm"
                                placeholder="e.g. GST Certificate"
                              />
                            </div>
                            <div>
                              <label className="ds-label mb-1 block">Description</label>
                              <input
                                type="text"
                                value={newItemDesc}
                                onChange={(e) => setNewItemDesc(e.target.value)}
                                className="w-full text-sm"
                                placeholder="Item description"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <label className="ds-label mb-1 block">Sort Order</label>
                              <input
                                type="number"
                                value={newItemSort}
                                onChange={(e) => setNewItemSort(parseInt(e.target.value, 10) || 1)}
                                className="w-full text-sm"
                              />
                            </div>
                            <div className="flex items-end pb-2">
                              <label className="flex items-center gap-2 text-xs text-on-surface cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={newItemRequired}
                                  onChange={(e) => setNewItemRequired(e.target.checked)}
                                  className="w-4 h-4 rounded text-[#00cec4] focus:ring-[#00cec4]/30"
                                />
                                <span>Required by Default</span>
                              </label>
                            </div>
                            <div className="flex items-end pb-2">
                              <label className="flex items-center gap-2 text-xs text-on-surface cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={newItemActive}
                                  onChange={(e) => setNewItemActive(e.target.checked)}
                                  className="w-4 h-4 rounded text-[#00cec4] focus:ring-[#00cec4]/30"
                                />
                                <span>Active</span>
                              </label>
                            </div>
                          </div>
                          <div className="flex justify-end gap-2 pt-1">
                            <Button
                              type="button"
                              variant="outline"
                              className="px-2.5 py-1 text-[11px] uppercase"
                              onClick={() => setAddingItemCategoryId(null)}
                            >
                              Cancel
                            </Button>
                            <Button
                              type="button"
                              className="px-2.5 py-1 text-[11px] uppercase"
                              onClick={() => handleSaveItem(cat.id)}
                            >
                              Add
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Items Table */}
                      {cat.items.length > 0 ? (
                        <div className="overflow-hidden rounded-xl border border-outline-variant/20 bg-surface-container-low/40">
                          <table className="ds-table">
                            <thead>
                              <tr>
                                <th>Name</th>
                                <th>Description</th>
                                <th className="w-16">Sort</th>
                                <th className="w-32">Req. Default</th>
                                <th className="w-20">Status</th>
                                <th className="text-right w-24">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {cat.items
                                .sort((a, b) => a.sortOrder - b.sortOrder)
                                .map((item) => {
                                  const isItemEditing = editingItemId === item.id;
                                  return (
                                    <tr key={item.id}>
                                      <td>
                                        {isItemEditing ? (
                                          <input
                                            type="text"
                                            value={editingItemName}
                                            onChange={(e) => setEditingItemName(e.target.value)}
                                            className="w-full text-xs py-1 px-2"
                                          />
                                        ) : (
                                          <span className="font-medium text-xs text-on-surface">{item.name}</span>
                                        )}
                                      </td>
                                      <td>
                                        {isItemEditing ? (
                                          <input
                                            type="text"
                                            value={editingItemDesc}
                                            onChange={(e) => setEditingItemDesc(e.target.value)}
                                            className="w-full text-xs py-1 px-2"
                                          />
                                        ) : (
                                          <span className="text-xs text-on-surface-variant break-all">
                                            {item.description || "—"}
                                          </span>
                                        )}
                                      </td>
                                      <td className="ds-numeric">
                                        {isItemEditing ? (
                                          <input
                                            type="number"
                                            value={editingItemSort}
                                            onChange={(e) => setEditingItemSort(parseInt(e.target.value, 10) || 1)}
                                            className="w-12 text-xs py-1 px-2 text-center bg-transparent"
                                          />
                                        ) : (
                                          item.sortOrder
                                        )}
                                      </td>
                                      <td>
                                        {isItemEditing ? (
                                          <input
                                            type="checkbox"
                                            checked={editingItemRequired}
                                            onChange={(e) => setEditingItemRequired(e.target.checked)}
                                            className="w-4 h-4 text-[#00cec4]"
                                          />
                                        ) : (
                                          <span
                                            className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                                              item.isRequiredDefault
                                                ? "bg-red-500/10 text-red-500"
                                                : "bg-surface-container text-on-surface-variant"
                                            }`}
                                          >
                                            {item.isRequiredDefault ? "Mandatory" : "Optional"}
                                          </span>
                                        )}
                                      </td>
                                      <td>
                                        {isItemEditing ? (
                                          <input
                                            type="checkbox"
                                            checked={editingItemActive}
                                            onChange={(e) => setEditingItemActive(e.target.checked)}
                                            className="w-4 h-4 text-[#00cec4]"
                                          />
                                        ) : (
                                          <span
                                            className={`text-[9px] px-1 py-0.5 rounded font-bold uppercase ${
                                              item.isActive
                                                ? "bg-[#00cec4]/15 text-[#00cec4]"
                                                : "bg-orange-500/15 text-orange-500"
                                            }`}
                                          >
                                            {item.isActive ? "Active" : "Inactive"}
                                          </span>
                                        )}
                                      </td>
                                      <td className="text-right">
                                        <div className="flex justify-end gap-1.5">
                                          {isItemEditing ? (
                                            <>
                                              <button
                                                type="button"
                                                onClick={() => handleSaveItem(cat.id, item.id)}
                                                className="text-[#00cec4] hover:text-[#00b8af] p-1"
                                                title="Save Item"
                                              >
                                                <Save size={13} />
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => setEditingItemId(null)}
                                                className="text-on-surface-variant hover:text-red-500 p-1"
                                                title="Cancel"
                                              >
                                                <X size={13} />
                                              </button>
                                            </>
                                          ) : (
                                            <>
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  setEditingItemId(item.id);
                                                  setEditingItemName(item.name);
                                                  setEditingItemDesc(item.description || "");
                                                  setEditingItemSort(item.sortOrder);
                                                  setEditingItemRequired(item.isRequiredDefault);
                                                  setEditingItemActive(item.isActive);
                                                }}
                                                className="text-on-surface-variant hover:text-[#00cec4] p-1"
                                                title="Edit Item"
                                              >
                                                <Edit size={13} />
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => handleDeleteItem(cat.id, item.id)}
                                                className="text-on-surface-variant hover:text-red-500 p-1"
                                                title="Delete Item"
                                              >
                                                <Trash2 size={13} />
                                              </button>
                                            </>
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-xs text-on-surface-variant italic py-2 pl-2">No requirement items added for this category yet.</p>
                      )}
                    </div>
                  </div>
                ))
            )}
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
