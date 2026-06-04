"use client";

import { useState } from "react";
import { DemoFillButton } from "@/components/demo-fill-button";
import {
  computeSalary,
  formatINR,
  type SalaryInputs,
  type SalaryBreakup,
  type City,
  type PFType,
  type InsuranceCoverage,
  type TaxRegime,
} from "@/modules/hrms/salary-structure";
import { useNotifications } from "@/components/notifications/notification-provider";
import { getSalaryDemoValues } from "@/lib/demo-fill";

type Employee = { id: string; name: string; designation: string | null };

const CITIES: { value: City; label: string }[] = [
  { value: "CHENNAI", label: "Chennai" },
  { value: "MUMBAI", label: "Mumbai" },
  { value: "DELHI", label: "Delhi" },
  { value: "KOLKATA", label: "Kolkata" },
  { value: "MUNDRA", label: "Mundra" },
];

const INSURANCE_OPTIONS: { value: InsuranceCoverage; label: string }[] = [
  { value: "SELF", label: "Self" },
  { value: "SELF_SPOUSE", label: "Self + Spouse" },
  { value: "FAMILY", label: "Family (Self + Spouse + 2 Children)" },
  { value: "FAMILY_PARENTS", label: "Family + Parents" },
];

function Row({ label, value, bold, sub }: { label: string; value: string; bold?: boolean; sub?: boolean }) {
  return (
    <tr className={bold ? "bg-gray-50 font-semibold" : ""}>
      <td className={`py-2 pr-4 text-sm ${sub ? "pl-6 text-gray-500" : bold ? "pl-3 text-gray-900" : "pl-3 text-gray-700"}`}>
        {label}
      </td>
      <td className={`py-2 text-right text-sm tabular-nums ${bold ? "text-gray-900" : "text-gray-700"}`}>
        {value}
      </td>
    </tr>
  );
}

function SalaryTable({ breakup }: { breakup: SalaryBreakup }) {
  return (
    <table className="w-full border-collapse">
      <thead>
        <tr className="border-b border-gray-200">
          <th className="pb-2 pl-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Component</th>
          <th className="pb-2 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Monthly (₹)</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        <tr><td colSpan={2} className="pt-3 pb-1 pl-3 text-xs font-semibold uppercase tracking-wide text-indigo-600">Earnings</td></tr>
        <Row sub label="Basic" value={formatINR(breakup.basic)} />
        <Row sub label="HRA" value={formatINR(breakup.hra)} />
        <Row sub label="Special Allowance" value={formatINR(breakup.specialAllowance)} />
        {breakup.monthlyIncentive > 0 && <Row sub label="Monthly Incentive" value={formatINR(breakup.monthlyIncentive)} />}

        <tr><td colSpan={2} className="pt-3 pb-1 pl-3 text-xs font-semibold uppercase tracking-wide text-indigo-600">Employer Contributions</td></tr>
        <Row sub label="Employer PF" value={formatINR(breakup.employerPF)} />
        <Row sub label="Gratuity (4.81%)" value={formatINR(breakup.gratuity)} />

        <Row bold label="Monthly Gross (CTC ÷ 12)" value={formatINR(breakup.monthlyGross)} />

        <tr><td colSpan={2} className="pt-3 pb-1 pl-3 text-xs font-semibold uppercase tracking-wide text-red-500">Deductions</td></tr>
        <Row sub label="Employee PF" value={`− ${formatINR(breakup.employeePF)}`} />
        {breakup.esi > 0 && <Row sub label="ESI (0.75%)" value={`− ${formatINR(breakup.esi)}`} />}
        {breakup.professionalTax > 0 && <Row sub label="Professional Tax" value={`− ${formatINR(breakup.professionalTax)}`} />}
        {breakup.insurancePremium > 0 && <Row sub label="Insurance Premium" value={`− ${formatINR(breakup.insurancePremium)}`} />}

        <Row bold label="Monthly In-Hand" value={formatINR(breakup.inHand)} />

        <tr><td colSpan={2} className="pt-3 pb-1 pl-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Annual Summary</td></tr>
        <Row sub label="Annual CTC" value={formatINR(breakup.annualCTC)} />
        <Row sub label="Annual Gross" value={formatINR(breakup.annualGross)} />
        <Row bold label="Annual In-Hand (est.)" value={formatINR(breakup.annualInHand)} />
      </tbody>
    </table>
  );
}

