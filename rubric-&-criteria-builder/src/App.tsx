/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  Copy, 
  RotateCcw, 
  Download, 
  Upload, 
  Eye, 
  Edit3, 
  Check, 
  AlertTriangle, 
  ChevronDown, 
  ChevronUp, 
  Sparkles, 
  Printer, 
  FileText, 
  CheckCircle,
  HelpCircle,
  Hash,
  Scale,
  Award,
  ListPlus,
  MessageSquare,
  FileDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Rubric, 
  Criterion, 
  Question, 
  ResponseType, 
  QuestionOption, 
  EvaluationResponse 
} from './types';
import { PRESET_RUBRICS } from './data';

// Initial brand-new blank criterion template
const createBlankCriterion = (index: number): Criterion => ({
  id: `criterion-${Date.now()}-${index}`,
  title: 'New Criterion',
  description: 'Add a short explanation or instructions for this criterion.',
  code: `C${index + 1}`,
  weightage: 20,
  maxPoints: 10,
  isExpanded: true,
  questions: []
});

// Initial brand-new blank question template
const createBlankQuestion = (index: number): Question => ({
  id: `question-${Date.now()}-${index}`,
  text: `New Evaluation Question ${index + 1}`,
  type: ResponseType.RATING_SCALE,
  maxPoints: 5,
  required: true
});

