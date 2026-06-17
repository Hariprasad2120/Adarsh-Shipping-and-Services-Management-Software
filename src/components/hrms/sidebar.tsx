"use client";

import React from "react";
import {
  Home,
  Folder,
  Heart,
  HelpCircle,
  FileText,
  Plane,
  Settings,
  Users,
  Grid,
  UserCheck,
  CheckSquare,
  CheckCircle2,
  BookOpen,
  Award,
  Mail,
} from "lucide-react";
import { ModuleKey } from "@/modules/hrms/types";

export type SidebarItem = {
  key: ModuleKey;
  label: string;
  icon: React.ReactNode;
  visible: boolean;
};

interface HrmsSidebarProps {
  activeModule: ModuleKey;
  onChangeModule: (key: ModuleKey) => void;
  permissions: string[];
}

export function HrmsSidebar({
  activeModule,
  onChangeModule,
  permissions,
}: HrmsSidebarProps) {
  const isAdmin = permissions.includes("hrms.peopleplus.admin") || permissions.includes("admin.org.manage");

  const items: SidebarItem[] = [
    { key: "home", label: "Home", icon: <Home className="size-5" />, visible: true },
    { key: "onboarding", label: "Onboard", icon: <UserCheck className="size-5" />, visible: true },
    { key: "workreports", label: "Reports", icon: <FileText className="size-5" />, visible: true },
    { key: "task", label: "Tasks", icon: <CheckSquare className="size-5" />, visible: true },
    { key: "approvals", label: "Approvals", icon: <CheckCircle2 className="size-5" />, visible: true },
    { key: "lms", label: "LMS", icon: <BookOpen className="size-5" />, visible: true },
    { key: "performance", label: "PMS", icon: <Award className="size-5" />, visible: true },
    { key: "travel", label: "Travel", icon: <Plane className="size-5" />, visible: true },
    { key: "files", label: "Files", icon: <Folder className="size-5" />, visible: true },
    { key: "hrservices", label: "Letters", icon: <Mail className="size-5" />, visible: true },
    { key: "employeeengagement", label: "Surveys", icon: <Heart className="size-5" />, visible: true },
    { key: "hrcase", label: "Help Desk", icon: <HelpCircle className="size-5" />, visible: true },
  ];


  const visibleItems = items.filter((item) => item.visible);
  const mainItems = visibleItems.slice(0, 8);
  const moreItems = visibleItems.slice(8);

  return (
    <aside className="w-[84px] bg-[#0f1319] border-r border-[#1c212a]/50 shrink-0 flex flex-col justify-between items-center py-4 select-none">
      <div className="flex flex-col items-center gap-1.5 w-full">
        {/* Module Brand Icon */}
        <div className="size-11 rounded-2xl bg-[#00c4b6]/10 flex items-center justify-center text-[#00c4b6] mb-4 shadow-sm font-bold text-sm tracking-wider">
          P+
        </div>

        {/* Navigation Items */}
        <div className="flex flex-col gap-1 w-full px-1">
          {mainItems.map((item) => {
            const isActive = activeModule === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onChangeModule(item.key)}
                className={`flex flex-col items-center justify-center w-full aspect-square rounded-xl transition-all cursor-pointer ${
                  isActive
                    ? "bg-[#161f28] text-[#00c4b6] font-medium"
                    : "text-slate-400 hover:bg-[#161f28]/40 hover:text-slate-200"
                }`}
                title={item.label}
              >
                {item.icon}
                <span className="text-[9.5px] mt-1 text-center scale-90 truncate max-w-full px-1">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col items-center gap-1 w-full px-1">
        {/* More Services Dropdown Trigger */}
        {moreItems.length > 0 && (
          <div className="relative group w-full">
            <button
              type="button"
              className="flex flex-col items-center justify-center w-full aspect-square rounded-xl text-slate-400 hover:bg-[#161f28]/40 hover:text-slate-200 cursor-pointer"
              title="More Services"
            >
              <Grid className="size-5" />
              <span className="text-[9.5px] mt-1">More</span>
            </button>
            <div className="absolute left-[78px] bottom-0 hidden group-hover:block bg-[#0f1319] border border-[#1c212a] rounded-xl shadow-xl w-48 py-2 z-50 animate-in fade-in slide-in-from-left-2 duration-150">
              <div className="px-3 py-1.5 text-[10px] font-bold text-slate-500 tracking-wide">
                More Services
              </div>
              {moreItems.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => onChangeModule(item.key)}
                  className={`flex items-center gap-3 w-full px-4 py-2.5 text-xs text-left transition-colors cursor-pointer ${
                    activeModule === item.key
                      ? "bg-[#161f28] text-[#00c4b6] font-medium"
                      : "text-slate-400 hover:bg-[#161f28]/50 hover:text-slate-200"
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Users / Account Setup */}
        {isAdmin && (
          <button
            type="button"
            onClick={() => onChangeModule("generalservice")}
            className={`flex flex-col items-center justify-center w-full aspect-square rounded-xl transition-all cursor-pointer ${
              activeModule === "generalservice"
                ? "bg-[#161f28] text-[#00c4b6]"
                : "text-slate-400 hover:bg-[#161f28]/40 hover:text-slate-200"
            }`}
            title="Users & Directory"
          >
            <Users className="size-5" />
            <span className="text-[9.5px] mt-1 scale-90">Users</span>
          </button>
        )}

        {/* Settings */}
        {isAdmin && (
          <button
            type="button"
            onClick={() => onChangeModule("okr")}
            className={`flex flex-col items-center justify-center w-full aspect-square rounded-xl transition-all cursor-pointer ${
              activeModule === "okr"
                ? "bg-[#161f28] text-[#00c4b6]"
                : "text-slate-400 hover:bg-[#161f28]/40 hover:text-slate-200"
            }`}
            title="HRMS Settings"
          >
            <Settings className="size-5" />
            <span className="text-[9.5px] mt-1 scale-90">Settings</span>
          </button>
        )}
      </div>
    </aside>
  );
}
