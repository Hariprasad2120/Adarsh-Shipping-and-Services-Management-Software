"use client";

import React, { useState, useEffect } from "react";
import { CheckCircle, AlertTriangle, ShieldCheck, FileText, Search, Loader2 } from "lucide-react";
import { use } from "react";

export default function VerifyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [loading, setLoading] = useState(true);
  const [doc, setDoc] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVerification = async () => {
      try {
        const res = await fetch(`/api/hrms/letters/verify?q=${id}`);
        const json = await res.json();
        if (json.ok) {
          setDoc(json.data);
        } else {
          setError(json.error?.message || "Document verification failed");
        }
      } catch (err) {
        setError("Failed to query the document register");
      } finally {
        setLoading(false);
      }
    };
    fetchVerification();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0d1117] text-[#f0f6fc] font-sans">
        <Loader2 className="size-8 animate-spin text-[#00cec4] mb-3" />
        <p className="text-xs uppercase tracking-widest font-mono">Verifying document credentials...</p>
      </div>
    );
  }

  const isValid = doc && doc.status !== "CANCELLED" && doc.validityStatus === "VALID";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0d1117] text-[#f0f6fc] font-sans p-6">
      <div className="w-full max-w-xl bg-[#161b22] border border-[#30363d] rounded-2xl p-6 shadow-2xl space-y-6 relative overflow-hidden">
        {/* Accent Top Bar */}
        <div className={`absolute top-0 left-0 right-0 h-1.5 ${isValid ? "bg-[#00cec4]" : "bg-[#fb923c]"}`} />

        <div className="flex flex-col items-center text-center space-y-2">
          <div className={`size-14 rounded-full flex items-center justify-center ${isValid ? "bg-[#00cec4]/15 text-[#00cec4]" : "bg-[#fb923c]/15 text-[#fb923c]"}`}>
            {isValid ? <ShieldCheck className="size-8" /> : <AlertTriangle className="size-8" />}
          </div>
          <h1 className="text-xl font-bold tracking-widest uppercase text-[#f0f6fc]" style={{ fontFamily: "var(--font-kiona-sans), sans-serif" }}>
            Document Authenticity Registry
          </h1>
          <p className="text-xs text-[#8b949e] uppercase font-bold tracking-wider">
            Public Verification Portal — Adarsh Shipping and Services
          </p>
        </div>

        {error ? (
          <div className="border border-red-500/20 bg-red-500/5 rounded-xl p-4 text-center text-sm text-red-400">
            <p className="font-bold uppercase tracking-wider mb-1">Verification Rejected</p>
            <p>{error}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className={`border rounded-xl p-4 ${isValid ? "border-[#00cec4]/20 bg-[#00cec4]/5 text-[#00cec4]" : "border-[#fb923c]/20 bg-[#fb923c]/5 text-[#fb923c]"} flex items-center gap-3`}>
              <CheckCircle className="size-5 shrink-0" />
              <div>
                <p className="text-xs font-bold uppercase tracking-wider">Status: {isValid ? "VERIFIED AUTHENTIC" : "NOT APPLICABLE / ARCHIVED"}</p>
                <p className="text-[11px] opacity-80">This document exists in the immutable registry of Adarsh Shipping and Services.</p>
              </div>
            </div>

            {/* Document Data Grid */}
            <div className="grid grid-cols-2 gap-4 bg-[#21262d] border border-[#30363d] rounded-xl p-4 text-xs">
              <div className="space-y-1">
                <p className="text-[10px] text-[#8b949e] uppercase font-bold tracking-wider">Letter Number</p>
                <p className="font-bold text-[#f0f6fc] font-mono">{doc.letterNumber}</p>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] text-[#8b949e] uppercase font-bold tracking-wider">Document Type</p>
                <p className="font-bold text-[#f0f6fc]">{doc.documentType}</p>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] text-[#8b949e] uppercase font-bold tracking-wider">Recipient Name</p>
                <p className="font-bold text-[#f0f6fc]">{doc.recipientName}</p>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] text-[#8b949e] uppercase font-bold tracking-wider">Issue Date</p>
                <p className="font-bold text-[#f0f6fc]">{doc.issueDate}</p>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] text-[#8b949e] uppercase font-bold tracking-wider">Masked Email</p>
                <p className="font-bold text-[#f0f6fc] font-mono">{doc.maskedEmail || "N/A"}</p>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] text-[#8b949e] uppercase font-bold tracking-wider">Masked Aadhaar</p>
                <p className="font-bold text-[#f0f6fc] font-mono">{doc.maskedAadhaar || "N/A"}</p>
              </div>

              <div className="col-span-2 space-y-1 pt-2 border-t border-[#30363d]">
                <p className="text-[10px] text-[#8b949e] uppercase font-bold tracking-wider">SHA-256 PDF Hash</p>
                <p className="font-mono text-[10px] text-[#8b949e] select-all break-all">{doc.documentHash}</p>
              </div>
            </div>

            <div className="text-[10px] text-[#8b949e] text-center space-y-1">
              <p>Verified Timestamp: {new Date(doc.verificationTimestamp).toLocaleString()}</p>
              <p className="font-mono">LIN / Reg No: DL-889812-LIN / TN-600112</p>
              <p className="font-semibold text-red-500/80">⚠️ Salary breakdown, physical addresses and contractual clauses are concealed for data privacy (DPDP Act Compliance).</p>
            </div>
          </div>
        )}

        <div className="flex justify-center border-t border-[#30363d] pt-4">
          <p className="text-[9px] text-[#8b949e] uppercase tracking-widest font-mono">
            Powered by Monolith Engine Secure Ledger
          </p>
        </div>
      </div>
    </div>
  );
}
