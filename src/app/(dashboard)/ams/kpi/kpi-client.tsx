"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LayoutGrid, FileText, CheckCircle, Plus, Info, Award } from "lucide-react";

type Dept = {
  id: string;
  name: string;
  code: string;
};

interface KpiClientProps {
  departments: Dept[];
}

const INITIAL_TEMPLATES = [
  {
    id: "temp-eng",
    departmentName: "Engineering",
    metricsCount: 3,
    metrics: [
      { name: "Sprint Delivery Rate", weight: 30, target: ">= 90%" },
      { name: "Code Quality Index", weight: 30, target: ">= 4.5/5" },
      { name: "System Uptime", weight: 40, target: ">= 99.9%" },
    ],
  },
  {
    id: "temp-sales",
    departmentName: "Sales",
    metricsCount: 3,
    metrics: [
      { name: "Monthly Revenue Target", weight: 50, target: ">= 100%" },
      { name: "Lead Conversion Rate", weight: 30, target: ">= 15%" },
      { name: "Client Satisfaction Score", weight: 20, target: ">= 4.7/5" },
    ],
  },
  {
    id: "temp-support",
    departmentName: "Customer Support",
    metricsCount: 3,
    metrics: [
      { name: "First Response Time", weight: 40, target: "<= 15 mins" },
      { name: "Ticket Resolution Rate", weight: 40, target: ">= 95%" },
      { name: "CSAT Score", weight: 20, target: ">= 4.8/5" },
    ],
  },
];

const INITIAL_REVIEWS = [
  {
    id: "rev-1",
    department: "Engineering",
    period: "May 2026",
    reviewer: "Director of Engineering",
    score: "92/100",
    status: "APPROVED",
  },
  {
    id: "rev-2",
    department: "Sales",
    period: "May 2026",
    reviewer: "VP of Sales",
    score: "85/100",
    status: "APPROVED",
  },
  {
    id: "rev-3",
    department: "Customer Support",
    period: "May 2026",
    reviewer: "Support Lead",
    score: "96/100",
    status: "APPROVED",
  },
];

