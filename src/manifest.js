// Self-contained frontmatter manifest (v2 Phase B, RFC Option B).
//
// A managed note records, inside its OWN frontmatter, which frontmatter keys are
// kept in sync with Zotero and HOW — as a reserved `zon:` map of
// `key -> single-line Nunjucks expression`. On Refresh the plugin re-renders
// each managed key's expression over the item's data and replaces that key's
// value, leaving unmanaged keys, the `zon:` map itself, and the note body
// untouched. Because the expression lives in the note, editing the template
// later never retroactively changes existing notes (RFC Goal 6 — no surprises).
//
//   ---
//   Title: "Old title"
//   Year: "1999"
//   zon:
//     Title: "\"{{title}}\""
//     Year: "\"{{date | format('YYYY')}}\""
//   ---
//
// Expressions are SINGLE-LINE Nunjucks. Whatever an expression renders becomes
// the key's value — a scalar (`"1999"`) or a YAML flow list (`["[[A]]","[[B]]"]`).
// applyManifest is value-shape-agnostic, so a multi-line block list in an
// existing note collapses to one line only if its key is actually in the
// manifest; keys left out of the manifest are never touched. This is why
// buildManifestFromScaffold only auto-manages single-line (scalar) value
// templates by default — it never silently reformats a user's block lists.
//
// All functions are pure (string in, string out) so they unit-test in Node.

import { makeEnv } from "./render.js";

export const MANIFEST_KEY = "zon";

const FM_RE = /^---\n([\s\S]*?)\n---\n?/;
const TOP_KEY_RE = /^([A-Za-z0-9_-]+):(.*)$/;
const CHILD_RE = /^(\s+)([A-Za-z0-9_-]+):\s?(.*)$/;

// ── note <-> frontmatter ────────────────────────────────────────────────────

function splitNote(md) {
  const s = String(md);
  const m = s.match(FM_RE);
  if (!m) return { frontmatter: null, body: s };
  return { frontmatter: m[1], body: s.slice(m[0].length) };
}

function assemble(frontmatter, body) {
  return `---\n${frontmatter}\n---\n${body}`;
}

// Parse frontmatter text into ordered entries. A top-level entry owns its
// `Key: ...` line plus following indented / non-key continuation lines.
function parseEntries(fm) {
  const lines = String(fm || "").split("\n");
  const entries = [];
  let cur = null;
  for (const line of lines) {
    const m = line.match(TOP_KEY_RE);
    if (m && !/^\s/.test(line)) {
      if (cur) entries.push(cur);
      cur = { key: m[1], lines: [line] };
    } else if (cur) {
      cur.lines.push(line);
    } else {
      entries.push({ key: null, lines: [line] }); // leading non-key line (rare)
    }
  }
  if (cur) entries.push(cur);
  return entries;
}

// ── YAML-ish scalar quoting (we own both ends; Obsidian also parses it) ──────

