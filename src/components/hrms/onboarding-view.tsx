"use client";

import React, { useState, useEffect } from "react";
import { UserCheck, CheckCircle2, ChevronRight, Lock, Save, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export function OnboardingView() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<any>(null);
  const [activeStep, setActiveStep] = useState<string>("personal_details");

  // Form states
  const [personal, setPersonal] = useState({ firstName: "", lastName: "", dob: "", gender: "MALE" });
  const [contact, setContact] = useState({ personalPhone: "", personalEmail: "", emergencyName: "", emergencyPhone: "", addressLine1: "", addressLine2: "", city: "", state: "", country: "", zipCode: "" });
  const [financial, setFinancial] = useState({ bankName: "", bankAccount: "", ifsc: "" });
  const [statutory, setStatutory] = useState({ pan: "", aadhaar: "", uan: "" });

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/hrms/onboarding");
      const json = await res.json();
      if (json.ok) {
        setData(json.data);
        const user = json.data.user;
        setPersonal({
          firstName: user.firstName || "",
          lastName: user.lastName || "",
          dob: user.dob ? user.dob.split("T")[0] : "",
          gender: user.gender || "MALE",
        });
        const contactData = user.hrmsContact || {};
        setContact({
          personalPhone: user.personalPhone || "",
          personalEmail: contactData.personalEmail || "",
          emergencyName: contactData.emergencyName || "",
          emergencyPhone: contactData.emergencyPhone || "",
          addressLine1: contactData.addressLine1 || "",
          addressLine2: contactData.addressLine2 || "",
          city: contactData.city || "",
          state: contactData.state || "",
          country: contactData.country || "India",
          zipCode: contactData.zipCode || "",
        });
        setFinancial({
          bankName: user.bankName || "",
          bankAccount: user.bankAccount || "",
          ifsc: user.ifsc || "",
        });
        setStatutory({
          pan: user.pan || "",
          aadhaar: user.aadhaar || "",
          uan: user.uan || "",
        });
      }
    } catch (e) {
      toast.error("Failed to load onboarding info");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/hrms/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personal, contact, financial, statutory }),
      });
      const json = await res.json();
      if (json.ok) {
        toast.success("Onboarding details updated!");
        fetchStatus();
      } else {
        toast.error("Failed to save onboarding details");
      }
    } catch (err) {
      toast.error("Error saving details");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
        <Loader2 className="size-8 animate-spin text-[#00c4b6]" />
        <p className="text-xs font-semibold tracking-wider">Syncing onboarding status...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="relative rounded-3xl border border-slate-800 bg-[#0f121b]/80 p-6 overflow-hidden shadow-2xl backdrop-blur-md">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#00c4b6]/5 rounded-full blur-3xl" />
        <div className="flex items-center gap-4">
          <div className="size-12 rounded-2xl bg-[#00c4b6]/10 border border-[#00c4b6]/35 flex items-center justify-center text-[#00c4b6] shadow-sm">
            <UserCheck className="size-6 animate-pulse" />
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-black text-slate-100 uppercase tracking-widest">EMPLOYEE ONBOARDING</h1>
            <p className="text-xs text-slate-500 font-bold mt-0.5 uppercase tracking-wider">Complete all stages to verify your profile credentials</p>
          </div>
          {data && (
            <div className="text-right">
              <span className="text-2xl font-extrabold text-[#00c4b6] font-mono">{data.progressPercent}%</span>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-wider mt-0.5">COMPLETED</p>
            </div>
          )}
        </div>

        {/* Progress bar */}
        {data && (
          <div className="mt-6 w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-emerald-500 to-[#00c4b6] rounded-full transition-all duration-500" style={{ width: `${data.progressPercent}%` }} />
          </div>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left checklist menu */}
        <div className="md:col-span-1 space-y-3">
          <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Checklist Checklist</div>
          {data?.checklist.map((item: any) => {
            const isCurrent = activeStep === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setActiveStep(item.key)}
                className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between cursor-pointer ${
                  isCurrent
                    ? "bg-[#161f28]/80 border-[#00c4b6]/40 text-slate-100 shadow-md"
                    : "bg-[#0e121b]/40 border-slate-900 text-slate-400 hover:bg-[#161f28]/20 hover:text-slate-200"
                }`}
              >
                <div className="flex items-center gap-3">
                  {item.completed ? (
                    <CheckCircle2 className="size-5 text-emerald-400 shrink-0" />
                  ) : (
                    <div className="size-5 rounded-full border-2 border-slate-800 shrink-0" />
                  )}
                  <span className="text-xs font-black tracking-wide">{item.label}</span>
                </div>
                <ChevronRight className="size-4 opacity-50" />
              </button>
            );
          })}
        </div>

        {/* Right Active Form Area */}
        <div className="md:col-span-2">
          <form onSubmit={handleSave} className="rounded-3xl border border-slate-900 bg-[#0e121b]/60 p-6 shadow-xl space-y-6 backdrop-blur-sm">
            
            {activeStep === "personal_details" && (
              <div className="space-y-4">
                <h3 className="text-sm font-black text-slate-300 uppercase tracking-widest border-b border-slate-900 pb-2">Personal Profile details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">First Name</label>
                    <input
                      type="text"
                      value={personal.firstName}
                      onChange={(e) => setPersonal({ ...personal, firstName: e.target.value })}
                      required
                      className="w-full px-3 py-2 text-xs bg-slate-950/60 border border-slate-800 rounded-xl text-slate-200 outline-none focus:border-[#00c4b6]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Last Name</label>
                    <input
                      type="text"
                      value={personal.lastName}
                      onChange={(e) => setPersonal({ ...personal, lastName: e.target.value })}
                      required
                      className="w-full px-3 py-2 text-xs bg-slate-950/60 border border-slate-800 rounded-xl text-slate-200 outline-none focus:border-[#00c4b6]"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Date of Birth</label>
                    <input
                      type="date"
                      value={personal.dob}
                      onChange={(e) => setPersonal({ ...personal, dob: e.target.value })}
                      required
                      className="w-full px-3 py-2 text-xs bg-slate-950/60 border border-slate-800 rounded-xl text-slate-200 outline-none focus:border-[#00c4b6]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Gender</label>
                    <select
                      value={personal.gender}
                      onChange={(e) => setPersonal({ ...personal, gender: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-slate-950/60 border border-slate-800 rounded-xl text-slate-200 outline-none focus:border-[#00c4b6]"
                    >
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {activeStep === "contact_details" && (
              <div className="space-y-4">
                <h3 className="text-sm font-black text-slate-300 uppercase tracking-widest border-b border-slate-900 pb-2">Emergency Contact details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Personal Phone</label>
                    <input
                      type="text"
                      value={contact.personalPhone}
                      onChange={(e) => setContact({ ...contact, personalPhone: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-slate-950/60 border border-slate-800 rounded-xl text-slate-200 outline-none focus:border-[#00c4b6]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Personal Email</label>
                    <input
                      type="email"
                      value={contact.personalEmail}
                      onChange={(e) => setContact({ ...contact, personalEmail: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-slate-950/60 border border-slate-800 rounded-xl text-slate-200 outline-none focus:border-[#00c4b6]"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Emergency Contact Name</label>
                    <input
                      type="text"
                      value={contact.emergencyName}
                      onChange={(e) => setContact({ ...contact, emergencyName: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-slate-950/60 border border-slate-800 rounded-xl text-slate-200 outline-none focus:border-[#00c4b6]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Emergency Contact Phone</label>
                    <input
                      type="text"
                      value={contact.emergencyPhone}
                      onChange={(e) => setContact({ ...contact, emergencyPhone: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-slate-950/60 border border-slate-800 rounded-xl text-slate-200 outline-none focus:border-[#00c4b6]"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Address Line 1</label>
                  <input
                    type="text"
                    value={contact.addressLine1}
                    onChange={(e) => setContact({ ...contact, addressLine1: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-950/60 border border-slate-800 rounded-xl text-slate-200 outline-none focus:border-[#00c4b6]"
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">City</label>
                    <input
                      type="text"
                      value={contact.city}
                      onChange={(e) => setContact({ ...contact, city: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-slate-950/60 border border-slate-800 rounded-xl text-slate-200 outline-none focus:border-[#00c4b6]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">State</label>
                    <input
                      type="text"
                      value={contact.state}
                      onChange={(e) => setContact({ ...contact, state: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-slate-950/60 border border-slate-800 rounded-xl text-slate-200 outline-none focus:border-[#00c4b6]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Zip Code</label>
                    <input
                      type="text"
                      value={contact.zipCode}
                      onChange={(e) => setContact({ ...contact, zipCode: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-slate-950/60 border border-slate-800 rounded-xl text-slate-200 outline-none focus:border-[#00c4b6]"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeStep === "financial_details" && (
              <div className="space-y-4">
                <h3 className="text-sm font-black text-slate-300 uppercase tracking-widest border-b border-slate-900 pb-2">Bank & Finance details</h3>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Bank Name</label>
                  <input
                    type="text"
                    value={financial.bankName}
                    onChange={(e) => setFinancial({ ...financial, bankName: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-950/60 border border-slate-800 rounded-xl text-slate-200 outline-none focus:border-[#00c4b6]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Account Number</label>
                    <input
                      type="text"
                      value={financial.bankAccount}
                      onChange={(e) => setFinancial({ ...financial, bankAccount: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-slate-950/60 border border-slate-800 rounded-xl text-slate-200 outline-none focus:border-[#00c4b6]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">IFSC Code</label>
                    <input
                      type="text"
                      value={financial.ifsc}
                      onChange={(e) => setFinancial({ ...financial, ifsc: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-slate-950/60 border border-slate-800 rounded-xl text-slate-200 outline-none focus:border-[#00c4b6]"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeStep === "statutory_ids" && (
              <div className="space-y-4">
                <h3 className="text-sm font-black text-slate-300 uppercase tracking-widest border-b border-slate-900 pb-2">Government IDs</h3>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">PAN Card Number</label>
                  <input
                    type="text"
                    value={statutory.pan}
                    onChange={(e) => setStatutory({ ...statutory, pan: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-950/60 border border-slate-800 rounded-xl text-slate-200 outline-none focus:border-[#00c4b6]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Aadhaar Number</label>
                    <input
                      type="text"
                      value={statutory.aadhaar}
                      onChange={(e) => setStatutory({ ...statutory, aadhaar: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-slate-950/60 border border-slate-800 rounded-xl text-slate-200 outline-none focus:border-[#00c4b6]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">UAN Number</label>
                    <input
                      type="text"
                      value={statutory.uan}
                      onChange={(e) => setStatutory({ ...statutory, uan: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-slate-950/60 border border-slate-800 rounded-xl text-slate-200 outline-none focus:border-[#00c4b6]"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-900">
              <div className="flex items-center gap-1.5 text-slate-500 text-[10px] font-bold">
                <AlertCircle className="size-3 text-[#00c4b6]" />
                <span>Values are encrypted securely in Postgres</span>
              </div>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-[#00c4b6] hover:brightness-105 border-0 rounded-2xl px-5 py-2.5 text-xs font-black text-slate-950 shadow-md cursor-pointer transition-all disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                <span>{saving ? "Saving..." : "Save details"}</span>
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}
