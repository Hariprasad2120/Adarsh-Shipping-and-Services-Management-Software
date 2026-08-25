import "server-only";

import { existsSync, readdirSync, readFileSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";

const repositoryRoot = process.cwd();
const reviewStorePath = path.join(
  repositoryRoot,
  "storage",
  "design-system-governance",
  "reviews.json",
);
const sourceRoots = ["src/app", "src/modules"];
const ignoredDirectories = new Set([
  ".next",
  "node_modules",
  "OLD UI code",
  "_design-reference",
]);

export type GovernanceStatus =
  | "pending_review"
  | "approved"
  | "replacement_pending"
  | "replaced"
  | "potential_duplicate"
  | "needs_manual_review";

export type GovernanceFindingKind =
  | "pattern"
  | "duplicate"
  | "token_deviation";

export type GovernancePreviewKind =
  | "actions"
  | "forms"
  | "tables"
  | "headings"
  | "cards"
  | "dialogs"
  | "navigation"
  | "timeline"
  | "status"
  | "attachments"
  | "module"
  | "token";

export type GovernanceCategory =
  | "Component"
  | "Pattern"
  | "Layout"
  | "Interaction"
  | "Navigation"
  | "Data Display"
  | "Form"
  | "Feedback"
  | "Workflow"
  | "Communication"
  | "Typography"
  | "Color"
  | "Spacing"
  | "Iconography"
  | "Responsive Pattern"
  | "Design Token Deviation";

export type GovernanceHistoryEntry = {
  actor: string;
  at: string;
  note: string;
  status: GovernanceStatus;
};

export type GovernanceFinding = {
  id: string;
  name: string;
  kind: GovernanceFindingKind;
  category: GovernanceCategory;
  designType: string;
  description: string;
  previewKind: GovernancePreviewKind;
  modules: string[];
  routes: string[];
  files: string[];
  sourceComponents: string[];
  occurrences: number;
  similarityLabel: string;
  recommendedAlternativeIds: string[];
  differences: string[];
  responsiveBehaviour: string;
  accessibility: string;
  status: GovernanceStatus;
  approvedCategory: GovernanceCategory | null;
  replacementTargetId: string | null;
  replacementTargetLabel: string | null;
  replacementAutomation: "developer_review_required" | "not_applicable";
  history: GovernanceHistoryEntry[];
};

type GovernanceReviewRecord = {
  findingId: string;
  status: GovernanceStatus;
  approvedCategory: GovernanceCategory | null;
  replacementTargetId: string | null;
  replacementTargetLabel: string | null;
  reviewedBy: string;
  reviewedAt: string;
  history: GovernanceHistoryEntry[];
};

type Occurrence = {
  module: string;
  route: string | null;
  file: string;
  sourceComponent: string | null;
};

type PatternDefinition = {
  id: string;
  name: string;
  kind: GovernanceFindingKind;
  category: GovernanceCategory;
  designType: string;
  description: string;
  previewKind: GovernancePreviewKind;
  recommendedAlternativeIds: string[];
  similarityLabel: string;
  differences: string[];
  responsiveBehaviour: string;
  accessibility: string;
  status: GovernanceStatus;
  tagTriggers?: Array<"button" | "input" | "textarea" | "select" | "table" | "dialog" | "h1" | "h2" | "h3" | "article">;
  keywordPattern?: RegExp;
};

const categoryChoices: GovernanceCategory[] = [
  "Component",
  "Pattern",
  "Layout",
  "Interaction",
  "Navigation",
  "Data Display",
  "Form",
  "Feedback",
  "Workflow",
  "Communication",
  "Typography",
  "Color",
  "Spacing",
  "Iconography",
  "Responsive Pattern",
  "Design Token Deviation",
];

const patternDefinitions: PatternDefinition[] = [
  {
    id: "route-local-action-controls",
    name: "Route-local action controls",
    kind: "pattern",
    category: "Component",
    designType: "Action",
    description:
      "Raw button usage and action-bar compositions are appearing outside the registered Monolith action hierarchy.",
    previewKind: "actions",
    recommendedAlternativeIds: ["actions", "button-link"],
    similarityLabel: "92% functional match to Actions",
    differences: [
      "Custom button spacing vs canonical action rhythm",
      "Mixed hover emphasis vs shared motion contract",
      "Route-local action grouping instead of registered button families",
    ],
    responsiveBehaviour:
      "Buttons often wrap unevenly under constrained widths, while the approved action system already handles compact and stacked states consistently.",
    accessibility:
      "Several occurrences rely on raw button/link groupings, so this queue recommends the canonical action components with established focus and disabled states.",
    status: "pending_review",
    tagTriggers: ["button"],
    keywordPattern: /(action|toolbar|controls?|cta|submit|save|approve|delete|button)/i,
  },
  {
    id: "route-local-form-clusters",
    name: "Route-local form clusters",
    kind: "pattern",
    category: "Form",
    designType: "Form controls",
    description:
      "Input, select, and textarea treatments are still being composed route-locally instead of through the registered workspace field system.",
    previewKind: "forms",
    recommendedAlternativeIds: ["workspace-fields", "document-dropzone-field"],
    similarityLabel: "95% functional match to Workspace fields",
    differences: [
      "Custom label and hint spacing vs workspace field contract",
      "Route-local control shells instead of shared field/error behavior",
      "Mixed control density under responsive collapse",
    ],
    responsiveBehaviour:
      "These findings commonly rely on fixed row groupings, while the approved field system already supports narrow stacking and theme parity.",
    accessibility:
      "The canonical field stack preserves labels, hints, and focus-visible behavior. Raw clusters are flagged when they bypass that contract.",
    status: "pending_review",
    tagTriggers: ["input", "textarea", "select"],
    keywordPattern: /(field|form|input|select|textarea|filter|search)/i,
  },
  {
    id: "route-local-data-shells",
    name: "Route-local data shells",
    kind: "pattern",
    category: "Data Display",
    designType: "Table and register shell",
    description:
      "Tables and dense data registers are still surfacing with route-specific wrappers, toolbars, or row affordances outside the operational table family.",
    previewKind: "tables",
    recommendedAlternativeIds: ["operational-data-table"],
    similarityLabel: "90% functional match to Operational data table",
    differences: [
      "Custom register toolbar density vs approved operational header",
      "Route-local row-action placement and summary footers",
      "Unregistered table empty/loading shells",
    ],
    responsiveBehaviour:
      "Several occurrences keep fixed cell assumptions or custom toolbars that clip earlier than the approved operational table wrapper.",
    accessibility:
      "The approved table system already preserves semantic headers and named row actions; route-local variants are queued for review.",
    status: "pending_review",
    tagTriggers: ["table"],
    keywordPattern: /(table|register|list|row|grid|pagination|records?)/i,
  },
  {
    id: "route-local-heading-stacks",
    name: "Route-local heading stacks",
    kind: "pattern",
    category: "Typography",
    designType: "Page and section identity",
    description:
      "Raw heading stacks are still being used where WorkspacePageHeader or WorkspaceSectionHeading should own route identity.",
    previewKind: "headings",
    recommendedAlternativeIds: ["workspace-page-header", "workspace-section-heading"],
    similarityLabel: "96% functional match to Workspace headings",
    differences: [
      "Raw h1/h2/h3 groupings instead of the approved heading hierarchy",
      "Ad hoc badge and supporting-copy placement",
      "Route-local spacing rather than canonical page rhythm",
    ],
    responsiveBehaviour:
      "Unregistered heading stacks often collapse copy and actions unpredictably on mobile. The approved heading components already manage that layout.",
    accessibility:
      "This review category focuses on semantic heading ownership and visible hierarchy rather than text content differences.",
    status: "pending_review",
    tagTriggers: ["h1", "h2", "h3"],
  },
  {
    id: "route-local-surface-cards",
    name: "Route-local surface cards",
    kind: "pattern",
    category: "Layout",
    designType: "Card and panel composition",
    description:
      "Article/card surfaces are appearing with local shadows, radii, and content framing instead of registered panels or module compositions.",
    previewKind: "cards",
    recommendedAlternativeIds: ["workspace-panel", "monolith-surface"],
    similarityLabel: "89% functional match to Panels and surfaces",
    differences: [
      "Custom inset and shadow treatments vs semantic panel system",
      "Static surfaces moving on hover without an interaction contract",
      "Local content framing in place of shared panel headers",
    ],
    responsiveBehaviour:
      "The approved panel system has already been tuned for narrow widths and zoom. Several route-local cards still need that containment.",
    accessibility:
      "Interactive surfaces must expose a keyboard contract. This queue highlights surfaces that look actionable without the registered behavior.",
    status: "pending_review",
    tagTriggers: ["article"],
    keywordPattern: /(card|panel|summary|tile|surface|widget|metric)/i,
  },
  {
    id: "route-local-dialogs",
    name: "Route-local dialogs and confirms",
    kind: "pattern",
    category: "Interaction",
    designType: "Dialog and confirmation flow",
    description:
      "Confirmation and overlay patterns are still being introduced outside the shared workspace dialog layer.",
    previewKind: "dialogs",
    recommendedAlternativeIds: ["workspace-feedback", "workspace-panel"],
    similarityLabel: "85% functional match to Workspace dialog flows",
    differences: [
      "Route-local confirmation copy and button placement",
      "Mixed overlay sizing and footer actions",
      "Unregistered focus and dismissal patterns",
    ],
    responsiveBehaviour:
      "Dialog findings are reviewed against the shared workspace overlay sizing and containment rules used elsewhere in Monolith.",
    accessibility:
      "The governance queue marks these when overlay behavior should be reconciled with the shared focus trap and escape contract.",
    status: "pending_review",
    tagTriggers: ["dialog"],
    keywordPattern: /(dialog|modal|confirm|drawer|sheet|overlay)/i,
  },
  {
    id: "route-local-navigation",
    name: "Route-local navigation treatments",
    kind: "pattern",
    category: "Navigation",
    designType: "Tabs and navigation controls",
    description:
      "Navigation clusters such as tabs, side rails, and route switchers are appearing as one-off treatments outside the current design-system inventory.",
    previewKind: "navigation",
    recommendedAlternativeIds: ["monolith-search-command", "cha-section"],
    similarityLabel: "78% functional match to current navigation inventory",
    differences: [
      "Custom active-state treatment vs shared navigation affordances",
      "Inconsistent spacing and selection cues",
      "One-off route switchers without a registered preview specimen",
    ],
    responsiveBehaviour:
      "These patterns are reviewed for overflow, wrap, and focus management across mobile and zoomed layouts.",
    accessibility:
      "The queue highlights navigation treatments that depend on hover-only emphasis or lack shared keyboard selection behavior.",
    status: "pending_review",
    keywordPattern: /(nav|tabs?|sidebar|menu|breadcrumb|switcher)/i,
  },
  {
    id: "route-local-attachments",
    name: "Route-local attachment and upload cards",
    kind: "pattern",
    category: "Communication",
    designType: "Upload and attachment surface",
    description:
      "Attachment, upload, and document cards are appearing with their own shells outside the registered dropzone pattern.",
    previewKind: "attachments",
    recommendedAlternativeIds: ["document-dropzone-field"],
    similarityLabel: "88% functional match to Document dropzone",
    differences: [
      "Local upload shell instead of the shared dropzone contract",
      "Custom attachment metadata rows and actions",
      "Mixed drag target emphasis and helper copy",
    ],
    responsiveBehaviour:
      "Attachment findings usually need the shared dropzone's width handling and helper-text wrapping.",
    accessibility:
      "The shared dropzone preserves the label-backed file picker contract; local upload cards are reviewed against that behavior.",
    status: "pending_review",
    keywordPattern: /(upload|attachment|document|dropzone|file)/i,
  },
  {
    id: "route-local-status-patterns",
    name: "Route-local status and warning treatments",
    kind: "pattern",
    category: "Feedback",
    designType: "Status, warning, and attention UI",
    description:
      "Status chips, warnings, and semantic callouts are being styled outside the registered badge and feedback families.",
    previewKind: "status",
    recommendedAlternativeIds: ["workspace-badges", "workspace-feedback"],
    similarityLabel: "93% functional match to Status and feedback",
    differences: [
      "Custom semantic colors vs canonical badge and alert variants",
      "Module-local warning emphasis and icon sizing",
      "Mixed copy density across route states",
    ],
    responsiveBehaviour:
      "Approved feedback patterns already preserve readable wrapping and action spacing across the supported viewports and zoom levels.",
    accessibility:
      "The queue flags warnings or status patterns that rely too heavily on color or custom icon-only emphasis.",
    status: "pending_review",
    keywordPattern: /(status|badge|warning|alert|danger|info|notice|pill)/i,
  },
  {
    id: "route-local-timelines",
    name: "Route-local timeline and workflow rows",
    kind: "pattern",
    category: "Workflow",
    designType: "Timeline and process indicator",
    description:
      "Timeline, activity, and workflow-stage rows are being composed in multiple local variants that are not catalogued yet.",
    previewKind: "timeline",
    recommendedAlternativeIds: ["workspace-panel", "workspace-badges"],
    similarityLabel: "74% functional match to current workflow inventory",
    differences: [
      "Different stage-marker sizing and connectors",
      "Custom process labels and status stacks",
      "Unregistered workflow card density",
    ],
    responsiveBehaviour:
      "These patterns are reviewed for marker alignment, copy wrap, and action placement as widths contract.",
    accessibility:
      "The queue focuses on timeline semantics that still need clearer keyboard and label behavior.",
    status: "pending_review",
    keywordPattern: /(timeline|activity|workflow|stage|step|progress|milestone)/i,
  },
  {
    id: "route-local-module-compositions",
    name: "Route-local module compositions",
    kind: "pattern",
    category: "Pattern",
    designType: "Module-specific composition",
    description:
      "Several modules still expose reusable page-level compositions that are not yet represented in the Design System inventory.",
    previewKind: "module",
    recommendedAlternativeIds: ["cha-section", "accounting-panel", "crm-panel", "communication-panel", "admin-panel"],
    similarityLabel: "81% match to existing module composition catalogue",
    differences: [
      "Composable business shells without a registered live specimen",
      "Module-owned summaries and section wrappers not surfaced in the Design System",
      "Partial overlap with existing dashboard and CHA composition references",
    ],
    responsiveBehaviour:
      "These items are reviewed as business-specific compositions so the queue can distinguish reusable module shells from truly one-off page layouts.",
    accessibility:
      "Module compositions are queued only when they appear reusable and still need a documented, reviewable design-system representation.",
    status: "pending_review",
    keywordPattern: /(workspace|overview|dashboard|summary|hero|module)/i,
  },
];

const duplicateSuffixes = [
  "Button",
  "Card",
  "Panel",
  "Toolbar",
  "Table",
  "Dialog",
  "Badge",
  "Status",
  "Timeline",
  "ActionBar",
  "Section",
  "Menu",
  "Tabs",
  "Field",
  "Upload",
];

function walk(relativeDirectory: string): string[] {
  const absoluteDirectory = path.join(repositoryRoot, relativeDirectory);
  if (!existsSync(absoluteDirectory)) return [];
  const files: string[] = [];
  for (const entry of readdirSync(absoluteDirectory, { withFileTypes: true })) {
    if (ignoredDirectories.has(entry.name)) continue;
    const relative = path.posix.join(relativeDirectory.replaceAll("\\", "/"), entry.name);
    if (entry.isDirectory()) files.push(...walk(relative));
    else if (entry.isFile() && /\.(?:tsx|ts|css)$/.test(entry.name)) files.push(relative);
  }
  return files.sort();
}

function read(relativeFile: string) {
  return readFileSync(path.join(repositoryRoot, relativeFile), "utf8").replaceAll("\r\n", "\n");
}

function sourceModule(relativeFile: string) {
  const appMatch = relativeFile.match(/^src\/app\/(?:\([^/]+\)\/)?([^/]+)/);
  const moduleMatch = relativeFile.match(/^src\/modules\/([^/]+)/);
  const segment = moduleMatch?.[1] ?? appMatch?.[1] ?? "shared";
  return segment.replaceAll("-", " ");
}

function routeFromSource(relativeFile: string) {
  if (!relativeFile.startsWith("src/app/")) return null;
  const relative = relativeFile.replace(/^src\/app\//, "").replace(/\/page\.tsx$/, "");
  const segments = relative
    .split("/")
    .filter(Boolean)
    .filter((segment) => !(segment.startsWith("(") && segment.endsWith(")")))
    .filter((segment) => !segment.startsWith("@"));
  return segments.length === 0 ? "/" : `/${segments.join("/")}`;
}

function exportedVisualComponents(relativeFile: string) {
  if (!relativeFile.endsWith(".tsx") || /(?:^|\/)(?:index|.*\.test)\.tsx$/.test(relativeFile)) {
    return [];
  }
  const source = read(relativeFile);
  const matches = source.matchAll(
    /export\s+(?:function|const|class)\s+([A-Z][A-Za-z0-9]+)/g,
  );
  return [...new Set(Array.from(matches, (match) => match[1]))];
}

function unique<T>(values: T[]) {
  return [...new Set(values)];
}

async function readReviewStore(): Promise<GovernanceReviewRecord[]> {
  try {
    const raw = await fs.readFile(reviewStorePath, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeReviewStore(records: GovernanceReviewRecord[]) {
  await fs.mkdir(path.dirname(reviewStorePath), { recursive: true });
  await fs.writeFile(reviewStorePath, `${JSON.stringify(records, null, 2)}\n`, "utf8");
}

function patternDefinitionsForFile(relativeFile: string, source: string) {
  const tagCounts = new Map<string, number>();
  const tagPattern = /<(button|input|textarea|select|table|dialog|h1|h2|h3|article)\b/g;
  for (const match of source.matchAll(tagPattern)) {
    tagCounts.set(match[1], (tagCounts.get(match[1]) ?? 0) + 1);
  }

  return patternDefinitions.filter((definition) => {
    const tagHit =
      definition.tagTriggers?.some((trigger) => (tagCounts.get(trigger) ?? 0) > 0) ?? false;
    const keywordHit = definition.keywordPattern?.test(relativeFile) ?? false;
    return tagHit || keywordHit;
  });
}

function collectPatternFindings() {
  const records = new Map<string, { definition: PatternDefinition; occurrences: Occurrence[] }>();
  const files = sourceRoots.flatMap((directory) => walk(directory)).filter((file) => file.endsWith(".tsx"));

  for (const file of files) {
    if (/\/(?:loading|error|not-found)\.tsx$/.test(file)) continue;
    if (file.includes("/admin/design-system/")) continue;
    const source = read(file);
    const definitions = patternDefinitionsForFile(file, source);
    const exports = exportedVisualComponents(file);
    const occurrence: Occurrence = {
      module: sourceModule(file),
      route: routeFromSource(file),
      file,
      sourceComponent: exports[0] ?? null,
    };

    for (const definition of definitions) {
      const current = records.get(definition.id) ?? { definition, occurrences: [] };
      current.occurrences.push(occurrence);
      records.set(definition.id, current);
    }
  }

  return [...records.values()].map(({ definition, occurrences }) => ({
    id: definition.id,
    name: definition.name,
    kind: definition.kind,
    category: definition.category,
    designType: definition.designType,
    description: definition.description,
    previewKind: definition.previewKind,
    modules: unique(occurrences.map((item) => item.module)).sort(),
    routes: unique(occurrences.flatMap((item) => (item.route ? [item.route] : []))).sort(),
    files: unique(occurrences.map((item) => item.file)).sort(),
    sourceComponents: unique(
      occurrences.flatMap((item) => (item.sourceComponent ? [item.sourceComponent] : [])),
    ).sort(),
    occurrences: occurrences.length,
    similarityLabel: definition.similarityLabel,
    recommendedAlternativeIds: definition.recommendedAlternativeIds,
    differences: definition.differences,
    responsiveBehaviour: definition.responsiveBehaviour,
    accessibility: definition.accessibility,
    status: definition.status,
    approvedCategory: null,
    replacementTargetId: null,
    replacementTargetLabel: null,
    replacementAutomation: "developer_review_required" as const,
    history: [],
  }));
}

function collectPotentialDuplicates(): GovernanceFinding[] {
  const componentFiles = walk("src/modules")
    .filter((file) => file.endsWith(".tsx"))
    .filter((file) => !/\/(?:index|.*\.test)\.tsx$/.test(file));
  const groups = new Map<
    string,
    { components: string[]; files: string[]; modules: string[]; routes: string[] }
  >();

  for (const file of componentFiles) {
    const exports = exportedVisualComponents(file);
    for (const component of exports) {
      const suffix = duplicateSuffixes.find((value) => component.endsWith(value));
      if (!suffix) continue;
      const group = groups.get(suffix) ?? {
        components: [],
        files: [],
        modules: [],
        routes: [],
      };
      group.components.push(component);
      group.files.push(file);
      group.modules.push(sourceModule(file));
      const route = routeFromSource(file);
      if (route) group.routes.push(route);
      groups.set(suffix, group);
    }
  }

  return [...groups.entries()]
    .filter(([, value]) => unique(value.components).length >= 3)
    .map(([suffix, value]) => ({
      id: `potential-duplicate-${suffix.toLowerCase()}`,
      name: `${suffix} family duplicates`,
      kind: "duplicate",
      category: "Pattern",
      designType: `${suffix} duplicate cluster`,
      description: `Multiple ${suffix} implementations are active across modules and should be reviewed before more variants accumulate.`,
      previewKind: suffix === "Table" ? "tables" : suffix === "Dialog" ? "dialogs" : "cards",
      modules: unique(value.modules).sort(),
      routes: unique(value.routes).sort(),
      files: unique(value.files).sort(),
      sourceComponents: unique(value.components).sort(),
      occurrences: value.components.length,
      similarityLabel: `Potential duplicate group spanning ${unique(value.components).length} exports`,
      recommendedAlternativeIds:
        suffix === "Button"
          ? ["actions"]
          : suffix === "Table"
            ? ["operational-data-table"]
            : suffix === "Dialog"
              ? ["workspace-feedback"]
              : ["workspace-panel"],
      differences: [
        `Multiple ${suffix} exports are active without one catalogue-backed standard`,
        "Naming and module boundaries suggest overlapping presentation responsibilities",
        "Review is required before any merge or replacement is attempted",
      ],
      responsiveBehaviour:
        "Duplicate families often diverge in wrap, spacing, and hover behavior. The queue keeps them grouped for deliberate review instead of blind consolidation.",
      accessibility:
        "Duplicate review focuses on visible contract differences and does not automatically assume the alternatives are semantically equivalent.",
      status: "potential_duplicate",
      approvedCategory: null,
      replacementTargetId: null,
      replacementTargetLabel: null,
      replacementAutomation: "not_applicable",
      history: [],
    }));
}

function collectTokenDeviationFindings(): GovernanceFinding[] {
  const cssFiles = walk("src/styles").filter((file) => file.endsWith(".css"));
  const groups = new Map<
    string,
    { files: string[]; modules: string[]; values: string[]; routes: string[]; count: number }
  >();
  const declarationPattern =
    /\b(font-size|font-family|border-radius|box-shadow|color|background(?:-color)?|margin|padding|gap)\s*:\s*([^;{}]+);/g;

  for (const file of cssFiles) {
    const source = read(file);
    const moduleName = sourceModule(file);
    for (const match of source.matchAll(declarationPattern)) {
      const property = match[1];
      const value = match[2].trim();
      const isColor = /#(?:[\da-f]{3,8})\b|\brgba?\(|\bhsla?\(/i.test(value);
      const isSized = /\b\d*\.?\d+(?:px|rem|em)\b/i.test(value);
      const isNonToken = !/var\(--mn/.test(value);
      if (!isNonToken || (!isColor && !isSized && !/box-shadow|font-family/i.test(property))) {
        continue;
      }

      const bucket =
        property === "border-radius"
          ? "radius"
          : property === "box-shadow"
            ? "shadow"
            : /font/i.test(property)
              ? "type"
              : isColor
                ? "color"
                : "spacing";
      const current = groups.get(bucket) ?? {
        files: [],
        modules: [],
        values: [],
        routes: [],
        count: 0,
      };
      current.files.push(file);
      current.modules.push(moduleName);
      current.values.push(value);
      current.count += 1;
      groups.set(bucket, current);
    }
  }

  const labels: Record<string, { name: string; differences: string[] }> = {
    color: {
      name: "Hardcoded semantic colors",
      differences: [
        "Raw color declarations bypass Light, Night, and Violet token semantics",
        "Equivalent intent often already exists in shared success, warning, accent, or border tokens",
        "Manual review is needed to map each value to the right semantic family",
      ],
    },
    spacing: {
      name: "Hardcoded spacing values",
      differences: [
        "Spacing declarations bypass the 4px rhythm and workspace stack tokens",
        "Several layouts keep fixed gaps or padding values outside shared panel rhythm",
        "Review should map them to semantic spacing rather than preserve arbitrary pixel values",
      ],
    },
    radius: {
      name: "Custom corner-radius values",
      differences: [
        "Routes are introducing non-semantic radii instead of control, panel, or feature tokens",
        "Radius drift makes cards and controls feel unrelated even when behavior is similar",
        "A shared token should replace these values where the design intent is reusable",
      ],
    },
    shadow: {
      name: "Custom shadow treatments",
      differences: [
        "Shadow declarations are diverging from the shared Monolith surface depth system",
        "Some static cards still use interactive-looking elevation",
        "Review should map these to semantic surface or interactive depth tokens",
      ],
    },
    type: {
      name: "Custom typography values",
      differences: [
        "Font size and family overrides are bypassing the semantic Monolith typography scale",
        "Route-local type choices weaken heading and helper-text consistency",
        "Review should align them with existing display, heading, body, control, or helper tokens",
      ],
    },
  };

  return [...groups.entries()].map(([bucket, value]) => ({
    id: `token-deviation-${bucket}`,
    name: labels[bucket]?.name ?? "Design token deviation",
    kind: "token_deviation",
    category: "Design Token Deviation",
    designType: "Token deviation",
    description: `Recurring ${bucket} declarations are bypassing the shared token system and should be reviewed with semantic replacements.`,
    previewKind: "token",
    modules: unique(value.modules).sort(),
    routes: unique(value.routes).sort(),
    files: unique(value.files).sort(),
    sourceComponents: [],
    occurrences: value.count,
    similarityLabel: `${unique(value.values).slice(0, 3).join(", ")}${unique(value.values).length > 3 ? "..." : ""}`,
    recommendedAlternativeIds: ["workspace-feedback"],
    differences: labels[bucket]?.differences ?? ["Token review required."],
    responsiveBehaviour:
      "Token deviations often become most visible under theme changes and high zoom, so they are tracked separately from reusable component patterns.",
    accessibility:
      "Color, typography, and spacing deviations are reviewed explicitly because they can degrade contrast, readability, or focus clarity without creating a whole new component.",
    status: "needs_manual_review",
    approvedCategory: null,
    replacementTargetId: null,
    replacementTargetLabel: null,
    replacementAutomation: "not_applicable",
    history: [],
  }));
}

function applyReviewRecords(
  findings: GovernanceFinding[],
  reviews: GovernanceReviewRecord[],
) {
  const reviewMap = new Map(reviews.map((review) => [review.findingId, review]));
  return findings.map((finding) => {
    const review = reviewMap.get(finding.id);
    if (!review) return finding;
    return {
      ...finding,
      status: review.status,
      approvedCategory: review.approvedCategory,
      replacementTargetId: review.replacementTargetId,
      replacementTargetLabel: review.replacementTargetLabel,
      history: review.history,
    };
  });
}

export async function getDesignSystemGovernanceSnapshot() {
  const reviews = await readReviewStore();
  const findings = applyReviewRecords(
    [...collectPatternFindings(), ...collectPotentialDuplicates(), ...collectTokenDeviationFindings()].sort(
      (left, right) => right.occurrences - left.occurrences || left.name.localeCompare(right.name),
    ),
    reviews,
  );

  const byStatus = findings.reduce<Record<string, number>>((accumulator, finding) => {
    accumulator[finding.status] = (accumulator[finding.status] ?? 0) + 1;
    return accumulator;
  }, {});

  return {
    generatedAt: new Date().toISOString(),
    categoryChoices,
    findings,
    summary: {
      totalFindings: findings.length,
      pendingReview: byStatus.pending_review ?? 0,
      approved: byStatus.approved ?? 0,
      replacementPending: byStatus.replacement_pending ?? 0,
      replaced: byStatus.replaced ?? 0,
      potentialDuplicates: byStatus.potential_duplicate ?? 0,
      manualReview: byStatus.needs_manual_review ?? 0,
      coveragePercent:
        findings.length === 0
          ? 100
          : Math.round((((byStatus.approved ?? 0) + (byStatus.replaced ?? 0)) / findings.length) * 100),
    },
  };
}

export async function saveDesignSystemGovernanceReview(input: {
  actor: string;
  findingId: string;
  status: GovernanceStatus;
  approvedCategory?: GovernanceCategory | null;
  replacementTargetId?: string | null;
  replacementTargetLabel?: string | null;
  note: string;
}) {
  const records = await readReviewStore();
  const timestamp = new Date().toISOString();
  const historyEntry: GovernanceHistoryEntry = {
    actor: input.actor,
    at: timestamp,
    note: input.note,
    status: input.status,
  };
  const nextRecord: GovernanceReviewRecord = {
    findingId: input.findingId,
    status: input.status,
    approvedCategory: input.approvedCategory ?? null,
    replacementTargetId: input.replacementTargetId ?? null,
    replacementTargetLabel: input.replacementTargetLabel ?? null,
    reviewedAt: timestamp,
    reviewedBy: input.actor,
    history: [],
  };

  const existingIndex = records.findIndex((record) => record.findingId === input.findingId);
  if (existingIndex >= 0) {
    const existing = records[existingIndex];
    records[existingIndex] = {
      ...existing,
      ...nextRecord,
      history: [...existing.history, historyEntry],
    };
  } else {
    records.push({ ...nextRecord, history: [historyEntry] });
  }

  await writeReviewStore(records.sort((left, right) => left.findingId.localeCompare(right.findingId)));
}
