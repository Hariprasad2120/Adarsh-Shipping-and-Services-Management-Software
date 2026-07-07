import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { auth } from "@/lib/auth";
import { can } from "@/lib/rbac";

/**
 * Dev tool backing the /cha-ui-showcase review page.
 *
 * POST { action: "apply", label, find, replace } — exact-string replace across
 *   the CHA module source (and the showcase itself), recorded to a history file
 *   and appended to design.md as a review decision.
 * POST { action: "undo", id } — reverse replacement for a history entry.
 * GET — history list.
 *
 * Safety: plain string matching only (no regex), whitelisted paths only,
 * minimum find length, disabled in production unless explicitly allowed.
 */

const ROOT = process.cwd();
const SCAN_DIRS = [
  path.join("src", "app", "(dashboard)", "cha"),
  path.join("src", "app", "(dashboard)", "cha-ui-showcase"),
  path.join("src", "components", "cha"),
];
const SCAN_FILES = [
  path.join("src", "app", "globals.css"),
  "design.md",
];
const HISTORY_FILE = path.join(ROOT, "docs", "cha-ui-showcase-history.json");
const DESIGN_MD = path.join(ROOT, "design.md");
const ALLOWED_EXTS = new Set([".tsx", ".ts", ".css", ".md"]);
const MIN_FIND_LENGTH = 6;

type HistoryEntry = {
  id: string;
  timestamp: string;
  label: string;
  find: string;
  replace: string;
  files: { path: string; count: number }[];
  undone: boolean;
};

async function requireAccess() {
  const session = await auth();
  if (!session?.user?.orgId) {
    return { error: NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 }) };
  }
  const allowed = await can(session.user.id, "cha.settings.manage");
  if (!allowed) {
    return { error: NextResponse.json({ ok: false, error: "Requires cha.settings.manage permission." }, { status: 403 }) };
  }
  if (process.env.NODE_ENV === "production" && process.env.CHA_SHOWCASE_EDIT !== "true") {
    return {
      error: NextResponse.json(
        { ok: false, error: "Source editing is disabled in production (set CHA_SHOWCASE_EDIT=true to allow)." },
        { status: 403 },
      ),
    };
  }
  return { userId: session.user.id };
}

async function collectFiles(): Promise<string[]> {
  const files: string[] = [];
  const walk = async (dir: string) => {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (ALLOWED_EXTS.has(path.extname(entry.name))) {
        files.push(full);
      }
    }
  };
  for (const dir of SCAN_DIRS) {
    await walk(path.join(ROOT, dir));
  }
  for (const file of SCAN_FILES) {
    const full = path.join(ROOT, file);
    try {
      await fs.access(full);
      files.push(full);
    } catch {
      /* skip missing */
    }
  }
  return files;
}

function countOccurrences(haystack: string, needle: string): number {
  let count = 0;
  let index = haystack.indexOf(needle);
  while (index !== -1) {
    count += 1;
    index = haystack.indexOf(needle, index + needle.length);
  }
  return count;
}

async function replaceAcrossFiles(find: string, replace: string) {
  const files = await collectFiles();
  const touched: { path: string; count: number }[] = [];
  for (const file of files) {
    const content = await fs.readFile(file, "utf8");
    // Never rewrite the decision log itself — its entries embed the raw
    // find/replace strings and must stay intact for undo bookkeeping.
    const isDesignMd = path.resolve(file) === path.resolve(DESIGN_MD);
    const splitIndex = isDesignMd ? content.indexOf(DESIGN_SECTION_HEADING) : -1;
    const editable = splitIndex === -1 ? content : content.slice(0, splitIndex);
    const frozen = splitIndex === -1 ? "" : content.slice(splitIndex);
    const count = countOccurrences(editable, find);
    if (count === 0) continue;
    await fs.writeFile(file, editable.split(find).join(replace) + frozen, "utf8");
    touched.push({ path: path.relative(ROOT, file).replace(/\\/g, "/"), count });
  }
  return touched;
}