export function KpiClient({ departments }: KpiClientProps) {
  const [tab, setTab] = useState<"templates" | "reviews" | "departments">("templates");
  const [templates, setTemplates] = useState(INITIAL_TEMPLATES);
  const [reviews, setReviews] = useState(INITIAL_REVIEWS);
  const [formOpen, setFormOpen] = useState(false);

  // Form State
  const [selectedDept, setSelectedDept] = useState("");
  const [metricName, setMetricName] = useState("");
  const [metricWeight, setMetricWeight] = useState("");
  const [metricTarget, setMetricTarget] = useState("");
  const [newMetrics, setNewMetrics] = useState<{ name: string; weight: number; target: string }[]>([]);

  function addMetricToDraft() {
    if (!metricName.trim() || !metricWeight || !metricTarget.trim()) return;
    setNewMetrics((prev) => [
      ...prev,
      {
        name: metricName.trim(),
        weight: parseInt(metricWeight),
        target: metricTarget.trim(),
      },
    ]);
    setMetricName("");
    setMetricWeight("");
    setMetricTarget("");
  }

  function handleCreateTemplate(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedDept || newMetrics.length === 0) return;

    const totalWeight = newMetrics.reduce((sum, m) => sum + m.weight, 0);
    if (totalWeight !== 100) {
      alert(`Total weight must equal 100%. Current sum: ${totalWeight}%`);
      return;
    }

    const newTemplate = {
      id: Math.random().toString(),
      departmentName: selectedDept,
      metricsCount: newMetrics.length,
      metrics: newMetrics,
    };

    setTemplates((prev) => [newTemplate, ...prev]);
    setSelectedDept("");
    setNewMetrics([]);
    setFormOpen(false);
  }

  return (
    <div className="space-y-6">
      {/* Tab system */}
      <div className="flex items-center gap-1 border-b border-outline-variant">
        {[
          { id: "templates", label: "KPI Templates", icon: FileText },
          { id: "reviews", label: "Monthly Reviews", icon: Award },
          { id: "departments", label: "Department Coverage", icon: LayoutGrid },
        ].map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id
                  ? "border-primary text-primary"
                  : "border-transparent text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <Icon className="size-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* TEMPLATES TAB */}
      {tab === "templates" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            {templates.map((temp) => (
              <Card key={temp.id} className="border-0 shadow-sm bg-surface">
                <CardHeader className="pb-3 border-b border-outline-variant/60 flex flex-row items-center justify-between">
                  <CardTitle className="text-base font-bold text-slate-800 dark:text-slate-200">
                    {temp.departmentName} Department KPI
                  </CardTitle>
                  <span className="text-xs text-[#00cec4] bg-[#00cec4]/10 rounded-full px-2.5 py-0.5 font-bold">
                    {temp.metricsCount} Metrics
                  </span>
                </CardHeader>
                <CardContent className="p-0">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-outline-variant/60 bg-surface-container-low/40 dark:bg-surface-container-lowest/50 text-left">
                        <th className="py-2.5 px-4 text-xs font-bold uppercase tracking-wider text-slate-400">Metric Name</th>
                        <th className="px-4 text-xs font-bold uppercase tracking-wider text-slate-400">Target</th>
                        <th className="px-4 text-xs font-bold uppercase tracking-wider text-slate-400 text-right">Weight</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/30">
                      {temp.metrics.map((metric, i) => (
                        <tr key={i} className="hover:bg-surface-container-high/20 transition">
                          <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{metric.name}</td>
                          <td className="px-4 font-semibold text-on-surface-variant dark:text-slate-400">{metric.target}</td>
                          <td className="px-4 font-bold text-slate-900 dark:text-white text-right">{metric.weight}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="space-y-6">
            {!formOpen ? (
              <Button onClick={() => setFormOpen(true)} className="w-full">
                <Plus className="size-4 mr-1.5" /> Create KPI Template
              </Button>
            ) : (
              <Card className="border-0 shadow-sm border-l-4 border-l-[#00cec4] bg-surface">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-bold text-slate-800 dark:text-slate-200">
                    New KPI Template
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreateTemplate} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Department
                      </label>
                      <select
                        value={selectedDept}
                        onChange={(e) => setSelectedDept(e.target.value)}
                        className="w-full rounded-lg border border-outline-variant/60 bg-surface px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#00cec4] transition"
                      >
                        <option value="">Select Department</option>
                        {departments.map((d) => (
                          <option key={d.id} value={d.name}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Metrics Add Area */}
                    <div className="space-y-3 rounded-lg border border-outline-variant/40 p-3 bg-surface-container-low/20">
                      <h4 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                        Add Metric Row
                      </h4>

                      <div className="space-y-2">
                        <input
                          type="text"
                          placeholder="Metric label..."
                          value={metricName}
                          onChange={(e) => setMetricName(e.target.value)}
                          className="w-full rounded border border-outline-variant/60 bg-surface px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="number"
                            placeholder="Weight %..."
                            value={metricWeight}
                            onChange={(e) => setMetricWeight(e.target.value)}
                            className="w-full rounded border border-outline-variant/60 bg-surface px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none"
                          />
                          <input
                            type="text"
                            placeholder="Target value..."
                            value={metricTarget}
                            onChange={(e) => setMetricTarget(e.target.value)}
                            className="w-full rounded border border-outline-variant/60 bg-surface px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={addMetricToDraft}
                          className="w-full h-8 text-xs font-bold"
                        >
                          Add Row
                        </Button>
                      </div>
                    </div>

                    {/* Metric Draft List */}
                    {newMetrics.length > 0 && (
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Template Metrics ({newMetrics.reduce((s, m) => s + m.weight, 0)}% total)
                        </label>
                        <ul className="text-xs font-semibold text-on-surface-variant dark:text-slate-400 space-y-1">
                          {newMetrics.map((m, idx) => (
                            <li key={idx} className="flex justify-between p-1 border-b border-outline-variant/20">
                              <span>{m.name}</span>
                              <strong className="text-slate-800 dark:text-slate-200">{m.weight}%</strong>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        type="submit"
                        disabled={!selectedDept || newMetrics.length === 0}
                        className="flex-1"
                      >
                        Create
                      </Button>
                      <Button variant="outline" onClick={() => setFormOpen(false)}>
                        Cancel
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            <Card className="border-0 shadow-sm bg-surface">
              <CardHeader className="border-b border-outline-variant/60 pb-3">
                <CardTitle className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Info className="size-4 text-[#00cec4]" /> KPI Guidelines
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3 text-xs text-on-surface-variant dark:text-slate-400 font-semibold leading-relaxed">
                <p>
                  1. Each department must have a designated KPI template configured containing critical delivery items.
                </p>
                <p>
                  2. All metrics inside a single template must sum up to **exactly 100% weight**.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* REVIEWS TAB */}
      {tab === "reviews" && (
        <Card className="border-0 shadow-sm bg-surface">
          <CardHeader className="pb-3 border-b border-outline-variant/60">
            <CardTitle className="text-base font-bold text-slate-800 dark:text-slate-200">
              Department Monthly Reviews
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-outline-variant bg-surface-container-low/40 dark:bg-surface-container-lowest/50 text-left">
                    <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-slate-400">Department</th>
                    <th className="px-4 text-xs font-bold uppercase tracking-wider text-slate-400">Review Period</th>
                    <th className="px-4 text-xs font-bold uppercase tracking-wider text-slate-400">Reviewer</th>
                    <th className="px-4 text-xs font-bold uppercase tracking-wider text-slate-400 text-right">Score</th>
                    <th className="px-4 text-xs font-bold uppercase tracking-wider text-slate-400 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/40">
                  {reviews.map((rev) => (
                    <tr key={rev.id} className="hover:bg-surface-container-high/20 transition">
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">{rev.department}</td>
                      <td className="px-4 font-semibold text-on-surface-variant dark:text-slate-400">{rev.period}</td>
                      <td className="px-4 font-semibold text-on-surface-variant dark:text-slate-400">{rev.reviewer}</td>
                      <td className="px-4 font-bold text-[#00cec4] text-right">{rev.score}</td>
                      <td className="px-4 text-center">
                        <span className="inline-flex rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/30 px-2 py-0.5 text-[10px] font-bold">
                          {rev.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* DEPARTMENTS TAB */}
      {tab === "departments" && (
        <Card className="border-0 shadow-sm bg-surface">
          <CardHeader className="pb-3 border-b border-outline-variant/60">
            <CardTitle className="text-base font-bold text-slate-800 dark:text-slate-200">
              Department Onboarding & KPI Coverage
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            {departments.length === 0 ? (
              <div className="text-center text-slate-400/80 py-8 text-sm font-medium">
                No departments found in the system.
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                {departments.map((dept) => {
                  const hasTemplate = templates.some(
                    (t) => t.departmentName.toLowerCase() === dept.name.toLowerCase()
                  );

                  return (
                    <div
                      key={dept.id}
                      className="rounded-xl border border-outline-variant/50 p-4 bg-surface-container-low/20 dark:bg-surface-container-lowest/30 flex items-center justify-between gap-3"
                    >
                      <div>
                        <h4 className="text-sm font-bold text-slate-850 dark:text-slate-200">
                          {dept.name}
                        </h4>
                        <span className="text-[10px] font-mono text-slate-400 uppercase">
                          Code: {dept.code}
                        </span>
                      </div>
                      <span
                        className={`text-[9px] px-2 py-0.5 rounded-full font-bold border uppercase ${
                          hasTemplate
                            ? "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300"
                            : "bg-surface-container-high text-on-surface-variant border-outline-variant dark:bg-slate-800 dark:text-slate-400"
                        }`}
                      >
                        {hasTemplate ? "Assigned" : "No Template"}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
