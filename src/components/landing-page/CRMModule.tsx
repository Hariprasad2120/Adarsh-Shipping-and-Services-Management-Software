/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import type { CRMLead } from '../../types/types';
import { Landmark, ArrowRight, TrendingUp, DollarSign, Wallet, Percent } from 'lucide-react';

interface Props {
  leads: CRMLead[];
}

export default function CRMModule({ leads }: Props) {
  const totalPipeline = leads.reduce((sum, item) => sum + item.value, 0);
  const closedWon = leads.filter((l) => l.stage === 'Won').reduce((sum, item) => sum + item.value, 0);
  const avgConfidence = Math.round(
    leads.reduce((sum, item) => sum + item.confidence, 0) / leads.length || 0
  );

  return (
    <div id="crm-module-root" className="w-full space-y-8 animate-fadeIn text-neutral-900">
      
      {/* Editorial Overview Header */}
      <div className="border border-neutral-200 bg-white p-8 rounded-lg space-y-4">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-black"></span>
          <span className="font-mono text-[10px] tracking-widest text-neutral-400 uppercase font-semibold">
            PROTOCOL REFERENCE // 04
          </span>
        </div>
        <h2 className="text-3xl font-display font-black text-black tracking-tight font-sans">
          CRM Growth Pipeline & Sales Matrix
        </h2>
        <p className="text-sm text-neutral-600 leading-relaxed max-w-xl">
          The pipeline module represents prospective contracts and enterprise annual recurring financial models. By tracking transaction velocity, client contact indices, and probability analytics, the system calculates future quarterly cashflow values.
        </p>
      </div>

      {/* Corporate Financial Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="border border-neutral-200 bg-white p-6 rounded-lg space-y-2">
          <p className="font-mono text-[9px] text-neutral-400 uppercase tracking-widest font-bold">
            Cumulative Pipeline Value
          </p>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-display font-black text-black">
              ${totalPipeline.toLocaleString()}
            </span>
            <span className="text-xs text-neutral-500 font-mono">USD</span>
          </div>
          <p className="text-[11px] text-neutral-400">Aggregated value of all active pipeline opportunities</p>
        </div>

        <div className="border border-neutral-200 bg-white p-6 rounded-lg space-y-2">
          <p className="font-mono text-[9px] text-neutral-400 uppercase tracking-widest font-bold">
            Annual Recurring Value Won
          </p>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-display font-black text-black">
              ${closedWon.toLocaleString()}
            </span>
            <span className="text-xs text-neutral-500 font-mono">USD</span>
          </div>
          <p className="text-[11px] text-neutral-400">Successfully closed and committed contracts</p>
        </div>

        <div className="border border-neutral-200 bg-white p-6 rounded-lg space-y-2">
          <p className="font-mono text-[9px] text-neutral-400 uppercase tracking-widest font-bold">
            Average Close Probability
          </p>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-display font-black text-black">{avgConfidence}%</span>
            <span className="text-xs text-neutral-500 font-mono">Probability</span>
          </div>
          <p className="text-[11px] text-neutral-400">Based on algorithmic enterprise velocity levels</p>
        </div>
      </div>

      {/* CRM Funnel Step Walkthrough */}
      <div className="border border-neutral-200 bg-white rounded-lg p-6 space-y-6">
        <div>
          <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-black border-b border-neutral-100 pb-2">
            SALES PIPELINE TRANSITION WORKFLOW
          </h3>
          <p className="text-xs text-neutral-500 mt-1">
            Understanding transaction milestones as opportunities transition from discovery to contract.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-white bg-black h-5 w-5 rounded-full flex items-center justify-center">1</span>
              <p className="text-xs font-bold text-black font-sans">Lead Qualification</p>
            </div>
            <p className="text-[11.5px] text-neutral-500 leading-normal font-sans">
              Prospective accounts are logged with essential contacts, current scale, and estimated contract opportunity values.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-white bg-black h-5 w-5 rounded-full flex items-center justify-center">2</span>
              <p className="text-xs font-bold text-black font-sans">Proposal Scoping</p>
            </div>
            <p className="text-[11.5px] text-neutral-500 leading-normal font-sans">
              Presales teams compile technical scopes, system integrations checklist, and service level pricing tiers.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-white bg-black h-5 w-5 rounded-full flex items-center justify-center">3</span>
              <p className="text-xs font-bold text-black font-sans">Legal Negotiation</p>
            </div>
            <p className="text-[11.5px] text-neutral-500 leading-normal font-sans">
              Attorneys and executives review liability safeguards, security wrappers, and long-term retainer clauses.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-white bg-black h-5 w-5 rounded-full flex items-center justify-center">4</span>
              <p className="text-xs font-bold text-black font-sans">Closed & Provisioned</p>
            </div>
            <p className="text-[11.5px] text-neutral-500 leading-normal font-sans">
              Contracts are digitally countersigned, instantly launching cloud runtime environments for onboarding clients.
            </p>
          </div>
        </div>
      </div>

      {/* Active opportunities table */}
      <div className="space-y-3">
        <p className="font-mono text-xs font-bold text-neutral-500 tracking-wider">
          ACTIVE PIPELINE DEALS INDEX PREVIEW
        </p>

        <div className="border border-neutral-200 bg-white rounded-lg overflow-hidden divide-y divide-neutral-100">
          {leads.map((lead) => (
            <div key={lead.id} className="p-6 flex flex-col sm:flex-row justify-between sm:items-center gap-4 hover:bg-[#fafafa] transition duration-200">
              <div className="space-y-1">
                <p className="text-sm font-bold text-black font-sans leading-none">{lead.company}</p>
                <p className="text-[11px] text-neutral-400 font-mono uppercase">
                  CONTACT: {lead.contactName} // EMAIL: {lead.email}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <span className="text-[11px] font-mono font-extrabold text-black bg-neutral-100 border border-neutral-200 px-3 py-1 rounded">
                  ${lead.value.toLocaleString()}
                </span>

                <span className="text-[10px] font-mono border border-neutral-200 bg-neutral-50 text-neutral-600 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                  {lead.confidence}% Probable
                </span>

                <span className="text-[10px] font-mono bg-black text-white px-2.5 py-0.5 rounded uppercase tracking-wider font-semibold">
                  {lead.stage}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="text-center py-4 border-t border-neutral-200">
        <p className="text-[11px] text-neutral-400 font-mono uppercase tracking-widest">
          SYSTEM REFERENCE CODE // SOC2-CRM-MONOLITH
        </p>
      </div>

    </div>
  );
}
