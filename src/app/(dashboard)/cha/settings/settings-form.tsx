"use client";

import {
  ChaNativeSelect as NativeSelect,
  ChaTable,
} from "@/modules/cha/components/workspace/cha-workspace";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {ChevronRight,Edit,Plus,Save,Search,ShieldCheck,Trash2,Truck,Users,Workflow,X,} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {updateSettingsAction,createJobTypeAction,updateJobTypeManifestConfigAction,deleteJobTypeAction,createShipmentTypeAction,deleteShipmentTypeAction,createTeamGroupAction,deleteTeamGroupAction,upsertDocumentCategoryAction,deleteDocumentCategoryAction,upsertDocumentItemAction,deleteDocumentItemAction} from "@/modules/cha/actions";
import { setPortalFeatureFlagAction } from "@/modules/customer-portal/actions";

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
    portalUploadsEnabled: boolean;
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
    filingFlowCategory: string | null;
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


type SettingsTab = "overview" | "numbering" | "access" | "operations" | "taxonomy" | "teams" | "documents";

const SETTINGS_TABS: { key: SettingsTab; label: string; description: string }[] = [
  { key: "overview", label: "Overview", description: "Health, counts, and quick links" },
  { key: "numbering", label: "Numbering", description: "Branch-wise job numbers" },
  { key: "access", label: "Access", description: "Creators and approvals" },
  { key: "operations", label: "Operations", description: "Expenses and workflows" },
  { key: "taxonomy", label: "Clearance Data", description: "Job and shipment types" },
  { key: "teams", label: "Teams", description: "Reusable work groups" },
  { key: "documents", label: "Documents", description: "Required document matrix" },
];

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
  const [activeTab, setActiveTab] = useState<SettingsTab>("overview");
  const [selfApprovalAllowed, setSelfApprovalAllowed] = useState(initialSettings.selfApprovalAllowed);
  const [managerApprovalPolicy, setManagerApprovalPolicy] = useState(initialSettings.managerApprovalPolicy);
  const [portalUploadsEnabled, setPortalUploadsEnabled] = useState(initialSettings.portalUploadsEnabled);
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
      | "isActive"
      | "filingFlowCategory",
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
        filingFlowCategory: jobType.filingFlowCategory,
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

      const portalRes = await setPortalFeatureFlagAction("CUSTOMER_PORTAL_SHIPMENT_UPLOADS", portalUploadsEnabled);

      if (!res.ok) {
        toast.error(res.error || "Failed to update settings.");
        return;
      }
      if (!portalRes.ok) {
        toast.error(portalRes.error || "Failed to update customer portal uploads setting.");
        return;
      }

      toast.success("CHA operational settings updated successfully.");
      router.refresh();
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

  const activeShipmentTypesCount = shipmentTypesList.filter((item) => item.isActive !== false).length;
  const selectedEmployeeNames = jobCreatorUsers
    .map((userId) => availableEmployees.find((employee) => employee.id === userId)?.name)
    .filter(Boolean) as string[];

  const getTabButtonClass = (tabKey: SettingsTab) =>
    `group relative flex min-h-[50px] min-w-0 items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition-all duration-300 ease-out motion-reduce:transition-none ${
      activeTab === tabKey
        ? "mnx-border-accent mnx-bg-accent-soft mnx-text-muted mnx-shadow-panel"
        : "mnx-border-accent mnx-bg-surface mnx-text-muted shadow-sm hover:-translate-y-0.5 mnx-hover-accent mnx-hover-accent mnx-shadow-panel active:scale-[0.99]"
    }`;

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-none space-y-5">
      <section className="w-full space-y-4">
        <div className="flex justify-end">
          <Button type="submit" disabled={loading} className="w-full sm:w-auto transition-all duration-200 hover:-translate-y-0.5 mnx-shadow-panel active:translate-y-0 motion-reduce:transition-none">
            <Save size={16} />
            {loading ? "Saving..." : "Save Configuration"}
          </Button>
        </div>

        <div className="sticky top-0 z-20 grid w-full grid-cols-2 gap-2 py-1 backdrop-blur sm:grid-cols-3 lg:grid-cols-7">
          {SETTINGS_TABS.map((tab) => (
            <Button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={getTabButtonClass(tab.key)}
              title={`${tab.label} — ${tab.description}`}
            >
              <span
                className={`h-2 w-2 shrink-0 rounded-full transition-all duration-200 ${activeTab === tab.key ? "mnx-bg-soft mnx-shadow-panel" : "mnx-bg-accent-soft mnx-bg-accent-soft"}`}
              />
              <span className="min-w-0 flex-1 overflow-hidden">
                <span className="block truncate text-[11px] font-semibold uppercase tracking-[0.1em] xl:text-xs xl:tracking-[0.12em]">{tab.label}</span>
                <span className={`hidden truncate text-[10px] transition-colors 2xl:block ${activeTab === tab.key ? "mnx-text-muted" : "mnx-text-muted mnx-text-primary"}`}>{tab.description}</span>
              </span>
            </Button>
          ))}
        </div>
      </section>

      {activeTab === "overview" ? (
        <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
          <Card>
            <CardHeader>
              <CardTitle>Configuration Health</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="rounded-xl border mnx-border mnx-bg-surface p-4 shadow-sm">
                  <p className="mnx-label mnx-text-muted">Job Creation</p>
                  <p className="mt-1 text-sm mnx-text-primary">
                    {jobCreatorRoles.length} role(s) and {jobCreatorUsers.length} user(s) can create CHA jobs.
                  </p>
                </div>
                <div className="rounded-xl border mnx-border mnx-bg-surface p-4 shadow-sm">
                  <p className="mnx-label mnx-text-muted">Checklist Approval</p>
                  <p className="mt-1 text-sm mnx-text-primary">
                    {managerApprovalPolicy === "ANY" ? "Any assigned manager can approve." : "All assigned managers must approve."}
                  </p>
                </div>
                <div className="rounded-xl border mnx-border mnx-bg-surface p-4 shadow-sm">
                  <p className="mnx-label mnx-text-muted">Expense Categories</p>
                  <p className="mt-1 text-sm mnx-text-primary">{expenseCategories.length} category option(s) available.</p>
                </div>
                <div className="rounded-xl border mnx-border mnx-bg-surface p-4 shadow-sm">
                  <p className="mnx-label mnx-text-muted">Shipment Types</p>
                  <p className="mt-1 text-sm mnx-text-primary">{activeShipmentTypesCount} active shipment type(s).</p>
                </div>
              </div>

              <div className="rounded-xl border mnx-border mnx-bg-surface p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <ShieldCheck size={18} className="mt-0.5 mnx-text-accent" />
                  <div>
                    <p className="text-sm font-medium mnx-text-primary">Recommended setup order</p>
                    <p className="mt-1 text-xs mnx-text-muted">
                      Finish numbering, then clearance data, then document requirements. Access and team groups can be updated anytime.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {SETTINGS_TABS.filter((tab) => tab.key !== "overview").map((tab) => (
                <Button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className="mnx-plain mnx-bg-surface mnx-border mnx-border-accent mnx-shadow-panel flex w-full items-center justify-between rounded-xl border mnx-border mnx-bg-surface px-4 py-3 text-left shadow-sm transition-all"
                >
                  <span>
                    <span className="block text-sm font-medium mnx-text-primary">{tab.label}</span>
                    <span className="block text-xs mnx-text-muted">{tab.description}</span>
                  </span>
                  <ChevronRight size={16} className="mnx-text-muted" />
                </Button>
              ))}

              <a
                href="/customer-portal"
                target="_blank"
                rel="noreferrer"
                className="mnx-plain mnx-bg-surface mnx-border mnx-border-warning mnx-shadow-panel flex w-full items-center justify-between rounded-xl border mnx-border mnx-bg-surface px-4 py-3 text-left shadow-sm transition-all"
                style={{ borderLeftColor: "var(--mnx-warning)" }}
              >
                <span>
                  <span className="block text-sm font-medium mnx-text-warning uppercase">Customer Portal Access ➔</span>
                  <span className="block text-xs mnx-text-muted">Navigate to customer portal login & tracking dashboard</span>
                </span>
                <ChevronRight size={16} className="mnx-text-warning" />
              </a>
            </CardContent>
          </Card>
        </section>
      ) : null}

      {activeTab === "numbering" ? (
        <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
          <Card>
            <CardHeader>
              <CardTitle>Legacy Default</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="space-y-1.5">
                <span className="mnx-label">Default Prefix</span>
                <Input
                  type="text"
                  value={jobNumberPrefix}
                  onChange={(event) => setJobNumberPrefix(event.target.value)}
                  className="w-full text-sm"
                  placeholder="CHA"
                />
              </label>
              <label className="space-y-1.5">
                <span className="mnx-label">Default Next Number</span>
                <Input
                  type="number"
                  min={1}
                  value={jobNumberNextNum}
                  onChange={(event) => setJobNumberNextNum(parseInt(event.target.value, 10) || 1)}
                  className="w-full text-sm mnx-numeric"
                />
              </label>
              <div className="rounded-xl border mnx-border mnx-bg-surface p-3 text-xs mnx-text-muted">
                Branch rules below are the primary numbering source. Legacy defaults are kept only for compatibility.
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Branch Numbering Rules</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3 2xl:grid-cols-2">
                {branchRules.map((rule) => (
                  <div key={rule.branchId} className="rounded-xl border mnx-border mnx-bg-surface p-4 shadow-sm">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold mnx-text-primary">{rule.branchName}</p>
                        <p className="text-xs mnx-text-muted">Code: {rule.branchCode}</p>
                      </div>
                      <label className="flex items-center gap-2 text-xs mnx-text-primary">
                        <Input
                          type="checkbox"
                          checked={rule.isActive}
                          onChange={(event) => updateBranchRule(rule.branchId, { isActive: event.target.checked })}
                        />
                        Active
                      </label>
                    </div>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                      <label className="space-y-1.5">
                        <span className="mnx-label">Prefix</span>
                        <Input type="text" value={rule.prefix} onChange={(event) => updateBranchRule(rule.branchId, { prefix: event.target.value })} className="w-full text-sm" />
                      </label>
                      <label className="space-y-1.5">
                        <span className="mnx-label">Suffix</span>
                        <Input type="text" value={rule.suffix} onChange={(event) => updateBranchRule(rule.branchId, { suffix: event.target.value })} className="w-full text-sm" placeholder="Optional" />
                      </label>
                      <label className="space-y-1.5">
                        <span className="mnx-label">Padding</span>
                        <Input type="number" min={1} value={rule.numberPadding} onChange={(event) => updateBranchRule(rule.branchId, { numberPadding: parseInt(event.target.value, 10) || 1 })} className="w-full text-sm mnx-numeric" />
                      </label>
                      <label className="space-y-1.5">
                        <span className="mnx-label">Start</span>
                        <Input type="number" min={1} value={rule.startingSequence} onChange={(event) => updateBranchRule(rule.branchId, { startingSequence: parseInt(event.target.value, 10) || 1 })} className="w-full text-sm mnx-numeric" />
                      </label>
                      <label className="space-y-1.5">
                        <span className="mnx-label">Current</span>
                        <Input type="number" min={0} value={rule.currentSequence} onChange={(event) => updateBranchRule(rule.branchId, { currentSequence: parseInt(event.target.value, 10) || 0 })} className="w-full text-sm mnx-numeric" />
                      </label>
                      <div className="rounded-xl border mnx-border mnx-bg-surface p-3">
                        <span className="mnx-label">Next Preview</span>
                        <p className="mt-1 break-all text-sm mnx-text-primary mnx-numeric">{getBranchRulePreview(rule)}</p>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                      <label className="flex items-center gap-2 rounded-xl border mnx-border mnx-bg-surface px-3 py-2 text-xs mnx-text-primary">
                        <Input
                          type="checkbox"
                          checked={rule.useFinancialYear}
                          onChange={(event) => updateBranchRule(rule.branchId, { useFinancialYear: event.target.checked })}
                        />
                        Include Financial Year
                      </label>
                      <label className="space-y-1.5">
                        <span className="mnx-label">Financial Year Format</span>
                        <NativeSelect
                          value={rule.financialYearFormat}
                          onChange={(event) => updateBranchRule(rule.branchId, { financialYearFormat: event.target.value })}
                          className="w-full text-sm"
                          disabled={!rule.useFinancialYear}
                        >
                          <option value="YYYY-YY">YYYY-YY</option>
                          <option value="YYYY-YYYY">YYYY-YYYY</option>
                          <option value="YY-YY">YY-YY</option>
                          <option value="YYYYYY">YYYYYY</option>
                        </NativeSelect>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
      ) : null}

      {activeTab === "access" ? (
        <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(340px,0.75fr)]">
          <Card>
            <CardHeader>
              <CardTitle>Job Creator Access</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="mnx-form-section space-y-3">
                <h3>Authorized Roles</h3>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {availableRoles.map((role) => {
                    const checked = jobCreatorRoles.includes(role);
                    return (
                      <label key={role} className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition ${checked ? "mnx-border-accent mnx-bg-surface mnx-text-primary mnx-shadow-panel" : "mnx-border mnx-bg-surface mnx-text-muted mnx-hover-accent mnx-shadow-panel"}`}>
                        <Input type="checkbox" checked={checked} onChange={() => handleRoleToggle(role)} />
                        <span className="text-sm font-medium">{role}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="mnx-form-section space-y-3">
                <h3>Specific Employees</h3>
                <div className="relative">
                  <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 mnx-text-muted" />
                  <Input
                    type="text"
                    placeholder="Search employees by name..."
                    value={employeeSearch}
                    onChange={(event) => setEmployeeSearch(event.target.value)}
                    className="w-full pl-9 text-sm"
                  />
                </div>
                {selectedEmployeeNames.length > 0 ? (
                  <div className="flex flex-wrap gap-2 rounded-xl border mnx-border mnx-bg-surface p-2">
                    {selectedEmployeeNames.map((name) => (
                      <span key={name} className="inline-flex items-center gap-1 rounded-full border mnx-border mnx-bg-surface px-2.5 py-1 text-xs mnx-text-primary">
                        {name}
                      </span>
                    ))}
                  </div>
                ) : null}
                <div className="grid max-h-72 grid-cols-1 gap-2 overflow-y-auto rounded-xl border mnx-border mnx-bg-surface p-2 md:grid-cols-2">
                  {filteredEmployees.length === 0 ? (
                    <p className="p-3 text-xs mnx-text-muted">No matching employees found.</p>
                  ) : (
                    filteredEmployees.map((employee) => {
                      const checked = jobCreatorUsers.includes(employee.id);
                      return (
                        <label key={employee.id} className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 transition ${checked ? "mnx-border-accent mnx-bg-surface mnx-text-primary mnx-shadow-panel" : "mnx-border mnx-bg-surface mnx-text-muted mnx-hover-accent mnx-shadow-panel"}`}>
                          <Input type="checkbox" checked={checked} onChange={() => handleUserToggle(employee.id)} />
                          <span className="text-sm">{employee.name}</span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Checklist Approval</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border mnx-border mnx-bg-surface p-4 shadow-sm">
                <Input
                  type="checkbox"
                  checked={selfApprovalAllowed}
                  onChange={(event) => setSelfApprovalAllowed(event.target.checked)}
                  className="mt-1"
                />
                <span>
                  <span className="block text-sm font-semibold mnx-text-primary">Allow Self-Approval</span>
                  <span className="mt-1 block text-xs mnx-text-muted">Job owners with permission can approve without routing.</span>
                </span>
              </label>

              <label className="flex cursor-pointer items-start gap-3 rounded-xl border mnx-border mnx-bg-surface p-4 shadow-sm">
                <Input
                  type="checkbox"
                  checked={portalUploadsEnabled}
                  onChange={(event) => setPortalUploadsEnabled(event.target.checked)}
                  className="mt-1"
                />
                <span>
                  <span className="block text-sm font-semibold mnx-text-accent">Enable Customer Portal Document Uploads</span>
                  <span className="mt-1 block text-xs mnx-text-muted">Allow authorized customer portal contacts to upload KYC and shipment documents.</span>
                </span>
              </label>
              <div className="rounded-xl border mnx-border mnx-bg-surface p-4 shadow-sm">
                <p className="text-sm font-semibold mnx-text-primary">Manager Approval Policy</p>
                <div className="mt-3 space-y-2">
                  <label className="flex cursor-pointer items-center gap-2 text-sm mnx-text-primary">
                    <Input type="radio" name="approvalPolicy" value="ANY" checked={managerApprovalPolicy === "ANY"} onChange={() => setManagerApprovalPolicy("ANY")} />
                    ANY manager can approve
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-sm mnx-text-primary">
                    <Input type="radio" name="approvalPolicy" value="ALL" checked={managerApprovalPolicy === "ALL"} onChange={() => setManagerApprovalPolicy("ALL")} />
                    ALL managers must approve
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      ) : null}

      {activeTab === "operations" ? (
        <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.65fr)]">
          <Card>
            <CardHeader>
              <CardTitle>Expense Categories</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Type category and press Enter"
                  value={categoryInput}
                  onChange={(event) => setCategoryInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      const trimmed = categoryInput.trim();
                      if (trimmed && !expenseCategories.includes(trimmed)) {
                        setExpenseCategories((prev) => [...prev, trimmed]);
                        setCategoryInput("");
                      }
                    }
                  }}
                  className="w-full text-sm"
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
                >
                  <Plus size={14} />
                  Add
                </Button>
              </div>
              <div className="flex min-h-24 flex-wrap content-start gap-2 rounded-xl border mnx-border mnx-bg-surface p-3">
                {expenseCategories.length === 0 ? (
                  <p className="self-center text-xs mnx-text-muted">No categories added yet.</p>
                ) : (
                  expenseCategories.map((category) => (
                    <span key={category} className="inline-flex items-center gap-2 rounded-full border mnx-border mnx-bg-surface px-3 py-1.5 text-xs font-medium mnx-text-primary">
                      {category}
                      <Button type="button" onClick={() => setExpenseCategories((prev) => prev.filter((entry) => entry !== category))} className="mnx-text-muted hover:text-destructive" aria-label={`Remove ${category}`}>
                        <X size={12} />
                      </Button>
                    </span>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Filing Workflows</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-xl border mnx-border mnx-bg-surface p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <Workflow size={20} className="mt-0.5 mnx-text-accent" />
                    <div>
                      <p className="text-sm font-semibold mnx-text-primary">Node-based filing blueprint</p>
                      <p className="mt-1 text-xs mnx-text-muted">Manage Import BE, Export SB, RMS, Open Bill, and custom routes in the workflow builder.</p>
                    </div>
                  </div>
                </div>
                <Button type="button" variant="outline" className="w-full justify-between" onClick={() => router.push("/cha/settings/filing-workflows")}>
                  Manage Filing Workflows
                  <ChevronRight size={16} />
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Shipment Intelligence</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-xl border border-dashed mnx-border mnx-bg-surface p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold mnx-text-primary">Live shipment tracking</p>
                        <Badge variant="warning" className="mnx-border-warning mnx-bg-warning mnx-text-warning mnx-text-accent">
                          Future Work
                        </Badge>
                      </div>
                      <p className="text-xs mnx-text-muted">
                        This overview widget is currently disabled. Enablement, external tracking integration, and map intelligence are planned for a later release.
                      </p>
                    </div>
                    <label className="flex items-center gap-2 rounded-full border mnx-border mnx-bg-soft px-3 py-1.5 text-xs mnx-text-muted">
                      <Input
                        type="checkbox"
                        checked={false}
                        disabled
                        aria-label="Enable live shipment tracking"
                      />
                      Coming soon
                    </label>
                  </div>
                </div>
                <div className="rounded-xl border mnx-border mnx-bg-soft p-3 text-xs mnx-text-muted">
                  Keep this off for now. The setting is shown only as a placeholder so future rollout can be controlled from CHA settings once the backend configuration is ready.
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      ) : null}

      {activeTab === "taxonomy" ? (
        <section className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Clearance Job Types</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl border mnx-border mnx-bg-surface p-4 shadow-sm">
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-5">
                  <label className="space-y-1.5 lg:col-span-2">
                    <span className="mnx-label">Type Name</span>
                    <Input type="text" placeholder="Import Clearance" value={newJobTypeName} onChange={(event) => setNewJobTypeName(event.target.value)} className="w-full text-sm" />
                  </label>
                  <label className="space-y-1.5">
                    <span className="mnx-label">Direction</span>
                    <NativeSelect value={newJobTypeMovementDirection} onChange={(event) => setNewJobTypeMovementDirection(event.target.value as "IMPORT" | "EXPORT" | "BOTH" | "OTHER")} className="w-full text-sm">
                      <option value="IMPORT">Import</option>
                      <option value="EXPORT">Export</option>
                      <option value="BOTH">Both</option>
                      <option value="OTHER">Other</option>
                    </NativeSelect>
                  </label>
                  <label className="space-y-1.5">
                    <span className="mnx-label">Manifest</span>
                    <NativeSelect value={newJobTypeManifestRequirement} onChange={(event) => setNewJobTypeManifestRequirement(event.target.value as "IGM" | "EGM" | "BOTH" | "NONE" | "CUSTOM")} className="w-full text-sm">
                      <option value="IGM">IGM</option>
                      <option value="EGM">EGM</option>
                      <option value="BOTH">Both</option>
                      <option value="NONE">None</option>
                      <option value="CUSTOM">Custom</option>
                    </NativeSelect>
                  </label>
                  <div className="flex items-end">
                    <Button type="button" disabled={addingJobType || !newJobTypeName.trim()} onClick={handleAddJobType} className="w-full">
                      <Plus size={14} />
                      Add Type
                    </Button>
                  </div>
                  {newJobTypeManifestRequirement === "CUSTOM" ? (
                    <label className="space-y-1.5 lg:col-span-2">
                      <span className="mnx-label">Custom Manifest Label</span>
                      <Input type="text" value={newJobTypeCustomManifestLabel} onChange={(event) => setNewJobTypeCustomManifestLabel(event.target.value)} className="w-full text-sm" />
                    </label>
                  ) : null}
                  <label className="space-y-1.5 lg:col-span-2">
                    <span className="mnx-label">Help Text</span>
                    <Input type="text" value={newJobTypeManifestHelpText} onChange={(event) => setNewJobTypeManifestHelpText(event.target.value)} className="w-full text-sm" />
                  </label>
                  <label className="flex items-center gap-2 self-end rounded-xl border mnx-border mnx-bg-surface px-3 py-2 text-xs mnx-text-primary">
                    <Input type="checkbox" checked={newJobTypeManifestMandatory} onChange={(event) => setNewJobTypeManifestMandatory(event.target.checked)} />
                    Mandatory
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                {jobTypesList.length === 0 ? (
                  <div className="rounded-xl border border-dashed mnx-border mnx-bg-surface p-6 text-center text-sm mnx-text-muted">No clearance job types added yet.</div>
                ) : (
                  jobTypesList.map((jobType) => (
                    <div key={jobType.id} className="rounded-xl border mnx-border mnx-bg-surface p-4 shadow-sm shadow-sm">
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div>
                          <p className="mnx-label mnx-text-muted">Clearance Type</p>
                          <Input type="text" value={jobType.name} onChange={(event) => handleJobTypeFieldChange(jobType.id, "name", event.target.value)} className="mt-1 w-full text-sm" />
                        </div>
                        <Button type="button" onClick={() => handleDeleteJobType(jobType.id, jobType.name)} className="rounded-lg p-2 mnx-text-muted mnx-hover-accent hover:text-destructive" aria-label="Delete job type">
                          <Trash2 size={15} />
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <label className="space-y-1.5">
                          <span className="mnx-label">Direction</span>
                          <NativeSelect value={jobType.movementDirection || "OTHER"} onChange={(event) => handleJobTypeFieldChange(jobType.id, "movementDirection", event.target.value)} className="w-full text-sm">
                            <option value="IMPORT">Import</option>
                            <option value="EXPORT">Export</option>
                            <option value="BOTH">Both</option>
                            <option value="OTHER">Other</option>
                          </NativeSelect>
                        </label>
                        <label className="space-y-1.5">
                          <span className="mnx-label">Manifest</span>
                          <NativeSelect value={jobType.manifestRequirement || "NONE"} onChange={(event) => handleJobTypeFieldChange(jobType.id, "manifestRequirement", event.target.value)} className="w-full text-sm">
                            <option value="IGM">IGM</option>
                            <option value="EGM">EGM</option>
                            <option value="BOTH">Both</option>
                            <option value="NONE">None</option>
                            <option value="CUSTOM">Custom</option>
                          </NativeSelect>
                        </label>
                        {jobType.manifestRequirement === "CUSTOM" ? (
                          <label className="space-y-1.5 md:col-span-2">
                            <span className="mnx-label">Custom Manifest Label</span>
                            <Input type="text" value={jobType.customManifestLabel || ""} onChange={(event) => handleJobTypeFieldChange(jobType.id, "customManifestLabel", event.target.value)} className="w-full text-sm" />
                          </label>
                        ) : null}
                        <label className="space-y-1.5 md:col-span-2">
                          <span className="mnx-label">Help Text</span>
                          <Input type="text" value={jobType.manifestHelpText || ""} onChange={(event) => handleJobTypeFieldChange(jobType.id, "manifestHelpText", event.target.value)} className="w-full text-sm" />
                        </label>
                        <label className="space-y-1.5">
                          <span className="mnx-label">Filing Flow</span>
                          <NativeSelect value={jobType.filingFlowCategory || ""} onChange={(event) => handleJobTypeFieldChange(jobType.id, "filingFlowCategory", event.target.value || null)} className="w-full text-sm">
                            <option value="">Catch-all Template</option>
                            <option value="IMPORT_BE">Import / Bill of Entry</option>
                            <option value="EXPORT_SB">Export / Shipping Bill</option>
                            <option value="CUSTOM">Custom Flow</option>
                          </NativeSelect>
                        </label>
                        <div className="grid grid-cols-2 gap-2 self-end">
                          <label className="flex items-center gap-2 rounded-xl border mnx-border mnx-bg-surface px-3 py-2 text-xs mnx-text-primary">
                            <Input type="checkbox" checked={jobType.isManifestMandatory} onChange={(event) => handleJobTypeFieldChange(jobType.id, "isManifestMandatory", event.target.checked)} />
                            Mandatory
                          </label>
                          <label className="flex items-center gap-2 rounded-xl border mnx-border mnx-bg-surface px-3 py-2 text-xs mnx-text-primary">
                            <Input type="checkbox" checked={jobType.isActive} onChange={(event) => handleJobTypeFieldChange(jobType.id, "isActive", event.target.checked)} />
                            Active
                          </label>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border mnx-border mnx-bg-surface px-3 py-2">
                        <span className="text-xs mnx-text-muted">
                          Required manifest: <span className="font-medium mnx-text-primary">{jobType.manifestRequirement === "CUSTOM" ? jobType.customManifestLabel || "Custom" : jobType.manifestRequirement || "None"}</span>
                        </span>
                        <Button type="button" size="sm" onClick={() => handleSaveJobType(jobType)} disabled={savingJobTypeId === jobType.id}>
                          {savingJobTypeId === jobType.id ? "Saving..." : "Save"}
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Shipment Types</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Rail, Sea, Air..."
                  value={newShipmentTypeName}
                  onChange={(event) => setNewShipmentTypeName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      handleAddShipmentType();
                    }
                  }}
                  className="w-full text-sm"
                />
                <Button type="button" disabled={addingShipmentType || !newShipmentTypeName.trim()} onClick={handleAddShipmentType}>
                  <Plus size={14} />
                  Add
                </Button>
              </div>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
                {shipmentTypesList.length === 0 ? (
                  <div className="rounded-xl border border-dashed mnx-border mnx-bg-surface p-5 text-center text-sm mnx-text-muted md:col-span-2 xl:col-span-3">No shipment types added yet.</div>
                ) : (
                  shipmentTypesList.map((shipmentType) => (
                    <div key={shipmentType.id} className="flex items-center justify-between rounded-xl border mnx-border mnx-bg-surface px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <Truck size={15} className="mnx-text-muted" />
                        <span className="text-sm font-medium mnx-text-primary">{shipmentType.name}</span>
                      </div>
                      <Button type="button" onClick={() => handleDeleteShipmentType(shipmentType.id, shipmentType.name)} className="rounded-lg p-1.5 mnx-text-muted mnx-hover-accent hover:text-destructive" aria-label="Delete shipment type">
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </section>
      ) : null}

      {activeTab === "teams" ? (
        <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
          <Card>
            <CardHeader>
              <CardTitle>Create Team Group</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="space-y-1.5">
                <span className="mnx-label">Group Name</span>
                <Input type="text" placeholder="Documentation Team" value={newGroupName} onChange={(event) => setNewGroupName(event.target.value)} className="w-full text-sm" />
              </label>
              <label className="space-y-1.5">
                <span className="mnx-label">Search Members</span>
                <Input type="text" placeholder="Search employees..." value={groupMemberSearch} onChange={(event) => setGroupMemberSearch(event.target.value)} className="w-full text-sm" />
              </label>
              <div className="grid max-h-64 grid-cols-1 gap-2 overflow-y-auto rounded-xl border mnx-border mnx-bg-surface p-2">
                {availableEmployees
                  .filter((employee) => employee.name.toLowerCase().includes(groupMemberSearch.toLowerCase()))
                  .map((employee) => {
                    const checked = groupMembers.includes(employee.id);
                    return (
                      <label key={employee.id} className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 ${checked ? "border-primary mnx-bg-surface" : "mnx-border mnx-bg-surface mnx-hover-accent"}`}>
                        <Input type="checkbox" checked={checked} onChange={() => handleGroupMemberToggle(employee.id)} />
                        <span className="text-sm mnx-text-primary">{employee.name}</span>
                      </label>
                    );
                  })}
              </div>
              <Button type="button" disabled={addingGroup || !newGroupName.trim() || groupMembers.length === 0} onClick={handleAddTeamGroup} className="w-full">
                <Users size={16} />
                {addingGroup ? "Creating..." : "Create Team Group"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Configured Team Groups</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {teamGroupsList.length === 0 ? (
                  <div className="rounded-xl border border-dashed mnx-border mnx-bg-surface p-8 text-center text-sm mnx-text-muted lg:col-span-2">No team groups configured yet.</div>
                ) : (
                  teamGroupsList.map((group) => {
                    const memberIds = parseJsonArray(group.memberIds);
                    const memberNames = memberIds.map((id) => availableEmployees.find((employee) => employee.id === id)?.name).filter(Boolean);
                    return (
                      <div key={group.id} className="mnx-bg-surface mnx-border mnx-border-accent rounded-xl border mnx-border mnx-bg-surface p-4 shadow-sm shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold mnx-text-primary">{group.name}</p>
                            <p className="mt-1 text-xs mnx-text-muted">{memberNames.length} member(s)</p>
                          </div>
                          <Button type="button" onClick={() => handleDeleteTeamGroup(group.id, group.name)} className="rounded-lg p-1.5 mnx-text-muted mnx-hover-accent hover:text-destructive" aria-label="Delete team group">
                            <Trash2 size={14} />
                          </Button>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {memberNames.map((name) => (
                            <span key={name} className="rounded-full border mnx-border mnx-bg-surface px-2 py-0.5 text-[11px] mnx-text-muted">{name}</span>
                          ))}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </section>
      ) : null}

      {activeTab === "documents" ? (
        <section className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Document Requirements</CardTitle>
                  <p className="mt-1 text-xs mnx-text-muted">Manage category headings and required document items without making the page endlessly long.</p>
                </div>
                {!isAddingCategory ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setNewCategoryName("");
                      setNewCategoryDesc("");
                      setNewCategorySort(docCategories.length + 1);
                      setNewCategoryActive(true);
                      setIsAddingCategory(true);
                    }}
                  >
                    <Plus size={14} />
                    Add Category
                  </Button>
                ) : null}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {isAddingCategory ? (
                <div className="rounded-xl border mnx-border mnx-bg-surface p-4 shadow-sm">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold mnx-text-primary">New Document Category</p>
                    <Button type="button" onClick={() => setIsAddingCategory(false)} className="rounded-lg p-1.5 mnx-text-muted mnx-hover-accent hover:text-destructive" aria-label="Cancel category">
                      <X size={14} />
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-5">
                    <label className="space-y-1.5 lg:col-span-2">
                      <span className="mnx-label">Category Name</span>
                      <Input type="text" value={newCategoryName} onChange={(event) => setNewCategoryName(event.target.value)} className="w-full text-sm" />
                    </label>
                    <label className="space-y-1.5 lg:col-span-2">
                      <span className="mnx-label">Description</span>
                      <Input type="text" value={newCategoryDesc} onChange={(event) => setNewCategoryDesc(event.target.value)} className="w-full text-sm" />
                    </label>
                    <label className="space-y-1.5">
                      <span className="mnx-label">Sort</span>
                      <Input type="number" value={newCategorySort} onChange={(event) => setNewCategorySort(parseInt(event.target.value, 10) || 1)} className="w-full text-sm mnx-numeric" />
                    </label>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <label className="flex items-center gap-2 text-xs mnx-text-primary">
                      <Input type="checkbox" checked={newCategoryActive} onChange={(event) => setNewCategoryActive(event.target.checked)} />
                      Active
                    </label>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" onClick={() => setIsAddingCategory(false)}>Cancel</Button>
                      <Button type="button" onClick={() => handleSaveCategory()} disabled={!newCategoryName.trim()}>Save Category</Button>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="space-y-3">
                {docCategories.length === 0 ? (
                  <div className="rounded-xl border border-dashed mnx-border mnx-bg-surface p-8 text-center text-sm mnx-text-muted">No document requirement categories configured yet.</div>
                ) : (
                  [...docCategories]
                    .sort((left, right) => left.sortOrder - right.sortOrder)
                    .map((category) => (
                      <div key={category.id} className="rounded-xl border mnx-border mnx-bg-surface shadow-sm">
                        {editingCategoryId === category.id ? (
                          <div className="border-b mnx-border mnx-bg-surface p-4">
                            <div className="grid grid-cols-1 gap-3 lg:grid-cols-5">
                              <label className="space-y-1.5 lg:col-span-2">
                                <span className="mnx-label">Category Name</span>
                                <Input type="text" value={editingCategoryName} onChange={(event) => setEditingCategoryName(event.target.value)} className="w-full text-sm" />
                              </label>
                              <label className="space-y-1.5 lg:col-span-2">
                                <span className="mnx-label">Description</span>
                                <Input type="text" value={editingCategoryDesc} onChange={(event) => setEditingCategoryDesc(event.target.value)} className="w-full text-sm" />
                              </label>
                              <label className="space-y-1.5">
                                <span className="mnx-label">Sort</span>
                                <Input type="number" value={editingCategorySort} onChange={(event) => setEditingCategorySort(parseInt(event.target.value, 10) || 1)} className="w-full text-sm mnx-numeric" />
                              </label>
                            </div>
                            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                              <label className="flex items-center gap-2 text-xs mnx-text-primary">
                                <Input type="checkbox" checked={editingCategoryActive} onChange={(event) => setEditingCategoryActive(event.target.checked)} />
                                Active
                              </label>
                              <div className="flex gap-2">
                                <Button type="button" variant="outline" onClick={() => setEditingCategoryId(null)}>Cancel</Button>
                                <Button type="button" onClick={() => handleSaveCategory(category.id)}>Save</Button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-3 border-b mnx-border p-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-semibold mnx-text-primary">{category.name}</p>
                                <Badge variant={category.isActive ? "success" : "warning"}>{category.isActive ? "Active" : "Inactive"}</Badge>
                                <Badge variant="secondary">Order {category.sortOrder}</Badge>
                                <Badge variant="secondary">{category.items.length} items</Badge>
                              </div>
                              {category.description ? <p className="mt-1 text-xs mnx-text-muted">{category.description}</p> : null}
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setEditingCategoryId(category.id);
                                  setEditingCategoryName(category.name);
                                  setEditingCategoryDesc(category.description || "");
                                  setEditingCategorySort(category.sortOrder);
                                  setEditingCategoryActive(category.isActive);
                                }}
                              >
                                <Edit size={14} />
                                Edit
                              </Button>
                              <Button type="button" variant="outline" size="sm" onClick={() => handleDeleteCategory(category.id)}>
                                <Trash2 size={14} />
                                Delete
                              </Button>
                              {addingItemCategoryId !== category.id ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() => {
                                    setAddingItemCategoryId(category.id);
                                    setNewItemName("");
                                    setNewItemDesc("");
                                    setNewItemSort(category.items.length + 1);
                                    setNewItemRequired(false);
                                    setNewItemActive(true);
                                  }}
                                >
                                  <Plus size={14} />
                                  Add Item
                                </Button>
                              ) : null}
                            </div>
                          </div>
                        )}

                        {addingItemCategoryId === category.id ? (
                          <div className="border-b mnx-border mnx-bg-surface p-4">
                            <div className="mb-3 flex items-center justify-between">
                              <p className="text-sm font-semibold mnx-text-primary">Add Requirement Item</p>
                              <Button type="button" onClick={() => setAddingItemCategoryId(null)} className="rounded-lg p-1.5 mnx-text-muted mnx-hover-accent hover:text-destructive" aria-label="Cancel item">
                                <X size={14} />
                              </Button>
                            </div>
                            <div className="grid grid-cols-1 gap-3 lg:grid-cols-5">
                              <label className="space-y-1.5 lg:col-span-2">
                                <span className="mnx-label">Item Name</span>
                                <Input type="text" value={newItemName} onChange={(event) => setNewItemName(event.target.value)} className="w-full text-sm" />
                              </label>
                              <label className="space-y-1.5 lg:col-span-2">
                                <span className="mnx-label">Description</span>
                                <Input type="text" value={newItemDesc} onChange={(event) => setNewItemDesc(event.target.value)} className="w-full text-sm" />
                              </label>
                              <label className="space-y-1.5">
                                <span className="mnx-label">Sort</span>
                                <Input type="number" value={newItemSort} onChange={(event) => setNewItemSort(parseInt(event.target.value, 10) || 1)} className="w-full text-sm mnx-numeric" />
                              </label>
                            </div>
                            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                              <div className="flex flex-wrap gap-3 text-xs mnx-text-primary">
                                <label className="flex items-center gap-2"><Input type="checkbox" checked={newItemRequired} onChange={(event) => setNewItemRequired(event.target.checked)} /> Required by default</label>
                                <label className="flex items-center gap-2"><Input type="checkbox" checked={newItemActive} onChange={(event) => setNewItemActive(event.target.checked)} /> Active</label>
                              </div>
                              <div className="flex gap-2">
                                <Button type="button" variant="outline" onClick={() => setAddingItemCategoryId(null)}>Cancel</Button>
                                <Button type="button" onClick={() => handleSaveItem(category.id)} disabled={!newItemName.trim()}>Add Item</Button>
                              </div>
                            </div>
                          </div>
                        ) : null}

                        <div className="overflow-x-auto">
                          <ChaTable className="mnx-cha-table">
                            <thead>
                              <tr>
                                <th>Name</th>
                                <th>Description</th>
                                <th>Sort</th>
                                <th>Required</th>
                                <th>Status</th>
                                <th className="text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {category.items.length === 0 ? (
                                <tr>
                                  <td colSpan={6} className="text-center text-sm mnx-text-muted">No requirement items added for this category yet.</td>
                                </tr>
                              ) : (
                                [...category.items]
                                  .sort((left, right) => left.sortOrder - right.sortOrder)
                                  .map((item) => {
                                    const isEditingItem = editingItemId === item.id;
                                    return (
                                      <tr key={item.id}>
                                        <td>
                                          {isEditingItem ? (
                                            <Input type="text" value={editingItemName} onChange={(event) => setEditingItemName(event.target.value)} className="w-full text-xs" />
                                          ) : (
                                            <span className="text-sm font-medium mnx-text-primary">{item.name}</span>
                                          )}
                                        </td>
                                        <td>
                                          {isEditingItem ? (
                                            <Input type="text" value={editingItemDesc} onChange={(event) => setEditingItemDesc(event.target.value)} className="w-full text-xs" />
                                          ) : (
                                            <span className="text-xs mnx-text-muted">{item.description || "—"}</span>
                                          )}
                                        </td>
                                        <td className="mnx-numeric">
                                          {isEditingItem ? (
                                            <Input type="number" value={editingItemSort} onChange={(event) => setEditingItemSort(parseInt(event.target.value, 10) || 1)} className="w-20 text-xs mnx-numeric" />
                                          ) : (
                                            item.sortOrder
                                          )}
                                        </td>
                                        <td>
                                          {isEditingItem ? (
                                            <Input type="checkbox" checked={editingItemRequired} onChange={(event) => setEditingItemRequired(event.target.checked)} />
                                          ) : (
                                            <Badge variant={item.isRequiredDefault ? "destructive" : "secondary"}>{item.isRequiredDefault ? "Mandatory" : "Optional"}</Badge>
                                          )}
                                        </td>
                                        <td>
                                          {isEditingItem ? (
                                            <Input type="checkbox" checked={editingItemActive} onChange={(event) => setEditingItemActive(event.target.checked)} />
                                          ) : (
                                            <Badge variant={item.isActive ? "success" : "warning"}>{item.isActive ? "Active" : "Inactive"}</Badge>
                                          )}
                                        </td>
                                        <td className="text-right">
                                          <div className="flex justify-end gap-1">
                                            {isEditingItem ? (
                                              <>
                                                <Button type="button" variant="outline" mode="icon" size="sm" onClick={() => handleSaveItem(category.id, item.id)} aria-label="Save item"><Save size={13} /></Button>
                                                <Button type="button" variant="outline" mode="icon" size="sm" onClick={() => setEditingItemId(null)} aria-label="Cancel item"><X size={13} /></Button>
                                              </>
                                            ) : (
                                              <>
                                                <Button
                                                  type="button"
                                                  variant="outline"
                                                  mode="icon"
                                                  size="sm"
                                                  onClick={() => {
                                                    setEditingItemId(item.id);
                                                    setEditingItemName(item.name);
                                                    setEditingItemDesc(item.description || "");
                                                    setEditingItemSort(item.sortOrder);
                                                    setEditingItemRequired(item.isRequiredDefault);
                                                    setEditingItemActive(item.isActive);
                                                  }}
                                                  aria-label="Edit item"
                                                >
                                                  <Edit size={13} />
                                                </Button>
                                                <Button type="button" variant="outline" mode="icon" size="sm" onClick={() => handleDeleteItem(category.id, item.id)} aria-label="Delete item">
                                                  <Trash2 size={13} />
                                                </Button>
                                              </>
                                            )}
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  })
                              )}
                            </tbody>
                          </ChaTable>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </CardContent>
          </Card>
        </section>
      ) : null}

    </form>
  );
}
