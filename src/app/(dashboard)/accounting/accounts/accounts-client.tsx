"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Folder,
  FolderOpen,
  FileText,
  Plus,
  ChevronRight,
  ChevronDown,
  Info,
  Layers,
  HelpCircle,
  Loader2
} from "lucide-react";
import { createAccountAction } from "@/modules/accounting/actions";

interface AccountsClientProps {
  initialCoa: any[];
  branches: any[];
}

export function AccountsClient({ initialCoa, branches }: AccountsClientProps) {
  const router = useRouter();
  const [coa, setCoa] = useState<any[]>(initialCoa);
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
    // Expand root items by default
    ...initialCoa.reduce((acc, node) => ({ ...acc, [node.id]: true }), {})
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    accountCode: "",
    accountName: "",
    parentAccountId: "",
    rootType: "ASSET" as any,
    accountType: "OTHER" as any,
    isGroup: false,
    isActive: true,
    openingDebit: 0,
    openingCredit: 0,
    branchId: "",
  });

  const toggleNode = (id: string) => {
    setExpandedNodes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Helper to flat list group accounts to select as Parent
  const getGroupAccounts = (nodes: any[]): any[] => {
    let list: any[] = [];
    nodes.forEach((n) => {
      if (n.isGroup) {
        list.push({ id: n.id, name: `${n.accountCode} - ${n.accountName}` });
        if (n.children && n.children.length > 0) {
          list = [...list, ...getGroupAccounts(n.children)];
        }
      }
    });
    return list;
  };

  const groupAccountsList = getGroupAccounts(coa);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.accountCode || !formData.accountName) {
      toast.error("Please fill in required fields");
      return;
    }

    setIsSaving(true);
    try {
      const res = await createAccountAction({
        ...formData,
        parentAccountId: formData.parentAccountId || null,
        branchId: formData.branchId || null,
        openingDebit: parseFloat(formData.openingDebit as any) || 0,
        openingCredit: parseFloat(formData.openingCredit as any) || 0,
      });

      if (res.ok) {
        toast.success("Ledger account registered successfully!");
        setShowAddForm(false);
        setFormData({
          accountCode: "",
          accountName: "",
          parentAccountId: "",
          rootType: "ASSET",
          accountType: "OTHER",
          isGroup: false,
          isActive: true,
          openingDebit: 0,
          openingCredit: 0,
          branchId: "",
        });
        router.refresh();
      } else {
        toast.error(res.error);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to create account");
    } finally {
      setIsSaving(false);
    }
  };

  // Recursive renderer for COA nodes
  const renderNode = (node: any) => {
    const isExpanded = !!expandedNodes[node.id];
    const hasChildren = node.children && node.children.length > 0;

    return (
      <div key={node.id} className="ml-4 space-y-1">
        <div className="flex items-center gap-2 py-1.5 px-2.5 rounded-lg hover:bg-[#161f28]/35 text-xs transition-all select-none">
          {node.isGroup ? (
            <button
              onClick={() => toggleNode(node.id)}
              className="p-0.5 text-slate-400 hover:text-white rounded hover:bg-slate-800/50 cursor-pointer"
            >
              {isExpanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
            </button>
          ) : (
            <span className="w-4.5 shrink-0" />
          )}

          <span className="shrink-0 text-[#00cec4]">
            {node.isGroup ? (
              isExpanded ? <FolderOpen className="size-4" /> : <Folder className="size-4" />
            ) : (
              <FileText className="size-4" />
            )}
          </span>

          <span className="font-mono text-slate-450 font-semibold tracking-wider shrink-0 w-16">{node.accountCode}</span>
          <span className="text-white font-medium">{node.accountName}</span>

          {node.accountType !== "OTHER" && (
            <span className="px-1.5 py-0.5 text-[8px] font-bold rounded uppercase tracking-wider bg-slate-800 text-slate-300 ml-2">
              {node.accountType}
            </span>
          )}

          {!node.isActive && (
            <span className="px-1.5 py-0.5 text-[8px] font-bold rounded uppercase tracking-wider bg-red-500/10 text-red-400 ml-2">
              Inactive
            </span>
          )}
        </div>

        {node.isGroup && isExpanded && hasChildren && (
          <div className="border-l border-[#1c212a]/40 ml-2.5 pl-1.5 space-y-1">
            {node.children.map((child: any) => renderNode(child))}
          </div>
        )}
      </div>
    );
  };

  const rootTypes = ["ASSET", "LIABILITY", "EQUITY", "INCOME", "EXPENSE"];
  const accountTypes = [
    "CASH", "BANK", "RECEIVABLE", "PAYABLE", "TAX", "SALES", "PURCHASE",
    "EXPENSE", "FIXED_ASSET", "DEPRECIATION", "EQUITY", "ROUND_OFF", "OTHER"
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      
      {/* LEFT COLUMN: Tree display */}
      <div className="lg:col-span-2 space-y-4">
        <div className="p-6 rounded-xl bg-[#0f1319] border border-[#1c212a]/55 space-y-4">
          <div className="flex justify-between items-center border-b border-[#1c212a]/30 pb-3">
            <h3 className="font-bold text-xs text-white uppercase tracking-wider flex items-center gap-2">
              <Layers className="size-4.5 text-[#00cec4]" /> Account Structure Tree
            </h3>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-1 bg-[#00cec4] text-white hover:bg-[#00b8af] hover:shadow-[0_0_0_3px_rgba(0,206,196,0.25)] px-3.5 py-1.5 rounded-lg text-xs uppercase tracking-wide font-bold transition-all cursor-pointer"
            >
              <Plus className="size-3.5" />
              <span>Add Account</span>
            </button>
          </div>

          <div className="space-y-2 max-h-[800px] overflow-y-auto pr-2">
            {coa.map((rootNode) => renderNode(rootNode))}
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Form editor */}
      <div className="lg:col-span-1 space-y-6">
        {(showAddForm || groupAccountsList.length === 0) && (
          <div className="p-6 rounded-xl bg-[#0f1319] border border-[#1c212a]/55 space-y-4 card-left-accent">
            <div className="flex items-center gap-3 border-b border-[#1c212a]/30 pb-3 mb-2">
              <Plus className="size-4.5 text-[#00cec4]" />
              <h3 className="font-bold text-sm text-white uppercase tracking-wider">Register Ledger Account</h3>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="ds-label block text-slate-400">Account Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 1131"
                    value={formData.accountCode}
                    onChange={(e) => setFormData({ ...formData, accountCode: e.target.value })}
                    className="w-full bg-[#161f28] border border-[#1c212a] text-white rounded-xl p-2.5 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="ds-label block text-slate-400">Account Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Accounts Receivable Chennai"
                    value={formData.accountName}
                    onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                    className="w-full bg-[#161f28] border border-[#1c212a] text-white rounded-xl p-2.5 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="ds-label block text-slate-400">Parent Group Account</label>
                <select
                  value={formData.parentAccountId}
                  onChange={(e) => setFormData({ ...formData, parentAccountId: e.target.value })}
                  className="w-full bg-[#161f28] border border-[#1c212a] text-white rounded-xl p-2.5 text-xs"
                >
                  <option value="">None (Root Account)</option>
                  {groupAccountsList.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="ds-label block text-slate-400">Classification (Root Type)</label>
                  <select
                    value={formData.rootType}
                    onChange={(e) => setFormData({ ...formData, rootType: e.target.value as any })}
                    className="w-full bg-[#161f28] border border-[#1c212a] text-white rounded-xl p-2.5 text-xs"
                  >
                    {rootTypes.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="ds-label block text-slate-400">Account Function Type</label>
                  <select
                    value={formData.accountType}
                    onChange={(e) => setFormData({ ...formData, accountType: e.target.value as any })}
                    className="w-full bg-[#161f28] border border-[#1c212a] text-white rounded-xl p-2.5 text-xs"
                  >
                    {accountTypes.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="ds-label block text-slate-400">Opening Debit (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.openingDebit}
                    onChange={(e) => setFormData({ ...formData, openingDebit: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-[#161f28] border border-[#1c212a] text-white rounded-xl p-2.5 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="ds-label block text-slate-400">Opening Credit (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.openingCredit}
                    onChange={(e) => setFormData({ ...formData, openingCredit: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-[#161f28] border border-[#1c212a] text-white rounded-xl p-2.5 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="ds-label block text-slate-400">Branch Mapping</label>
                  <select
                    value={formData.branchId}
                    onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                    className="w-full bg-[#161f28] border border-[#1c212a] text-white rounded-xl p-2.5 text-xs"
                  >
                    <option value="">All Branches / Org-wide</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2 pt-5 select-none">
                  <input
                    type="checkbox"
                    id="isGroup"
                    checked={formData.isGroup}
                    onChange={(e) => setFormData({ ...formData, isGroup: e.target.checked })}
                    className="size-4 accent-[#00cec4] rounded bg-slate-900 border-[#1c212a] cursor-pointer"
                  />
                  <label htmlFor="isGroup" className="ds-label block text-slate-200 cursor-pointer">
                    Is Group Account?
                  </label>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="bg-[#00cec4] text-white hover:bg-[#00b8af] hover:shadow-[0_0_0_3px_rgba(0,206,196,0.25)] px-4 py-2.5 rounded-xl text-xs uppercase tracking-wide font-bold transition-all w-full cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      <span>Saving Account...</span>
                    </>
                  ) : (
                    <span>Register Account</span>
                  )}
                </button>
              </div>

            </form>
          </div>
        )}

        <div className="p-6 rounded-xl bg-[#0f1319] border border-[#1c212a]/55 space-y-4">
          <div className="flex items-center gap-3 border-b border-[#1c212a]/30 pb-3">
            <Info className="size-4.5 text-[#00cec4]" strokeWidth={2} />
            <h3 className="font-bold text-xs text-white uppercase tracking-wider">Accounting Definitions</h3>
          </div>
          <div className="space-y-3 text-xs text-slate-400 leading-relaxed">
            <p>
              <strong className="text-white">Group Accounts:</strong> Hierarchical folders (like Current Assets or Accounts Payable) used to group leaf accounts. Debits/Credits cannot be posted to group folders directly.
            </p>
            <p>
              <strong className="text-white">Leaf Accounts:</strong> Active accounts that record physical transactions. Sub-ledgers are automatically maintained for Receivables (Customers) and Payables (Suppliers).
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
