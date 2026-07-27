import { db } from "@/lib/db";

type RatingItem = {
  criterion: string;
  weight: number;
  score: number;
  rationale: string;
};

type AiReportAnalysis = {
  executiveSummary: string;
  mistakes: string[];
  improvements: string[];
  rating: {
    overallScore: number;
    grade: string;
    criteria: RatingItem[];
  };
};

const REPORT_CRITERIA = [
  { criterion: "Timeliness and SLA Discipline", weight: 25 },
  { criterion: "Documentation Quality and Completeness", weight: 20 },
  { criterion: "Compliance and Audit Hygiene", weight: 20 },
  { criterion: "Expense Discipline and Payout Control", weight: 20 },
  { criterion: "Communication, Clarification Handling, and Rework Control", weight: 15 },
];

function formatDate(value?: Date | string | null) {
  if (!value) return "Not recorded";
  return new Date(value).toLocaleString("en-IN");
}

function money(value: unknown) {
  return `INR ${Number(value || 0).toLocaleString("en-IN")}`;
}

function gradeFromScore(score: number) {
  if (score >= 90) return "A+";
  if (score >= 80) return "A";
  if (score >= 70) return "B";
  if (score >= 60) return "C";
  return "D";
}

function normalizeScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export async function listCompletedChaJobsForReports(orgId: string, query?: string) {
  return db.chaJob.findMany({
    where: {
      orgId,
      deletedAt: null,
      OR: [{ stage: "FILED" }, { status: "COMPLETED" }],
      ...(query?.trim()
        ? {
            jobNumber: { contains: query.trim(), mode: "insensitive" },
          }
        : {}),
    },
    select: {
      id: true,
      jobNumber: true,
      title: true,
      stage: true,
      status: true,
      updatedAt: true,
      customer: { select: { name: true } },
      filing: { select: { actualFilingDate: true, filingRef: true, delayReason: true } },
      expenseRequests: {
        select: {
          status: true,
          lines: { select: { amount: true } },
          payments: { select: { amountPaid: true } },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 25,
  });
}

async function getCompletedJobForReport(orgId: string, jobId: string) {
  const job = await db.chaJob.findFirst({
    where: {
      id: jobId,
      orgId,
      deletedAt: null,
      OR: [{ stage: "FILED" }, { status: "COMPLETED" }],
    },
    include: {
      customer: { select: { name: true, gstin: true, pan: true } },
      branch: { select: { name: true, code: true } },
      jobType: { select: { name: true } },
      shipmentType: { select: { name: true } },
      primaryOwner: { select: { name: true } },
      assignedManager: { select: { name: true } },
      assignments: { include: { user: { select: { name: true } } } },
      documentRequirements: {
        include: {
          versions: { orderBy: { uploadedAt: "desc" }, include: { uploadedBy: { select: { name: true } } } },
          exception: { include: { user: { select: { name: true } } } },
        },
        orderBy: { name: "asc" },
      },
      additionalData: true,
      doExtensions: true,
      section49Extensions: true,
      checklistImports: {
        include: {
          sections: { include: { items: true }, orderBy: { order: "asc" } },
          approvals: { include: { manager: { select: { name: true } } } },
          reworkNotes: { include: { author: { select: { name: true } } } },
        },
        orderBy: { uploadedAt: "asc" },
      },
      checklistWorkflow: {
        include: {
          fileVersions: true,
          approvals: true,
          customerResponses: true,
          customerMailLogs: true,
        },
      },
      filing: { include: { dateHistory: true } },
      filingWorkflowInstance: {
        include: {
          nodeRuns: {
            include: {
              node: true,
              fieldValues: true,
              responses: true,
              attachments: true,
              queries: true,
            },
            orderBy: { startedAt: "asc" },
          },
        },
      },
      customerAdvance: { include: { receipts: true } },
      expenseRequests: {
        include: {
          requestedBy: { select: { name: true } },
          lines: true,
          payments: { include: { paidBy: { select: { name: true } } } },
          queries: true,
          statusHistory: true,
        },
        orderBy: { createdAt: "asc" },
      },
      customerDocumentSubmissions: { include: { versions: true, portalUser: { select: { name: true, email: true } } } },
      customerQueryThreads: { include: { messages: true } },
      shipmentRatings: true,
      auditLogs: { orderBy: { timestamp: "asc" } },
    },
  });

  if (!job) {
    throw new Error("Report can be generated only after the selected job is fully completed.");
  }
  return job;
}

function summarizeJob(job: Awaited<ReturnType<typeof getCompletedJobForReport>>) {
  const totalExpenseRequested = job.expenseRequests.reduce(
    (total, request) => total + request.lines.reduce((sum, line) => sum + Number(line.amount), 0),
    0,
  );
  const totalExpensePaid = job.expenseRequests.reduce(
    (total, request) => total + request.payments.reduce((sum, payment) => sum + Number(payment.amountPaid), 0),
    0,
  );
  const totalAdvanceCollected = job.customerAdvance?.receipts.reduce((sum, receipt) => sum + Number(receipt.amount), 0) || 0;
  const reworkCount =
    job.checklistImports.reduce((sum, checklist) => sum + checklist.reworkNotes.length, 0) +
    job.documentRequirements.filter((requirement) => requirement.status === "REQUIRES_ATTENTION").length;
  const clarificationCount = job.expenseRequests.reduce(
    (sum, request) => sum + request.statusHistory.filter((entry) => entry.status === "CLARIFICATION_REQUIRED").length,
    0,
  );
  const rejectedExpenses = job.expenseRequests.filter((request) => request.status === "REJECTED").length;
  const missingDocuments = job.documentRequirements.filter((requirement) => requirement.status !== "UPLOADED" && requirement.isMandatory).length;
  const delayed = Boolean(job.filing?.delayReason);

  return {
    totalExpenseRequested,
    totalExpensePaid,
    totalAdvanceCollected,
    reworkCount,
    clarificationCount,
    rejectedExpenses,
    missingDocuments,
    delayed,
  };
}

function buildEvidenceText(job: Awaited<ReturnType<typeof getCompletedJobForReport>>) {
  const summary = summarizeJob(job);
  return [
    `Job ${job.jobNumber}: ${job.title}`,
    `Customer: ${job.customer.name}`,
    `Job type: ${job.jobType.name}; shipment: ${job.shipmentType?.name || "Not recorded"}; branch: ${job.branch.name}`,
    `Owner: ${job.primaryOwner.name}; manager: ${job.assignedManager?.name || "Not assigned"}`,
    `Stage: ${job.stage}; status: ${job.status}; created: ${formatDate(job.createdAt)}; updated: ${formatDate(job.updatedAt)}`,
    `Filing reference: ${job.filing?.filingRef || "Not recorded"}; actual filing: ${formatDate(job.filing?.actualFilingDate)}; delay reason: ${job.filing?.delayReason || "None"}`,
    `Documents: ${job.documentRequirements.length} requirements; missing mandatory: ${summary.missingDocuments}; uploaded/current: ${job.documentRequirements.filter((r) => r.versions.length > 0).length}`,
    `Checklist imports: ${job.checklistImports.length}; rework notes: ${summary.reworkCount}`,
    `Expenses requested: ${money(summary.totalExpenseRequested)}; paid: ${money(summary.totalExpensePaid)}; rejected requests: ${summary.rejectedExpenses}; clarification requests: ${summary.clarificationCount}`,
    `Customer advance expected: ${money(job.customerAdvance?.expectedAmount)}; collected: ${money(summary.totalAdvanceCollected)}; status: ${job.customerAdvance?.status || "Not recorded"}`,
    `Filing workflow nodes: ${job.filingWorkflowInstance?.nodeRuns.length || 0}.`,
    `Customer queries: ${job.customerQueryThreads.length}; customer document submissions: ${job.customerDocumentSubmissions.length}; customer ratings: ${job.shipmentRatings.length}`,
    `Audit events: ${job.auditLogs.length}. Latest events: ${job.auditLogs.slice(-15).map((log) => `${log.event} ${log.newState || ""} ${log.remarks || ""}`).join(" | ")}`,
  ].join("\n");
}

function buildFallbackAnalysis(job: Awaited<ReturnType<typeof getCompletedJobForReport>>): AiReportAnalysis {
  const summary = summarizeJob(job);
  const timeliness = normalizeScore(100 - (summary.delayed ? 20 : 0));
  const documentation = normalizeScore(100 - summary.missingDocuments * 12 - summary.reworkCount * 4);
  const compliance = normalizeScore(92 - (job.auditLogs.length === 0 ? 15 : 0) - (summary.delayed ? 5 : 0));
  const expense = normalizeScore(95 - summary.rejectedExpenses * 10 - summary.clarificationCount * 3);
  const communication = normalizeScore(90 - summary.reworkCount * 5 - summary.clarificationCount * 4);
  const scores = [timeliness, documentation, compliance, expense, communication];
  const criteria = REPORT_CRITERIA.map((criterion, index) => ({
    ...criterion,
    score: scores[index],
    rationale: `Score computed from recorded delays, rework, clarification, expense and audit signals for ${job.jobNumber}.`,
  }));
  const overallScore = normalizeScore(criteria.reduce((sum, item) => sum + item.score * (item.weight / 100), 0));
  return {
    executiveSummary: `Job ${job.jobNumber} was completed for ${job.customer.name}. The report combines MIS financials, workflow evidence, audit history, and performance signals captured during the clearance lifecycle.`,
    mistakes: [
      summary.delayed ? `Filing delay recorded: ${job.filing?.delayReason}` : "No filing delay was recorded.",
      summary.reworkCount > 0 ? `${summary.reworkCount} rework or attention item(s) were recorded.` : "No checklist/document rework was detected.",
      summary.clarificationCount > 0 ? `${summary.clarificationCount} expense clarification event(s) were recorded.` : "No expense clarification loop was detected.",
    ],
    improvements: [
      "Keep document naming, validity checks, and checklist remarks standardized before filing.",
      "Review expense categories and payout timing after each completed job.",
      "Use audit events to identify recurring bottlenecks for the same customer, branch, or job type.",
    ],
    rating: { overallScore, grade: gradeFromScore(overallScore), criteria },
  };
}

async function generateAiAnalysis(job: Awaited<ReturnType<typeof getCompletedJobForReport>>) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return buildFallbackAnalysis(job);

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.CHA_JOB_REPORT_AI_MODEL || "gpt-4o-mini",
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You are an MIS and operations performance analyst for a customs house agent. Return strict JSON with executiveSummary, mistakes array, improvements array, and rating {overallScore, grade, criteria[{criterion, weight, score, rationale}]}. Use the provided five criteria and weights exactly. Be specific, fair, and evidence-based.",
          },
          {
            role: "user",
            content: `Criteria: ${JSON.stringify(REPORT_CRITERIA)}\n\nEvidence:\n${buildEvidenceText(job)}`,
          },
        ],
      }),
    });
    if (!response.ok) return buildFallbackAnalysis(job);
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return buildFallbackAnalysis(job);
    const parsed = JSON.parse(content) as AiReportAnalysis;
    return {
      ...parsed,
      rating: {
        ...parsed.rating,
        overallScore: normalizeScore(Number(parsed.rating?.overallScore || 0)),
        grade: parsed.rating?.grade || gradeFromScore(Number(parsed.rating?.overallScore || 0)),
        criteria: REPORT_CRITERIA.map((criterion) => {
          const aiCriterion = parsed.rating?.criteria?.find((item) => item.criterion === criterion.criterion);
          return {
            ...criterion,
            score: normalizeScore(Number(aiCriterion?.score || 0)),
            rationale: aiCriterion?.rationale || "AI assessment generated from job evidence.",
          };
        }),
      },
    };
  } catch {
    return buildFallbackAnalysis(job);
  }
}

