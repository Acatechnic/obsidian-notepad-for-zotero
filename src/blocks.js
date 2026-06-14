// Live-block engine.
//
// A note is plain markdown with optional "managed blocks" delimited by invisible
// Obsidian comments:
//
//   %% zon kind=annotations colour=yellow type=highlight sync=on format=quote %%
//   > ...rendered annotations...
//   %% /zon %%
//
// On Sync, every block whose `sync` is not "off" has its body regenerated from
// the current Zotero annotations (filtered by colour/type, rendered with the
// named format). Everything else — free prose, frozen (sync=off) blocks,
// frontmatter — is left byte-identical. Re-running Sync is idempotent.
//
// This replaces the old single fixed "## Annotations" section: blocks can live
// anywhere, any number, each with its own filter / format / sync flag.

import { makeEnv } from "./render.js";
import { DEFAULT_FORMATS, DEFAULT_FORMAT_NAME } from "./formats.js";

const OPEN_RE = /^\s*%%\s*zon\s+([^%]*?)\s*%%\s*$/;
const CLOSE_RE = /^\s*%%\s*\/zon\s*%%\s*$/;

export function parseConfig(str) {
  const cfg = {};
  for (const tok of String(str).trim().split(/\s+/)) {
    if (!tok) continue;
    const i = tok.indexOf("=");
    if (i > 0) cfg[tok.slice(0, i)] = tok.slice(i + 1);
    else cfg[tok] = true;
  }
  return cfg;
}

export function configToString(cfg) {
  return Object.entries(cfg)
    .map(([k, v]) => (v === true ? k : `${k}=${v}`))
    .join(" ");
}

// Split a note into ordered segments: { type:'text', text } and
// { type:'block', config, openRaw, closeRaw, body }.
export function parseBlocks(md) {
  const lines = String(md).split("\n");
  const segs = [];
  let buf = [];
  const flush = () => { if (buf.length) { segs.push({ type: "text", text: buf.join("\n") }); buf = []; } };

  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(OPEN_RE);
    if (!m) { buf.push(lines[i]); continue; }
    flush();
    const openRaw = lines[i];
    const config = parseConfig(m[1]);
    const body = [];
    let closeRaw = "%% /zon %%";
    i++;
    for (; i < lines.length; i++) {
      if (CLOSE_RE.test(lines[i])) { closeRaw = lines[i]; break; }
      body.push(lines[i]);
    }
    segs.push({ type: "block", config, openRaw, closeRaw, body: body.join("\n") });
  }
  flush();
  return segs;
}

function annotationContext(a, opts) {
  const pageIndex = a.pageIndex ?? 0;
  return {
    text: a.annotatedText || "",
    comment: a.comment || "",
    page: a.pageLabel || "",
    pageLabel: a.pageLabel || "",
    pageIndex,
    key: a.key,
    colour: a.colourName || "",
    color: a.colourName || "",
    type: a.type || "",
    link: `zotero://open-pdf/library/items/${a.attachmentKey}?page=${pageIndex}`,
    citekey: opts.citekey || "",
    imageBaseName: a.imageBaseName || "",
  };
}

function matchesFilter(a, cfg) {
  const wantColour = cfg.colour || cfg.color;
  if (wantColour && wantColour !== "all" && (a.colourName || "") !== wantColour) return false;
  if (cfg.type && cfg.type !== "all" && a.type !== cfg.type) return false;
  return true;
}

// Render the body of one block from the annotation set.
export function renderBlockBody(config, annotations, opts = {}) {
  const formats = opts.formats || DEFAULT_FORMATS;
  const fmt = formats[config.format] || formats[DEFAULT_FORMAT_NAME];
  const env = opts.env || makeEnv();
  const anns = (annotations || [])
    .filter((a) => matchesFilter(a, config))
    .sort((x, y) => {
      const sx = String(x.sortIndex ?? ""), sy = String(y.sortIndex ?? "");
      if (sx !== sy) return sx < sy ? -1 : 1;
      return String(x.key).localeCompare(String(y.key));
    });
  const items = anns.map((a) => env.renderString(fmt.item, annotationContext(a, opts)).replace(/\s+$/, ""));
  return items.join(fmt.sep || "\n");
}

// Regenerate every sync!=off block from the current annotations; leave all
// other content untouched. Idempotent.
export function syncBlocks(md, annotations, opts = {}) {
  const env = opts.env || makeEnv();
  const segs = parseBlocks(md);
  const out = segs.map((s) => {
    if (s.type === "text") return s.text;
    const body = s.config.sync === "off"
      ? s.body
      : renderBlockBody(s.config, annotations, { ...opts, env });
    return `${s.openRaw}\n${body}\n${s.closeRaw}`;
  });
  return out.join("\n");
}

// Build a block string ready to insert at the cursor. `config` e.g.
// { kind:'annotations', colour:'yellow', sync:'on', format:'quote' }.
export function makeBlock(config, annotations = [], opts = {}) {
  const body = renderBlockBody(config, annotations, opts);
  return `%% zon ${configToString(config)} %%\n${body}\n%% /zon %%`;
}

// Convert a legacy mgmeyers-style annotation dump into an empty live block, so
// a subsequent Sync repopulates it from Zotero. Targets the
// `%% begin annotations %%` … `%% end annotations %%` region and the trailing
// `%% Import Date: … %%` marker the old template emits. Returns
// { markdown, changed }; `changed` is false if no legacy markers were found.
const LEGACY_RE = /%%\s*begin annotations\s*%%[\s\S]*?%%\s*end annotations\s*%%/i;
const IMPORT_DATE_RE = /[ \t]*%%\s*Import Date:[^%]*%%[ \t]*\n?/i;

export function migrateLegacyAnnotations(md, opts = {}) {
  const cfg = opts.config || "kind=annotations colour=all sync=on format=list";
  const block = `%% zon ${cfg} %%\n%% /zon %%`;
  let out = String(md);
  let changed = false;
  if (LEGACY_RE.test(out)) {
    out = out.replace(LEGACY_RE, block);
    changed = true;
  }
  if (IMPORT_DATE_RE.test(out)) {
    out = out.replace(IMPORT_DATE_RE, "");
    changed = true;
  }
  return { markdown: out, changed };
}
