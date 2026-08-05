"use client";

import { CrmButton } from "@/modules/crm/components/workspace/crm-workspace";

import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { QuoteTemplateOption } from "@/modules/crm/components/quotes/lib/types";

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
    <div className="border-t border-[var(--mnx-border)] bg-mono-card px-6 py-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          <Button
            className="h-9 bg-[var(--mnx-accent)] px-4 text-[12px] hover:bg-[var(--mnx-accent)]"
            onClick={onSaveDraft}
          >
            Save as Draft
          </Button>
          <Button
            variant="outline"
            className="h-9 border-[var(--mnx-border)] px-4 text-[12px]"
            onClick={onSaveSend}
          >
            Save and Send
          </Button>
          <Button
            variant="outline"
            className="h-9 border-[var(--mnx-danger-bg)] px-4 text-[12px] text-[var(--mnx-danger)] hover:bg-[var(--mnx-danger-bg)]"
            onClick={onCancel}
          >
            Cancel
          </Button>
        </div>

        <div className="relative flex items-center gap-2 text-[12px] text-[var(--mnx-text-muted)]">
          <span>PDF Template: &lsquo;{template}&rsquo;</span>
          <CrmButton
            type="button"
            onClick={onToggleTemplateMenu}
            className="inline-flex items-center gap-1 font-medium text-[var(--mnx-accent)]"
          >
            Change
            <ChevronDown className="size-4" />
          </CrmButton>
          {templateMenuOpen ? (
            <div className="absolute right-0 top-full mt-2 min-w-[180px] rounded-md border border-[var(--mnx-border)] bg-mono-card py-1 mnx-shadow-panel">
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
