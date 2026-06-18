"use client";

import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
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
    <div className="sticky bottom-0 z-40 border-t border-[#d9dee7] bg-white px-4 py-3 shadow-[0_-8px_18px_rgba(15,23,42,0.04)]">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          <Button className="h-9 bg-[#408dfb] px-4 text-[12px] hover:bg-[#2e7df1]" onClick={onSaveDraft}>
            Save as Draft
          </Button>
          <Button variant="outline" className="h-9 border-[#cdd8e6] px-4 text-[12px]" onClick={onSaveSend}>
            Save and Send
          </Button>
          <Button variant="outline" className="h-9 border-[#f1c9c9] px-4 text-[12px] text-[#fe4242] hover:bg-[#fff5f5]" onClick={onCancel}>
            Cancel
          </Button>
        </div>

        <div className="relative flex items-center gap-2 text-[12px] text-[#4b5563]">
          <span>PDF Template: &lsquo;{template}&rsquo;</span>
          <button type="button" onClick={onToggleTemplateMenu} className="inline-flex items-center gap-1 font-medium text-[#408dfb]">
            Change
            <ChevronDown className="size-4" />
          </button>
          {templateMenuOpen ? (
            <div className="absolute right-0 top-full mt-2 min-w-[180px] rounded-md border border-[#d9dee7] bg-white py-1 shadow-[0_10px_24px_rgba(15,23,42,0.12)]">
              {templateOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  className="block w-full px-3 py-2 text-left text-[12px] text-[#1f2937] hover:bg-[#f5f7fa]"
                  onClick={() => onTemplateChange(option)}
                >
                  {option}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
