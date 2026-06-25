// Template-file parsing.
//
// A template file is one insertable block template (or the whole-note scaffold).
// It is *pure Nunjucks* with one optional first line — a "directive" — that pins
// this template's defaults:
//
//   %%! colour=yellow sync=on sep=blank %%
//   > {{text}}
//   > — [p.{{page}}]({{link}})
//
// The `%%! … %%` line (note the `!`, to distinguish it from a `%% zon %%` block
// marker) is parsed and stripped; the rest is the per-annotation body. Recognised
// directive keys: colour/color, sync (on|off), type, sep (blank|newline).
//
// NOTE: bootstrap.js mirrors this logic in ZON.parseTemplateText() because it
// runs in the privileged scope before the core bundle is guaranteed loaded. Keep
// the two in sync; this copy is the Node-tested source of truth.
import { parseConfig } from "./blocks.js";
import { hasLLMBlocks } from "./llm-blocks.js";

const DIRECTIVE_RE = /^\s*%%!\s*([^%]*?)\s*%%\s*$/;

export function parseTemplateFile(text) {
  const raw = String(text).replace(/\s+$/, "");
  const lines = raw.split("\n");
  let defaults = {};
  let sepMode = null;

  if (lines.length && DIRECTIVE_RE.test(lines[0])) {
    const cfg = parseConfig(lines[0].match(DIRECTIVE_RE)[1]);
    if (cfg.sep) { sepMode = cfg.sep; delete cfg.sep; }
    if (cfg.color && !cfg.colour) { cfg.colour = cfg.color; }
    delete cfg.color;
    defaults = cfg;
    lines.shift();
  }

  const body = lines.join("\n").replace(/^\n+/, "").replace(/\s+$/, "");
  let sep;
  if (sepMode === "blank") sep = "\n\n";
  else if (sepMode === "newline") sep = "\n";
  else sep = body.includes("\n") ? "\n\n" : "\n";

  return { item: body, sep, defaults };
}

// Classify a template for the unified "Insert / Create from anything" model:
//   - "document": a whole-note template — it has YAML frontmatter and/or contains
//     a `%% zon %%` annotations block. Rendered ONCE with the item's data.
//   - "format": a per-annotation body (no frontmatter, no zon block). Rendered
//     once PER highlight; Insert wraps it in a zon block automatically.
export function templateKind(text) {
  const t = String(text || "");
  if (/^---\r?\n[\s\S]*?\r?\n---/.test(t)) return "document";
  if (/%%\s*zon\b/.test(t)) return "document";
  if (hasLLMBlocks(t)) return "document";   // NEW — templates with LLM blocks are once-per-item
  return "format";
}

// Selective-refresh rule: a frontmatter field AUTO-UPDATES from Zotero if the
// template fills it with an expression (`{{ }}` or `{% %}`); a field written
// plainly (e.g. `KeyIdea:`) is the USER's and must be preserved on refresh.
// Returns the user-owned key names found in the template's frontmatter.
export function templateUserOwnedKeys(text) {
  const m = String(text || "").match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return [];
  const lines = m[1].split("\n");
  const keys = [];
  let cur = null;
  let hasExpr = false;
  const flush = () => { if (cur && !hasExpr) keys.push(cur); };
  const isExpr = (s) => /\{\{|\{%/.test(s);
  for (const line of lines) {
    const km = line.match(/^([A-Za-z0-9_-]+):/);
    if (km && !/^\s/.test(line)) {
      flush();
      cur = km[1];
      hasExpr = isExpr(line);
    } else if (cur && isExpr(line)) {
      hasExpr = true;
    }
  }
  flush();
  return keys;
}
