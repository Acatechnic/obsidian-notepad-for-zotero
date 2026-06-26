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
import { DEFAULT_FORMATS, DEFAULT_FORMAT_NAME, composeFormat } from "./formats.js";
import { pdfLink } from "./annotations.js";

// Resolve the format a block renders with: a composed `style`+`parts` format (the
// configurator's advanced mode) takes precedence over a named `format=…`.
function resolveFormat(config, formats) {
  if (config.style) return composeFormat(config.style, config.parts);
  return formats[config.format] || formats[DEFAULT_FORMAT_NAME];
}

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
    // The highlight's OWN tags (role markers like method/finding/quote), as a
    // list to loop/filter, plus a comma-joined string for the simple case.
    tags: a.tags || [],
    tagList: (a.tags || []).join(", "),
    attachmentFolder: opts.attachmentFolder || "References/Attachments",
  };
}

function matchesFilter(a, cfg) {
  const wantType = cfg.type;
  // Ink (freehand) annotations aren't supported yet — Zotero caches only the
  // strokes (no text, no page content), so they'd render as empty `""` items.
  // Exclude them unless a block explicitly asks for `type=ink`.
  if (a.type === "ink" && (!wantType || wantType === "all")) return false;
  // Colour filter: a single colour or a comma list (OR), e.g. `colour=yellow,blue`.
  const wantColour = cfg.colour || cfg.color;
  if (wantColour && wantColour !== "all") {
    const want = String(wantColour).split(",").map((s) => s.trim()).filter(Boolean);
    if (want.length && want.indexOf(a.colourName || "") === -1) return false;
  }
  if (wantType && wantType !== "all" && a.type !== wantType) return false;
  // Tag filter (OR-semantics): keep highlights carrying ANY of the named tags.
  // `tag=method` or `tag=method,finding` (comma-separated). `tags=` is accepted
  // as an alias. The annotation's own tags come from a.tags (see annotations.js).
  const wantTags = cfg.tag || cfg.tags;
  if (wantTags && wantTags !== "all") {
    const want = String(wantTags).split(",").map((s) => s.trim()).filter(Boolean);
    const have = a.tags || [];
    if (want.length && !want.some((t) => have.indexOf(t) !== -1)) return false;
  }
  // `comment=yes` keeps only highlights that carry a non-empty comment.
  if (cfg.comment === "yes" && !String(a.comment == null ? "" : a.comment).trim()) return false;
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
  const fmt = resolveFormat(config, formats);
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
    const data = { citekey: opts.citekey || "", ...(opts.itemData || {}) };
    if (opts.citekey) data.citekey = opts.citekey;
    // `var=<item field>` renders that single item variable (a custom field block
    // for any field — `%% zon kind=field var=publisher %%`). Guarded to a plain
    // identifier so the marker stays a safe, space-free token.
    if (config.var && /^[A-Za-z0-9_]+$/.test(config.var)) {
      return env.renderString("{{ " + config.var + " }}", data).replace(/\s+$/, "");
    }
    const tpl = formats[config.format] && formats[config.format].item;
    if (tpl == null) return ""; // unknown template -> empty (don't invent content)
    return env.renderString(tpl, data).replace(/\s+$/, "");
  }

  const fmt = resolveFormat(config, formats);
  const items = renderAnnotationItems(config, annotations, { ...opts, env, formats });
  return items.map((i) => i.text).join(fmt.sep || "\n");
}

// Split an existing block body by its `%% ann:KEY %%` anchors. Returns the keyed
// item chunks (`blocks`) AND any trailing user text after the LAST anchor
// (`tail`). NOTE: the current sync=on merge (mergeAnnotationItems) is a full
// re-render from Zotero and only re-uses `tail` — `blocks` is computed but not
// merged back, so prose typed BETWEEN annotations is replaced on Update (a
// sync=on block is owned by Zotero; per-annotation notes belong in the Zotero
// comment, and free prose goes after the last anchor or outside the block).
// `hadAnchors` is false for a body with no anchors at all.
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

// Regenerate the block body from current Zotero annotations. A `sync=on` block
// MIRRORS Zotero: every annotation is re-rendered from current data, so edits
// (a highlight extended/contracted, a changed comment) propagate on Refresh; new
// ones appear in Zotero order, removed ones drop. Free prose AFTER the last
// annotation anchor is preserved (a place for closing notes). To hand-curate a
// block and freeze it against resync, set `sync=off`. Idempotent.
function mergeAnnotationItems(existingBody, freshItems, sep) {
  const { tail } = parseAnchoredItems(existingBody);
  let out = freshItems.map((f) => f.text).join(sep);
  if (tail) out += (out ? sep : "") + tail;
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