// Double-quote an expression so an inner `"` (e.g. `"{{title}}"`) survives a
// round-trip through YAML.
function quoteExpr(expr) {
  return `"${String(expr).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function unquoteExpr(raw) {
  const s = String(raw).trim();
  if (s.length >= 2 && s[0] === '"' && s[s.length - 1] === '"') {
    return s.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, "\\");
  }
  return s;
}

// ── public API ──────────────────────────────────────────────────────────────

// Parse a note's `zon:` manifest -> { entries: [{key, expr}], present }.
export function parseManifest(md) {
  const { frontmatter } = splitNote(md);
  if (frontmatter == null) return { entries: [], present: false };
  const zon = parseEntries(frontmatter).find((e) => e.key === MANIFEST_KEY);
  if (!zon) return { entries: [], present: false };
  const entries = [];
  for (const line of zon.lines.slice(1)) {
    const m = line.match(CHILD_RE);
    if (m) entries.push({ key: m[2], expr: unquoteExpr(m[3]) });
  }
  return { entries, present: true };
}

export function hasManifest(md) {
  return parseManifest(md).present;
}

// Refresh every managed frontmatter key from its stored expression. Unmanaged
// keys, the `zon:` map, and the body are left untouched. A bad/throwing
// expression leaves its key as-is. Idempotent.
export function applyManifest(md, itemData = {}, opts = {}) {
  const { entries: man, present } = parseManifest(md);
  if (!present || man.length === 0) return String(md);
  const env = opts.env || makeEnv();
  const { frontmatter, body } = splitNote(md);
  const manMap = new Map(man.map((e) => [e.key, e.expr]));

  const out = parseEntries(frontmatter).map((e) => {
    if (!e.key || e.key === MANIFEST_KEY || !manMap.has(e.key)) return e;
    let val;
    try {
      val = env.renderString(manMap.get(e.key), itemData).replace(/\s+$/, "");
    } catch (err) {
      return e; // leave the key untouched on a bad expression
    }
    return { key: e.key, lines: [`${e.key}: ${val}`] };
  });

  return assemble(out.map((e) => e.lines.join("\n")).join("\n"), body);
}

// Add or replace a managed key's expression in the `zon:` map, creating the map
// if absent. Returns the updated note. (For the insert / "manage this field" UX.)
export function setManifestEntry(md, key, expr) {
  const { frontmatter, body } = splitNote(md);
  if (frontmatter == null) {
    // No frontmatter at all — start one carrying just the manifest.
    return assemble(`${MANIFEST_KEY}:\n  ${key}: ${quoteExpr(expr)}`, String(md));
  }
  const entries = parseEntries(frontmatter);
  let zon = entries.find((e) => e.key === MANIFEST_KEY);
  if (!zon) {
    zon = { key: MANIFEST_KEY, lines: [`${MANIFEST_KEY}:`] };
    entries.push(zon);
  }
  const childIdx = zon.lines.findIndex((l) => {
    const m = l.match(CHILD_RE);
    return m && m[2] === key;
  });
  const childLine = `  ${key}: ${quoteExpr(expr)}`;
  if (childIdx >= 0) zon.lines[childIdx] = childLine;
  else zon.lines.push(childLine);
  return assemble(entries.map((e) => e.lines.join("\n")).join("\n"), body);
}

// Remove a key from the manifest (so it stops syncing). Drops the whole `zon:`
// map if it becomes empty. The key's current value in the frontmatter is left
// as-is (now an ordinary, unmanaged field). Returns the updated note.
export function removeManifestEntry(md, key) {
  const { frontmatter, body } = splitNote(md);
  if (frontmatter == null) return String(md);
  const entries = parseEntries(frontmatter);
  const zon = entries.find((e) => e.key === MANIFEST_KEY);
  if (!zon) return String(md);
  zon.lines = zon.lines.filter((l) => {
    const m = l.match(CHILD_RE);
    return !(m && m[2] === key);
  });
  const remaining = zon.lines.slice(1).some((l) => CHILD_RE.test(l));
  const kept = remaining ? entries : entries.filter((e) => e !== zon);
  return assemble(kept.map((e) => e.lines.join("\n")).join("\n"), body);
}

// Build a manifest from a note.md scaffold's frontmatter: each SINGLE-LINE value
// template (e.g. `Title: "{{title}}"`) becomes a managed expression. Multi-line
// (block-list) keys like Author/Topics are skipped so migration never reformats
// them — they can be managed explicitly later via setManifestEntry. `reserved`
// keys (user-owned, e.g. KeyIdea) are always skipped. Returns { Key: expr }.
export function buildManifestFromScaffold(scaffoldMd, opts = {}) {
  const reserved = new Set(opts.reserved || ["KeyIdea", MANIFEST_KEY]);
  const { frontmatter } = splitNote(scaffoldMd);
  if (frontmatter == null) return {};
  const map = {};
  for (const e of parseEntries(frontmatter)) {
    if (!e.key || reserved.has(e.key)) continue;
    if (e.lines.length !== 1) continue; // multi-line value -> not auto-managed
    const m = e.lines[0].match(TOP_KEY_RE);
    const value = (m ? m[2] : "").trim();
    if (!value) continue; // empty value (e.g. `KeyIdea:`) -> nothing to sync
    map[e.key] = value;
  }
  return map;
}

// Embed a manifest map into a note's frontmatter as the `zon:` block. Existing
// entries are merged (the map wins). Convenience over repeated setManifestEntry.
export function writeManifest(md, map) {
  let out = String(md);
  for (const [key, expr] of Object.entries(map || {})) {
    out = setManifestEntry(out, key, expr);
  }
  return out;
}
