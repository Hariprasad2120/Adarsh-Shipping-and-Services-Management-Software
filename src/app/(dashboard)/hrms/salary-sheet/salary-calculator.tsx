"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { Calculator, TrendingUp, IndianRupee } from "lucide-react";
import { Button } from "@/components/ui/button";

type PfType = "Capped" | "Uncapped";
type City = "Chennai" | "Mumbai" | "Delhi" | "Kolkata" | "Mundra";
type Coverage = "Nil" | "Self Only" | "Self + Spouse" | "Family" | "Family + Parents";
type TaxRegime = "New" | "Old";

function calcSalary(
  annualCTC: number,
  pfType: PfType,
  city: City,
  monthlyIncentive: number,
  coverage: Coverage,
  taxRegime: TaxRegime,
) {
  const monthlyCTC = annualCTC / 12;
  const basic = monthlyCTC * 0.5;
  const hra = city === "Chennai" ? basic * 0.5 : basic * 0.4;
  const employerPF = pfType === "Capped" ? Math.min(basic * 0.12, 1800) : basic * 0.12;
  const travelAllowance = basic * 0.15;
  const specialAllowance = Math.max(0, monthlyCTC - (basic + hra + employerPF + travelAllowance));
  const gross = basic + hra + specialAllowance + travelAllowance;

  const employeePF = employerPF;
  const esiEmployer = gross <= 21000 ? gross * 0.0325 : 0;
  const esiEmployee = gross <= 21000 ? gross * 0.0075 : 0;

  let pt = 0;
  if (city === "Chennai") {
    pt = gross <= 12000 ? 0 : gross <= 21000 ? 200 : 208;
  } else if (city === "Delhi") {
    pt = 0;
  } else {
    pt = 200;
  }

  let insurance = 0;
  if (coverage !== "Nil" && gross > 21000) {
    const base = annualCTC < 400000 ? 1000 
                : annualCTC < 800000 ? 1500 
                : 2000;

    const mult = coverage === "Self Only" ? 1 
               : coverage === "Self + Spouse" ? 1.5 
               : coverage === "Family" ? 2 
               : 0;

    insurance = base * mult;
  }

  const inHand = gross - employeePF - esiEmployee - pt;

  let tax = 0;
  if (taxRegime === "New") {
    const taxable = annualCTC - 50000;
    if (taxable > 1500000) tax = (60000 + (taxable - 1500000) * 0.3) / 12;
    else if (taxable > 1200000) tax = ((taxable - 1200000) * 0.2) / 12;
    else tax = 0;
  } else {
    tax = (annualCTC * 0.1) / 12;
  }

  const finalTakeHome = inHand - tax + monthlyIncentive;

  return {
    monthlyCTC, basic, hra, employerPF, travelAllowance, specialAllowance,
    gross, employeePF, esiEmployer, esiEmployee, pt, insurance,
    inHand, tax, finalTakeHome,
  };
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.abs(n));
}

function Row({ label, monthly, annual, highlight, note }: {
  label: string; monthly: number; annual: number;
  highlight?: boolean; note?: string;
}) {
  const isNegative = monthly < 0;
  const displayMonthly = fmt(monthly);
  const displayAnnual = fmt(annual);

  return (
    <tr className={highlight ? "bg-slate-50 dark:bg-slate-800/50 font-semibold" : ""}>
      <td className="py-2.5 px-4 text-slate-700 dark:text-slate-300">
        {label}
        {note && <span className="text-xs text-slate-400 ml-1.5">({note})</span>}
      </td>
      <td className={`py-2.5 px-4 text-right font-medium ${isNegative ? "text-red-600 dark:text-red-400" : "text-slate-900 dark:text-white"}`}>
        {isNegative ? "-" : ""}₹{displayMonthly}
      </td>
      <td className={`py-2.5 px-4 text-right font-medium ${isNegative ? "text-red-600 dark:text-red-400" : "text-slate-900 dark:text-white"}`}>
        {isNegative ? "-" : ""}₹{displayAnnual}
      </td>
    </tr>
  );
}

