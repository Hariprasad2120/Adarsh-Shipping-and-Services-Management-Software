"use client";

import React, { useState } from 'react';
import { Appraisal, Employee, AttendanceRecord, CRMLead } from '../types/types';
import {
  INITIAL_EMPLOYEES,
  INITIAL_APPRAISALS,
  INITIAL_ATTENDANCE,
  INITIAL_CRM_LEADS,
} from '../components/landing-page/initialData';
import AppraisalsModule from '../components/landing-page/AppraisalsModule';
import HRModule from '../components/landing-page/HRModule';
import AttendanceModule from '../components/landing-page/AttendanceModule';
import CRMModule from '../components/landing-page/CRMModule';
import CompanyOverview from '../components/landing-page/CompanyOverview';
import { ChevronLeft, LogIn, ArrowRight, X, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';

export default function App() {
  const [activeModule, setActiveModule] = useState<'overview' | 'appraisals' | 'hr' | 'attendance' | 'crm'>('overview');
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Roster States
  const [employees] = useState<Employee[]>(INITIAL_EMPLOYEES);
  const [appraisals] = useState<Appraisal[]>(INITIAL_APPRAISALS);
  const [attendance] = useState<AttendanceRecord[]>(INITIAL_ATTENDANCE);
  const [leads] = useState<CRMLead[]>(INITIAL_CRM_LEADS);

  const handleMockLogin = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`Success: System connection request initialized for ${loginEmail || 'enterprise user'}. This CTA is ready to be linked to your server page.`);
    setIsLoginModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#fafafa] text-neutral-900 flex flex-col justify-between font-sans selection:bg-black selection:text-white antialiased">
      {/* Dynamic Top Navigation Bar */}
      <header className="border-b border-neutral-200 bg-white sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">

          {/* Logo Brand Metaphor */}
          <button
            onClick={() => setActiveModule('overview')}
            className="text-left group flex items-center gap-3 cursor-pointer"
          >
            <div className="h-8 w-8 bg-black text-white flex items-center justify-center font-display font-black text-sm tracking-tighter">
              M
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-bold text-md text-black tracking-tight">MONOLITH</span>
                <span className="font-mono text-[9px] px-1.5 py-0.5 bg-neutral-100 border border-neutral-200 text-neutral-600 font-semibold rounded uppercase tracking-wider">
                  v2.4
                </span>
              </div>
              <p className="font-mono text-[10px] text-neutral-400 uppercase tracking-widest leading-none">
                Enterprise Engine
              </p>
            </div>
          </button>

          {/* Quick links & CTA Login Gateway Link button */}
          <div className="flex items-center gap-3">
            {activeModule !== 'overview' && (
              <button
                id="btn-back-dashboard-header"
                onClick={() => setActiveModule('overview')}
                className="px-3 py-1.5 text-xs text-neutral-600 hover:text-black hover:bg-neutral-50 rounded border border-neutral-200 flex items-center gap-1.5 transition font-mono uppercase tracking-wider cursor-pointer"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Core Console
              </button>
            )}

            {/* HIGHLY COMPLIANT CTA LOGIN GATEWAY BUTTON */}
            <Link
              href="/login"
              id="cta-gate-login"
              className="px-4 py-2 bg-black hover:bg-neutral-800 text-white text-xs font-mono uppercase tracking-widest font-semibold rounded shadow-sm hover:shadow transition flex items-center gap-2 cursor-pointer"
            >
              <LogIn className="h-3.5 w-3.5" />
              Sign In // Link Gateway
            </Link>
          </div>
        </div>
      </header>

      {/* Main Structural Centered Body */}
      <main className="flex-1 flex flex-col items-center justify-start w-full px-6 py-12">
        <div className="w-full max-w-4xl space-y-8">

          {/* Breadcrumb Info Bar (Black/White high-contrast line) */}
          <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
            <div className="flex items-center gap-2 font-mono text-xs text-neutral-500 uppercase tracking-wider">
              <span>ROOT</span>
              <span>/</span>
              <span className="text-black font-semibold">
                {activeModule === 'overview' ? 'DASHBOARD' : `${activeModule.toUpperCase()} _ OVERVIEW`}
              </span>
            </div>

            <div className="text-right font-mono text-[10px] text-neutral-400">
              UTC DATE // 2026-06-04
            </div>
          </div>

          {/* Render Active Sub-Modules as beautifully styled descriptive walkthrough overviews */}
          <div className="w-full transition duration-300 min-h-[460px]">
            {activeModule === 'overview' && (
              <CompanyOverview
                employees={employees}
                appraisals={appraisals}
                attendance={attendance}
                leads={leads}
                onSelectModule={setActiveModule}
              />
            )}

            {activeModule === 'appraisals' && (
              <AppraisalsModule
                appraisals={appraisals}
              />
            )}

            {activeModule === 'hr' && (
              <HRModule
                employees={employees}
              />
            )}

            {activeModule === 'attendance' && (
              <AttendanceModule
                attendanceRecords={attendance}
                employees={employees}
              />
            )}

            {activeModule === 'crm' && (
              <CRMModule
                leads={leads}
              />
            )}
          </div>

        </div>
      </main>

      {/* Modern, high contrast, elegant light-theme footer */}
      <footer className="border-t border-neutral-200 bg-white w-full py-8 text-neutral-500 font-mono text-[10px] uppercase tracking-widest mt-12">
        <div className="max-w-4xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-black">MONOLITH CORPORATION</span>
            <span>•</span>
            <span>LICENSED ENTERPRISE PROTOCOL</span>
          </div>
          <div className="flex gap-4">
            <span className="text-neutral-400">SECURE LINK</span>
            <span>•</span>
            <span className="text-neutral-400">ISO 27001 ACTIVE</span>
          </div>
        </div>
      </footer>

      {/* Sleek Minimalist Black/White Login Modal Mockup */}
      {isLoginModalOpen && (
        <div id="login-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white border border-neutral-300 rounded-none max-w-sm w-full p-8 shadow-2xl flex flex-col justify-between">
            <div className="flex justify-between items-start mb-6">
              <div>
                <span className="font-mono text-[10px] tracking-widest text-neutral-400 uppercase block mb-1">
                  SECURE PORTAL ENTRY
                </span>
                <h3 className="ds-h3 text-black">
                  ENTERPRISE LOGIN
                </h3>
              </div>
              <button
                onClick={() => setIsLoginModalOpen(false)}
                className="text-neutral-400 hover:text-black p-1 hover:bg-neutral-100 rounded transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-neutral-500 mb-6 font-sans leading-relaxed">
              This interactive CTA is pre-configured. You can bind this action key to your custom routing rules later.
            </p>

            <form onSubmit={handleMockLogin} className="space-y-4">
              <div>
                <label className="block text-[10px] font-mono text-neutral-600 uppercase tracking-wider mb-1">
                  Security Identifier (Email)
                </label>
                <Input
                  type="email"
                  required
                  placeholder="e.g. administrator@monolith.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full rounded-xl border-neutral-200 bg-neutral-50 text-sm text-black placeholder:text-neutral-400 focus:border-black focus-visible:ring-black/10"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-neutral-600 uppercase tracking-wider mb-1">
                  Cryptographic Token (Password)
                </label>
                <Input
                  type="password"
                  required
                  placeholder="Enter security token"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full rounded-xl border-neutral-200 bg-neutral-50 text-sm text-black placeholder:text-neutral-400 focus:border-black focus-visible:ring-black/10"
                />
              </div>

              <div className="bg-neutral-50 border border-neutral-100 p-3 rounded flex gap-2 items-start text-[11px] text-neutral-500 font-sans leading-normal">
                <AlertCircle className="h-4 w-4 text-black shrink-0 mt-0.5" />
                <span>By continuing, you agree to inspect and map your production routing targets.</span>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="submit"
                  className="w-full py-3 bg-black hover:bg-neutral-800 text-white font-mono text-xs uppercase tracking-widest font-bold transition flex items-center justify-center gap-2"
                >
                  Confirm Gateway Link <ArrowRight className="h-3 w-3" />
                </button>

                <button
                  type="button"
                  onClick={() => setIsLoginModalOpen(false)}
                  className="w-full py-2.5 bg-transparent hover:bg-neutral-100 text-neutral-500 hover:text-black font-mono text-xs uppercase tracking-widest transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
