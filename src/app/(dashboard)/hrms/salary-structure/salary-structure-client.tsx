"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { FileSpreadsheet, IndianRupee, TrendingUp } from "lucide-react";
import { DemoFillButton } from "@/components/demo-fill-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DropdownSelect } from "@/components/ui/dropdown-select";
import { Input } from "@/components/ui/input";
import { useNotifications } from "@/components/notifications/notification-provider";
import { getSalaryDemoValues } from "@/lib/demo-fill";
import {
  cityLabel,
  computeSalary,
  formatINR,
  type City,
  type InsuranceCoverage,
  type PFType,
  type SalaryInputs,
  type TaxRegime,
} from "@/modules/hrms/salary-structure";

type Employee = { id: string; name: string; designation: string | null };

const CITIES: Array<{ value: City; label: string }> = [
  { value: "CHENNAI", label: "Chennai" },
  { value: "MUMBAI", label: "Mumbai" },
  { value: "DELHI", label: "Delhi" },
  { value: "KOLKATA", label: "Kolkata" },
  { value: "MUNDRA", label: "Mundra" },
];

const INSURANCE_OPTIONS: Array<{ value: InsuranceCoverage; label: string }> = [
  { value: "NIL", label: "Nil" },
  { value: "SELF", label: "Self Only" },
  { value: "SELF_SPOUSE", label: "Self + Spouse" },
  { value: "FAMILY", label: "Family" },
  { value: "FAMILY_PARENTS", label: "Family + Parents" },
];

const TAX_OPTIONS: Array<{ value: TaxRegime; label: string }> = [
  { value: "NEW", label: "New" },
  { value: "OLD", label: "Old" },
];

const PF_OPTIONS: Array<{ value: PFType; label: string }> = [
  { value: "CAPPED", label: "Capped" },
  { value: "UNCAPPED", label: "Uncapped" },
];

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(value);
}

function Row({
  label,
  monthly,
  annual,
  note,
  highlight,
}: {
  label: string;
  monthly: number;
  annual: number;
  note?: string;
  highlight?: boolean;
}) {
  return (
    <tr className={highlight ? "bg-surface-container-low font-semibold" : ""}>
      <td className="px-4 py-3 text-sm text-on-surface">
        {label}
        {note ? <span className="ml-1.5 text-xs text-on-surface-variant">({note})</span> : null}
      </td>
      <td className="ds-numeric px-4 py-3 text-right text-sm text-on-surface">₹{formatNumber(monthly)}</td>
      <td className="ds-numeric px-4 py-3 text-right text-sm text-on-surface">₹{formatNumber(annual)}</td>
    </tr>
  );
}

function SummaryCard({
  label,
  value,
  annual,
  tone,
}: {
  label: string;
  value: number;
  annual: number;
  tone: string;
}) {
  return (
    <Card className="rounded-[22px] border-outline-variant/40 shadow-ambient">
      <CardContent className="p-5">
        <p className={`text-xs font-medium ${tone}`}>{label}</p>
        <p className="ds-numeric mt-1 text-3xl font-semibold tracking-tight text-on-surface">₹{formatNumber(value)}</p>
        <p className="ds-numeric mt-1 text-xs text-on-surface-variant">₹{formatNumber(annual)} / yr</p>
      </CardContent>
    </Card>
  );
}

