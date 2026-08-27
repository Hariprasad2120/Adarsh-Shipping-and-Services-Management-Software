import { db } from "@/lib/db";
import {
  createDocumentCitation,
  createFaqCitation,
  createGuideCitation,
  createModuleCitation,
} from "./citations";
import {
  HOW_TO_GUIDES,
  MONOLITH_MODULES,
  STATIC_FAQS,
} from "./knowledge-base";
import type { MonaCitation } from "./types";

export type MonaKnowledgeHit = {
  citation: MonaCitation;
  id: string;
  kind: "guide" | "faq" | "module" | "document";
  path?: string;
  score: number;
  summary: string;
  title: string;
  trustLevel: "trusted_curated" | "trusted_internal";
};

const UNTRUSTED_INSTRUCTION_PATTERNS = [
  /ignore (all|any|previous|prior) instructions?/i,
  /system prompt/i,
  /developer message/i,
  /reveal .*secret/i,
  /tool call/i,
  /act as/i,
];

export function searchMonaKnowledge(
  query: string,
  limit = 5,
): MonaKnowledgeHit[] {
  const normalizedQuery = query.toLowerCase().trim();
  if (!normalizedQuery) {
    return [];
  }

  const hits: MonaKnowledgeHit[] = [];

  for (const guide of HOW_TO_GUIDES) {
    const score = scoreKeywordMatch(normalizedQuery, guide.keywords);
    if (score < 1.5) continue;
    hits.push({
      id: `guide:${guide.title.toLowerCase().replace(/\s+/g, "-")}`,
      kind: "guide",
      title: guide.title,
      summary: guide.steps[0] ?? "Monolith workflow guide",
      path: normalizePath(guide.path),
      score,
      trustLevel: "trusted_curated",
      citation: createGuideCitation(guide),
    });
  }

  for (const faq of STATIC_FAQS) {
    const score =
      scoreKeywordMatch(normalizedQuery, faq.keywords) +
      scoreTitleTokens(normalizedQuery, faq.question);
    if (score < 1) continue;
    hits.push({
      id: `faq:${faq.question.toLowerCase().replace(/\s+/g, "-")}`,
      kind: "faq",
      title: faq.question,
      summary: faq.answer,
      score,
      trustLevel: "trusted_curated",
      citation: createFaqCitation(faq),
    });
  }

  for (const moduleInfo of MONOLITH_MODULES) {
    const score =
      scoreModuleMatch(normalizedQuery, moduleInfo.name) +
      scoreTitleTokens(normalizedQuery, moduleInfo.description);
    if (score < 1) continue;
    hits.push({
      id: `module:${moduleInfo.name.toLowerCase().replace(/\s+/g, "-")}`,
      kind: "module",
      title: moduleInfo.name,
      summary: moduleInfo.description,
      path: normalizePath(moduleInfo.path),
      score,
      trustLevel: "trusted_curated",
      citation: createModuleCitation(moduleInfo),
    });
  }

  return hits.sort((a, b) => b.score - a.score).slice(0, limit);
}

export async function searchMonaKnowledgeForContext(params: {
  limit?: number;
  orgId?: string;
  permissions: string[];
  query: string;
  userId: string;
}): Promise<MonaKnowledgeHit[]> {
  const normalizedQuery = params.query.toLowerCase().trim();
  if (!normalizedQuery) {
    return [];
  }

  const hits = searchMonaKnowledge(normalizedQuery, params.limit ?? 5);

  if (matchesPersonalWorkQuery(normalizedQuery)) {
    const [todoCount, hrmsTaskCount, unreadNotificationCount, openCaseCount] =
      await Promise.all([
        db.todoTask.count({
          where: {
            userId: params.userId,
            status: "PENDING",
          },
        }),
        db.hrmsTask.count({
          where: {
            assigneeId: params.userId,
            status: "PENDING",
          },
        }),
        db.notification.count({
          where: {
            userId: params.userId,
            readAt: null,
          },
        }),
        db.hRCase.count({
          where: {
            userId: params.userId,
            status: { in: ["OPEN", "ASSIGNED", "IN_PROGRESS"] },
          },
        }),
      ]);

    hits.push({
      id: `document:personal-work:${params.userId}`,
      kind: "document",
      title: "My work snapshot",
      summary: [
        `${todoCount} pending To-Do item${todoCount === 1 ? "" : "s"}`,
        `${hrmsTaskCount} pending HRMS task${hrmsTaskCount === 1 ? "" : "s"}`,
        `${unreadNotificationCount} unread notification${unreadNotificationCount === 1 ? "" : "s"}`,
        `${openCaseCount} open HR case${openCaseCount === 1 ? "" : "s"}`,
      ].join(" • "),
      path: "/dashboard",
      score: 3.5,
      trustLevel: "trusted_internal",
      citation: createDocumentCitation({
        id: `document:personal-work:${params.userId}`,
        label: "Live personal work snapshot",
        detail:
          "Live aggregate of your To-Do items, HRMS tasks, unread notifications, and open HR cases.",
        href: "/dashboard",
      }),
    });
  }

  if (
    params.orgId &&
    params.permissions.includes("hrms.letters.manage")
  ) {
    const templates = await db.hRLetterTemplate.findMany({
      where: {
        orgId: params.orgId,
        isActive: true,
        OR: [
          { name: { contains: params.query, mode: "insensitive" } },
          { type: { contains: params.query, mode: "insensitive" } },
          { content: { contains: params.query, mode: "insensitive" } },
          { sourceFileName: { contains: params.query, mode: "insensitive" } },
        ],
      },
      orderBy: [
        { isLegalReviewed: "desc" },
        { updatedAt: "desc" },
      ],
      take: Math.max(params.limit ?? 5, 5),
      select: {
        id: true,
        name: true,
        type: true,
        content: true,
        sourceFileName: true,
        isLegalReviewed: true,
        version: true,
      },
    });

    for (const template of templates) {
      hits.push({
        id: `document:hr-letter-template:${template.id}`,
        kind: "document",
        title: template.name,
        summary: buildTemplateSummary(template),
        path: "/hrms/letters",
        score: scoreTemplateMatch(normalizedQuery, template),
        trustLevel: "trusted_internal",
        citation: createDocumentCitation({
          id: `document:hr-letter-template:${template.id}`,
          label: template.name,
          detail: buildTemplateCitationDetail(template),
          href: "/hrms/letters",
        }),
      });
    }
  }

  return hits.sort((a, b) => b.score - a.score).slice(0, params.limit ?? 5);
}

