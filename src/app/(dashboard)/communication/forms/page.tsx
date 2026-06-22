"use client";

import React, { useEffect, useState, useTransition } from "react";
import { Plus, Settings, AlertCircle, FileText, CheckSquare, Trash, BarChart3, Lock, Unlock } from "lucide-react";
import { useSession } from "next-auth/react";
import {
  listForms,
  createForm,
  getFormWithFields,
  listFormResponses,
  toggleFormStatus,
} from "@/modules/communication/form.service";

export default function FormsPage() {
  const { data: session } = useSession();
  const [forms, setForms] = useState<any[]>([]);
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const [formDetails, setFormDetails] = useState<any>(null);
  const [responses, setResponses] = useState<any[]>([]);

  // Creation form
  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [fields, setFields] = useState<any[]>([
    { label: "Full Name", type: "TEXT", required: true, options: "" },
  ]);

  const [isPending, startTransition] = useTransition();

  const reloadForms = () => {
    const userId = session?.user?.id;
    const orgId = session?.user?.orgId;
    if (userId && orgId) {
      listForms(userId, orgId).then((res) => {
        setForms(res);
      });
    }
  };

  useEffect(() => {
    reloadForms();
  }, [session]);

  useEffect(() => {
    const userId = session?.user?.id;
    const orgId = session?.user?.orgId;
    if (selectedFormId && orgId && userId) {
      getFormWithFields(orgId, selectedFormId).then((res) => {
        setFormDetails(res);
      });
      listFormResponses(userId, orgId, selectedFormId).then((res) => {
        setResponses(res);
      });
    } else {
      setFormDetails(null);
      setResponses([]);
    }
  }, [selectedFormId, session]);

  const handleAddField = () => {
    setFields((prev) => [...prev, { label: "", type: "TEXT", required: false, options: "" }]);
  };

  const handleFieldChange = (index: number, key: string, value: any) => {
    setFields((prev) => {
      const nextFields = [...prev];
      nextFields[index] = { ...nextFields[index], [key]: value };
      return nextFields;
    });
  };

  const handleRemoveField = (index: number) => {
    setFields((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleCreate = () => {
    const userId = session?.user?.id;
    const orgId = session?.user?.orgId;
    if (!title || !userId || !orgId) return;

    startTransition(async () => {
      try {
        await createForm(userId, orgId, {
          title,
          description: description || undefined,
          fields,
        });

        setIsCreating(false);
        setTitle("");
        setDescription("");
        setFields([{ label: "Full Name", type: "TEXT", required: true, options: "" }]);
        reloadForms();
      } catch (err) {
        console.error(err);
      }
    });
  };

  const handleToggleActive = (id: string, activeState: boolean) => {
    const userId = session?.user?.id;
    const orgId = session?.user?.orgId;
    if (!userId || !orgId) return;
    toggleFormStatus(userId, orgId, id, activeState).then(() => {
      reloadForms();
      setSelectedFormId(id); // Reload details
    });
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-140px)] min-h-0">
      
      {/* 1. Forms list index */}
      <div className="w-full lg:w-80 shrink-0 flex flex-col bg-[var(--color-surface)] border border-[var(--color-outline-variant)] rounded-xl overflow-hidden min-h-0">
        <div className="p-4 border-b border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)] flex justify-between items-center shrink-0">
          <h3 className="ds-h3 text-white text-xs font-bold uppercase tracking-wider">
            Operational Forms
          </h3>
          <button
            onClick={() => setIsCreating(true)}
            className="p-1.5 rounded-lg bg-[#00cec4]/10 text-[#00cec4] hover:bg-[#00cec4]/20 transition-all cursor-pointer border-0"
            title="Create Custom Form"
          >
            <Plus size={14} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {forms.map((f) => {
            const isActive = f.id === selectedFormId;
            return (
              <button
                key={f.id}
                onClick={() => setSelectedFormId(f.id)}
                className={`w-full text-left p-3 rounded-xl transition-all border cursor-pointer flex justify-between items-start gap-2 ${
                  isActive
                    ? "bg-[#00cec4]/10 text-[#00cec4] border-[#00cec4]/30"
                    : "bg-[var(--color-surface-container-low)] text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container)] hover:text-white border-[var(--color-outline-variant)]/60"
                }`}
              >
                <div className="min-w-0">
                  <span className="text-[8px] text-[var(--color-on-surface-variant)] font-semibold block uppercase">
                    Status: {f.isActive ? "Active" : "Closed"}
                  </span>
                  <h4 className="text-white text-xs font-bold truncate leading-snug font-sans uppercase mt-0.5">
                    {f.title}
                  </h4>
                  <span className="text-[8px] text-[var(--color-on-surface-variant)] block font-mono">
                    Submissions: {f._count?.responses || 0}
                  </span>
                </div>
              </button>
            );
          })}
          {forms.length === 0 && (
            <span className="text-[10px] text-[var(--color-on-surface-variant)] block px-3 py-4 italic uppercase">
              No custom forms set
            </span>
          )}
        </div>
      </div>

      {/* 2. Responses table view / Fields checklist */}
      <div className="flex-1 bg-[var(--color-surface)] border border-[var(--color-outline-variant)] rounded-xl overflow-hidden flex flex-col min-h-0">
        {formDetails ? (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Header info */}
            <div className="p-5 border-b border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)] flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-white text-sm font-bold font-sans uppercase">
                  {formDetails.title}
                </h3>
                <span className="text-[9px] text-[var(--color-on-surface-variant)] block font-sans">
                  {formDetails.description || "No description set"}
                </span>
              </div>
              <div className="flex gap-2">
                {formDetails.isActive ? (
                  <button
                    onClick={() => handleToggleActive(formDetails.id, false)}
                    className="px-3 py-1.5 rounded-xl bg-yellow-950 text-yellow-400 border border-yellow-400/20 text-xs font-bold uppercase hover:bg-yellow-900 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Lock size={12} />
                    Close Form
                  </button>
                ) : (
                  <button
                    onClick={() => handleToggleActive(formDetails.id, true)}
                    className="px-3 py-1.5 rounded-xl bg-green-950 text-green-400 border border-green-400/20 text-xs font-bold uppercase hover:bg-green-900 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Unlock size={12} />
                    Open Form
                  </button>
                )}
              </div>
            </div>

            {/* Content lists */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Question Fields structure */}
              <div className="space-y-3">
                <span className="ds-label block px-1">Question Fields Structure</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {formDetails.fields.map((f: any) => (
                    <div key={f.id} className="p-4 bg-[var(--color-surface-container-low)] border border-[var(--color-outline-variant)]/60 rounded-xl space-y-1.5">
                      <span className="text-white text-xs font-bold font-sans uppercase block">
                        {f.label} {f.required && <span className="text-[#00cec4]">*</span>}
                      </span>
                      <span className="text-[9px] text-[var(--color-on-surface-variant)] block font-mono">
                        Type: {f.type} {f.options ? `(${f.options})` : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Submissions data table */}
              <div className="space-y-3 border-t border-[var(--color-outline-variant)]/40 pt-5">
                <h4 className="ds-h3 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <BarChart3 size={13} className="text-[#00cec4]" />
                  Responses Checklist ({responses.length})
                </h4>

                <div className="overflow-x-auto">
                  <table className="ds-table">
                    <thead>
                      <tr>
                        <th>Respondent</th>
                        {formDetails.fields.map((f: any) => (
                          <th key={f.id}>{f.label}</th>
                        ))}
                        <th>Submitted At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {responses.map((resp: any) => (
                        <tr key={resp.id}>
                          <td>{resp.user?.name || "Anonymous / Client"}</td>
                          {formDetails.fields.map((f: any) => {
                            const val = resp.answers[f.id] || "";
                            return <td key={f.id}>{typeof val === "boolean" ? (val ? "Yes" : "No") : String(val)}</td>;
                          })}
                          <td className="ds-numeric font-mono text-[9px]">
                            {new Date(resp.createdAt).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {responses.length === 0 && (
                    <div className="p-8 text-center text-xs text-[var(--color-on-surface-variant)] uppercase tracking-wider">
                      No response entries submitted yet
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <CheckSquare size={48} className="text-[var(--color-outline)] mb-3" />
            <h4 className="text-white font-bold text-xs uppercase tracking-wider">No Form Selected</h4>
            <p className="text-[var(--color-on-surface-variant)] text-xs mt-1">
              Select a custom form template from the sidebar lists to inspect fields and responses.
            </p>
          </div>
        )}
      </div>

      {/* Creation Modal Dialog */}
      {isCreating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-[var(--color-surface)] border border-[var(--color-outline-variant)] rounded-2xl p-6 shadow-2xl space-y-4 max-h-[95vh] overflow-y-auto">
            <h3 className="ds-h3 text-white text-sm font-bold flex items-center gap-2">
              <Plus size={16} className="text-[#00cec4]" />
              Form Builder
            </h3>
            
            <div className="space-y-3">
              <div>
                <span className="ds-label block mb-1">Form Title</span>
                <input
                  type="text"
                  placeholder="e.g. Employee Feedback 2026"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full text-xs text-white"
                />
              </div>

              <div>
                <span className="ds-label block mb-1">Description</span>
                <input
                  type="text"
                  placeholder="Enter instructions for respondents..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full text-xs text-white"
                />
              </div>

              {/* Dynamic fields */}
              <div className="space-y-3 pt-3 border-t border-[var(--color-outline-variant)]/40">
                <div className="flex justify-between items-center">
                  <span className="ds-label block">Questions List</span>
                  <button
                    onClick={handleAddField}
                    className="text-[10px] text-[#00cec4] hover:underline uppercase font-bold cursor-pointer"
                  >
                    Add Question
                  </button>
                </div>

                <div className="space-y-3 max-h-[40vh] overflow-y-auto">
                  {fields.map((f, idx) => (
                    <div key={idx} className="p-3 bg-[var(--color-surface-container-low)] border border-[var(--color-outline-variant)] rounded-xl space-y-2 relative">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder={`Question Label #${idx + 1}`}
                          value={f.label}
                          onChange={(e) => handleFieldChange(idx, "label", e.target.value)}
                          className="flex-1 text-xs text-white"
                        />
                        <select
                          value={f.type}
                          onChange={(e) => handleFieldChange(idx, "type", e.target.value)}
                          className="w-32 text-xs bg-[var(--color-surface-container)] text-white"
                        >
                          <option value="TEXT">Text input</option>
                          <option value="TEXTAREA">Textarea box</option>
                          <option value="SELECT">Select options</option>
                          <option value="CHECKBOX">Checkbox check</option>
                          <option value="RADIO">Radio list</option>
                        </select>
                        <button
                          onClick={() => handleRemoveField(idx)}
                          className="p-2 text-red-400 hover:text-red-300 cursor-pointer"
                          title="Remove field"
                        >
                          <Trash size={12} />
                        </button>
                      </div>
                      
                      {/* Options input if list type */}
                      {["SELECT", "RADIO"].includes(f.type) && (
                        <input
                          type="text"
                          placeholder="Options list (comma separated, e.g. High, Medium, Low)"
                          value={f.options || ""}
                          onChange={(e) => handleFieldChange(idx, "options", e.target.value)}
                          className="w-full text-[10px] text-white py-1"
                        />
                      )}

                      <div className="flex items-center gap-1.5">
                        <input
                          type="checkbox"
                          id={`req-${idx}`}
                          checked={f.required}
                          onChange={(e) => handleFieldChange(idx, "required", e.target.checked)}
                          className="rounded border-[#00cec4]"
                        />
                        <label htmlFor={`req-${idx}`} className="text-[10px] text-white cursor-pointer select-none">
                          Required field validation
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-[var(--color-outline-variant)]/40">
              <button
                onClick={() => setIsCreating(false)}
                className="px-4 py-2 text-xs text-[var(--color-on-surface-variant)] hover:text-white uppercase tracking-wider font-bold cursor-pointer"
              >
                Close
              </button>
              <button
                disabled={isPending}
                onClick={handleCreate}
                className="bg-[#00cec4] text-white hover:bg-[#00b8af] px-5 py-2 rounded-xl text-xs uppercase tracking-widest font-bold transition-all cursor-pointer disabled:opacity-50"
              >
                {isPending ? "Creating..." : "Create Form"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