function TableCard({
  icon,
  title,
  rows,
}: {
  icon: ReactNode;
  title: string;
  rows: Array<{ label: string; monthly: number; annual: number; note?: string; highlight?: boolean }>;
}) {
  return (
    <Card className="overflow-hidden rounded-[24px] border-outline-variant/40 shadow-ambient">
      <CardHeader className="border-b border-outline-variant/20 pb-4">
        <CardTitle className="flex items-center gap-2 text-base">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-container-low">
              <tr>
                <th className="px-4 py-3 text-left text-xs uppercase tracking-[0.14em] text-on-surface-variant">Component</th>
                <th className="px-4 py-3 text-right text-xs uppercase tracking-[0.14em] text-on-surface-variant">Monthly</th>
                <th className="px-4 py-3 text-right text-xs uppercase tracking-[0.14em] text-on-surface-variant">Annual</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20">
              {rows.map((row) => (
                <Row key={row.label} {...row} />
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

export function SalaryStructureClient({ employees }: { employees: Employee[] }) {
  const { success, error } = useNotifications();

  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [employeeName, setEmployeeName] = useState("");
  const [employeeRole, setEmployeeRole] = useState("");
  const [dateOfJoining, setDateOfJoining] = useState("");
  const [inputs, setInputs] = useState<SalaryInputs>({
    annualCTC: 0,
    pfType: "CAPPED",
    city: "CHENNAI",
    monthlyIncentive: 0,
    insurance: "NIL",
    taxRegime: "NEW",
  });
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);

  const breakup = useMemo(() => computeSalary(inputs), [inputs]);

  const selectedEmployee = employees.find((employee) => employee.id === selectedEmployeeId) ?? null;

  function set<K extends keyof SalaryInputs>(key: K, value: SalaryInputs[K]) {
    setInputs((current) => ({ ...current, [key]: value }));
    setConfirmed(false);
  }

  async function updateEmployee() {
    if (!selectedEmployeeId) return;

    setSaving(true);
    const res = await fetch(`/api/hrms/employees/${selectedEmployeeId}/salary-structure`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        annualCTC: breakup.annualCTC,
        monthlyGross: breakup.monthlyGross,
        breakup: {
          monthlyCTC: breakup.monthlyCTC,
          basic: breakup.basic,
          hra: breakup.hra,
          specialAllowance: breakup.specialAllowance,
          employerPF: breakup.employerPF,
          employeePF: breakup.employeePF,
          travelAllowance: breakup.travelAllowance,
          gratuity: breakup.gratuity,
          esiEmployer: breakup.esiEmployer,
          esi: breakup.esi,
          professionalTax: breakup.professionalTax,
          insurancePremium: breakup.insurancePremium,
          tax: breakup.tax,
          inHand: breakup.inHand,
          finalTakeHome: breakup.finalTakeHome,
        },
      }),
    });
    setSaving(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      error(data.error ?? "Update failed");
      return;
    }

    setConfirmed(true);
    success(`Salary updated for ${selectedEmployee?.name ?? "employee"}`);
  }

  function handlePrint() {
    window.print();
  }

  function fillDemoData() {
    const demo = getSalaryDemoValues(employees);
    setSelectedEmployeeId(demo.selectedEmployeeId);
    setInputs({
      ...demo.inputs,
      insurance: demo.inputs.insurance ?? "NIL",
    });
    setConfirmed(false);
  }

  const detailedRows = [
    { label: "Monthly CTC", monthly: breakup.monthlyCTC, annual: breakup.monthlyCTC * 12, note: "CTC / 12" },
    { label: "Basic (50%)", monthly: breakup.basic, annual: breakup.basic * 12, note: "50% of monthly CTC" },
    { label: "HRA", monthly: breakup.hra, annual: breakup.hra * 12, note: `${inputs.city === "CHENNAI" ? "50%" : "40%"} of basic` },
    { label: "Employer PF", monthly: breakup.employerPF, annual: breakup.employerPF * 12, note: inputs.pfType === "CAPPED" ? "min(12%, ₹1800)" : "12% of basic" },
    { label: "travelAllowance", monthly: breakup.travelAllowance, annual: breakup.travelAllowance * 12, note: "15% of basic" },
    { label: "Special Allowance", monthly: breakup.specialAllowance, annual: breakup.specialAllowance * 12, note: "Balancing" },
    { label: "Gross Earnings", monthly: breakup.gross, annual: breakup.annualGross, highlight: true },
    { label: "Employee PF (deduction)", monthly: -breakup.employeePF, annual: -(breakup.employeePF * 12) },
    { label: "ESI Employer", monthly: breakup.esiEmployer, annual: breakup.esiEmployer * 12, note: breakup.gross <= 21000 ? "3.25% of gross" : "N/A (gross > 21k)" },
    { label: "ESI Employee (deduction)", monthly: -breakup.esi, annual: -(breakup.esi * 12) },
    { label: "Professional Tax (deduction)", monthly: -breakup.professionalTax, annual: -(breakup.professionalTax * 12), note: cityLabel(inputs.city) },
    { label: "Insurance", monthly: breakup.insurancePremium, annual: breakup.insurancePremium * 12, note: inputs.insurance === "NIL" ? "Nil" : "Benefit cover" },
    { label: "In-Hand Salary", monthly: breakup.inHand, annual: breakup.annualInHand, highlight: true },
    { label: "Income Tax (deduction)", monthly: -breakup.tax, annual: -(breakup.tax * 12), note: `${inputs.taxRegime === "NEW" ? "New" : "Old"} regime` },
    { label: "Monthly Incentive", monthly: inputs.monthlyIncentive, annual: inputs.monthlyIncentive * 12 },
    { label: "Final Take Home", monthly: breakup.finalTakeHome, annual: breakup.annualFinalTakeHome, highlight: true },
  ];

  const offerRows = [
    { label: "Basic", monthly: breakup.basic, annual: breakup.basic * 12 },
    { label: "HRA", monthly: breakup.hra, annual: breakup.hra * 12 },
    { label: "Special Allowance", monthly: breakup.specialAllowance, annual: breakup.specialAllowance * 12 },
    { label: "Employer PF", monthly: breakup.employerPF, annual: breakup.employerPF * 12 },
    { label: "travelAllowance", monthly: breakup.travelAllowance, annual: breakup.travelAllowance * 12 },
    { label: "Insurance", monthly: breakup.insurancePremium, annual: breakup.insurancePremium * 12 },
    { label: "Total CTC", monthly: breakup.monthlyCTC, annual: breakup.annualCTC, highlight: true },
    { label: "CTC + Benefits", monthly: breakup.monthlyCTC + breakup.insurancePremium, annual: breakup.annualCTC + breakup.insurancePremium * 12, highlight: true },
  ];

  const insuranceBadge =
    breakup.gross > 21000
      ? `Insurance applicable (gross > ₹21,000) · ${INSURANCE_OPTIONS.find((option) => option.value === inputs.insurance)?.label ?? "Nil"}`
      : "ESI applicable (gross ≤ ₹21,000)";

  const taxNote =
    inputs.taxRegime === "NEW" && breakup.tax === 0
      ? "No income tax (rebate applies under new regime)"
      : `Tax regime: ${inputs.taxRegime === "NEW" ? "New" : "Old"}`;

  return (
    <div className="space-y-6">
      <Card className="rounded-[26px] border-outline-variant/40 shadow-ambient">
        <CardHeader className="pb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileSpreadsheet className="size-4 text-[#00cec4]" />
              Salary Inputs
            </CardTitle>
            <DemoFillButton disabled={saving} onClick={fillDemoData} />
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {employees.length > 0 ? (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-on-surface">Employee (optional)</label>
              <DropdownSelect
                ariaLabel="Employee"
                onValueChange={(nextEmployeeId) => {
                  const nextEmployee = employees.find((employee) => employee.id === nextEmployeeId) ?? null;
                  setSelectedEmployeeId(nextEmployeeId);
                  if (nextEmployee) {
                    setEmployeeName(nextEmployee.name);
                    setEmployeeRole(nextEmployee.designation ?? "");
                  }
                  setConfirmed(false);
                }}
                options={[
                  { value: "", label: "No employee selected" },
                  ...employees.map((employee) => ({
                    value: employee.id,
                    label: `${employee.name}${employee.designation ? ` - ${employee.designation}` : ""}`,
                  })),
                ]}
                value={selectedEmployeeId}
              />
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-on-surface">Employee Name</label>
              <Input
                value={employeeName}
                onChange={(event) => setEmployeeName(event.target.value)}
                placeholder="Full name"
                className="placeholder:text-on-surface-variant/60 dark:placeholder:text-on-surface-variant"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-on-surface">Role / Designation</label>
              <Input
                value={employeeRole}
                onChange={(event) => setEmployeeRole(event.target.value)}
                placeholder="e.g. Manager"
                className="placeholder:text-on-surface-variant/60 dark:placeholder:text-on-surface-variant"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-on-surface">Date of Joining</label>
              <Input type="date" value={dateOfJoining} onChange={(event) => setDateOfJoining(event.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 border-t border-outline-variant/20 pt-5 md:grid-cols-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-on-surface">Annual CTC (₹)</label>
              <Input
                type="number"
                min={0}
                step={1000}
                value={inputs.annualCTC === 0 ? "" : inputs.annualCTC}
                onChange={(event) => set("annualCTC", Number(event.target.value) || 0)}
                placeholder="0"
                className="placeholder:text-on-surface-variant/60 dark:placeholder:text-on-surface-variant"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-on-surface">PF Type</label>
              <DropdownSelect
                ariaLabel="PF Type"
                onValueChange={(value) => set("pfType", value as PFType)}
                options={PF_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
                value={inputs.pfType}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-on-surface">City</label>
              <DropdownSelect
                ariaLabel="City"
                onValueChange={(value) => set("city", value as City)}
                options={CITIES.map((option) => ({ value: option.value, label: option.label }))}
                value={inputs.city}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-on-surface">Monthly Incentive (₹)</label>
              <Input
                type="number"
                min={0}
                value={inputs.monthlyIncentive === 0 ? "" : inputs.monthlyIncentive}
                onChange={(event) => set("monthlyIncentive", Number(event.target.value) || 0)}
                placeholder="0"
                className="placeholder:text-on-surface-variant/60 dark:placeholder:text-on-surface-variant"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-on-surface">Insurance Coverage</label>
              <DropdownSelect
                ariaLabel="Insurance Coverage"
                onValueChange={(value) => set("insurance", value as InsuranceCoverage)}
                options={INSURANCE_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
                value={inputs.insurance}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-on-surface">Tax Regime</label>
              <DropdownSelect
                ariaLabel="Tax Regime"
                onValueChange={(value) => set("taxRegime", value as TaxRegime)}
                options={TAX_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
                value={inputs.taxRegime}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div id="salary-print-area" className="space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label="Monthly CTC" value={breakup.monthlyCTC} annual={breakup.monthlyCTC * 12} tone="text-[#00a7a0]" />
          <SummaryCard label="Gross Monthly" value={breakup.gross} annual={breakup.annualGross} tone="text-[#00b8af]" />
          <SummaryCard label="In-Hand Monthly" value={breakup.inHand} annual={breakup.annualInHand} tone="text-[#00A278]" />
          <SummaryCard label="Final Take Home" value={breakup.finalTakeHome} annual={breakup.annualFinalTakeHome} tone="text-[#0B8B8F]" />
        </div>

        <div className="flex flex-wrap gap-2 text-xs text-on-surface-variant">
          <span className="rounded-full bg-surface-container-low px-3 py-1">{insuranceBadge}</span>
          <span className="rounded-full bg-green-100 px-3 py-1 text-green-700 dark:bg-green-900/30 dark:text-green-300">{taxNote}</span>
          <span className="rounded-full bg-surface-container-low px-3 py-1">PT: {cityLabel(inputs.city)} · ₹{formatNumber(breakup.professionalTax)}/mo</span>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(340px,0.98fr)]">
          <TableCard icon={<TrendingUp className="size-4" />} title="Detailed Breakdown" rows={detailedRows} />

          <div className="space-y-6">
            <TableCard icon={<IndianRupee className="size-4" />} title="Offer Letter Structure" rows={offerRows} />

            <Card className="rounded-[24px] border-outline-variant/40 shadow-ambient">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Salary Notes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-on-surface-variant">
                {employeeName ? <p><span className="font-medium text-on-surface">Employee:</span> {employeeName}</p> : null}
                {employeeRole ? <p><span className="font-medium text-on-surface">Role:</span> {employeeRole}</p> : null}
                {dateOfJoining ? <p><span className="font-medium text-on-surface">DOJ:</span> {new Date(dateOfJoining).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p> : null}
                <div className="border-t border-outline-variant/20 pt-3 text-xs leading-6">
                  <p>• Basic is 50% of CTC.</p>
                  <p>• HRA based on city ({cityLabel(inputs.city)}) — {inputs.city === "CHENNAI" ? "50%" : "40%"} of basic.</p>
                  <p>• PF applied as per {inputs.pfType === "CAPPED" ? "Capped" : "Uncapped"} method.</p>
                  <p>• travelAllowance included as long-term benefit.</p>
                  <p>• {inputs.insurance === "NIL" ? "Covered under insurance (Nil)." : `Insurance cover selected: ${INSURANCE_OPTIONS.find((option) => option.value === inputs.insurance)?.label}.`}</p>
                  <p>• PT applied based on location — ₹{formatNumber(breakup.professionalTax)}/month.</p>
                  <p>• {breakup.tax > 0 ? `Income tax applied as per ${inputs.taxRegime === "NEW" ? "new" : "old"} regime.` : "No income tax applicable under new regime."}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[24px] border-outline-variant/40 shadow-ambient print:hidden">
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
                <div>
                  <p className="text-sm font-medium text-on-surface">Actions</p>
                  <p className="mt-1 text-xs text-on-surface-variant">
                    Save gross salary for AMS hike calculations or export the page as PDF.
                  </p>
                  {confirmed ? (
                    <p className="mt-1 text-xs text-green-700 dark:text-green-300">
                      Saved — monthly gross: {formatINR(breakup.monthlyGross)}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={handlePrint}
                    variant="outline"
                    className="border-[#00cec4]/30 text-[#008b85] hover:bg-[#00cec4]/8"
                  >
                    Print / PDF
                  </Button>
                  {selectedEmployeeId ? (
                  <Button
                      onClick={updateEmployee}
                      disabled={saving || confirmed}
                      className="bg-[#00cec4] text-white hover:bg-[#00b5ad]"
                    >
                      {saving ? "Saving..." : confirmed ? "Updated" : "Update Employee Salary"}
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body > * { display: none !important; }
          #salary-print-area { display: block !important; position: absolute; inset: 0; }
        }
      `}</style>
    </div>
  );
}
