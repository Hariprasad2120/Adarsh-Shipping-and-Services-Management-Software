"use client";

import { CrmButton } from "@/components/monolith/crm-workspace";

import { ChevronDown } from "lucide-react";
import { Button } from "@/components/monolith/button";
import type { QuoteTemplateOption } from "../_lib/types";

type FixedActionBarProps = {
  onSaveDraft: () => void;
  onSaveSend: () => void;
  onCancel: () => void;
  template: QuoteTemplateOption;
  templateOptions: QuoteTemplateOption[];
  templateMenuOpen: boolean;
  onToggleTemplateMenu: () => void;
  onTemplateChange: (template: QuoteTemplateOption) => void;
};

export function FixedActionBar({
  onSaveDraft,
  onSaveSend,
  onCancel,
  template,
  templateOptions,
  templateMenuOpen,
  onToggleTemplateMenu,
  onTemplateChange,
}: FixedActionBarProps) {
  return (
    <div className="sticky bottom-0 z-40 border-t border-[var(--mnx-border)] bg-mono-card px-4 py-3 shadow-[0_-8px_18px_var(--mnx-border)]">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          <Button className="h-9 bg-[var(--mnx-accent)] px-4 text-[12px] hover:bg-[var(--mnx-accent)]" onClick={onSaveDraft}>
            Save as Draft
          </Button>
          <Button variant="outline" className="h-9 border-[var(--mnx-border)] px-4 text-[12px]" onClick={onSaveSend}>
            Save and Send
          </Button>
          <Button variant="outline" className="h-9 border-[var(--mnx-danger-bg)] px-4 text-[12px] text-[var(--mnx-danger)] hover:bg-[var(--mnx-danger-bg)]" onClick={onCancel}>
            Cancel
          </Button>
        </div>

        <div className="relative flex items-center gap-2 text-[12px] text-[var(--mnx-text-muted)]">
          <span>PDF Template: &lsquo;{template}&rsquo;</span>
          <CrmButton type="button" onClick={onToggleTemplateMenu} className="inline-flex items-center gap-1 font-medium text-[var(--mnx-accent)]">
            Change
            <ChevronDown className="size-4" />
          </CrmButton>
          {templateMenuOpen ? (
            <div className="absolute right-0 top-full mt-2 min-w-[180px] rounded-md border border-[var(--mnx-border)] bg-mono-card py-1 shadow-[0_10px_24px_var(--mnx-border)]">
              {templateOptions.map((option) => (
                <CrmButton
                  key={option}
                  type="button"
                  className="block w-full px-3 py-2 text-left text-[12px] text-[var(--mnx-text-strong)] hover:bg-[var(--mnx-surface)]"
                  onClick={() => onTemplateChange(option)}
                >
                  {option}
                </CrmButton>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