export function SalaryStructureClient({ employees }: { employees: Employee[] }) {
  const { success, error } = useNotifications();

  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [inputs, setInputs] = useState<SalaryInputs>({
    annualCTC: 0,
    pfType: "CAPPED",
    city: "CHENNAI",
    monthlyIncentive: 0,
    insurance: "SELF",
    taxRegime: "NEW",
  });
  const [breakup, setBreakup] = useState<SalaryBreakup | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  function set<K extends keyof SalaryInputs>(key: K, value: SalaryInputs[K]) {
    setInputs((p) => ({ ...p, [key]: value }));
    setBreakup(null);
    setConfirmed(false);
  }

  function calculate() {
    if (!inputs.annualCTC || inputs.annualCTC <= 0) return;
    setBreakup(computeSalary(inputs));
    setConfirmed(false);
  }

  async function updateEmployee() {
    if (!breakup || !selectedEmployeeId) return;
    setSaving(true);
    const res = await fetch(`/api/hrms/employees/${selectedEmployeeId}/salary-structure`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        annualCTC: breakup.annualCTC,
        monthlyGross: breakup.monthlyGross,
        breakup: {
          basic: breakup.basic,
          hra: breakup.hra,
          specialAllowance: breakup.specialAllowance,
          monthlyIncentive: breakup.monthlyIncentive,
          employerPF: breakup.employerPF,
          gratuity: breakup.gratuity,
          employeePF: breakup.employeePF,
          esi: breakup.esi,
          professionalTax: breakup.professionalTax,
          insurancePremium: breakup.insurancePremium,
          inHand: breakup.inHand,
        },
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      error(d.error ?? "Update failed");
      return;
    }
    setConfirmed(true);
    const emp = employees.find((e) => e.id === selectedEmployeeId);
    success(`Salary updated for ${emp?.name ?? "employee"}`);
  }

  function handlePrint() {
    window.print();
  }

  function fillDemoData() {
    const demo = getSalaryDemoValues(employees);
    setSelectedEmployeeId(demo.selectedEmployeeId);
    setInputs(demo.inputs);
    setBreakup(null);
    setConfirmed(false);
  }

  return (
    <div className="space-y-6">
      {/* Input form */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 className="font-semibold text-gray-900">Inputs</h2>
          <DemoFillButton disabled={saving} onClick={fillDemoData} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* Employee selector */}
          {employees.length > 0 && (
            <div className="sm:col-span-2 space-y-1">
              <label className="block text-sm font-medium text-gray-700">Employee (optional)</label>
              <select
                value={selectedEmployeeId}
                onChange={(e) => { setSelectedEmployeeId(e.target.value); setConfirmed(false); }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">— No employee selected —</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}{emp.designation ? ` — ${emp.designation}` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Annual CTC */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Annual CTC (₹)</label>
            <input
              type="number"
              min={0}
              value={inputs.annualCTC || ""}
              onChange={(e) => set("annualCTC", Number(e.target.value))}
              placeholder="e.g. 600000"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Monthly Incentive */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Monthly Incentive (₹)</label>
            <input
              type="number"
              min={0}
              value={inputs.monthlyIncentive || ""}
              onChange={(e) => set("monthlyIncentive", Number(e.target.value))}
              placeholder="0"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* PF Type */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">PF Type</label>
            <div className="flex gap-3">
              {(["CAPPED", "UNCAPPED"] as PFType[]).map((t) => (
                <label key={t} className={`flex items-center gap-2 cursor-pointer rounded-lg border px-4 py-2 text-sm flex-1 ${inputs.pfType === t ? "border-indigo-300 bg-indigo-50 text-indigo-800" : "border-gray-200"}`}>
                  <input
                    type="radio"
                    name="pfType"
                    value={t}
                    checked={inputs.pfType === t}
                    onChange={() => set("pfType", t)}
                    className="accent-indigo-600"
                  />
                  {t === "CAPPED" ? "Capped (₹1,800)" : "Uncapped (12%)"}
                </label>
              ))}
            </div>
          </div>

          {/* City */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">City</label>
            <select
              value={inputs.city}
              onChange={(e) => set("city", e.target.value as City)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {CITIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>

          {/* Insurance */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Insurance Coverage</label>
            <select
              value={inputs.insurance}
              onChange={(e) => set("insurance", e.target.value as InsuranceCoverage)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {INSURANCE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          {/* Tax Regime */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Tax Regime</label>
            <div className="flex gap-3">
              {(["NEW", "OLD"] as TaxRegime[]).map((t) => (
                <label key={t} className={`flex items-center gap-2 cursor-pointer rounded-lg border px-4 py-2 text-sm flex-1 ${inputs.taxRegime === t ? "border-indigo-300 bg-indigo-50 text-indigo-800" : "border-gray-200"}`}>
                  <input
                    type="radio"
                    name="taxRegime"
                    value={t}
                    checked={inputs.taxRegime === t}
                    onChange={() => set("taxRegime", t)}
                    className="accent-indigo-600"
                  />
                  {t === "NEW" ? "New Regime" : "Old Regime"}
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-5 flex gap-3">
          <button
            onClick={calculate}
            disabled={!inputs.annualCTC || inputs.annualCTC <= 0}
            className="px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition"
          >
            Calculate
          </button>
        </div>
      </div>

      {/* Results */}
      {breakup && (
        <>
          {/* Print-friendly section */}
          <div id="salary-print-area" className="bg-white rounded-xl border border-gray-200 p-6 print:border-0 print:p-0">
            <div className="flex items-start justify-between mb-5 print:mb-4">
              <div>
                <h2 className="font-semibold text-gray-900 text-lg">Salary Breakup</h2>
                {selectedEmployeeId && (
                  <p className="text-sm text-gray-500 mt-0.5">
                    {employees.find((e) => e.id === selectedEmployeeId)?.name}
                  </p>
                )}
              </div>
              <div className="text-right print:hidden flex gap-2">
                <button
                  onClick={handlePrint}
                  className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 transition"
                >
                  Print / PDF
                </button>
              </div>
            </div>

            <SalaryTable breakup={breakup} />

            {/* Quick summary chips */}
            <div className="mt-5 flex flex-wrap gap-3 pt-4 border-t border-gray-100">
              {[
                { label: "Monthly Gross", value: formatINR(breakup.monthlyGross) },
                { label: "Monthly In-Hand", value: formatINR(breakup.inHand), accent: true },
                { label: "Annual CTC", value: formatINR(breakup.annualCTC) },
              ].map((chip) => (
                <div key={chip.label} className={`rounded-lg px-4 py-2 text-sm ${chip.accent ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-800"}`}>
                  <span className="opacity-75">{chip.label}: </span>
                  <span className="font-semibold">{chip.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Update employee action */}
          {selectedEmployeeId && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Update salary for{" "}
                  <strong>{employees.find((e) => e.id === selectedEmployeeId)?.name}</strong>
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Saves CTC + monthly gross to employment record. Used for AMS hike calculations.
                </p>
                {confirmed && (
                  <p className="text-xs text-green-700 mt-1">Saved — monthly gross: {formatINR(breakup.monthlyGross)}</p>
                )}
              </div>
              <button
                onClick={updateEmployee}
                disabled={saving || confirmed}
                className="shrink-0 px-5 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition"
              >
                {saving ? "Saving…" : confirmed ? "Updated" : "Update Employee Salary"}
              </button>
            </div>
          )}
        </>
      )}

      <style>{`
        @media print {
          body > * { display: none !important; }
          #salary-print-area { display: block !important; position: fixed; top: 0; left: 0; width: 100%; }
        }
      `}</style>
    </div>
  );
}