function scoreKeywordMatch(query: string, keywords: string[]) {
  return keywords.reduce((score, keyword) => {
    const normalizedKeyword = keyword.toLowerCase();
    if (normalizedKeyword.includes(" ")) {
      const words = normalizedKeyword.split(" ");
      return words.every((word) => query.includes(word)) ? score + 1.5 : score;
    }

    return query.includes(normalizedKeyword) ? score + 1 : score;
  }, 0);
}

function scoreTitleTokens(query: string, text: string) {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .reduce((score, token) => (query.includes(token) ? score + 0.2 : score), 0);
}

function scoreModuleMatch(query: string, moduleName: string) {
  const normalizedName = moduleName.toLowerCase();
  if (query.includes(normalizedName)) {
    return 2;
  }

  const leadToken = normalizedName.split(" ")[0];
  return query.includes(leadToken) ? 1 : 0;
}

function normalizePath(path: string | undefined) {
  if (!path) return undefined;
  return path.replace(/\*/g, "");
}

function matchesPersonalWorkQuery(query: string) {
  return [
    "my work",
    "personal work",
    "tasks",
    "todo",
    "to-do",
    "notifications",
    "unread",
    "cases",
    "helpdesk",
    "attention",
    "pending work",
  ].some((keyword) => query.includes(keyword));
}

function buildTemplateSummary(template: {
  content: string;
  name: string;
  sourceFileName: string | null;
  type: string;
  version: number;
}) {
  return [
    `${template.type} template`,
    template.sourceFileName ? `source ${template.sourceFileName}` : null,
    `version ${template.version}`,
    buildSafeDocumentSummary(template.content),
  ]
    .filter(Boolean)
    .join(" • ");
}

function buildTemplateCitationDetail(template: {
  isLegalReviewed: boolean;
  type: string;
  version: number;
}) {
  return `${template.type} HR letter template • version ${template.version} • ${
    template.isLegalReviewed ? "legally reviewed" : "pending legal review"
  }`;
}

function scoreTemplateMatch(
  query: string,
  template: {
    content: string;
    name: string;
    sourceFileName: string | null;
    type: string;
  },
) {
  const nameScore = scoreTitleTokens(query, template.name) * 3;
  const typeScore = scoreTitleTokens(query, template.type) * 2;
  const fileScore = template.sourceFileName
    ? scoreTitleTokens(query, template.sourceFileName)
    : 0;
  const contentScore = scoreTitleTokens(query, template.content);

  return nameScore + typeScore + fileScore + contentScore + 1;
}

export function buildSafeDocumentSummary(content: string) {
  const trimmedContent = content.replace(/\s+/g, " ").trim();
  if (!trimmedContent) {
    return "Content preview hidden for safety. Open the source document to review the full text.";
  }

  const shortPreview =
    trimmedContent.length > 140
      ? `${trimmedContent.slice(0, 137)}...`
      : trimmedContent;

  if (UNTRUSTED_INSTRUCTION_PATTERNS.some((pattern) => pattern.test(shortPreview))) {
    return "Content preview hidden because the source contains instruction-like text. Open the source document to review it directly.";
  }

  return shortPreview;
}
