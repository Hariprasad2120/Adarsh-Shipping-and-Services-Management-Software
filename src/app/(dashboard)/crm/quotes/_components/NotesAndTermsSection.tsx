"use client";

import { useEffect, useRef, useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import { BookmarkPlus, ChevronDown, CreditCard, Save, Trash2, X } from "lucide-react";
import type { QuoteFormValues } from "../_lib/types";
import { bankAccounts } from "../_lib/mock-data";
import { FileUploadBox } from "./FileUploadBox";
import { TotalsPanel } from "./TotalsPanel";

const TEMPLATES_KEY = "quote_note_templates";

type NoteTemplate = {
  id: string;
  name: string;
  text: string;
};

function loadTemplates(): NoteTemplate[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(TEMPLATES_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveTemplates(templates: NoteTemplate[]) {
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
}

type NotesAndTermsSectionProps = {
  form: UseFormReturn<QuoteFormValues>;
  files: File[];
  onFilesChange: (files: File[]) => void;
  discountAmount: number;
};

export function NotesAndTermsSection({ form, files, onFilesChange, discountAmount }: NotesAndTermsSectionProps) {
  const [templates, setTemplates] = useState<NoteTemplate[]>([]);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const pickerRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTemplates(loadTemplates());
  }, []);

  useEffect(() => {
    function handlePointerDown(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setTemplatePickerOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  useEffect(() => {
    if (saveDialogOpen) nameInputRef.current?.focus();
  }, [saveDialogOpen]);

  function applyTemplate(t: NoteTemplate) {
    form.setValue("customerNotes", t.text, { shouldDirty: true });
    setTemplatePickerOpen(false);
  }

  function handleSaveTemplate() {
    const name = newTemplateName.trim();
    if (!name) return;
    const text = form.getValues("customerNotes") ?? "";
    const next: NoteTemplate[] = [
      ...templates,
      { id: `tpl_${Date.now()}`, name, text },
    ];
    setTemplates(next);
    saveTemplates(next);
    setNewTemplateName("");
    setSaveDialogOpen(false);
  }

  function handleDeleteTemplate(id: string) {
    const next = templates.filter((t) => t.id !== id);
    setTemplates(next);
    saveTemplates(next);
  }

  const selectedBank = bankAccounts.find((b) => b.id === form.watch("bankDetailsId"));

  return (
    <>
      <section className="border-b border-[#d9dee7] px-5 py-5">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          {/* Customer Notes with Templates */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[12px] font-medium text-[#374151]">Customer Notes</label>

              <div className="flex items-center gap-2">
                {/* Template picker */}
                <div className="relative" ref={pickerRef}>
                  <button
                    type="button"
                    onClick={() => setTemplatePickerOpen((o) => !o)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#d9dee7] bg-white px-2.5 py-1 text-[11px] font-medium text-[#374151] hover:bg-[#f7f9fb] transition-colors"
                  >
                    <BookmarkPlus size={12} />
                    Templates
                    <ChevronDown size={11} className={`transition-transform ${templatePickerOpen ? "rotate-180" : ""}`} />
                  </button>

                  {templatePickerOpen && (
                    <div className="absolute right-0 top-full mt-1 z-30 w-64 rounded-xl border border-[#d9dee7] bg-white shadow-lg overflow-hidden">
                      {templates.length === 0 ? (
                        <p className="px-4 py-6 text-center text-[11px] text-[#6b7280]">
                          No saved templates yet.
                          <br />
                          Write a note and save it as a template.
                        </p>
                      ) : (
                        <ul className="max-h-52 overflow-y-auto divide-y divide-[#f3f4f6]">
                          {templates.map((t) => (
                            <li key={t.id} className="flex items-center justify-between gap-2 px-3 py-2.5 hover:bg-[#f7f9fb]">
                              <button
                                type="button"
                                onClick={() => applyTemplate(t)}
                                className="flex-1 text-left text-[12px] text-[#1f2937] truncate"
                              >
                                {t.name}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteTemplate(t.id)}
                                className="flex-shrink-0 p-1 rounded text-[#6b7280] hover:text-[#fe4242] hover:bg-red-50 transition-colors"
                                aria-label={`Delete template "${t.name}"`}
                              >
                                <Trash2 size={12} />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>

                {/* Save current text as template */}
                <button
                  type="button"
                  onClick={() => setSaveDialogOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#d9dee7] bg-white px-2.5 py-1 text-[11px] font-medium text-[#374151] hover:bg-[#f7f9fb] transition-colors"
                  title="Save current note as template"
                >
                  <Save size={12} />
                  Save as Template
                </button>
              </div>
            </div>

            <textarea
              rows={6}
              placeholder="Will be displayed on the quote"
              className="w-full rounded-md bg-white px-3 py-2 text-[13px] text-[#1f2937] outline-none"
              {...form.register("customerNotes")}
            />

            {/* Save template inline dialog */}
            {saveDialogOpen && (
              <div className="flex items-center gap-2 rounded-lg border border-[#d9dee7] bg-[#f7f9fb] px-3 py-2">
                <input
                  ref={nameInputRef}
                  type="text"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveTemplate();
                    if (e.key === "Escape") setSaveDialogOpen(false);
                  }}
                  placeholder="Template name…"
                  className="flex-1 min-w-0 bg-white rounded px-2 py-1 text-[12px] text-[#1f2937] outline-none"
                />
                <button
                  type="button"
                  onClick={handleSaveTemplate}
                  disabled={!newTemplateName.trim()}
                  className="px-3 py-1 rounded bg-[#00cec4] text-white text-[11px] font-medium hover:bg-[#00b8af] disabled:opacity-40 transition-colors"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setSaveDialogOpen(false)}
                  className="p-1 rounded text-[#6b7280] hover:text-[#1f2937] hover:bg-white transition-colors"
                  aria-label="Cancel"
                >
                  <X size={14} />
                </button>
              </div>
            )}
          </div>

          <div>
            <TotalsPanel form={form} discountAmount={discountAmount} />
          </div>
        </div>
      </section>

      {/* Bank Details for Quote */}
      <section className="border-b border-[#d9dee7] px-5 py-5">
        <div className="flex items-center gap-2 mb-3">
          <CreditCard size={14} className="text-[#00cec4]" />
          <h3 className="text-[12px] font-semibold text-[#374151] uppercase tracking-wide">
            Bank Details to Display
          </h3>
        </div>

        <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
          <div>
            <label htmlFor="bankDetailsId" className="mb-1 block text-[11px] font-medium text-[#6b7280]">
              Select bank account for this document
            </label>
            <select
              id="bankDetailsId"
              className="w-full rounded-md bg-white px-3 py-2 text-[13px] text-[#1f2937] outline-none"
              {...form.register("bankDetailsId")}
            >
              <option value="">— None (hide bank details) —</option>
              {bankAccounts.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.bankName} · {b.accountNumber}
                </option>
              ))}
            </select>
          </div>

          {selectedBank && (
            <div className="rounded-lg border border-[#d9dee7] bg-[#f8fafd] px-4 py-3 text-[12px] leading-6 text-[#374151]">
              <p className="font-semibold text-[#1f2937] mb-1">{selectedBank.bankName}</p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-0.5 text-[11px]">
                <span className="text-[#6b7280]">A/C Name</span>
                <span>{selectedBank.accountName}</span>
                <span className="text-[#6b7280]">A/C Number</span>
                <span className="font-mono">{selectedBank.accountNumber}</span>
                <span className="text-[#6b7280]">IFSC</span>
                <span className="font-mono">{selectedBank.ifsc}</span>
                <span className="text-[#6b7280]">Branch</span>
                <span>{selectedBank.branch}</span>
                {selectedBank.upi && (
                  <>
                    <span className="text-[#6b7280]">UPI</span>
                    <span>{selectedBank.upi}</span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="bg-[#fbfcff] px-5 py-5">
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <label className="mb-1 block text-[12px] font-medium text-[#374151]">Terms &amp; Conditions</label>
            <textarea
              rows={4}
              placeholder="Enter the terms and conditions of your business to be displayed in your transaction"
              className="w-full rounded-md bg-white px-3 py-2 text-[13px] text-[#1f2937] outline-none"
              {...form.register("terms")}
            />
          </div>
          <div>
            <label className="mb-1 block text-[12px] font-medium text-[#374151]">Attach File(s) to Quote</label>
            <FileUploadBox files={files} onFilesChange={onFilesChange} />
          </div>
        </div>
      </section>
    </>
  );
}