export function SalaryCalculator() {
  const [empName, setEmpName] = useState("");
  const [empRole, setEmpRole] = useState("");
  const [doj, setDoj] = useState("");
  const [annualCTC, setAnnualCTC] = useState(600000);
  const [pfType, setPfType] = useState<PfType>("Capped");
  const [city, setCity] = useState<City>("Chennai");
  const [incentive, setIncentive] = useState(0);
  const [coverage, setCoverage] = useState<Coverage>("Nil");
  const [taxRegime, setTaxRegime] = useState<TaxRegime>("New");

  const calc = useMemo(
    () => calcSalary(annualCTC, pfType, city, incentive, coverage, taxRegime),
    [annualCTC, pfType, city, incentive, coverage, taxRegime],
  );

  const rows = [
    { label: "Monthly CTC", monthly: calc.monthlyCTC, annual: annualCTC, note: "CTC / 12" },
    { label: "Basic (50%)", monthly: calc.basic, annual: calc.basic * 12, note: "50% of monthly CTC" },
    { label: "HRA", monthly: calc.hra, annual: calc.hra * 12, note: city === "Chennai" ? "50% of basic" : "40% of basic" },
    { label: "Employer PF", monthly: calc.employerPF, annual: calc.employerPF * 12, note: pfType === "Capped" ? "min(12%, ₹1800)" : "12% of basic" },
    { label: "Travel Allowance", monthly: calc.travelAllowance, annual: calc.travelAllowance * 12, note: "15% of basic" },
    { label: "Special Allowance", monthly: calc.specialAllowance, annual: calc.specialAllowance * 12, note: "Balancing" },
    { label: "Gross Earnings", monthly: calc.gross, annual: calc.gross * 12, highlight: true },
    { label: "Employee PF (deduction)", monthly: -calc.employeePF, annual: -calc.employeePF * 12 },
    { label: "ESI Employer", monthly: calc.esiEmployer, annual: calc.esiEmployer * 12, note: calc.gross <= 21000 ? "3.25% of gross" : "N/A (gross > 21k)" },
    { label: "ESI Employee (deduction)", monthly: -calc.esiEmployee, annual: -calc.esiEmployee * 12 },
    { label: "Professional Tax (deduction)", monthly: -calc.pt, annual: -calc.pt * 12, note: city },
    { label: "Insurance", monthly: calc.insurance, annual: calc.insurance * 12, note: calc.gross > 21000 ? coverage : "ESI covered" },
    { label: "In-Hand Salary", monthly: calc.inHand, annual: calc.inHand * 12, highlight: true },
    { label: "Income Tax (deduction)", monthly: -calc.tax, annual: -calc.tax * 12, note: taxRegime + " regime" },
    { label: "Monthly Incentive", monthly: incentive, annual: incentive * 12 },
    { label: "Final Take Home", monthly: calc.finalTakeHome, annual: calc.finalTakeHome * 12, highlight: true },
  ];

  const offerRows = [
    { label: "Basic", monthly: calc.basic, annual: calc.basic * 12 },
    { label: "HRA", monthly: calc.hra, annual: calc.hra * 12 },
    { label: "Special Allowance", monthly: calc.specialAllowance, annual: calc.specialAllowance * 12 },
    { label: "Employer PF", monthly: calc.employerPF, annual: calc.employerPF * 12 },
    { label: "Travel Allowance", monthly: calc.travelAllowance, annual: calc.travelAllowance * 12 },
    { label: "Insurance", monthly: calc.insurance, annual: calc.insurance * 12 },
    { label: "Total CTC", monthly: annualCTC / 12, annual: annualCTC, highlight: true },
    { label: "CTC + Benefits", monthly: (annualCTC / 12) + calc.insurance, annual: annualCTC + (calc.insurance * 12) }
  ];

  const esiApplies = calc.gross <= 21000;
  const taxApplies = (annualCTC - 50000) > 1200000 && taxRegime === "New";

  const selectClass = "flex h-11 w-full rounded-xl border border-[#00cec4]/55 bg-surface px-4 py-2.5 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/15 hover:border-[#00cec4]/85 transition";

  return (
    <div className="space-y-6">
      {/* Input panel */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 text-gray-900 dark:text-white font-semibold">
            <Calculator className="size-4" /> Salary Inputs
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Employee details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Employee Name</Label>
              <Input value={empName} onChange={(e) => setEmpName(e.target.value)} placeholder="Full name" />
            </div>
            <div className="space-y-1.5">
              <Label>Role / Designation</Label>
              <Input value={empRole} onChange={(e) => setEmpRole(e.target.value)} placeholder="e.g. Manager" />
            </div>
            <div className="space-y-1.5">
              <Label>Date of Joining</Label>
              <Input type="date" value={doj} onChange={(e) => setDoj(e.target.value)} />
            </div>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800 pt-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5 sm:col-span-1 col-span-2">
              <Label>Annual CTC (₹)</Label>
              <Input
                type="number"
                value={annualCTC}
                onChange={(e) => setAnnualCTC(Number(e.target.value) || 0)}
                min={0}
                step={10000}
              />
            </div>
            <div className="space-y-1.5">
              <Label>PF Type</Label>
              <select value={pfType} onChange={(e) => setPfType(e.target.value as PfType)} className={selectClass}>
                <option value="Capped" className="bg-surface">Capped (max ₹1,800)</option>
                <option value="Uncapped" className="bg-surface">Uncapped (12% of basic)</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>City</Label>
              <select value={city} onChange={(e) => setCity(e.target.value as City)} className={selectClass}>
                {(["Chennai", "Mumbai", "Delhi", "Kolkata", "Mundra"] as City[]).map((c) => (
                  <option key={c} value={c} className="bg-surface">{c}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Monthly Incentive (₹)</Label>
              <Input
                type="number"
                value={incentive}
                onChange={(e) => setIncentive(Number(e.target.value) || 0)}
                min={0}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Insurance Coverage</Label>
              <select value={coverage} onChange={(e) => setCoverage(e.target.value as Coverage)} className={selectClass}>
                {(["Nil", "Self Only", "Self + Spouse", "Family", "Family + Parents"] as Coverage[]).map((c) => (
                  <option key={c} value={c} className="bg-surface">{c}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Tax Regime</Label>
              <select value={taxRegime} onChange={(e) => setTaxRegime(e.target.value as TaxRegime)} className={selectClass}>
                <option value="New" className="bg-surface">New Regime</option>
                <option value="Old" className="bg-surface">Old Regime (10%)</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Monthly CTC", value: calc.monthlyCTC, color: "text-sky-600 dark:text-sky-400" },
          { label: "Gross Monthly", value: calc.gross, color: "text-purple-600 dark:text-purple-400" },
          { label: "In-Hand Monthly", value: calc.inHand, color: "text-emerald-600 dark:text-emerald-400" },
          { label: "Final Take Home", value: calc.finalTakeHome, color: "text-teal-600 dark:text-teal-400" },
        ].map((s) => (
          <Card key={s.label} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className={`text-xs font-semibold ${s.color} mb-1`}>{s.label}</div>
              <motion.div
                key={Math.round(s.value)}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-2xl font-bold text-slate-900 dark:text-white"
              >
                ₹{fmt(s.value)}
              </motion.div>
              <div className="text-xs text-slate-400 mt-0.5 font-medium">₹{fmt(s.value * 12)} / yr</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Flags */}
      <div className="flex flex-wrap gap-2 text-xs">
        {esiApplies && (
          <span className="bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300 rounded-full px-3 py-1.5 font-semibold">
            ESI applicable (gross ≤ ₹21,000)
          </span>
        )}
        {!esiApplies && (
          <span className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 rounded-full px-3 py-1.5 font-medium">
            Insurance applicable (gross &gt; ₹21,000) · {coverage}
          </span>
        )}
        {taxApplies && (
          <span className="bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 rounded-full px-3 py-1.5 font-semibold">
            Income tax applicable
          </span>
        )}
        {!taxApplies && taxRegime === "New" && (
          <span className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 rounded-full px-3 py-1.5 font-semibold">
            No income tax (rebate applies under new regime)
          </span>
        )}
        <span className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 rounded-full px-3 py-1.5 font-medium">
          PT: {city} · ₹{fmt(calc.pt)}/mo
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Full breakdown */}
        <Card className="border-0 shadow-sm overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-gray-900 dark:text-white font-semibold">
              <TrendingUp className="size-4" /> Detailed Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-outline-variant bg-slate-50 dark:bg-slate-800/30">
                    <th className="py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">Component</th>
                    <th className="py-3 px-4 text-right font-semibold text-slate-700 dark:text-slate-300">Monthly</th>
                    <th className="py-3 px-4 text-right font-semibold text-slate-700 dark:text-slate-300">Annual</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/60">
                  {rows.map((r) => (
                    <Row key={r.label} {...r} />
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Offer letter structure */}
        <div className="space-y-6">
          <Card className="border-0 shadow-sm overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-gray-900 dark:text-white font-semibold">
                <IndianRupee className="size-4" /> Offer Letter Structure
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b border-outline-variant bg-slate-50 dark:bg-slate-800/30">
                      <th className="py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">Component</th>
                      <th className="py-3 px-4 text-right font-semibold text-slate-700 dark:text-slate-300">Monthly</th>
                      <th className="py-3 px-4 text-right font-semibold text-slate-700 dark:text-slate-300">Annual</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/60">
                    {offerRows.map((r) => (
                      <Row key={r.label} {...r} />
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Explanation */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-gray-900 dark:text-white font-semibold">Salary Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                {empName && <p><span className="font-semibold text-slate-900 dark:text-white">Employee:</span> {empName}</p>}
                {empRole && <p><span className="font-semibold text-slate-900 dark:text-white">Role:</span> {empRole}</p>}
                {doj && <p><span className="font-semibold text-slate-900 dark:text-white">DOJ:</span> {new Date(doj).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p>}
                <div className="border-t border-slate-100 dark:border-slate-800 pt-3 mt-3 space-y-1.5 text-xs font-medium">
                  <p>• Basic is 50% of CTC.</p>
                  <p>• HRA based on city ({city}) — {city === "Chennai" ? "50%" : "40%"} of basic.</p>
                  <p>• PF applied as per {pfType} method.</p>
                  <p>• Travel Allowance included as long-term benefit.</p>
                  <p>• {esiApplies ? "Covered under ESI." : `Covered under insurance (${coverage}).`}</p>
                  <p>• PT applied based on location — ₹{fmt(calc.pt)}/month.</p>
                  <p>• {taxApplies ? `Income tax applied as per ${taxRegime} regime.` : "No income tax applicable under new regime."}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