export default function App() {
  // --- States ---
  const [rubric, setRubric] = useState<Rubric>(PRESET_RUBRICS[0]);
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [sandboxScores, setSandboxScores] = useState<Record<string, number>>({});
  const [sandboxMCQSelections, setSandboxMCQSelections] = useState<Record<string, string>>({});
  const [sandboxComments, setSandboxComments] = useState<Record<string, string>>({});
  const [overallEvaluatorNotes, setOverallEvaluatorNotes] = useState('');
  const [copiedReport, setCopiedReport] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importJsonText, setImportJsonText] = useState('');
  const [showImportArea, setShowImportArea] = useState(false);

  // --- Reset/Preset loaders ---
  const loadPreset = (presetId: string) => {
    const preset = PRESET_RUBRICS.find(p => p.id === presetId);
    if (preset) {
      // Create deep copy to avoid mutations
      const deepCopy = JSON.parse(JSON.stringify(preset)) as Rubric;
      setRubric(deepCopy);
      resetSandbox(deepCopy);
    }
  };

  const handleCreateNewFromScratch = () => {
    const freshRubric: Rubric = {
      id: `rubric-${Date.now()}`,
      title: 'Blank Custom Rubric',
      description: 'Define your custom evaluation criteria, assign point caps, set weights, and test the assessment form live.',
      criteria: [createBlankCriterion(0)]
    };
    setRubric(freshRubric);
    resetSandbox(freshRubric);
  };

  const resetSandbox = (targetRubric: Rubric) => {
    const initialScores: Record<string, number> = {};
    const initialMCQs: Record<string, string> = {};
    const initialComments: Record<string, string> = {};

    targetRubric.criteria.forEach(crit => {
      crit.questions.forEach(q => {
        if (q.type === ResponseType.YES_NO) {
          initialScores[q.id] = q.maxPoints; // Default to YES (full points)
        } else if (q.type === ResponseType.RATING_SCALE) {
          initialScores[q.id] = q.maxPoints; // Default to top tier
        } else if (q.type === ResponseType.MULTIPLE_CHOICE) {
          if (q.options && q.options.length > 0) {
            initialMCQs[q.id] = q.options[0].id;
            initialScores[q.id] = q.options[0].points ?? 0;
          } else {
            initialScores[q.id] = 0;
          }
        } else {
          initialScores[q.id] = q.maxPoints; // Default text scores
        }
        initialComments[q.id] = '';
      });
    });
    setSandboxScores(initialScores);
    setSandboxMCQSelections(initialMCQs);
    setSandboxComments(initialComments);
    setOverallEvaluatorNotes('');
  };

  // Run initialization
  useEffect(() => {
    resetSandbox(rubric);
  }, []);

  // --- Metric Calculations ---
  const totalWeightage = useMemo(() => {
    return rubric.criteria.reduce((sum, c) => sum + (Number(c.weightage) || 0), 0);
  }, [rubric.criteria]);

  const totalMaxPoints = useMemo(() => {
    return rubric.criteria.reduce((sum, c) => sum + (Number(c.maxPoints) || 0), 0);
  }, [rubric.criteria]);

  const totalQuestions = useMemo(() => {
    return rubric.criteria.reduce((sum, c) => sum + (c.questions?.length || 0), 0);
  }, [rubric.criteria]);

  // Dynamic live scorecard evaluation
  const scoreReport = useMemo(() => {
    let earnedWeightedSum = 0;
    let maxWeightedSum = 0;
    const criterionScores: Record<string, { earned: number; max: number; weightedEarned: number; weightedMax: number }> = {};

    rubric.criteria.forEach((crit) => {
      let critEarnedRaw = 0;
      let critMaxRaw = 0;

      crit.questions.forEach((q) => {
        const score = sandboxScores[q.id] !== undefined ? sandboxScores[q.id] : 0;
        critEarnedRaw += Number(score) || 0;
        critMaxRaw += Number(q.maxPoints) || 0;
      });

      // Avoid divide-by-zero if criterion has no questions
      const factor = critMaxRaw > 0 ? (critEarnedRaw / critMaxRaw) : 0;
      const criterionWeightedEarned = factor * crit.weightage;

      criterionScores[crit.id] = {
        earned: critEarnedRaw,
        max: critMaxRaw,
        weightedEarned: criterionWeightedEarned,
        weightedMax: crit.weightage
      };

      earnedWeightedSum += criterionWeightedEarned;
      maxWeightedSum += crit.weightage;
    });

    // Score scaled out of 100%
    const finalPercentage = maxWeightedSum > 0 ? (earnedWeightedSum / maxWeightedSum) * 100 : 0;

    // Numerical range conversion, e.g. performance bracket
    let bracket = 'Critical';
    let color = 'text-red-500';
    let bgColor = 'bg-red-50';
    let borderColor = 'border-red-200';

    if (finalPercentage >= 90) {
      bracket = 'Exceptional Performance';
      color = 'text-emerald-600';
      bgColor = 'bg-emerald-50';
      borderColor = 'border-emerald-200';
    } else if (finalPercentage >= 80) {
      bracket = 'Strong & Compliant';
      color = 'text-teal-600';
      bgColor = 'bg-teal-50';
      borderColor = 'border-teal-200';
    } else if (finalPercentage >= 70) {
      bracket = 'Meets Core Standards';
      color = 'text-amber-600';
      bgColor = 'bg-amber-50';
      borderColor = 'border-amber-200';
    } else if (finalPercentage >= 50) {
      bracket = 'Needs Focused Development';
      color = 'text-orange-600';
      bgColor = 'bg-orange-50';
      borderColor = 'border-orange-200';
    }

    return {
      earnedWeightedSum,
      maxWeightedSum,
      finalPercentage,
      criterionScores,
      bracket,
      color,
      bgColor,
      borderColor
    };
  }, [rubric, sandboxScores]);

  // --- CRUD Operations ---
  const updateRubricMeta = (key: 'title' | 'description', value: string) => {
    setRubric(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const updateCriterion = (critId: string, updatedFields: Partial<Criterion>) => {
    setRubric(prev => {
      const idx = prev.criteria.findIndex(c => c.id === critId);
      if (idx === -1) return prev;
      const updatedCriteria = [...prev.criteria];
      updatedCriteria[idx] = { ...updatedCriteria[idx], ...updatedFields };
      return { ...prev, criteria: updatedCriteria };
    });
  };

  const deleteCriterion = (critId: string) => {
    setRubric(prev => {
      const updatedCriteria = prev.criteria.filter(c => c.id !== critId);
      // Remap codes standard sequential (C1, C2...) to make reorders clean
      const cleanedCriteria = updatedCriteria.map((c, i) => ({
        ...c,
        code: `C${i + 1}`
      }));
      return { ...prev, criteria: cleanedCriteria };
    });
  };

  const addCriterionAt = (index: number) => {
    setRubric(prev => {
      const newCrit = createBlankCriterion(prev.criteria.length);
      const updatedCriteria = [...prev.criteria];
      updatedCriteria.splice(index + 1, 0, newCrit);
      
      // Remap codes sequentially
      const cleanedCriteria = updatedCriteria.map((c, i) => ({
        ...c,
        code: `C${i + 1}`
      }));
      return { ...prev, criteria: cleanedCriteria };
    });
  };

  const moveCriterion = (index: number, direction: 'up' | 'down') => {
    setRubric(prev => {
      const updatedCriteria = [...prev.criteria];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= updatedCriteria.length) return prev;

      // Swap positions
      const temp = updatedCriteria[index];
      updatedCriteria[index] = updatedCriteria[targetIndex];
      updatedCriteria[targetIndex] = temp;

      // Maintain sequential custom codes so rearranging works beautifully
      const cleanedCriteria = updatedCriteria.map((c, i) => ({
        ...c,
        code: `C${i + 1}`
      }));

      return { ...prev, criteria: cleanedCriteria };
    });
  };

  const duplicateCriterion = (critId: string) => {
    setRubric(prev => {
      const source = prev.criteria.find(c => c.id === critId);
      if (!source) return prev;
      
      const clone: Criterion = JSON.parse(JSON.stringify(source));
      clone.id = `criterion-clone-${Date.now()}`;
      clone.title = `${clone.title} (Copy)`;
      clone.isExpanded = true;
      
      const sourceIdx = prev.criteria.findIndex(c => c.id === critId);
      const updatedCriteria = [...prev.criteria];
      updatedCriteria.splice(sourceIdx + 1, 0, clone);

      const cleanedCriteria = updatedCriteria.map((c, i) => ({
        ...c,
        code: `C${i + 1}`
      }));

      return { ...prev, criteria: cleanedCriteria };
    });
  };

  // --- Questions Operations ---
  const addQuestionToCriterion = (critId: string) => {
    setRubric(prev => {
      const critIdx = prev.criteria.findIndex(c => c.id === critId);
      if (critIdx === -1) return prev;

      const updatedCriteria = [...prev.criteria];
      const currentQuestions = updatedCriteria[critIdx].questions || [];
      const newQuestion = createBlankQuestion(currentQuestions.length);

      // Pre-populate with typical setup
      updatedCriteria[critIdx].questions = [...currentQuestions, newQuestion];

      // Refresh default scores for sandbox
      setSandboxScores(prevScores => ({
        ...prevScores,
        [newQuestion.id]: newQuestion.maxPoints
      }));

      return { ...prev, criteria: updatedCriteria };
    });
  };

  const updateQuestion = (critId: string, qId: string, updatedFields: Partial<Question>) => {
    setRubric(prev => {
      const critIdx = prev.criteria.findIndex(c => c.id === critId);
      if (critIdx === -1) return prev;

      const updatedCriteria = [...prev.criteria];
      const questions = [...updatedCriteria[critIdx].questions];
      const qIdx = questions.findIndex(q => q.id === qId);
      if (qIdx === -1) return prev;

      const oldType = questions[qIdx].type;
      let targetQuestion = { ...questions[qIdx], ...updatedFields };

      // Handle structural change if user changes type
      if (updatedFields.type && updatedFields.type !== oldType) {
        if (updatedFields.type === ResponseType.MULTIPLE_CHOICE) {
          targetQuestion.options = [
            { id: `opt-${Date.now()}-1`, text: 'Excellent compliance', points: Number(targetQuestion.maxPoints) },
            { id: `opt-${Date.now()}-2`, text: 'Satisfactory standard', points: Math.floor(Number(targetQuestion.maxPoints) * 0.6) },
            { id: `opt-${Date.now()}-3`, text: 'Unsatisfactory progress', points: 0 }
          ];
        } else {
          delete targetQuestion.options;
        }
      }

      questions[qIdx] = targetQuestion;
      updatedCriteria[critIdx].questions = questions;

      // Keep sandbox score in bounds
      setSandboxScores(prevScores => {
        const current = prevScores[qId] || 0;
        const max = Number(targetQuestion.maxPoints) || 0;
        return {
          ...prevScores,
          [qId]: current > max ? max : current
        };
      });

      return { ...prev, criteria: updatedCriteria };
    });
  };

  const deleteQuestion = (critId: string, qId: string) => {
    setRubric(prev => {
      const critIdx = prev.criteria.findIndex(c => c.id === critId);
      if (critIdx === -1) return prev;

      const updatedCriteria = [...prev.criteria];
      updatedCriteria[critIdx].questions = updatedCriteria[critIdx].questions.filter(q => q.id !== qId);
      return { ...prev, criteria: updatedCriteria };
    });
  };

  const addMCQOption = (critId: string, qId: string) => {
    setRubric(prev => {
      const critIdx = prev.criteria.findIndex(c => c.id === critId);
      if (critIdx === -1) return prev;

      const updatedCriteria = [...prev.criteria];
      const questions = [...updatedCriteria[critIdx].questions];
      const qIdx = questions.findIndex(q => q.id === qId);
      if (qIdx === -1) return prev;

      const currentOptions = questions[qIdx].options || [];
      const parentMax = Number(questions[qIdx].maxPoints) || 5;

      const newOption: QuestionOption = {
        id: `opt-${Date.now()}-${currentOptions.length}`,
        text: `New scoring tier ${currentOptions.length + 1}`,
        points: Math.max(0, parentMax - currentOptions.length)
      };

      questions[qIdx].options = [...currentOptions, newOption];
      updatedCriteria[critIdx].questions = questions;
      return { ...prev, criteria: updatedCriteria };
    });
  };

  const updateMCQOption = (critId: string, qId: string, optId: string, text: string, points: number) => {
    setRubric(prev => {
      const critIdx = prev.criteria.findIndex(c => c.id === critId);
      if (critIdx === -1) return prev;

      const updatedCriteria = [...prev.criteria];
      const questions = [...updatedCriteria[critIdx].questions];
      const qIdx = questions.findIndex(q => q.id === qId);
      if (qIdx === -1) return prev;

      const options = [...(questions[qIdx].options || [])];
      const optIdx = options.findIndex(o => o.id === optId);
      if (optIdx === -1) return prev;

      options[optIdx] = { ...options[optIdx], text, points: Number(points) || 0 };
      questions[qIdx].options = options;
      updatedCriteria[critIdx].questions = questions;
      return { ...prev, criteria: updatedCriteria };
    });
  };

  const deleteMCQOption = (critId: string, qId: string, optId: string) => {
    setRubric(prev => {
      const critIdx = prev.criteria.findIndex(c => c.id === critId);
      if (critIdx === -1) return prev;

      const updatedCriteria = [...prev.criteria];
      const questions = [...updatedCriteria[critIdx].questions];
      const qIdx = questions.findIndex(q => q.id === qId);
      if (qIdx === -1) return prev;

      questions[qIdx].options = (questions[qIdx].options || []).filter(o => o.id !== optId);
      updatedCriteria[critIdx].questions = questions;
      return { ...prev, criteria: updatedCriteria };
    });
  };

  // --- Export Report Generator ---
  const generateMarkdownReport = (): string => {
    let report = `# Evaluation Assessment Report\n`;
    report += `**Rubric Title:** ${rubric.title}\n`;
    report += `**Date of Evaluation:** ${new Date().toLocaleDateString()}\n`;
    report += `**Overall Evaluation Score:** ${scoreReport.finalPercentage.toFixed(1)}% (${scoreReport.bracket})\n`;
    report += `*Total Rubric Weightage Assigned: ${scoreReport.maxWeightedSum}%\n\n`;
    report += `## Summary of Assessment Findings\n`;
    report += `${overallEvaluatorNotes || 'No high-level overview notes provided.'}\n\n`;

    report += `## Criterion Breakdown\n\n`;
    rubric.criteria.forEach(crit => {
      const stats = scoreReport.criterionScores[crit.id];
      const weightPercentage = crit.weightage;
      const contributionPercent = stats ? ((stats.earned / (stats.max || 1)) * crit.weightage) : 0;
      
      report += `### [${crit.code}] ${crit.title} (${weightPercentage}% Weightage)\n`;
      report += `* **Description:** ${crit.description || 'No description'}\n`;
      report += `* **Raw Score:** ${stats?.earned || 0} / ${stats?.max || 0} points\n`;
      report += `* **Weighted Rating:** ${contributionPercent.toFixed(2)}% out of ${weightPercentage}%\n\n`;
      
      if (crit.questions && crit.questions.length > 0) {
        report += `| Question / Parameter | Score | Assessment / Feedback |\n`;
        report += `|:---|:---|:---|\n`;
        crit.questions.forEach(q => {
          const score = sandboxScores[q.id] !== undefined ? sandboxScores[q.id] : '-';
          const comments = sandboxComments[q.id] || 'None';
          report += `| ${q.text} | **${score} / ${q.maxPoints}** | ${comments} |\n`;
        });
        report += `\n`;
      } else {
        report += `*No individual questions monitored for this criterion.*\n\n`;
      }
    });

    report += `\n*Report compiled via Google AI Studio Rubric Workspace.*`;
    return report;
  };

  const copyReportToClipboard = () => {
    const reportText = generateMarkdownReport();
    navigator.clipboard.writeText(reportText).then(() => {
      setCopiedReport(true);
      setTimeout(() => setCopiedReport(false), 2000);
    });
  };

  const downloadJsonRubric = () => {
    const jsonStr = JSON.stringify(rubric, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${rubric.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-config.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportJson = () => {
    try {
      const parsed = JSON.parse(importJsonText);
      if (!parsed.title || !Array.isArray(parsed.criteria)) {
        throw new Error("Invalid structure. Active rubrics must contain a 'title' string and a 'criteria' list.");
      }
      // Ensure IDs exist
      const cleaned = {
        ...parsed,
        id: parsed.id || `imported-${Date.now()}`,
        criteria: parsed.criteria.map((c: any, i: number) => ({
          ...c,
          id: c.id || `c-${Date.now()}-${i}`,
          code: c.code || `C${i + 1}`,
          weightage: Number(c.weightage) || 10,
          maxPoints: Number(c.maxPoints) || 10,
          questions: Array.isArray(c.questions) ? c.questions.map((q: any, qi: number) => ({
            ...q,
            id: q.id || `q-${Date.now()}-${i}-${qi}`,
            maxPoints: Number(q.maxPoints) || 5,
            required: !!q.required
          })) : []
        }))
      };

      setRubric(cleaned);
      resetSandbox(cleaned);
      setShowImportArea(false);
      setImportError(null);
      setImportJsonText('');
    } catch (err: any) {
      setImportError(err?.message || "Invalid JSON formatting. Check syntax guidelines.");
    }
  };

  // Check if questions score sum matches the target criterion max points
  const getQuestionPointsDifference = (crit: Criterion) => {
    const questionsSum = crit.questions.reduce((sum, q) => sum + (Number(q.maxPoints) || 0), 0);
    return questionsSum - Number(crit.maxPoints);
  };

  return (
    <div className="min-h-screen bg-slate-50 bg-grid-dots text-slate-900 selection:bg-[#00cec4]/20 transition-all duration-350">
      {/* Header Bar */}
      <header className="sticky top-0 z-45 bg-white/90 backdrop-blur-md border-b border-slate-200/70 shadow-xs px-4 lg:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center text-primary shadow-premium transition-transform duration-300 hover:scale-105">
              <Sparkles className="h-5 w-5 text-[#00cec4]" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
                Rubric &amp; Criteria Builder
                <span className="hidden sm:inline-block text-[9px] px-2 py-0.5 font-bold rounded-full bg-[#00cec4]/10 text-[#00b8af] uppercase border border-[#00cec4]/20 tracking-wider">
                  Enterprise Workspace
                </span>
              </h1>
              <p className="text-xs text-slate-500 font-medium font-sans">Design criteria schemas, configure point caps, and score in real-time</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Presets Button */}
            <div className="flex items-center gap-2 bg-slate-100/80 p-1 rounded-xl border border-slate-200/90 shadow-2xs">
              <span className="text-[11px] text-slate-500 font-bold px-1.5 uppercase tracking-wide hidden sm:inline">Templates:</span>
              <select 
                className="text-xs font-bold bg-white rounded-lg border border-slate-200/80 text-slate-800 py-1.5 px-3 outline-none focus:border-[#00cec4] focus:ring-1 focus:ring-[#00cec4] transition cursor-pointer shadow-2xs"
                onChange={(e) => {
                  if (e.target.value === 'scratch') {
                    handleCreateNewFromScratch();
                  } else {
                    loadPreset(e.target.value);
                  }
                }}
                value={rubric.id.includes('imported') ? '' : rubric.id}
              >
                <option value="tech-code-review">💻 Software Code Review</option>
                <option value="ux-ui-critique font-sans">🎨 UI/UX Critique</option>
                <option value="academic-thesis">🎓 Thesis Defense</option>
                <option value="scratch">✨ Blank Workspace (New)</option>
              </select>
            </div>

            {/* Config Utilities */}
            <button
              onClick={() => setShowImportArea(!showImportArea)}
              className="inline-flex h-9 items-center gap-1.5 px-3.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 bg-white hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 transition shadow-2xs cursor-pointer active:scale-97"
              title="Import Rubric JSON"
            >
              <Upload className="h-3.5 w-3.5 text-slate-500" />
              <span>Import Schema</span>
            </button>

            <button
              onClick={downloadJsonRubric}
              className="inline-flex h-9 items-center gap-1.5 px-3.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 bg-white hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 transition shadow-2xs cursor-pointer active:scale-97"
              title="Export Rubric JSON"
            >
              <Download className="h-3.5 w-3.5 text-slate-500" />
              <span>Export Schema</span>
            </button>

            <button
              onClick={() => {
                setShowExportModal(true);
              }}
              className="inline-flex h-9 items-center gap-1.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-premium transition cursor-pointer active:scale-97 border border-slate-950"
              title="Export Evaluation Assessment Report"
            >
              <FileDown className="h-4 w-4 text-[#00cec4]" />
              <span>Generate Report</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace Frame */}
      <main className="max-w-7xl mx-auto p-4 lg:p-8">
        
        {/* Toggleable Import Module */}
        <AnimatePresence>
          {showImportArea && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mb-6"
            >
              <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-premium space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">Import Rubric Configuration Schema</h3>
                    <p className="text-xs text-slate-550 font-medium font-sans">Paste a valid JSON schema below containing titles, weights, and questions.</p>
                  </div>
                  <button 
                    onClick={() => setShowImportArea(false)} 
                    className="text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer bg-slate-50 hover:bg-slate-100 border border-slate-200 py-1.5 px-3 rounded-lg transition"
                  >
                    Close
                  </button>
                </div>
                <textarea
                  className="w-full h-36 font-mono text-[11px] p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 focus:bg-white focus:border-[#00cec4] focus:ring-1 focus:ring-[#00cec4] outline-none transition"
                  placeholder='{"title": "My Rubric", "criteria": [{"title": "C1", "weightage": 50, "maxPoints": 10, "questions": []}]}'
                  value={importJsonText}
                  onChange={(e) => setImportJsonText(e.target.value)}
                />
                {importError && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-100 text-xs text-rose-600 font-bold">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-rose-500" />
                    <span>{importError}</span>
                  </div>
                )}
                <div className="flex justify-end gap-2 text-xs">
                  <button 
                    onClick={() => {
                      setImportJsonText(JSON.stringify(PRESET_RUBRICS[0], null, 2));
                      setImportError(null);
                    }}
                    className="px-3.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 font-bold text-slate-600 transition cursor-pointer font-sans"
                  >
                    Load Sample Syntax
                  </button>
                  <button 
                    onClick={handleImportJson}
                    className="px-4 py-1.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition font-bold cursor-pointer font-sans"
                  >
                    Parse JSON Config
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Global Summary Dashboard Section (Fostering Space and Balance) */}
        <section className="mb-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          
          <div className="group flex items-center gap-4 p-5 rounded-2xl bg-white border border-slate-200/70 shadow-premium hover:shadow-premium-hover hover:border-slate-300 transition-all duration-300 hover:-translate-y-0.5">
            <div className="p-3 bg-slate-50 rounded-xl text-slate-800 group-hover:bg-[#00cec4]/10 group-hover:text-[#00cec4] transition-colors">
              <Hash className="h-5 w-5 stroke-[2.25]" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Evaluation Modules</p>
              <h4 className="text-xl font-extrabold font-mono text-slate-800">{rubric.criteria.length} Categories</h4>
            </div>
          </div>

          <div className={`group flex items-center gap-4 p-5 rounded-2xl bg-white border shadow-premium hover:shadow-[#00cec4]/5 transition-all duration-300 hover:-translate-y-0.5
            ${totalWeightage === 100 ? 'border-emerald-200/80 hover:border-emerald-300' : 'border-amber-200/80 hover:border-amber-300'}`}
          >
            <div className={`p-3 rounded-xl transition-colors
              ${totalWeightage === 100 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}
            >
              <Scale className="h-5 w-5 stroke-[2.25]" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest leading-normal">Cumulative Weight</p>
              <div className="flex flex-col">
                <span className="text-xl font-extrabold font-mono text-slate-800">{totalWeightage}%</span>
                {totalWeightage === 100 ? (
                  <span className="text-[8px] bg-emerald-100 text-emerald-700 px-1.5 py-0.2 rounded font-extrabold mt-0.5 uppercase tracking-wider select-none max-w-max">Balanced</span>
                ) : (
                  <span 
                    className="text-[8.5px] bg-amber-100 text-amber-700 px-1 py-0.2 rounded font-extrabold mt-0.5 uppercase tracking-wider select-none cursor-help max-w-max"
                    title="Criteria weights must sum to exactly 100% for mathematical consistency."
                  >
                    Adjust to 100%
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="group flex items-center gap-4 p-5 rounded-2xl bg-white border border-slate-200/70 shadow-premium hover:shadow-premium-hover hover:border-slate-300 transition-all duration-300 hover:-translate-y-0.5">
            <div className="p-3 bg-slate-50 rounded-xl text-slate-800 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
              <Award className="h-5 w-5 stroke-[2.25]" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Global Score Cap</p>
              <h4 className="text-xl font-extrabold font-mono text-slate-800">{totalMaxPoints} pts</h4>
            </div>
          </div>

          <div className="group flex items-center gap-4 p-5 rounded-2xl bg-white border border-slate-200/70 shadow-premium hover:shadow-premium-hover hover:border-slate-300 transition-all duration-300 hover:-translate-y-0.5">
            <div className="p-3 bg-slate-50 rounded-xl text-slate-800 group-hover:bg-violet-50 group-hover:text-violet-600 transition-colors">
              <ListPlus className="h-5 w-5 stroke-[2.25]" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Active Parameters</p>
              <h4 className="text-xl font-extrabold font-mono text-slate-800">{totalQuestions} Queries</h4>
            </div>
          </div>

        </section>

        {/* Global Metadata Editor */}
        <section className="mb-8 p-6 bg-white/70 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-premium">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="md:col-span-1 space-y-1 pr-4">
              <span className="text-[10px] font-bold text-[#00b8af] uppercase tracking-widest">Rubric Metadata</span>
              <h3 className="text-base font-extrabold text-slate-900">Appraisal Scheme Labels</h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed font-sans mt-1">Set high-level identifiers and general instructions for this assessment worksheet context.</p>
            </div>
            <div className="md:col-span-2 space-y-4">
              <div>
                <input
                  type="text"
                  id="rubric-title-field"
                  className="w-full px-4 py-2.5 text-base font-extrabold text-slate-800 bg-white border border-slate-200 hover:border-slate-350 focus:border-[#00cec4] focus:ring-1 focus:ring-[#00cec4] rounded-xl outline-none transition font-sans shadow-2xs"
                  value={rubric.title}
                  onChange={(e) => updateRubricMeta('title', e.target.value)}
                  placeholder="Rubric Title"
                />
              </div>
              <div>
                <textarea
                  id="rubric-desc-field"
                  rows={2}
                  className="w-full text-xs px-4 py-2.5 bg-white border border-slate-200 hover:border-slate-350 focus:border-[#00cec4] focus:ring-1 focus:ring-[#00cec4] rounded-xl text-slate-600 outline-none resize-none transition font-sans shadow-2xs"
                  value={rubric.description}
                  onChange={(e) => updateRubricMeta('description', e.target.value)}
                  placeholder="Add high-level evaluation description or core benchmarks summary..."
                />
              </div>
            </div>
          </div>
        </section>

        {/* Grid Dual Column Layout - Optimizing use of space */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT PANEL: The Rubric Builder Workspace (Columns 1-7) */}
          <div className="lg:col-span-7 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-200/40 pb-3">
              <div className="flex items-center gap-2.5">
                <Edit3 className="h-5 w-5 text-[#00b8af]" />
                <h2 className="text-base font-extrabold text-slate-900 tracking-tight">Configure Criteria &amp; Scaling Parameters</h2>
              </div>
              <span className="text-xs text-slate-400 font-bold font-mono bg-slate-100/90 py-1 px-2.5 rounded-lg border border-slate-200/65">
                {rubric.criteria.length} Schema Row{rubric.criteria.length === 1 ? '' : 's'}
              </span>
            </div>

            {/* Criteria Loop Container with dynamic rearranging and motion/react */}
            <div className="space-y-5">
              <AnimatePresence initial={false}>
                {rubric.criteria.map((crit, index) => {
                  const pointsDiff = getQuestionPointsDifference(crit);
                  const isExpanded = crit.isExpanded !== false;
                  const totalQuestionsInCrit = crit.questions?.length || 0;

                  return (
                    <motion.div
                      key={crit.id}
                      layoutId={crit.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="group"
                    >
                      {/* Interactive block structure echoing specific user-requested markup */}
                      <div 
                        id={`card-${crit.id}`} 
                        className={`relative overflow-hidden rounded-2xl border-l-4 border-y border-r transition-all duration-300 ease-out bg-white
                          ${isExpanded ? 'shadow-premium border-l-[#00cec4] border-slate-200/90' : 'hover:shadow-premium-hover hover:border-slate-350 border-l-[#00cec4]/70 border-slate-200/80 bg-white/95'}`}
                      >
                        
                        {/* Header bar of criterion card with collapsible control & drag reordering */}
                        <div className="flex items-center justify-between border-b border-slate-200/60 bg-slate-50/50 px-4 md:px-5 py-3.5">
                          
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            {/* Simple, reliable reorder arrow handlers to optimize space & avoid desktop drag layout complexity */}
                            <div className="flex items-center bg-white rounded-lg border border-slate-200/80 shrink-0 shadow-2xs">
                              <button
                                type="button"
                                disabled={index === 0}
                                onClick={() => moveCriterion(index, 'up')}
                                className="p-1 px-1.5 text-slate-400 hover:text-slate-800 disabled:opacity-25 disabled:pointer-events-none transition cursor-pointer"
                                title="Move criterion up"
                              >
                                <ArrowUp className="h-3.5 w-3.5" />
                              </button>
                              <div className="h-3 w-px bg-slate-200" />
                              <button
                                type="button"
                                disabled={index === rubric.criteria.length - 1}
                                onClick={() => moveCriterion(index, 'down')}
                                className="p-1 px-1.5 text-slate-400 hover:text-slate-800 disabled:opacity-25 disabled:pointer-events-none transition cursor-pointer"
                                title="Move criterion down"
                              >
                                <ArrowDown className="h-3.5 w-3.5" />
                              </button>
                            </div>

                            {/* Criterion Index Badge */}
                            <span className="font-mono text-[9px] bg-slate-900 text-[#00cec4] font-extrabold px-2 py-1 rounded-lg">
                              {crit.code}
                            </span>

                            {/* Collapsed view summary details to save massive catalog space */}
                            {!isExpanded ? (
                              <div 
                                onClick={() => updateCriterion(crit.id, { isExpanded: true })}
                                className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800 hover:text-slate-950 truncate flex-1"
                              >
                                <span className="truncate">{crit.title || 'Untitled Criterion'}</span>
                                <span className="text-[10px] text-[#00b8af] font-mono bg-[#00cec4]/10 border border-[#00cec4]/15 px-1.5 py-0.2 rounded shrink-0 font-extrabold select-none">
                                  {crit.weightage}% WT
                                </span>
                                <span className="text-[10px] text-indigo-600 font-mono bg-indigo-50 border border-indigo-100 px-1.5 py-0.2 rounded shrink-0 font-extrabold select-none">
                                  {crit.maxPoints} pts
                                </span>
                                <span className="hidden md:inline text-[9px] text-slate-450 font-bold uppercase tracking-widest shrink-0">
                                  ({totalQuestionsInCrit} Row{totalQuestionsInCrit === 1 ? '' : 's'})
                                </span>
                              </div>
                            ) : (
                              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 select-none">
                                Criterion Parameter Config
                              </span>
                            )}
                          </div>

                          {/* Toggle Expand Card details */}
                          <div className="flex items-center gap-1 shrink-0 ml-2">
                            <button
                              type="button"
                              onClick={() => deleteCriterion(crit.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50/70 border border-transparent hover:border-rose-100 rounded-lg transition cursor-pointer"
                              title="Delete physical criterion"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => duplicateCriterion(crit.id)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50/70 border border-transparent hover:border-indigo-100 rounded-lg transition cursor-pointer"
                              title="Duplicate criterion structure"
                            >
                              <Copy className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => updateCriterion(crit.id, { isExpanded: !isExpanded })}
                              className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50/70 border border-transparent hover:border-emerald-100 rounded-lg transition cursor-pointer"
                              title={isExpanded ? "Collapse panel to free screen space" : "Expand settings layout"}
                            >
                              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </button>
                          </div>

                        </div>

                        {/* Interactive Body details rendering when expanded */}
                        <AnimatePresence initial={false}>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.18 }}
                              className="overflow-hidden bg-white px-4 md:px-5 py-5 space-y-4"
                            >
                              {/* Title / Description Block */}
                              <div className="grid gap-3 sm:grid-cols-3">
                                
                                <div className="sm:col-span-2 space-y-1.5">
                                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block pr-1">Criterion Name Descriptor</label>
                                  <input 
                                    className="h-10 w-full rounded-xl border border-slate-200 hover:border-slate-350 bg-slate-50/50 px-3.5 py-2 text-slate-800 text-xs font-bold placeholder:text-slate-400 focus:bg-white focus:border-[#00cec4] focus:ring-1 focus:ring-[#00cec4]/20 focus:outline-none transition-all shadow-2xs"
                                    placeholder="Criterion title" 
                                    type="text" 
                                    value={crit.title} 
                                    onChange={(e) => updateCriterion(crit.id, { title: e.target.value })}
                                  />
                                </div>

                                <div className="sm:col-span-1 space-y-1.5">
                                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block text-center">Ref Code</label>
                                  <input 
                                    className="h-10 w-full rounded-xl border border-slate-200 hover:border-slate-350 bg-slate-50/50 px-3 py-2 text-slate-800 text-xs font-mono font-bold placeholder:text-slate-400 focus:bg-white focus:border-[#00cec4] focus:ring-1 focus:ring-[#00cec4]/20 focus:outline-none transition-all text-center uppercase shadow-2xs"
                                    placeholder="e.g. C1" 
                                    type="text" 
                                    value={crit.code} 
                                    onChange={(e) => updateCriterion(crit.id, { code: e.target.value })}
                                  />
                                </div>

                              </div>

                              {/* Description area & Code/Weight/Max grid optimized for beautiful desktop and vertical spacing */}
                              <div className="grid gap-4 md:grid-cols-12">
                                
                                <div className="md:col-span-7 flex flex-col gap-1.5">
                                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#00b8af]">Description &amp; Guidelines Summary</span>
                                  <textarea 
                                    placeholder="Add explanations, instructions, or specific criteria points for this evaluation module." 
                                    rows={4} 
                                    className="min-h-24 w-full resize-y rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50/50 px-3.5 py-2.5 text-xs text-slate-650 text-slate-600 outline-none transition focus:bg-white focus:border-[#00cec4] focus:ring-1 focus:ring-[#00cec4]/20 font-sans leading-relaxed shadow-2xs"
                                    value={crit.description}
                                    onChange={(e) => updateCriterion(crit.id, { description: e.target.value })}
                                  />
                                </div>

                                {/* Highly-optimized, high-density stats module (Replaces redundant bulky column) */}
                                <div className="md:col-span-5 grid grid-cols-2 gap-3.5 rounded-2xl border border-slate-200 bg-slate-50/40 p-4">
                                  
                                  <div className="space-y-1">
                                    <span className="text-[10px] font-extrabold text-slate-450 text-slate-400 block uppercase tracking-wide">Weightage (%)</span>
                                    <div className="relative">
                                      <input 
                                        className="h-9 w-full rounded-xl border border-slate-200 bg-white px-2.5 pr-6 text-xs text-slate-700 font-bold focus:border-[#00cec4] focus:ring-1 focus:ring-[#00cec4]/20 focus:outline-none transition shadow-2xs" 
                                        placeholder="Weight" 
                                        type="number" 
                                        min="0"
                                        max="100"
                                        value={crit.weightage === 0 ? '' : crit.weightage} 
                                        onChange={(e) => updateCriterion(crit.id, { weightage: Number(e.target.value) || 0 })}
                                      />
                                      <span className="absolute right-2.5 top-2 text-xs font-bold text-slate-400">%</span>
                                    </div>
                                    <p className="text-[8.5px] font-bold text-slate-400 uppercase tracking-widest">Impact Weight</p>
                                  </div>

                                  <div className="space-y-1">
                                    <span className="text-[10px] font-extrabold text-slate-450 text-slate-400 block uppercase tracking-wide">Max Points</span>
                                    <input 
                                      className="h-9 w-full rounded-xl border border-slate-200 bg-white px-2.5 text-xs text-slate-700 font-bold focus:border-[#00cec4] focus:ring-1 focus:ring-[#00cec4]/20 focus:outline-none transition shadow-2xs" 
                                      placeholder="Points" 
                                      type="number" 
                                      min="1"
                                      value={crit.maxPoints === 0 ? '' : crit.maxPoints} 
                                      onChange={(e) => updateCriterion(crit.id, { maxPoints: Number(e.target.value) || 0 })}
                                    />
                                    <p className="text-[8.5px] font-bold text-slate-400 uppercase tracking-widest">Cap Score</p>
                                  </div>

                                  {/* Info Warnings regarding numerical alignments */}
                                  <div className="col-span-2 pt-2.5 border-t border-slate-200 text-[10px] text-slate-500 font-medium font-sans">
                                    {pointsDiff === 0 ? (
                                      <span className="text-emerald-600 font-bold flex items-center gap-1 select-none">
                                        <Check className="h-3.5 w-3.5 stroke-[2.5]" /> Alignments match cap limit ({crit.maxPoints} pts).
                                      </span>
                                    ) : (
                                      <span className="text-amber-600 font-bold flex items-center gap-1 select-none cursor-help" title="It's best practice for the sum score of individual questions to align directly with the total points for this evaluation category.">
                                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                                        Nested sum: {crit.questions.reduce((sum, q) => sum + (Number(q.maxPoints) || 0), 0)}/{crit.maxPoints} pts
                                      </span>
                                    )}
                                  </div>

                                </div>

                              </div>

                              {/* Nested Questions Sub-Module (User Requested styled layout block) */}
                              <div className="rounded-2xl border border-slate-200/90 bg-slate-50/50 p-4.5 space-y-4">
                                
                                <div className="flex items-center justify-between gap-3">
                                  <div>
                                    <p className="text-xs font-bold text-slate-800 uppercase tracking-wider">Evaluation Steps &amp; Criteria checklist</p>
                                    <p className="text-[10px] text-slate-500 font-sans">Introduce checkpoint parameters here to specify criteria answers.</p>
                                  </div>
                                  
                                  <button 
                                    type="button" 
                                    onClick={() => addQuestionToCriterion(crit.id)}
                                    className="inline-flex items-center justify-center rounded-xl text-xs font-bold shadow-2xs transition bg-slate-900 text-white hover:bg-slate-800 h-8 px-3 ml-2 border border-slate-950 cursor-pointer"
                                  >
                                    <Plus className="h-3.5 w-3.5 mr-1 text-[#00cec4]" /> Add Checkpoint
                                  </button>
                                </div>

                                {/* Staged Questions */}
                                <div className="space-y-3">
                                  {crit.questions && crit.questions.length > 0 ? (
                                    crit.questions.map((q, qIndex) => (
                                      <div 
                                        key={q.id}
                                        className="bg-white rounded-xl border border-slate-200/80 p-3.5 space-y-3 shadow-2xs hover:border-slate-250 transition"
                                      >
                                        <div className="flex flex-col gap-3.5 sm:flex-row sm:items-center sm:justify-between">
                                          
                                          {/* Question Text Box */}
                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5 mb-1.5 text-slate-400 select-none">
                                              <span className="font-mono text-[9px] bg-slate-900 text-white px-1.5 py-0.5 rounded font-extrabold uppercase tracking-wider">CP {qIndex + 1}</span>
                                              <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Checklist Evaluation Prompt</span>
                                            </div>
                                            <input
                                              type="text"
                                              className="w-full text-xs font-bold text-slate-800 placeholder:text-slate-400 bg-slate-50/30 hover:bg-slate-50/80 focus:bg-white px-3 py-2 rounded-xl border border-slate-200 focus:border-[#00cec4] outline-none transition"
                                              value={q.text}
                                              onChange={(e) => updateQuestion(crit.id, q.id, { text: e.target.value })}
                                              placeholder="Specify question prompt here..."
                                            />
                                          </div>

                                          {/* Response Format Dropdown and Point Cap */}
                                          <div className="flex flex-wrap items-center gap-2.5 sm:self-end shrink-0">
                                            
                                            <div className="flex flex-col gap-1 w-[150px]">
                                              <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest pl-1 leading-normal">Reaction Scaler</span>
                                              <select
                                                className="text-xs bg-slate-100 hover:bg-slate-150 rounded-lg border border-slate-250 border-slate-200 px-2.5 py-1.5 text-slate-700 outline-none focus:ring-1 focus:ring-[#00cec4] font-bold cursor-pointer transition shadow-2xs"
                                                value={q.type}
                                                onChange={(e) => updateQuestion(crit.id, q.id, { type: e.target.value as ResponseType })}
                                              >
                                                <option value={ResponseType.RATING_SCALE}>⭐ Rating Scale (1-5)</option>
                                                <option value={ResponseType.YES_NO}>✅ Yes / No System</option>
                                                <option value={ResponseType.MULTIPLE_CHOICE}>🎛️ Multichoice Tiers</option>
                                                <option value={ResponseType.SHORT_TEXT}>✏️ Comment Textslider</option>
                                              </select>
                                            </div>

                                            <div className="flex flex-col gap-1 w-[60px]">
                                              <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest pl-1 text-center leading-normal font-sans">Cap score</span>
                                              <input
                                                type="number"
                                                className="w-full text-xs text-center font-extrabold text-slate-800 bg-slate-50 rounded-lg border border-slate-200 py-1.5 focus:bg-white focus:border-[#00cec4] outline-none shadow-2xs transition"
                                                min="1"
                                                value={q.maxPoints}
                                                onChange={(e) => {
                                                  const val = Number(e.target.value) || 1;
                                                  updateQuestion(crit.id, q.id, { maxPoints: val });
                                                }}
                                              />
                                            </div>

                                            <button
                                              type="button"
                                              onClick={() => deleteQuestion(crit.id, q.id)}
                                              className="p-1.5 mt-4 text-slate-400 hover:text-rose-600 rounded-lg bg-slate-50 border border-slate-200 hover:border-rose-100 hover:bg-rose-50 transition cursor-pointer"
                                              title="Delete Question"
                                            >
                                              <Trash2 className="h-4 w-4" />
                                            </button>

                                          </div>

                                        </div>

                                        {/* Multi-choice Specific sub-form */}
                                        {q.type === ResponseType.MULTIPLE_CHOICE && (
                                          <div className="mt-2.5 pl-4 py-2 border-l-2 border-dashed border-[#00cec4]/30 bg-slate-50/70 p-3 rounded-xl space-y-3">
                                            <div className="flex items-center justify-between border-b border-slate-200/40 pb-1">
                                              <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wide">Interactive Multiple Choice Tiers</span>
                                              <button
                                                type="button"
                                                onClick={() => addMCQOption(crit.id, q.id)}
                                                className="px-2.5 py-1 rounded text-[9px] font-extrabold bg-[#00cec4]/10 text-teal-850 hover:bg-[#00cec4]/20 border border-[#00cec4]/20 transition cursor-pointer"
                                              >
                                                + Add Scoring Tier
                                              </button>
                                            </div>

                                            <div className="space-y-2">
                                              {q.options?.map((opt) => (
                                                <div key={opt.id} className="flex items-center gap-2">
                                                  <input
                                                    type="text"
                                                    value={opt.text}
                                                    onChange={(e) => updateMCQOption(crit.id, q.id, opt.id, e.target.value, opt.points ?? 0)}
                                                    className="flex-1 hover:bg-white bg-slate-100/60 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-850 font-bold outline-none focus:bg-white focus:border-[#00cec4] transition"
                                                    placeholder="Option tier description..."
                                                  />
                                                  <div className="relative w-22">
                                                    <input
                                                      type="number"
                                                      value={opt.points}
                                                      onChange={(e) => updateMCQOption(crit.id, q.id, opt.id, opt.text, Number(e.target.value) || 0)}
                                                      className="w-full text-center hover:bg-white bg-slate-100/60 rounded-lg border border-slate-200 pr-5 py-1.5 text-xs text-slate-800 font-extrabold outline-none focus:bg-white focus:border-[#00cec4] transition"
                                                      placeholder="Points"
                                                      min="0"
                                                      max={q.maxPoints}
                                                    />
                                                    <span className="absolute right-2 top-2 text-[8px] font-bold text-slate-400">pts</span>
                                                  </div>
                                                  <button
                                                    onClick={() => deleteMCQOption(crit.id, q.id, opt.id)}
                                                    className="p-1 px-1.5 text-slate-400 hover:text-rose-500 bg-white border border-slate-200 hover:bg-rose-50 rounded-lg cursor-pointer transition"
                                                    title="Remove tier"
                                                  >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                  </button>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        )}

                                      </div>
                                    ))
                                  ) : (
                                    <div className="rounded-xl border border-dashed border-slate-250 border-slate-300 bg-white px-4 py-8 text-center text-xs text-slate-400 font-semibold leading-relaxed">
                                      No parameters yet. Introduce your first evaluation question to start grading.
                                    </div>
                                  )}
                                </div>

                              </div>

                              {/* Save & Confirm Trigger mimicking the exact styling variables shown */}
                              <div className="flex flex-col gap-3 border-t border-slate-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
                                <span className="text-[9.5px] text-slate-400 font-bold uppercase tracking-wider">
                                  🚀 Auto-saved locally. Select duplicate/delete to reorder.
                                </span>
                                <div className="flex items-center gap-2 self-end">
                                  <button 
                                    type="button"
                                    onClick={() => updateCriterion(crit.id, { isExpanded: false })}
                                    className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 text-xs font-bold cursor-pointer h-8 px-3.5 transition"
                                  >
                                    Collapse Settings Layout
                                  </button>
                                </div>
                              </div>

                            </motion.div>
                          )}
                        </AnimatePresence>

                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {/* Dotted Anchor Frame representing the user prompt nested plus */}
            <div className="rounded-2xl border border-dashed border-[#00cec4]/30 hover:border-[#00cec4]/70 bg-[#00cec4]/2 hover:bg-[#00cec4]/5 px-4 py-7 text-center shadow-2xs transition duration-300">
              <button 
                type="button" 
                onClick={() => addCriterionAt(rubric.criteria.length)}
                aria-label="Add criterion below" 
                title="Add criterion below" 
                className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-white shadow-premium hover:shadow-glow-primary hover:bg-[#00cec4] transition-all duration-350 hover:scale-110 cursor-pointer"
              >
                <Plus className="h-5.5 w-5.5 text-[#00cec4] hover:text-white" />
              </button>
              <p className="mt-3.5 text-xs text-slate-800 font-extrabold uppercase tracking-widest leading-none">Add Category Module Block</p>
            </div>

          </div>

          {/* RIGHT PANEL: Dynamic Live Assessment Sandbox (Columns 8-12) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Sticky Sandbox Header with live scores progress gauge */}
            <div className="sticky top-20 z-10 space-y-4">

              {/* Title & Toggle Simulator */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-[#00b8af]" />
                  <h2 className="text-lg font-bold text-slate-800">Dynamic Sandbox Evaluator</h2>
                </div>
                <button
                  onClick={() => resetSandbox(rubric)}
                  className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-650 text-indigo-600 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 rounded px-2.5 py-1 transition"
                  title="Wipe assessment selections and reload defaults"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Reset Playground</span>
                </button>
              </div>

              {/* Massive Score Gauge Block */}
              <div className="p-6 bg-white rounded-3xl border border-slate-200/80 shadow-premium flex flex-col items-center justify-center text-center relative overflow-hidden transition duration-300 hover:shadow-premium-hover hover:border-slate-350">
                
                {/* Dynamic colored top background accent block */}
                <div className={`absolute top-0 inset-x-0 h-1.5 transition-all duration-300 ${scoreReport.finalPercentage >= 80 ? 'bg-[#00cec4]' : scoreReport.finalPercentage >= 70 ? 'bg-amber-400' : 'bg-rose-500'}`} />

                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1">Evaluated Appraisal Output</span>
                
                <div className="relative flex items-center justify-center my-1.5">
                  
                  {/* Outer Circular SVG progress */}
                  <svg className="w-28 h-28 transform -rotate-90">
                    <circle
                      cx="56"
                      cy="56"
                      r="46"
                      stroke="#f1f5f9"
                      strokeWidth="8"
                      fill="transparent"
                    />
                    <circle
                      cx="56"
                      cy="56"
                      r="46"
                      stroke={scoreReport.finalPercentage >= 80 ? '#00cec4' : scoreReport.finalPercentage >= 70 ? '#f59e0b' : '#ef4444'}
                      strokeWidth="8"
                      strokeLinecap="round"
                      fill="transparent"
                      strokeDasharray={2 * Math.PI * 46}
                      strokeDashoffset={(1 - scoreReport.finalPercentage / 100) * (2 * Math.PI * 46)}
                      className="transition-all duration-700 ease-out"
                    />
                  </svg>
                  
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-black font-mono text-slate-900 leading-none">
                      {scoreReport.finalPercentage.toFixed(1)}%
                    </span>
                    <span className="text-[8.5px] mt-1 text-[#00b8af] font-extrabold uppercase tracking-widest">
                      Weighted Ratio
                    </span>
                  </div>

                </div>

                {/* Rating bracket banner */}
                <div className={`mt-2.5 px-4.5 py-1.5 rounded-full text-[11px] font-extrabold leading-none ${scoreReport.bgColor} ${scoreReport.color} border ${scoreReport.borderColor} uppercase tracking-wider select-none shadow-2xs`}>
                  {scoreReport.bracket}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-4 w-full pt-4 border-t border-slate-100 text-[11px] font-medium text-slate-500">
                  <div>
                    <span className="text-slate-400 block text-[9.5px] font-extrabold uppercase tracking-wide">Earned Weights</span>
                    <span className="text-sm font-bold font-mono text-slate-800 leading-normal">
                      {scoreReport.earnedWeightedSum.toFixed(2)}% / {scoreReport.maxWeightedSum}%
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9.5px] font-extrabold uppercase tracking-wide font-sans">Integrity Scale</span>
                    <span className={`text-xs font-bold inline-flex items-center gap-1 leading-normal ${totalWeightage === 100 ? 'text-emerald-600' : 'text-amber-500'}`}>
                      {totalWeightage === 100 ? (
                        <>
                          <Check className="h-3.5 w-3.5 stroke-[2.5]" /> Stable (100%)
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> Out of Scale
                        </>
                      )}
                    </span>
                  </div>
                </div>

              </div>

              {/* Sandbox Form UI Rendering the live inputs */}
              <div className="p-5 bg-white rounded-3xl border border-slate-200/80 shadow-premium space-y-6 max-h-[500px] overflow-y-auto scrollable-premium">
                <div className="pb-3 border-b border-slate-100">
                  <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-widest flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-[#00b8af]" />
                    Interactive Appraisal Form
                  </h3>
                  <p className="text-[10px] text-slate-500 mt-1">Populate criteria benchmarks and sliders to view real-time calculations.</p>
                </div>

                {rubric.criteria.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-400 font-medium">
                    No criteria defined yet. Press "+" to introduce evaluation parameters.
                  </div>
                ) : (
                  rubric.criteria.map((crit, critIdx) => {
                    const stats = scoreReport.criterionScores[crit.id];
                    const rawEarned = stats?.earned || 0;
                    const rawMax = stats?.max || 1;
                    const contribution = stats ? ((rawEarned / rawMax) * crit.weightage) : 0;

                    return (
                      <div key={crit.id} className="space-y-3 pb-4 border-b border-slate-100 last:border-b-0">
                        
                        {/* Criterion Header inside Simulator */}
                        <div className="flex items-center justify-between">
                          <div className="min-w-0 pr-1.5">
                            <h4 className="text-xs font-extrabold text-slate-900 truncate uppercase tracking-tight">
                              {crit.code}. {crit.title || 'Untitled Category'}
                            </h4>
                            <p className="text-[9px] text-[#00b8af] font-mono font-bold uppercase tracking-wider mt-0.5">
                              Impact: {crit.weightage}% total | max: {crit.maxPoints} pts
                            </p>
                          </div>
                          
                          <div className="text-right shrink-0">
                            <span className="font-mono text-[10px] font-extrabold bg-[#00cec4]/10 text-teal-800 px-2 py-0.5 rounded-md border border-[#00cec4]/15">
                              {contribution.toFixed(1)}% / {crit.weightage}%
                            </span>
                          </div>
                        </div>

                        {/* Question Checklist mapping */}
                        <div className="space-y-2.5">
                          {crit.questions && crit.questions.length > 0 ? (
                            crit.questions.map((q) => {
                              const currentScore = sandboxScores[q.id] || 0;
                              const comments = sandboxComments[q.id] || '';

                              return (
                                <div key={q.id} className="bg-slate-50/70 p-3.5 rounded-2xl border border-slate-200/50 text-xs space-y-3 transition duration-150 hover:bg-slate-50 hover:border-slate-350">
                                  <div className="flex items-start justify-between gap-2">
                                    <p className="font-semibold text-slate-800 text-[11.5px] leading-relaxed flex-1">
                                      {q.text} {q.required && <span className="text-rose-500 font-bold">*</span>}
                                    </p>
                                    <span className="text-[9.5px] font-black font-mono text-slate-650 bg-white border border-slate-200/80 px-2 py-0.5 rounded-md shrink-0 uppercase tracking-wide select-none">
                                      {currentScore} / {q.maxPoints} pts
                                    </span>
                                  </div>

                                  {/* Interaction Input Element strictly mapping ResponseType */}
                                  <div className="pt-0.5">
                                    
                                    {/* Rating Scale: click numbers layout */}
                                    {q.type === ResponseType.RATING_SCALE && (
                                      <div className="flex items-center gap-1.5">
                                        {[...Array(q.maxPoints)].map((_, i) => {
                                          const v = i + 1;
                                          const isActive = currentScore === v;
                                          return (
                                            <button
                                              key={i}
                                              type="button"
                                              onClick={() => {
                                                setSandboxScores(prev => ({ ...prev, [q.id]: v }));
                                              }}
                                              className={`h-7.5 w-7.5 rounded-lg text-xs font-bold transition flex items-center justify-center cursor-pointer select-none
                                                ${isActive ? 'bg-[#00cec4] text-white shadow-glow-primary scale-105' : 'bg-white hover:bg-slate-100 text-slate-500 border border-slate-200 hover:border-slate-300'}`}
                                            >
                                              {v}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    )}

                                    {/* Yes / No layout button */}
                                    {q.type === ResponseType.YES_NO && (
                                      <div className="flex items-center gap-2">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setSandboxScores(prev => ({ ...prev, [q.id]: q.maxPoints }));
                                          }}
                                          className={`py-1.5 px-3.5 rounded-xl text-xs font-bold transition flex-1 cursor-pointer select-none border
                                            ${currentScore === q.maxPoints ? 'bg-emerald-500 border-emerald-600/20 text-white shadow-xs' : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200 hover:border-slate-300'}`}
                                        >
                                          Yes ({q.maxPoints} pts)
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setSandboxScores(prev => ({ ...prev, [q.id]: 0 }));
                                          }}
                                          className={`py-1.5 px-3.5 rounded-xl text-xs font-bold transition flex-1 cursor-pointer select-none border
                                            ${currentScore === 0 ? 'bg-rose-500 border-rose-600/20 text-white shadow-xs' : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200 hover:border-slate-300'}`}
                                        >
                                          No (0 pts)
                                        </button>
                                      </div>
                                    )}

                                    {/* Multiple choice selection tiles */}
                                    {q.type === ResponseType.MULTIPLE_CHOICE && (
                                      <div className="space-y-1.5">
                                        {q.options && q.options.length > 0 ? (
                                          q.options.map((opt) => {
                                            const isSelected = sandboxMCQSelections[q.id] === opt.id;
                                            return (
                                              <button
                                                key={opt.id}
                                                type="button"
                                                onClick={() => {
                                                  setSandboxMCQSelections(prev => ({ ...prev, [q.id]: opt.id }));
                                                  setSandboxScores(prev => ({ ...prev, [q.id]: opt.points ?? 0 }));
                                                }}
                                                className={`w-full text-left px-3 py-2 rounded-xl border text-xs font-semibold flex items-center justify-between transition cursor-pointer select-none
                                                  ${isSelected ? 'bg-indigo-50 border-indigo-200/90 text-indigo-700 shadow-2xs' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'}`}
                                              >
                                                <span>{opt.text}</span>
                                                <span className="font-mono text-[9px] bg-white border border-slate-200 px-1.5 py-0.2 rounded-md font-bold text-slate-500">
                                                  {opt.points} pts
                                                </span>
                                              </button>
                                            );
                                          })
                                        ) : (
                                          <p className="text-[10px] text-slate-400 py-1 italic">Define options in the criteria builder block.</p>
                                        )}
                                      </div>
                                    )}

                                    {/* Comments Box or Text score slider */}
                                    {q.type === ResponseType.SHORT_TEXT && (
                                      <div className="space-y-2 bg-white/75 p-2 rounded-xl border border-slate-150/60">
                                        <div className="flex items-center gap-3">
                                          <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider select-none shrink-0">Evaluation Score Range</span>
                                          <input
                                            type="range"
                                            min="0"
                                            max={q.maxPoints}
                                            step="1"
                                            className="accent-[#00cec4] flex-1 cursor-pointer h-1.5 rounded-full bg-slate-100"
                                            value={currentScore}
                                            onChange={(e) => {
                                              const parse = Number(e.target.value) || 0;
                                              setSandboxScores(prev => ({ ...prev, [q.id]: parse }));
                                            }}
                                          />
                                        </div>
                                      </div>
                                    )}

                                  </div>

                                  {/* Individual Question feedback text */}
                                  <div className="space-y-1">
                                    <input
                                      type="text"
                                      value={comments}
                                      onChange={(e) => {
                                        setSandboxComments(prev => ({ ...prev, [q.id]: e.target.value }));
                                      }}
                                      className="w-full text-[10px] font-medium bg-white border border-slate-200 p-2 px-3 rounded-xl hover:border-[#00cec4]/70 focus:border-[#00cec4] focus:ring-1 focus:ring-[#00cec4] focus:bg-white outline-none placeholder-slate-400/95 transition"
                                      placeholder="Comment regarding appraisal metrics here..."
                                    />
                                  </div>

                                </div>
                              );
                            })
                          ) : (
                            <p className="text-[10px] text-slate-400 italic">No checklist parameters.</p>
                          )}
                        </div>

                      </div>
                    );
                  })
                )}

                {/* Overall Assessment Comment Form */}
                <div className="pt-3 border-t border-slate-100/80">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest pl-1 block mb-1.5">
                    Overall Synthesis Summary Feedback Comments
                  </label>
                  <textarea
                    rows={3}
                    className="w-full text-xs p-3.5 rounded-2xl border border-slate-200 bg-slate-50 focus:border-[#00cec4] focus:ring-1 focus:ring-[#00cec4] outline-none font-medium text-slate-800 placeholder-slate-400/90 transition"
                    placeholder="Enter final high-level synthesis overview, recommendations, or grading panel feedback..."
                    value={overallEvaluatorNotes}
                    onChange={(e) => setOverallEvaluatorNotes(e.target.value)}
                  />
                </div>

              </div>

            </div>

          </div>

        </div>

      </main>

      {/* Full Screen Interactive Portal / Export Report Modality */}
      <AnimatePresence>
        {showExportModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.96, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 15 }}
              className="bg-white rounded-3xl border border-slate-200/90 shadow-2xl max-w-2xl w-full p-6.5 space-y-4 overflow-hidden max-h-[85vh] flex flex-col hover:border-slate-300 transition duration-300"
            >
              <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-widest leading-none">Completed Assessment Report</h3>
                  <p className="text-[10px] text-slate-500 font-sans mt-1.5">Copy or print formatted raw markdown summary of selected scores</p>
                </div>
                <button 
                  onClick={() => setShowExportModal(false)}
                  className="p-1.5 px-3 text-[10px] font-extrabold uppercase tracking-wider rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition cursor-pointer select-none"
                >
                  Close Modal
                </button>
              </div>

              {/* Text report preview */}
              <div className="flex-1 overflow-y-auto bg-slate-50 p-4 rounded-2xl border border-slate-200 font-mono text-[10.5px] text-slate-700 whitespace-pre-wrap leading-relaxed max-h-[50vh] scrollable-premium">
                {generateMarkdownReport()}
              </div>

              <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-end border-t border-slate-100 pt-3.5">
                <button
                  onClick={copyReportToClipboard}
                  className="rounded-xl bg-slate-900 text-white font-bold text-xs py-2 px-4 transition active:scale-95 hover:bg-slate-800 hover:shadow-glow-primary hover:bg-[#00cec4] inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {copiedReport ? (
                    <>
                      <Check className="h-4 w-4 text-[#00cec4] hover:text-white" />
                      <span>Copied Report!</span>
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4 text-[#00cec4] hover:text-white" />
                      <span>Copy Report (Markdown)</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    const printWindow = window.open('', '_blank');
                    if (printWindow) {
                      printWindow.document.write(`
                        <html>
                          <head>
                            <title>${rubric.title} - Appraisal Summary Report</title>
                            <style>
                              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 40px; color: #111827; line-height: 1.6; }
                              h1 { border-bottom: 2px solid #00cec4; padding-bottom: 8px; color: #1f2937; }
                              h2 { color: #374151; margin-top: 24px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
                              h3 { color: #4b5563; }
                              table { width: 100%; border-collapse: collapse; margin-top: 16px; margin-bottom: 24px; }
                              th, td { border: 1px solid #d1d5db; padding: 10px; text-align: left; font-size: 13px; }
                              th { background-color: #f9fafb; font-weight: 600; }
                              p { font-size: 14px; }
                            </style>
                          </head>
                          <body>
                            <h1>Evaluation Assessment Report</h1>
                            <p><strong>Rubric Target:</strong> ${rubric.title}</p>
                            <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
                            <p><strong>Combined Mark Result:</strong> ${scoreReport.finalPercentage.toFixed(1)}% (${scoreReport.bracket})</p>
                            <p><strong>Weight Count:</strong> ${scoreReport.earnedWeightedSum.toFixed(2)}% / ${scoreReport.maxWeightedSum}%</p>
                            <p><strong>Overview Summary Feedback:</strong> ${overallEvaluatorNotes || 'None'}</p>
                            <h2>Criteria Specific Scoring Summary</h2>
                          `);

                      rubric.criteria.forEach(crit => {
                        const stats = scoreReport.criterionScores[crit.id];
                        const weightPercentage = crit.weightage;
                        const contributionPercent = stats ? ((stats.earned / (stats.max || 1)) * crit.weightage) : 0;
                        
                        printWindow.document.write(`
                          <h3>[${crit.code}] ${crit.title} (${weightPercentage}% Impact weight)</h3>
                          <p><strong>Description:</strong> ${crit.description || 'N/A'}</p>
                          <p><strong>Subtotal Score:</strong> ${stats?.earned || 0} / ${stats?.max || 0} pts (Weighted influence: ${contributionPercent.toFixed(2)}% out of ${weightPercentage}%)</p>
                        `);

                        if (crit.questions && crit.questions.length > 0) {
                          printWindow.document.write(`
                            <table>
                              <thead>
                                <tr>
                                  <th>Question / Appraisal checklist element</th>
                                  <th style="width: 100px;">Assigned Score</th>
                                  <th>Appraiser Comments</th>
                                </tr>
                              </thead>
                              <tbody>
                          `);
                          crit.questions.forEach(q => {
                            const score = sandboxScores[q.id] !== undefined ? sandboxScores[q.id] : '-';
                            const comment = sandboxComments[q.id] || 'N/A';
                            printWindow.document.write(`
                              <tr>
                                <td>${q.text}</td>
                                <td><strong>${score} / ${q.maxPoints}</strong></td>
                                <td>${comment}</td>
                              </tr>
                            `);
                          });
                          printWindow.document.write(`
                              </tbody>
                            </table>
                          `);
                        }
                      });

                      printWindow.document.write(`
                          </body>
                        </html>
                      `);
                      printWindow.document.close();
                      printWindow.focus();
                      printWindow.print();
                    }
                  }}
                  className="rounded-xl border border-slate-200 bg-white font-bold text-xs py-2 px-4 text-slate-700 hover:bg-slate-50 transition active:scale-95 inline-flex items-center justify-center gap-1.5 cursor-pointer hover:border-slate-300"
                >
                  <Printer className="h-4 w-4 text-[#00cec4]" />
                  <span>Print Formal PDF Report</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