export async function generateCompletedChaJobReport(orgId: string, jobId: string) {
  const job = await getCompletedJobForReport(orgId, jobId);
  const analysis = await generateAiAnalysis(job);
  const summary = summarizeJob(job);

  const lines = [
    "EXECUTIVE SUMMARY",
    analysis.executiveSummary,
    "",
    "JOB PROFILE",
    `Job Number: ${job.jobNumber}`,
    `Customer: ${job.customer.name}`,
    `Customer GSTIN/PAN: ${job.customer.gstin || "Not recorded"} / ${job.customer.pan || "Not recorded"}`,
    `Title: ${job.title}`,
    `Branch: ${job.branch.name} (${job.branch.code || "No code"})`,
    `Job Type: ${job.jobType.name}`,
    `Shipment Type: ${job.shipmentType?.name || "Not recorded"}`,
    `Priority: ${job.priority}`,
    `Owner: ${job.primaryOwner.name}`,
    `Assigned Manager: ${job.assignedManager?.name || "Not assigned"}`,
    `Assignments: ${job.assignments.map((assignment) => `${assignment.responsibility} - ${assignment.user.name}`).join("; ") || "None"}`,
    "",
    "FILING AND WORKFLOW",
    `Filing Reference: ${job.filing?.filingRef || "Not recorded"}`,
    `Actual Filing Date: ${formatDate(job.filing?.actualFilingDate)}`,
    `Filed Bill Copy: ${job.filing?.filedBillCopyKey || "Not recorded"}`,
    `Delay Reason: ${job.filing?.delayReason || "None"}`,
    `Additional Data: Vessel ${formatDate(job.additionalData?.vesselInwardDate)}, IGM ${job.additionalData?.importGeneralManifest || "N/A"}, EGM ${job.additionalData?.exportGeneralManifest || "N/A"}, DO Validity ${formatDate(job.additionalData?.deliveryOrderValidity)}`,
    ...((job.filingWorkflowInstance?.nodeRuns || []).map((run, index) => `${index + 1}. ${run.node?.name || run.nodeKey}: ${run.status}; completed ${formatDate(run.completedAt)}; remarks ${run.remarks || "None"}`)),
    "",
    "DOCUMENTS AND CHECKLISTS",
    ...job.documentRequirements.map((requirement) =>
      `${requirement.name}: ${requirement.status}; uploads ${requirement.versions.length}; latest ${requirement.versions[0]?.fileName || "None"}; exception ${requirement.exception?.reason || "None"}`,
    ),
    ...job.checklistImports.map((checklist) =>
      `Checklist ${checklist.fileName}: ${checklist.status}; uploaded ${formatDate(checklist.uploadedAt)}; approvals ${checklist.approvals.map((approval) => `${approval.manager.name} ${approval.decision}`).join(", ") || "None"}; rework ${checklist.reworkNotes.map((note) => note.note).join(" | ") || "None"}`,
    ),
    "",
    "EXPENSE MIS",
    `Total Requested: ${money(summary.totalExpenseRequested)}`,
    `Total Paid: ${money(summary.totalExpensePaid)}`,
    `Advance Expected: ${money(job.customerAdvance?.expectedAmount)}`,
    `Advance Collected: ${money(summary.totalAdvanceCollected)}`,
    ...job.expenseRequests.flatMap((request, index) => [
      `Expense Request ${index + 1}: ${request.id}; status ${request.status}; requested by ${request.requestedBy.name}; urgent ${request.isUrgent ? "Yes" : "No"}; UPI ${request.upiId || request.upiNumber || "Not recorded"}`,
      ...request.lines.map((line) => `  Line: ${line.category}; ${line.purpose}; ${money(line.amount)}; required ${formatDate(line.requiredDate)}; receipt ${line.supportingDocumentKey || "None"}`),
      ...request.payments.map((payment) => `  Payment: ${money(payment.amountPaid)} via ${payment.paymentMethod}; ref ${payment.transactionReference}; paid by ${payment.paidBy.name}; proof ${payment.paymentProofKey || "None"}`),
      ...request.statusHistory.map((history) => `  Audit: ${history.status}; ${history.remarks || "No remarks"}; ${formatDate(history.createdAt)}`),
    ]),
    "",
    "CUSTOMER COMMUNICATION AND EXTERNAL SIGNALS",
    ...job.customerDocumentSubmissions.map((submission) => `Customer document ${submission.requirementId}: ${submission.status}; by ${submission.portalUser.name || submission.portalUser.email}; versions ${submission.versions.length}`),
    ...job.customerQueryThreads.map((thread) => `Customer query ${thread.title}: ${thread.status}; ${thread.description}; messages ${thread.messages.length}; resolution ${thread.resolution || "None"}`),
    ...job.shipmentRatings.map((rating) => `Customer rating: ${rating.overallRating}/5; remarks ${rating.remarks || "None"}`),
    "",
    "MISTAKES / ISSUES IDENTIFIED",
    ...analysis.mistakes.map((item) => `- ${item}`),
    "",
    "POSSIBLE IMPROVEMENTS",
    ...analysis.improvements.map((item) => `- ${item}`),
    "",
    "TEAM PERFORMANCE RATING",
    `Overall Score: ${analysis.rating.overallScore}/100`,
    `Grade: ${analysis.rating.grade}`,
    ...analysis.rating.criteria.map((item) => `${item.criterion} (${item.weight}%): ${item.score}/100 - ${item.rationale}`),
    "",
    "ORGANIZATION AUDIT TRAIL",
    ...job.auditLogs.map((log) => `${formatDate(log.timestamp)} - ${log.event}; entity ${log.entityType}; state ${log.prevState || "N/A"} -> ${log.newState || "N/A"}; ${log.remarks || "No remarks"}`),
  ];

  return {
    filename: `${job.jobNumber}-MIS-performance-report.pdf`,
    title: `MIS & Performance Evaluation Report - ${job.jobNumber}`,
    subtitle: `Generated ${formatDate(new Date())} for ${job.customer.name}`,
    lines,
  };
}
