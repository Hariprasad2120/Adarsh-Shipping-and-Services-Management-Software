"use client";

import React, { useState } from "react";
import { Search, Plus, Bell, HelpCircle, User } from "lucide-react";
import { ModuleKey } from "@/modules/hrms/peopleplus/types";

interface PeoplePlusTopNavProps {
  activeModule: ModuleKey;
  activeTab: string; // e.g. "myspace" | "team" | "organization"
  onChangeTab: (tab: string) => void;
  userName: string;
  onSearchQuery: (query: string) => void;
}

export function PeoplePlusTopNav({
  activeModule,
  activeTab,
  onChangeTab,
  userName,
  onSearchQuery,
}: PeoplePlusTopNavProps) {
  const [searchValue, setSearchValue] = useState("");

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.target.value);
    onSearchQuery(e.target.value);
  };

  // Home module has multiple subtabs
  const showSubtabs = activeModule === "home";

  return (
    <header className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 select-none">
      {/* Subtabs context or Module title */}
      <div className="flex items-center gap-6">
        {showSubtabs ? (
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => onChangeTab("myspace")}
              className={`text-[14px] font-semibold pb-4 pt-4 border-b-2 cursor-pointer transition-all ${
                activeTab === "myspace"
                  ? "border-[#00c4b6] text-[#00c4b6]"
                  : "border-transparent text-slate-500 hover:text-slate-900"
              }`}
            >
              My Space
            </button>
            <button
              type="button"
              onClick={() => onChangeTab("team")}
              className={`text-[14px] font-semibold pb-4 pt-4 border-b-2 cursor-pointer transition-all ${
                activeTab === "team"
                  ? "border-[#00c4b6] text-[#00c4b6]"
                  : "border-transparent text-slate-500 hover:text-slate-900"
              }`}
            >
              Team
            </button>
            <button
              type="button"
              onClick={() => onChangeTab("organization")}
              className={`text-[14px] font-semibold pb-4 pt-4 border-b-2 cursor-pointer transition-all ${
                activeTab === "organization"
                  ? "border-[#00c4b6] text-[#00c4b6]"
                  : "border-transparent text-slate-500 hover:text-slate-900"
              }`}
            >
              Organization
            </button>
          </div>
        ) : (
          <h2 className="text-[15px] font-bold text-slate-800 capitalize">
            {activeModule === "generalservice" ? "Users & Directory" : activeModule === "okr" ? "HRMS Settings" : activeModule}
          </h2>
        )}
      </div>

      {/* Global Search and Actions */}
      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search employee..."
            value={searchValue}
            onChange={handleSearchChange}
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-[#00c4b6] focus:bg-white transition-colors"
          />
        </div>

        {/* User profile brief */}
        <div className="flex items-center gap-2 border-l border-slate-200 pl-4">
          <div className="size-8 rounded-full bg-[#00c4b6]/10 flex items-center justify-center text-[#00c4b6]">
            <User className="size-4" />
          </div>
          <span className="text-xs font-semibold text-slate-700 hidden sm:inline">
            {userName}
          </span>
        </div>
      </div>
    </header>
  );
}
