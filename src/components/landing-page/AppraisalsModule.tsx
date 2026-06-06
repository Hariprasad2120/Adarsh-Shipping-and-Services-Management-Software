/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import type { Appraisal } from '../../types/types';
import { Award, FileText, CheckCircle2, Star, ShieldCheck, ArrowRight, HelpCircle } from 'lucide-react';

interface Props {
  appraisals: Appraisal[];
}

export default function AppraisalsModule({ appraisals }: Props) {
  // Stats
  const activeCount = appraisals.length;
  const inReviewCount = appraisals.filter((a) => a.status === 'Under Review').length;
  const avgRating = Number(
    (appraisals.reduce((sum, item) => sum + item.score, 0) / appraisals.length || 0).toFixed(1)
  );

  return (
    <div id="appraisals-module-root" className="w-full space-y-8 animate-fadeIn text-neutral-900">
      
      {/* Editorial Overview Header */}
      <div className="border border-neutral-200 bg-white p-8 rounded-lg space-y-4">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-black"></span>
          <span className="font-mono text-[10px] tracking-widest text-neutral-400 uppercase font-semibold">
            PROTOCOL REFERENCE // 01
          </span>
        </div>
        <h2 className="text-3xl font-display font-black text-black tracking-tight">
          Performance Appraisal Engine
        </h2>
        <p className="text-sm text-neutral-600 leading-relaxed max-w-xl">
          This system organizes continuous, peer-reviewed qualitative performance audits. By mapping personal growth criteria directly against departmental micro-achievements, Monolith aligns team output with rigid corporate standards.
        </p>
      </div>

      {/* High-Contrast Analytical Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="border border-neutral-200 bg-white p-6 rounded-lg space-y-2">
          <p className="font-mono text-[9px] text-neutral-400 uppercase tracking-widest font-bold">
            Average Evaluated Score
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-display font-black text-black">{avgRating}</span>
            <span className="text-xs text-neutral-500 font-mono">/ 5.0 Rating</span>
          </div>
          <p className="text-[11px] text-neutral-400">Based on historical audited records</p>
        </div>

        <div className="border border-neutral-200 bg-white p-6 rounded-lg space-y-2">
          <p className="font-mono text-[9px] text-neutral-400 uppercase tracking-widest font-bold">
            Audited Records Pending
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-display font-black text-black">{inReviewCount}</span>
            <span className="text-xs text-neutral-500 font-mono">In-Review Cycles</span>
          </div>
          <p className="text-[11px] text-neutral-400">Awaiting executive cryptographic signature</p>
        </div>

        <div className="border border-neutral-200 bg-white p-6 rounded-lg space-y-2">
          <p className="font-mono text-[9px] text-neutral-400 uppercase tracking-widest font-bold">
            Historical Database Archives
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-display font-black text-black">{activeCount}</span>
            <span className="text-xs text-neutral-500 font-mono">Active Artifacts</span>
          </div>
          <p className="text-[11px] text-neutral-400">Logged on distributed backup nodes</p>
        </div>
      </div>

      {/* Visual Workflow Steps: "What happens in this module when clicked" */}
      <div className="border border-neutral-200 bg-white rounded-lg p-6 space-y-6">
        <div>
          <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-black border-b border-neutral-100 pb-2">
            AUDIT & ALIGNMENT SYSTEM WORKFLOW
          </h3>
          <p className="text-xs text-neutral-500 mt-1">
            Below is the operational sequence triggered when initiating an appraisal task.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-white bg-black h-5 w-5 rounded-full flex items-center justify-center">1</span>
              <p className="text-xs font-bold text-black font-sans">Initialize Review</p>
            </div>
            <p className="text-[11.5px] text-neutral-500 leading-normal font-sans">
              Supervisors register employee milestones, departmental focus, and target timelines in the secure registry.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-white bg-black h-5 w-5 rounded-full flex items-center justify-center">2</span>
              <p className="text-xs font-bold text-black font-sans">Identify Strengths</p>
            </div>
            <p className="text-[11.5px] text-neutral-500 leading-normal font-sans">
              Algorithmic scoring measures qualitative traits against enterprise milestones to assign numeric ratings.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-white bg-black h-5 w-5 rounded-full flex items-center justify-center">3</span>
              <p className="text-xs font-bold text-black font-sans">Analyze Constraints</p>
            </div>
            <p className="text-[11.5px] text-neutral-500 leading-normal font-sans">
              The engine catalogs technical bottlenecks, team feedback, and operational blockers.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-white bg-black h-5 w-5 rounded-full flex items-center justify-center">4</span>
              <p className="text-xs font-bold text-black font-sans">Goal Synchronization</p>
            </div>
            <p className="text-[11.5px] text-neutral-500 leading-normal font-sans">
              Milestones are committed to immutable database logs to automate standard optimization cycles.
            </p>
          </div>
        </div>
      </div>

      {/* Explainer UI Showcase & Mock records */}
      <div className="space-y-3">
        <p className="font-mono text-xs font-bold text-neutral-500 tracking-wider">
          SAMPLE EVALUATIONS METRIC OUTPUTS
        </p>

        <div className="border border-neutral-200 bg-white rounded-lg divide-y divide-neutral-100 overflow-hidden">
          {appraisals.map((appraisal) => (
            <div key={appraisal.id} className="p-6 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                <div>
                  <h4 className="text-sm font-bold text-black leading-none">{appraisal.employeeName}</h4>
                  <p className="text-[11px] text-neutral-400 font-mono mt-1 uppercase">
                    {appraisal.department} // AUDITED BY: {appraisal.reviewer}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-0.5 bg-neutral-100 px-2 py-1 rounded border border-neutral-200">
                    <Star className="h-3.5 w-3.5 text-black fill-black" />
                    <span className="font-mono text-xs font-bold text-black">{appraisal.score}.0</span>
                  </div>
                  <span className="text-[10px] font-mono border border-neutral-200 text-neutral-700 bg-neutral-50 px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold">
                    {appraisal.status}
                  </span>
                </div>
              </div>

              {/* Layout design details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans text-neutral-600 leading-relaxed bg-[#fafafa] p-4 border border-neutral-100 rounded">
                <div>
                  <span className="block font-mono text-[9px] text-neutral-400 uppercase tracking-widest font-bold mb-1">
                    Key Performance Highs
                  </span>
                  <p className="text-[11px]">{appraisal.highs}</p>
                </div>
                <div>
                  <span className="block font-mono text-[9px] text-neutral-400 uppercase tracking-widest font-bold mb-1">
                    Strategic Goals Setup
                  </span>
                  <p className="text-[11px]">{appraisal.goals}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="text-center py-4 border-t border-neutral-200">
        <p className="text-[11px] text-neutral-400 font-mono uppercase tracking-widest">
          SYSTEM REFERENCE CODE // SOC2-APR-MONOLITH
        </p>
      </div>

    </div>
  );
}
