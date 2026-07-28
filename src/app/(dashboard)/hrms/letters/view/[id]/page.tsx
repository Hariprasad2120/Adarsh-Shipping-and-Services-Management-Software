"use client";

import { PeopleControlInput as MnxInput } from "@/components/monolith/people-controls";
/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */

import React, { useState, useEffect, use, useCallback } from "react";
import {
  CheckCircle,
  AlertTriangle,
  FileText,
  Download,
  ShieldCheck,
  Signature,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/monolith/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/monolith/card";

export default function EmployeeLetterViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [loading, setLoading] = useState(true);
  const [doc, setDoc] = useState<any>(null);
  const [signing, setSigning] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [nameSignature, setNameSignature] = useState("");
  const [checkTerms, setCheckTerms] = useState(false);

  const fetchDocument = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/hrms/letters/${id}`);
      const json = await res.json();
      if (json.ok) {
        setDoc(json.data);
        if (json.data.status === "ACCEPTED") {
          setAccepted(true);
        }
      } else {
        toast.error(json.error?.message || "Failed to load document");
      }
    } catch {
      toast.error("Network error loading document");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDocument();
  }, [fetchDocument]);

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkTerms) {
      toast.error("Please read and tick the terms acceptance box");
      return;
    }
    if (!nameSignature.trim()) {
      toast.error("Please type your full name to sign this document");
      return;
    }

    setSigning(true);
    try {
      const res = await fetch(`/api/hrms/letters/${id}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nameSignature }),
      });
      const json = await res.json();
      if (json.ok) {
        toast.success("Document accepted successfully!");
        setAccepted(true);
        fetchDocument();
      } else {
        toast.error(json.error?.message || "Acceptance failed");
      }
    } catch {
      toast.error("Failed to submit digital signature");
    } finally {
      setSigning(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-mono-muted">
        <Loader2 className="size-8 animate-spin text-[var(--mnx-accent)]" />
        <p className="text-xs font-semibold tracking-wider uppercase font-mono">
          Loading document review portal...
        </p>
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="text-center py-20 text-mono-muted space-y-4">
        <AlertTriangle className="size-12 mx-auto text-[var(--mnx-warning)]" />
        <h2 className="text-lg font-bold uppercase">Document Not Found</h2>
        <p className="text-xs max-w-md mx-auto">
          The requested document could not be located, or you do not have
          permissions to review it.
        </p>
      </div>
    );
  }

  const auditTrail =
    typeof doc.auditTrail === "string"
      ? JSON.parse(doc.auditTrail || "[]")
      : doc.auditTrail || [];
  const isIssued = doc.status === "ISSUED";

  return (
    <div className="space-y-6 animate-page-enter">
      {/* Upper Info Banner */}
      <div className="relative rounded-3xl border border-mono-border bg-mono-card p-6 overflow-hidden shadow-sm">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--mnx-accent)]/5 rounded-full blur-3xl" />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="size-12 rounded-2xl bg-[var(--mnx-accent)]/10 border border-[var(--mnx-accent)]/25 flex items-center justify-center text-[var(--mnx-accent)] shadow-sm">
              <FileText className="size-6" />
            </div>
            <div>
              <h1
                className="text-lg font-black text-mono-text uppercase tracking-widest"
                style={{ fontFamily: "var(--font-geist-sans), sans-serif" }}
              >
                Letters & Contracts Portal
              </h1>
              <p className="text-xs text-mono-muted font-bold mt-0.5 uppercase tracking-wider">
                Document Review and Digital Signature Interface
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            {doc.pdfPath && (
              <a
                href={`/${doc.pdfPath}`}
                download
                className="inline-flex items-center justify-center gap-2 bg-[var(--mnx-accent)] text-[var(--mnx-text)] hover:bg-[var(--mnx-accent-soft)] hover:shadow-ambient-hover px-4 py-2 rounded-xl text-xs uppercase tracking-wide font-bold transition-all"
              >
                <Download className="size-4" />
                <span>Download PDF</span>
              </a>
            )}
            {doc.docxPath && (
              <a
                href={`/${doc.docxPath}`}
                download
                className="inline-flex items-center justify-center gap-2 bg-mono-card border border-mono-border hover:bg-mono-soft px-4 py-2 rounded-xl text-xs uppercase tracking-wide font-bold transition-all"
              >
                <Download className="size-4" />
                <span>Download DOCX</span>
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Document Details Panel */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="rounded-2xl border-mono-border/60 bg-mono-card shadow-sm">
            <CardHeader className="border-b border-mono-border p-4">
              <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="size-4 text-[var(--mnx-accent)]" />
                Document Metadata & Integrity
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="mnx-dashboard-spec-label block">
                    Document Reference
                  </span>
                  <span className="font-bold text-mono-text font-mono">
                    {doc.letterNumber}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="mnx-dashboard-spec-label block">
                    Recipient Name
                  </span>
                  <span className="font-bold text-mono-text">
                    {doc.user.name}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="mnx-dashboard-spec-label block">
                    Issue Date
                  </span>
                  <span className="font-bold text-mono-text">
                    {doc.issuedAt
                      ? new Date(doc.issuedAt).toLocaleDateString("en-IN", {
                          dateStyle: "long",
                        })
                      : "Pending"}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="mnx-dashboard-spec-label block">
                    Document Status
                  </span>
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                      doc.status === "ACCEPTED"
                        ? "bg-[var(--mnx-success-bg)]/10 text-[var(--mnx-success)] border border-[var(--mnx-success)]/20"
                        : doc.status === "ISSUED"
                          ? "bg-[var(--mnx-accent)]/10 text-[var(--mnx-accent)] border border-[var(--mnx-accent)]/20"
                          : "bg-[var(--mnx-warning-bg)]/10 text-[var(--mnx-warning)] border border-[var(--mnx-warning)]/20"
                    }`}
                  >
                    {doc.status}
                  </span>
                </div>
              </div>

              {doc.documentHash && (
                <div className="space-y-1 pt-2 border-t border-mono-border/60">
                  <span className="mnx-dashboard-spec-label block">
                    SHA-256 PDF Hash
                  </span>
                  <span className="font-mono text-[10px] text-mono-muted break-all select-all">
                    {doc.documentHash}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Embedded PDF iframe or view details */}
          <Card className="rounded-2xl border-mono-border/60 bg-mono-card shadow-sm overflow-hidden">
            <CardHeader className="border-b border-mono-border p-4">
              <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                <FileText className="size-4 text-[var(--mnx-accent)]" />
                Letter Preview
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {doc.pdfPath ? (
                <iframe
                  src={`/${doc.pdfPath}`}
                  className="w-full h-[600px] border-0"
                  title="PDF Preview"
                />
              ) : (
                <div className="text-center py-20 text-mono-muted">
                  <FileText className="size-12 mx-auto text-[var(--mnx-accent)]/30 mb-3" />
                  <p>
                    Document PDF is not yet compiled or compiled copy is
                    missing.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Digital Signature Acceptance Block */}
        <div className="space-y-6">
          <Card className="rounded-2xl border-mono-border/60 bg-mono-card shadow-sm mnx-panel mnx-accent-edge p-4 space-y-4">
            <h3 className="mnx-title-3 text-sm font-black uppercase tracking-wider flex items-center gap-2">
              <Signature className="size-5 text-[var(--mnx-accent)]" />
              Digital Acceptance
            </h3>

            {accepted ? (
              <div className="border border-[var(--mnx-success)]/20 bg-[var(--mnx-success-bg)]/5 rounded-xl p-4 text-center space-y-2">
                <CheckCircle className="size-10 text-[var(--mnx-success)] mx-auto" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--mnx-success)]">
                  Document Accepted
                </h4>
                <p className="text-[11px] text-mono-muted leading-relaxed">
                  You successfully reviewed and digitally signed this agreement
                  on{" "}
                  {doc.acceptedAt
                    ? new Date(doc.acceptedAt).toLocaleString("en-IN")
                    : "N/A"}
                  .
                </p>
                <div className="text-[10px] text-mono-muted bg-mono-soft border border-mono-border rounded p-2 text-left space-y-1 font-mono">
                  <p>IP: {doc.acceptanceIp || "N/A"}</p>
                  <p className="truncate">
                    UA: {doc.acceptanceUserAgent || "N/A"}
                  </p>
                </div>
              </div>
            ) : isIssued ? (
              <form onSubmit={handleAccept} className="space-y-4">
                <p className="text-xs text-mono-muted leading-relaxed">
                  Please read the terms outlined in the document preview. By
                  checking the box and typing your name below, you confirm your
                  acceptance of all clauses and joining protocols.
                </p>

                <div className="flex items-start gap-2.5">
                  <MnxInput
                    type="checkbox"
                    id="terms_check"
                    checked={checkTerms}
                    onChange={(e) => setCheckTerms(e.target.checked)}
                    className="mt-0.5"
                  />
                  <label
                    htmlFor="terms_check"
                    className="text-[11px] text-mono-muted cursor-pointer select-none leading-normal"
                  >
                    I read, fully understand, and unconditionally accept the
                    employment/internship terms and conditions specified.
                  </label>
                </div>

                <div className="space-y-1">
                  <label className="mnx-dashboard-spec-label">
                    Type full name to sign
                  </label>
                  <MnxInput
                    type="text"
                    required
                    value={nameSignature}
                    onChange={(e) => setNameSignature(e.target.value)}
                    placeholder="E.g., Amanulla R"
                    className="w-full text-xs"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={signing}
                  className="w-full flex items-center justify-center gap-2"
                >
                  {signing ? (
                    <Loader2 className="size-4 animate-spin text-[var(--mnx-text)]" />
                  ) : (
                    <Signature className="size-4" />
                  )}
                  <span>Sign & Accept Document</span>
                </Button>
              </form>
            ) : (
              <div className="border border-[var(--mnx-warning)]/20 bg-[var(--mnx-warning-bg)]/5 rounded-xl p-4 text-center space-y-2 text-[var(--mnx-warning)]">
                <AlertTriangle className="size-8 mx-auto" />
                <h4 className="text-xs font-bold uppercase tracking-wider">
                  Document In Draft / Review
                </h4>
                <p className="text-[11px] text-mono-muted">
                  This document has not been issued to you yet. It is currently
                  under HR, Legal, or Management workflow review.
                </p>
              </div>
            )}
          </Card>

          {/* Audit Logs */}
          <Card className="rounded-2xl border-mono-border/60 bg-mono-card shadow-sm p-4 space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-mono-text">
              Audit Trail Log
            </h4>
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {auditTrail.map((log: any, idx: number) => (
                <div
                  key={idx}
                  className="border-l-2 border-[var(--mnx-accent)]/40 pl-3 space-y-1 text-xs"
                >
                  <div className="flex items-center justify-between text-[9px] text-mono-muted font-bold uppercase">
                    <span>{log.userName}</span>
                    <span>{new Date(log.timestamp).toLocaleDateString()}</span>
                  </div>
                  <p className="font-semibold text-[11px] uppercase text-mono-text">
                    {log.action.replace(/_/g, " ")}
                  </p>
                  <p className="text-[10px] text-mono-muted leading-relaxed">
                    {log.details}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
