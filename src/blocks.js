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
import { pdfLink } from "./annotations.js";

const OPEN_RE = /^\s*%%\s*zon\s+([^%]*?)\s*%%\s*$/;
const CLOSE_RE = /^\s*%%\s*\/zon\s*%%\s*$/;
const ANN_ANCHOR = /%%\s*ann:([A-Za-z0-9]+)\s*%%/;

function annAnchor(key) { return `%% ann:${key} %%`; }

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
    link: pdfLink(a),
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

// Render the matching annotations of a block into anchored items, in Zotero
// sort order. Each item is { key, text }, where text is the format's rendered
// markdown for that annotation followed by an invisible `%% ann:KEY %%` anchor.
// The anchor is what lets a later sync preserve manual in-block edits (A2): the
// merge keys on it, so user text attached to an annotation survives regeneration.
function renderAnnotationItems(config, annotations, opts = {}) {
  const formats = opts.formats || DEFAULT_FORMATS;
  const env = opts.env || makeEnv();
  const fmt = formats[config.format] || formats[DEFAULT_FORMAT_NAME];
  const anns = (annotations || [])
    .filter((a) => matchesFilter(a, config))
    .sort((x, y) => {
      const sx = String(x.sortIndex ?? ""), sy = String(y.sortIndex ?? "");
      if (sx !== sy) return sx < sy ? -1 : 1;
      return String(x.key).localeCompare(String(y.key));
    });
  return anns.map((a) => {
    const rendered = env.renderString(fmt.item, annotationContext(a, opts)).replace(/\s+$/, "");
    return { key: a.key, text: `${rendered} ${annAnchor(a.key)}` };
  });
}

// Render the body of one block. Dispatches on `kind`:
//  - "annotations" (default): one rendered (anchored) item per matching annotation.
//  - "field" | "section" | "custom": the named template rendered ONCE over the
//    item's data (opts.itemData from buildItemData) — e.g. a "year" or "abstract"
//    element that refreshes from Zotero like an annotation block does.
export function renderBlockBody(config, annotations, opts = {}) {
  const kind = config.kind || "annotations";
  const formats = opts.formats || DEFAULT_FORMATS;
  const env = opts.env || makeEnv();

  if (kind !== "annotations") {
    const tpl = formats[config.format] && formats[config.format].item;
    if (tpl == null) return ""; // unknown template -> empty (don't invent content)
    const data = { citekey: opts.citekey || "", ...(opts.itemData || {}) };
    if (opts.citekey) data.citekey = opts.citekey;
    return env.renderString(tpl, data).replace(/\s+$/, "");
  }

  const fmt = formats[config.format] || formats[DEFAULT_FORMAT_NAME];
  const items = renderAnnotationItems(config, annotations, { ...opts, env, formats });
  return items.map((i) => i.text).join(fmt.sep || "\n");
}

// Split an existing block body into keyed annotation items by their
// `%% ann:KEY %%` anchors, plus any trailing user text after the last anchor.
// A block runs up to and INCLUDING its anchor line, so user text typed between
// two anchors rides along with the following annotation, and is preserved with
// it on merge. If the body has no anchors at all (a pre-A2 block, or hand-typed
// prose), `hadAnchors` is false and the caller discards it for a clean re-render.
function parseAnchoredItems(body) {
  const lines = String(body).split("\n");
  const blocks = [];
  let buf = [];
  let seen = false;
  for (const line of lines) {
    buf.push(line);
    const m = line.match(ANN_ANCHOR);
    if (m) {
      while (buf.length && buf[0].trim() === "") buf.shift();
      blocks.push({ key: m[1], text: buf.join("\n").replace(/\s+$/, "") });
      buf = [];
      seen = true;
    }
  }
  const tail = buf.join("\n").trim();
  return { blocks, tail: seen ? tail : "", hadAnchors: seen };
}

// Merge freshly-rendered anchored items into the existing block body: for every
// annotation key still present in Zotero, keep the EXISTING text (so manual
// edits inside the block survive); insert new annotations in Zotero order; drop
// annotations no longer in Zotero. Trailing user text after the last anchor is
// preserved. Idempotent: merge(render, render) === render. (A2)
function mergeAnnotationItems(existingBody, freshItems, sep) {
  const existing = parseAnchoredItems(existingBody);
  const byKey = new Map(existing.blocks.map((b) => [b.key, b]));
  const merged = freshItems.map((f) => (byKey.has(f.key) ? byKey.get(f.key).text : f.text));
  let out = merged.join(sep);
  if (existing.tail) out += sep + existing.tail;
  return out;
}

// Regenerate one block's body from current annotations. Annotation blocks merge
// (preserving in-block edits); field/section/custom blocks render fresh.
function regenerateBlock(seg, annotations, opts) {
  const kind = seg.config.kind || "annotations";
  if (kind !== "annotations") return renderBlockBody(seg.config, annotations, opts);
  const formats = opts.formats || DEFAULT_FORMATS;
  const fmt = formats[seg.config.format] || formats[DEFAULT_FORMAT_NAME];
  const fresh = renderAnnotationItems(seg.config, annotations, opts);
  return mergeAnnotationItems(seg.body, fresh, fmt.sep || "\n");
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
      : regenerateBlock(s, annotations, { ...opts, env });
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