async function readHistory(): Promise<HistoryEntry[]> {
  try {
    const raw = await fs.readFile(HISTORY_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeHistory(entries: HistoryEntry[]) {
  await fs.mkdir(path.dirname(HISTORY_FILE), { recursive: true });
  await fs.writeFile(HISTORY_FILE, JSON.stringify(entries, null, 2), "utf8");
}

const DESIGN_SECTION_HEADING = "## 16. CHA UI Review Decisions (live)";

async function appendDesignDecision(entry: HistoryEntry) {
  let content: string;
  try {
    content = await fs.readFile(DESIGN_MD, "utf8");
  } catch {
    return;
  }
  const line = `- **${entry.timestamp.slice(0, 10)} · ${entry.label}** — replaced \`${entry.find}\` with \`${entry.replace}\` (${entry.files.length} file(s), id \`${entry.id}\`)`;
  if (content.includes(DESIGN_SECTION_HEADING)) {
    content = content.replace(DESIGN_SECTION_HEADING, `${DESIGN_SECTION_HEADING}\n${line}`);
  } else {
    content = `${content.trimEnd()}\n\n---\n\n${DESIGN_SECTION_HEADING}\n\n> Style decisions applied from /cha-ui-showcase. Each entry is undoable via the showcase history panel.\n${line}\n`;
  }
  await fs.writeFile(DESIGN_MD, content, "utf8");
}

async function markDesignDecisionUndone(entry: HistoryEntry) {
  let content: string;
  try {
    content = await fs.readFile(DESIGN_MD, "utf8");
  } catch {
    return;
  }
  if (!content.includes(entry.id)) return;
  const lines = content.split("\n");
  const updated = lines.map((line) =>
    line.includes(entry.id) && !line.includes("(UNDONE)") ? `${line} **(UNDONE)**` : line,
  );
  await fs.writeFile(DESIGN_MD, updated.join("\n"), "utf8");
}

export async function GET() {
  const access = await requireAccess();
  if ("error" in access) return access.error;
  const history = await readHistory();
  return NextResponse.json({ ok: true, history: history.slice().reverse() });
}

export async function POST(request: Request) {
  const access = await requireAccess();
  if ("error" in access) return access.error;

  let body: { action?: string; label?: string; find?: string; replace?: string; id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  if (body.action === "apply") {
    const find = body.find ?? "";
    const replace = body.replace ?? "";
    const label = (body.label || "Unnamed change").slice(0, 120);
    if (find.trim().length < MIN_FIND_LENGTH) {
      return NextResponse.json(
        { ok: false, error: `Find string must be at least ${MIN_FIND_LENGTH} characters (exact match, to avoid mass replacements).` },
        { status: 400 },
      );
    }
    if (find === replace) {
      return NextResponse.json({ ok: false, error: "Find and replace are identical." }, { status: 400 });
    }
    if (replace.includes(find)) {
      return NextResponse.json(
        { ok: false, error: "Replace contains the find string — undo would corrupt files. Adjust the strings." },
        { status: 400 },
      );
    }

    const touched = await replaceAcrossFiles(find, replace);
    if (touched.length === 0) {
      return NextResponse.json({ ok: false, error: "Find string not found in any CHA source file. Copy the exact code from the source." }, { status: 404 });
    }

    const entry: HistoryEntry = {
      id: Math.random().toString(36).slice(2, 10),
      timestamp: new Date().toISOString(),
      label,
      find,
      replace,
      files: touched,
      undone: false,
    };
    const history = await readHistory();
    history.push(entry);
    await writeHistory(history);
    await appendDesignDecision(entry);

    return NextResponse.json({ ok: true, entry });
  }

  if (body.action === "undo") {
    const history = await readHistory();
    const entry = history.find((item) => item.id === body.id);
    if (!entry) {
      return NextResponse.json({ ok: false, error: "History entry not found." }, { status: 404 });
    }
    if (entry.undone) {
      return NextResponse.json({ ok: false, error: "Entry already undone." }, { status: 400 });
    }
    const touched = await replaceAcrossFiles(entry.replace, entry.find);
    entry.undone = true;
    await writeHistory(history);
    await markDesignDecisionUndone(entry);
    return NextResponse.json({ ok: true, entry, reverted: touched });
  }

  return NextResponse.json({ ok: false, error: "Unknown action." }, { status: 400 });
}
