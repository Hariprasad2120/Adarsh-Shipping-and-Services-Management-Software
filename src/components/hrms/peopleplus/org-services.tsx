"use client";

import React, { useState } from "react";
import { Megaphone, BookOpen, Users, HelpCircle, FileText, Download, ChevronRight, User, GitCommit, Search, Printer, Calendar } from "lucide-react";

interface OrgServicesProps {
  data: {
    announcements: any[];
    upcomingHolidays: any[];
  };
  employees: any[];
  departments: any[];
  branches: any[];
}

export function OrgServices({ data, employees, departments, branches }: OrgServicesProps) {
  const [activeSubView, setActiveSubView] = useState<
    "overview" | "announcements" | "policies" | "employee-tree" | "department-tree" | "directory" | "birthday" | "newhires"
  >("overview");
  const [searchTerm, setSearchTerm] = useState("");

  // Employee Tree State: stores selected managers at each hierarchy level
  const [selectedL1, setSelectedL1] = useState<string>("patit"); // Root: Patit Paban Goswami
  const [selectedL2, setSelectedL2] = useState<string | null>(null); // e.g. Abhilash, Kirubakari, Purushothaman
  const [selectedL3, setSelectedL3] = useState<string | null>(null); // e.g. Sathiya Moorhty, Samson

  // Department Tree State: columns selection
  const [deptL1, setDeptL1] = useState<string>("management"); // Root option
  const [deptL2, setDeptL2] = useState<string | null>(null); // Subheads selection

  const filteredEmployees = employees.filter((emp) =>
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.designation?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Helper: Find employee record
  const findEmp = (empNo: string) => employees.find(e => String(e.employeeNumber) === empNo) || null;

  // Visual Organigram Data for Department Tree (matching Doc1.pdf Page 6)
  const deptTreeData = {
    director: { code: "D", name: "Director", head: "Director", count: 2 },
    execTeam: { code: "ET", name: "Executive Team", head: "-", count: 0 },
    management: {
      code: "M",
      name: "Management",
      head: "vijaykumar@adarshshipping...",
      count: 34,
      children: [
        { code: "HO", name: "Head of HR", email: "hr@adarshshipping.in", count: 2, children: [
          { code: "HR", name: "Human Resource Operation", email: "hr@adarshshipping.in", count: 1 },
          { code: "A&A", name: "Administration & Compliance", email: "ad@adarshshipping.in" },
          { code: "EMP", name: "PURUSHOTHAMAN V", role: "Manager", photo: null }
        ]},
        { code: "HO", name: "Head of Accounts", email: "accounts@adarshshipping.in", count: 3 },
        { code: "HO", name: "Head of Freight Forwarding", email: "ff@adarshshipping.in", count: 7 },
        { code: "HO", name: "Head of Custom Broker's", email: "cb@adarshshipping.in", count: 22 }
      ]
    }
  };

  // Visual Hierarchy for Employee Tree (matching Doc1.pdf Page 7-9)
  const getEmployeeChildren = (managerKey: string): any[] => {
    switch (managerKey) {
      case "patit": // 106
        return [
          { id: "abhilash", empNo: "121", name: "ABHILASH D", role: "Manager", count: 7 },
          { id: "devendran", empNo: "102", name: "DEVENDRAN DAMODARAN", role: "Management", count: 0 },
          { id: "kirubakari", empNo: "129", name: "KIRUBAKARI S", role: "Manager", count: 10 },
          { id: "amirtha", empNo: "135", name: "AMIRTHA VARSHINI", role: "Trainee", count: 0 },
          { id: "ravi", empNo: "140", name: "RAVI R", role: "Executive", count: 2 },
          { id: "akshaya", empNo: "144", name: "Akshaya Blessey", role: "Executive", count: 0 },
          { id: "aishwariya", empNo: "150", name: "AISHWARIYA VIJAYAKUMAR", role: "Management", count: 0 },
          { id: "sridhar", empNo: "183", name: "Sridhar B", role: "Consultant", count: 0 },
          { id: "dineshan", empNo: "177", name: "Dineshan Pm", role: "Consultant", count: 2 },
          { id: "adarsh", empNo: "110", name: "Adarsh VR", role: "Consultant", count: 0 },
          { id: "purushothaman", empNo: "116", name: "PURUSHOTHAMAN V", role: "Manager", count: 3 },
          { id: "selvam", empNo: "105", name: "SELVAM RANGANATHAN", role: "Executive", count: 2 }
        ];
      case "abhilash":
        return [
          { id: "karan", empNo: "120", name: "KARAN M", role: "Executive", count: 0 },
          { id: "naveen", empNo: "172", name: "Naveen Sathiyan", role: "Assistant Manager", count: 5 }
        ];
      case "kirubakari":
        return [
          { id: "samson", empNo: "107", name: "SAMSON PRAKASAM", role: "Consultant", count: 1 },
          { id: "sathiya", empNo: "108", name: "SATHIYA MOORHTY DHANASEKAR", role: "Team Leader", count: 4 },
          { id: "nandha", empNo: "133", name: "Nandha Gopal J", role: "Executive", count: 0 },
          { id: "sandhya", empNo: "181", name: "Sandhya K", role: "Executive", count: 0 },
          { id: "amanulla", empNo: "192", name: "Amanulla R", role: "Trainee", count: 0 }
        ];
      case "samson":
        return [
          { id: "maansi", empNo: "175", name: "Maansi B", role: "Associate", count: 0 }
        ];
      case "sathiya":
        return [
          { id: "surya", empNo: "170", name: "SURYA K", role: "Associate", count: 0 },
          { id: "arunkumar", empNo: "176", name: "ARUNKUMAR B", role: "Associate", count: 0 },
          { id: "bala", empNo: "171", name: "BALA HARIHARAN K", role: "Associate", count: 0 },
          { id: "balaji", empNo: "178", name: "Balaji K", role: "Associate", count: 0 }
        ];
      case "ravi":
        return [
          { id: "shyam", empNo: "180", name: "SHYAM NARAYAN YADAV", role: "Executive", count: 0 },
          { id: "dinesh_g", empNo: "181", name: "DINESH SATYANARAYAN G...", role: "Associate", count: 0 }
        ];
      case "dineshan":
        return [
          { id: "ranga", empNo: "173", name: "Ranga nayaki", role: "Associate", count: 0 },
          { id: "keerthana", empNo: "184", name: "Keerthana P", role: "Executive", count: 0 }
        ];
      case "purushothaman":
        return [
          { id: "madhavan", empNo: "156", name: "MADHAVAN M", role: "Associate", count: 0 },
          { id: "babyshalini", empNo: "160", name: "Babyshalini K", role: "Associate", count: 0 },
          { id: "john", empNo: "191", name: "John Arputharaj", role: "Associate", count: 0 }
        ];
      case "selvam":
        return [
          { id: "dinesh_y", empNo: "185", name: "DINESH KUMAR YADAV", role: "Executive", count: 0 },
          { id: "rajesh", empNo: "186", name: "RAJESH KUMAR YADAV", role: "Associate", count: 0 }
        ];
      default:
        return [];
    }
  };

  const tabsList = [
    { key: "overview", label: "Overview" },
    { key: "announcements", label: "Announcements" },
    { key: "policies", label: "Policies" },
    { key: "employee-tree", label: "Employee Tree" },
    { key: "department-tree", label: "Department Tree" },
    { key: "directory", label: "Department Directory" },
    { key: "birthday", label: "Birthday Folks" },
    { key: "newhires", label: "New Hires" }
  ] as const;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col gap-6 select-none">
      {/* Subtab navigation */}
      <div className="flex items-center gap-2 border-b border-slate-100 pb-3 overflow-x-auto whitespace-nowrap">
        {tabsList.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveSubView(tab.key)}
            className={`text-xs font-bold px-3.5 py-2 rounded-lg border transition-all cursor-pointer ${
              activeSubView === tab.key
                ? "bg-[#00c4b6]/10 text-[#00c4b6] border-[#00c4b6]/20 font-bold"
                : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100 hover:text-slate-800"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* View Content */}
      <div className="flex-1 min-h-[450px]">
        
        {/* OVERVIEW */}
        {activeSubView === "overview" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-200">
            <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-5 md:col-span-2 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Megaphone className="size-4 text-[#00c4b6]" />
                Latest Announcements
              </h3>
              <div className="space-y-3">
                {data.announcements.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">No announcements logged today.</p>
                ) : (
                  data.announcements.map((item) => (
                    <div key={item.id} className="bg-white border border-slate-200 p-4 rounded-xl">
                      <h4 className="text-xs font-bold text-slate-800">{item.title}</h4>
                      <p className="text-xs text-slate-500 mt-1">{item.body}</p>
                      <span className="text-[10px] text-slate-400 block mt-2">
                        Published on {new Date(item.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-gradient-to-br from-[#00c4b6] to-[#00b0a3] text-white p-5 rounded-2xl shadow-sm flex flex-col justify-between h-32">
                <span className="text-[10px] uppercase font-bold tracking-widest leading-none opacity-80">Branches</span>
                <span className="text-3xl font-extrabold leading-none">{branches.length}</span>
                <span className="text-[11px] font-semibold opacity-95">Locations active across regions</span>
              </div>
              <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white p-5 rounded-2xl shadow-sm flex flex-col justify-between h-32">
                <span className="text-[10px] uppercase font-bold tracking-widest leading-none opacity-80">Departments</span>
                <span className="text-3xl font-extrabold leading-none">{departments.length}</span>
                <span className="text-[11px] font-semibold opacity-95">Functional divisions configured</span>
              </div>
            </div>
          </div>
        )}

        {/* ANNOUNCEMENTS */}
        {activeSubView === "announcements" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Publish Announcements</h4>
              <button type="button" className="bg-[#00c4b6] text-white text-xs font-bold px-3 py-1.5 rounded-lg">Create Announcement</button>
            </div>
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
              {data.announcements.map((ann) => (
                <div key={ann.id} className="bg-white p-5 rounded-xl border border-slate-155">
                  <h5 className="text-xs font-bold text-slate-800">{ann.title}</h5>
                  <p className="text-xs text-slate-500 mt-2 leading-relaxed">{ann.body}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* POLICIES */}
        {activeSubView === "policies" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Company Policy Manuals
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-slate-200 hover:border-[#00c4b6] p-4 rounded-xl flex items-center justify-between bg-white shadow-sm hover:shadow transition-colors">
                <div className="flex items-center gap-3">
                  <BookOpen className="size-5 text-indigo-500" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-700">Code of Conduct</h4>
                    <p className="text-[10px] text-slate-400">Version 2.0 &bull; Updated Jan 2026</p>
                  </div>
                </div>
                <button type="button" className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 hover:text-[#00c4b6] hover:bg-[#00c4b6]/5 cursor-pointer transition-all">
                  <Download className="size-3.5" />
                </button>
              </div>

              <div className="border border-slate-200 hover:border-[#00c4b6] p-4 rounded-xl flex items-center justify-between bg-white shadow-sm hover:shadow transition-colors">
                <div className="flex items-center gap-3">
                  <FileText className="size-5 text-emerald-500" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-700">Leave & Holiday Policy</h4>
                    <p className="text-[10px] text-slate-400">Reworked Version &bull; Updated Feb 2026</p>
                  </div>
                </div>
                <button type="button" className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 hover:text-[#00c4b6] hover:bg-[#00c4b6]/5 cursor-pointer transition-all">
                  <Download className="size-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* DEPARTMENT TREE (Page 6 bottom) */}
        {activeSubView === "department-tree" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="flex justify-between items-center">
              <span className="text-[10px] uppercase font-bold text-slate-400">Department Hierarchy Tree</span>
              <button type="button" className="p-1.5 border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-500">
                <Printer className="size-4" />
              </button>
            </div>

            {/* Tree Flow Columns layout */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch border border-slate-200 bg-slate-50/20 rounded-2xl p-6 min-h-[400px]">
              
              {/* Column 1: Root Levels */}
              <div className="space-y-4 flex flex-col justify-center">
                <div
                  onClick={() => { setDeptL1("director"); setDeptL2(null); }}
                  className={`p-4 border rounded-xl bg-white shadow-xs cursor-pointer hover:border-[#00c4b6] transition-all flex items-center justify-between ${
                    deptL1 === "director" ? "border-2 border-[#00c4b6]" : "border-slate-200"
                  }`}
                >
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Director</span>
                    <span className="text-[9.5px] text-slate-400 font-semibold block mt-0.5">-</span>
                  </div>
                  <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">2</span>
                </div>

                <div
                  onClick={() => { setDeptL1("execteam"); setDeptL2(null); }}
                  className={`p-4 border rounded-xl bg-white shadow-xs cursor-pointer hover:border-[#00c4b6] transition-all flex items-center justify-between ${
                    deptL1 === "execteam" ? "border-2 border-[#00c4b6]" : "border-slate-200"
                  }`}
                >
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Executive Team</span>
                    <span className="text-[9.5px] text-slate-400 font-semibold block mt-0.5">-</span>
                  </div>
                  <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">-</span>
                </div>

                <div
                  onClick={() => { setDeptL1("management"); setDeptL2(null); }}
                  className={`p-4 border rounded-xl bg-white shadow-xs cursor-pointer hover:border-[#00c4b6] transition-all flex items-center justify-between ${
                    deptL1 === "management" ? "border-2 border-[#00c4b6]" : "border-slate-200"
                  }`}
                >
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-slate-800 block">Management</span>
                    <span className="text-[9.5px] text-[#00c4b6] font-bold block mt-0.5 truncate">vijaykumar@adarshshipping.in</span>
                  </div>
                  <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full shrink-0 ml-2">34</span>
                </div>
              </div>

              {/* Column 2: Connected Sub-heads */}
              <div className="space-y-3 flex flex-col justify-center border-l border-slate-200/80 pl-6">
                {deptL1 === "management" ? (
                  deptTreeData.management.children.map((sub, i) => (
                    <div
                      key={sub.name}
                      onClick={() => setDeptL2(sub.name)}
                      className={`p-3.5 border rounded-xl bg-white shadow-xs cursor-pointer hover:border-[#00c4b6] transition-all flex items-center justify-between ${
                        deptL2 === sub.name ? "border-2 border-[#00c4b6]" : "border-slate-200"
                      }`}
                    >
                      <div className="min-w-0">
                        <span className="text-[11px] font-extrabold text-slate-700 block">{sub.name}</span>
                        <span className="text-[9.5px] text-slate-400 block mt-0.5 truncate">{sub.email || "-"}</span>
                      </div>
                      {sub.count !== undefined && (
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full shrink-0 ml-2">
                          {sub.count}
                        </span>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center text-slate-400 font-semibold text-[11px] py-12">Select Management to expand sub-heads</div>
                )}
              </div>

              {/* Column 3: Profiles or divisions */}
              <div className="space-y-3 flex flex-col justify-center border-l border-slate-200/80 pl-6">
                {deptL2 === "Head of HR" ? (
                  <>
                    <div className="p-3 border border-slate-200 rounded-xl bg-white flex items-center justify-between shadow-xs">
                      <div>
                        <span className="text-[11px] font-bold text-slate-700 block">Human Resource Operation</span>
                        <span className="text-[9.5px] text-slate-400 block">hr@adarshshipping.in</span>
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">1</span>
                    </div>

                    <div className="p-3 border border-slate-200 rounded-xl bg-white shadow-xs">
                      <span className="text-[11px] font-bold text-slate-700 block">Administration & Compliance</span>
                      <span className="text-[9.5px] text-slate-400 block">ad@adarshshipping.in</span>
                    </div>

                    <div className="p-3 border border-[#00c4b6]/20 bg-[#00c4b6]/5 rounded-xl flex items-center gap-2 shadow-xs">
                      <div className="size-8 rounded-full bg-[#00c4b6]/10 flex items-center justify-center text-[#00c4b6] font-bold text-xs">
                        P
                      </div>
                      <div>
                        <span className="text-[11px] font-bold text-slate-700 block">PURUSHOTHAMAN V</span>
                        <span className="text-[9.5px] text-slate-500 font-semibold">Manager</span>
                      </div>
                    </div>
                  </>
                ) : deptL2 ? (
                  <div className="text-center text-slate-400 font-semibold text-[11px] py-12">No nested sub-divisions listed</div>
                ) : (
                  <div className="text-center text-slate-400 font-semibold text-[11px] py-12">Select Head of HR to inspect division profiles</div>
                )}
              </div>

            </div>
          </div>
        )}

        {/* EMPLOYEE TREE (Page 7-9) */}
        {activeSubView === "employee-tree" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="flex justify-between items-center">
              <span className="text-[10px] uppercase font-bold text-slate-400">Reporting line chart</span>
              <button type="button" className="p-1.5 border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-500">
                <Printer className="size-4" />
              </button>
            </div>

            {/* Tree Explorer with Multi-column panel lists */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch border border-slate-200 bg-slate-50/20 rounded-2xl p-6 min-h-[400px] text-xs">
              
              {/* Column 1: Root Manager */}
              <div className="space-y-4 flex flex-col justify-center">
                <div
                  onClick={() => { setSelectedL1("patit"); setSelectedL2(null); setSelectedL3(null); }}
                  className={`p-4 border rounded-xl bg-white hover:border-[#00c4b6] cursor-pointer shadow-xs transition-all flex items-center justify-between ${
                    selectedL1 === "patit" ? "border-2 border-[#00c4b6]" : "border-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="size-8 rounded-full bg-[#00c4b6]/10 flex items-center justify-center text-[#00c4b6] font-bold text-xs shrink-0">
                      P
                    </div>
                    <div>
                      <span className="font-bold text-slate-800 block">PATIT PABAN GOSWAMI</span>
                      <span className="text-[9.5px] text-slate-400 font-semibold">Executive</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">39</span>
                </div>
              </div>

              {/* Column 2: Level 2 direct reports */}
              <div className="flex flex-col gap-2 border-l border-slate-200/80 pl-6 h-[400px] overflow-y-auto pr-2">
                {getEmployeeChildren(selectedL1).map((emp) => {
                  const isSelected = selectedL2 === emp.id;
                  return (
                    <div
                      key={emp.id}
                      onClick={() => { setSelectedL2(emp.id); setSelectedL3(null); }}
                      className={`p-3 border rounded-xl bg-white hover:border-[#00c4b6] cursor-pointer shadow-xs transition-all flex items-center justify-between ${
                        isSelected ? "border-2 border-[#00c4b6] bg-[#00c4b6]/5" : "border-slate-200"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="size-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-[9px] shrink-0">
                          {emp.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <span className="font-bold text-slate-700 block truncate leading-tight">{emp.name}</span>
                          <span className="text-[9px] text-slate-400 block leading-none mt-0.5">{emp.role}</span>
                        </div>
                      </div>
                      {emp.count > 0 && (
                        <span className="text-[9px] font-bold text-slate-400 bg-slate-150 px-1.5 py-0.2 rounded-full shrink-0 ml-1">
                          {emp.count}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Column 3: Level 3 nested reports */}
              <div className="flex flex-col gap-2 border-l border-slate-200/80 pl-6 h-[400px] overflow-y-auto pr-2">
                {selectedL2 ? (
                  getEmployeeChildren(selectedL2).length === 0 ? (
                    <div className="text-center text-slate-400 font-semibold py-12 text-[10.5px]">
                      No direct reports for this employee.
                    </div>
                  ) : (
                    getEmployeeChildren(selectedL2).map((emp) => {
                      const isSelected = selectedL3 === emp.id;
                      return (
                        <div
                          key={emp.id}
                          onClick={() => setSelectedL3(emp.id)}
                          className={`p-3 border rounded-xl bg-white hover:border-[#00c4b6] cursor-pointer shadow-xs transition-all flex items-center justify-between ${
                            isSelected ? "border-2 border-[#00c4b6] bg-[#00c4b6]/5" : "border-slate-200"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div className="size-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-[9px] shrink-0">
                              {emp.name.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <span className="font-bold text-slate-700 block truncate leading-tight">{emp.name}</span>
                              <span className="text-[9px] text-slate-400 block leading-none mt-0.5">{emp.role}</span>
                            </div>
                          </div>
                          {emp.count > 0 && (
                            <span className="text-[9px] font-bold text-slate-400 bg-slate-150 px-1.5 py-0.2 rounded-full shrink-0 ml-1">
                              {emp.count}
                            </span>
                          )}
                        </div>
                      );
                    })
                  )
                ) : (
                  <div className="text-center text-slate-400 font-semibold py-12 text-[10.5px]">
                    Select a manager in Level 2 to explore direct reports.
                  </div>
                )}

                {/* Sub-level 4 if Sathiya or Samson is expanded */}
                {selectedL3 && getEmployeeChildren(selectedL3).length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                    <span className="text-[9.5px] uppercase font-bold text-slate-400 block">Level 4 Team:</span>
                    {getEmployeeChildren(selectedL3).map((emp) => (
                      <div key={emp.id} className="p-2.5 border border-slate-155 rounded-lg bg-slate-50 flex items-center justify-between shadow-xs">
                        <div className="flex items-center gap-1.5">
                          <div className="size-5 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 text-[8px] font-bold">
                            {emp.name.charAt(0)}
                          </div>
                          <span className="font-bold text-slate-600 block text-[10px]">{emp.name}</span>
                        </div>
                        <span className="text-[9.5px] text-slate-400 font-medium">{emp.role}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

        {/* DEPARTMENT DIRECTORY */}
        {activeSubView === "directory" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between gap-4">
              <input
                type="text"
                placeholder="Search colleagues by name, email or role..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full max-w-sm pl-4 pr-4 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-[#00c4b6] focus:bg-white bg-slate-50 transition-colors"
              />
              <span className="text-[11px] font-bold text-slate-400 shrink-0">
                {filteredEmployees.length} Colleagues
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {filteredEmployees.map((emp) => (
                <div key={emp.id} className="border border-slate-200 hover:border-[#00c4b6] p-4 rounded-xl bg-white shadow-sm hover:shadow-md transition-all flex items-center gap-3">
                  <div className="size-10 rounded-full bg-[#00c4b6]/10 flex items-center justify-center text-[#00c4b6] font-bold text-sm shrink-0">
                    {emp.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-slate-800 truncate">{emp.name}</h4>
                    <p className="text-[10px] text-slate-500 truncate">{emp.designation || "Executive"}</p>
                    <p className="text-[9.5px] text-slate-400 truncate mt-0.5">{emp.email}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* BIRTHDAY FOLKS */}
        {activeSubView === "birthday" && (
          <div className="flex items-center justify-center p-12 border border-slate-100 bg-slate-50/50 rounded-2xl animate-in fade-in duration-200">
            <div className="text-center space-y-2">
              <Calendar className="size-8 text-indigo-400 mx-auto" />
              <p className="text-xs text-slate-400 font-semibold">No birthdays today.</p>
            </div>
          </div>
        )}

        {/* NEW HIRES */}
        {activeSubView === "newhires" && (
          <div className="flex items-center justify-center p-12 border border-slate-100 bg-slate-50/50 rounded-2xl animate-in fade-in duration-200">
            <div className="text-center space-y-2">
              <Users className="size-8 text-emerald-400 mx-auto" />
              <p className="text-xs text-slate-400 font-semibold">No new joinees in the past 15 days.</p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
