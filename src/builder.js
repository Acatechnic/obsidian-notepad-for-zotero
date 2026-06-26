// Template-builder core (pure, Node + Vitest).
//
// Backs the dedicated "Template Builder" window: a CodeMirror editor + a
// CONTEXT-AWARE palette (it offers only what's valid where the cursor sits) + a
// LIVE PREVIEW rendered against the selected item. No form, no generated output —
// you compose freely; the palette inserts well-formed building blocks, including
// one-click UPDATABLE field blocks (citation / abstract / title / authors) so
// metadata can live in the body and stay in sync, not just annotations.
//
// The preview reuses the SAME engine the write paths use, so what you see is what
// Insert/Save produces.

import { makeBlock, syncBlocks, parseConfig, configToString } from "./blocks.js";
import { render } from "./render.js";
import { parseTemplateFile, templateKind } from "./templates.js";
import { DEFAULT_FORMATS, FIELD_FORMATS } from "./formats.js";

// ----------------------------------------------- context-aware palette support
//
// Classify where the cursor sits so the palette shows only what's valid there:
//   - "frontmatter" — inside the leading `--- … ---` YAML block
//   - "block"       — inside a `%% zon … %% … %% /zon %%` block (with its kind:
//                     "annotations" → highlight variables; "field" → item vars)
//   - "body"        — anywhere else (prose); item variables + insertable blocks
// Pure + unit-tested; the UI calls it on every cursor move.
export function paletteContextAt(text, offset) {
  const md = String(text == null ? "" : text);
  const pos = Math.max(0, Math.min(offset == null ? 0 : offset, md.length));

  // Frontmatter: a leading --- … --- block. Cursor anywhere within it (incl. the
  // fences) counts as frontmatter.
  const fm = md.match(/^---\r?\n[\s\S]*?\r?\n---/);
  if (fm && pos <= fm[0].length) return { context: "frontmatter", blockKind: null };

  // Walk the %% zon … %% / %% /zon %% blocks; if the cursor is within one, report
  // it and the block's kind.
  const openRe = /%%\s*zon\b([^%]*)%%/g;
  let m;
  while ((m = openRe.exec(md))) {
    const openEnd = m.index + m[0].length;
    const closeRe = /%%\s*\/zon\s*%%/g;
    closeRe.lastIndex = openEnd;
    const c = closeRe.exec(md);
    const closeEnd = c ? c.index + c[0].length : md.length;
    if (pos >= m.index && pos <= closeEnd) {
      const cfg = parseConfig(m[1] || "");
      return { context: "block", blockKind: cfg.kind || "annotations" };
    }
    openRe.lastIndex = closeEnd;
  }
  return { context: "body", blockKind: null };
}

// --------------------------------------------- annotation-block configurator
//
// The side-pane configurator builds/edits an annotations block from controls.
// These catalogs drive its UI; the helpers below read the block under the cursor
// (for two-way editing) and serialise a config back to a marker.
export const BLOCK_COLOURS = ["yellow", "red", "green", "blue", "purple", "magenta", "orange", "grey"];
export const BLOCK_TYPES = [["", "All types"], ["highlight", "Highlights"], ["underline", "Underlines"], ["image", "Images"], ["note", "Notes"]];
export const BLOCK_STYLES = [["list", "List"], ["quote", "Blockquote"], ["callout", "Callout"]];
export const BLOCK_PARTS = [["page", "Page link"], ["comment", "Comment"], ["tags", "Tags as #"]];
export const NAMED_FORMATS = ["list", "quote", "callout", "compact"];

// The enclosing `%% zon … %%` block at `offset`, with its parsed config and the
// open-marker range [openStart, openEnd) to rewrite. null if not inside one.
export function blockConfigAt(text, offset) {
  const md = String(text == null ? "" : text);
  const pos = Math.max(0, Math.min(offset == null ? 0 : offset, md.length));
  const openRe = /%%\s*zon\b([^%]*)%%/g;
  let m;
  while ((m = openRe.exec(md))) {
    const openStart = m.index, openEnd = m.index + m[0].length;
    const closeRe = /%%\s*\/zon\s*%%/g;
    closeRe.lastIndex = openEnd;
    const c = closeRe.exec(md);
    const closeEnd = c ? c.index + c[0].length : md.length;
    if (pos >= openStart && pos <= closeEnd) return { config: parseConfig(m[1] || ""), openStart, openEnd };
    openRe.lastIndex = closeEnd;
  }
  return null;
}

// Canonicalise configurator state into a block config (stable key order). State
// values for colour/tag/parts are comma-joined strings (or "all"/"" for none).
function normalizeAnnotationConfig(c) {
  const o = c || {};
  const out = { kind: "annotations" };
  out.colour = o.colour && o.colour !== "all" ? o.colour : "all";
  if (o.tag) out.tag = o.tag;
  if (o.type && o.type !== "all") out.type = o.type;
  if (o.style) { out.style = o.style; if (o.parts) out.parts = o.parts; }
  else out.format = o.format || "quote";
  out.sync = o.sync === "off" ? "off" : "on";
  return out;
}

// The open marker `%% zon … %%` for a config (used to rewrite a block in place).
export function annotationMarkerOpen(config) {
  return "%% zon " + configToString(normalizeAnnotationConfig(config)) + " %%";
}

// A full, empty annotations block (marker pair) to insert at the cursor.
export function annotationBlockText(config) {
  return annotationMarkerOpen(config) + "\n%% /zon %%";
}

// Item fields that can become a custom updatable field block (`var=…`). Scalars
// only (no spaces/loops) so the marker stays a clean token; the rich presets
// (citation/abstract/title/authors) cover the formatted/looped cases.
export const FIELD_VARS = [
  ["title", "Title"], ["publicationTitle", "Journal / publication"], ["abstractNote", "Abstract"],
  ["itemType", "Item type"], ["date", "Date"], ["dateAdded", "Date added"], ["dateModified", "Date modified"],
  ["citekey", "Citekey"], ["bibliography", "Citation"], ["openPdf", "Open-PDF link"], ["desktopURI", "Zotero link"],
];

// An updatable field block for a single item variable.
export function fieldBlockVarText(varId) {
  const v = /^[A-Za-z0-9_]+$/.test(String(varId || "")) ? varId : "title";
  return "%% zon kind=field var=" + v + " sync=on %%\n%% /zon %%";
}

// The unified "Updatable field block" menu: the formatted presets (a named
// FIELD_FORMAT) plus any single item field (var=…), including All tags. One list,
// one picker — what goes in the body as a field block that re-syncs on Update.
export const UPDATABLE_FIELDS = [
  { id: "citation", label: "Citation (formatted)", format: "citation" },
  { id: "abstract", label: "Abstract (callout)", format: "abstract" },
  { id: "title", label: "Title (heading)", format: "title" },
  { id: "authors", label: "Authors (links)", format: "authors" },
  { id: "allTags", label: "All tags", var: "allTags" },
  { id: "publicationTitle", label: "Journal / publication", var: "publicationTitle" },
  { id: "itemType", label: "Item type", var: "itemType" },
  { id: "date", label: "Date", var: "date" },
  { id: "dateAdded", label: "Date added", var: "dateAdded" },
  { id: "dateModified", label: "Date modified", var: "dateModified" },
  { id: "citekey", label: "Citekey", var: "citekey" },
  { id: "openPdf", label: "Open-PDF link", var: "openPdf" },
  { id: "desktopURI", label: "Zotero link", var: "desktopURI" },
];

// Open marker / full block for an UPDATABLE_FIELDS option. `sync` defaults to
// "on" (live, re-syncs on Update); pass "off" for a frozen one-time snapshot.
export function fieldBlockMarkerOpen(opt, sync) {
  const o = opt || {};
  const spec = o.var ? "var=" + o.var : "format=" + (o.format || "citation");
  return "%% zon kind=field " + spec + " sync=" + (sync === "off" ? "off" : "on") + " %%";
}
export function fieldBlockTextFor(opt, sync) {
  return fieldBlockMarkerOpen(opt, sync) + "\n%% /zon %%";
}
// Match a field block's parsed config back to a UPDATABLE_FIELDS id (for the
// in-block configurator to reflect what's there).
export function fieldOptionId(config) {
  const c = config || {};
  if (c.var) { const m = UPDATABLE_FIELDS.find((f) => f.var === c.var); return m ? m.id : null; }
  if (c.format) { const m = UPDATABLE_FIELDS.find((f) => f.format === c.format); return m ? m.id : null; }
  return null;
}

// Route highlights by colour into one section each, via the highlights() helper —
// for a whole-note template. opts = { colours:[names], format, headings }.
export function colourRouteText(opts) {
  const o = opts || {};
  const colours = o.colours && o.colours.length ? o.colours : ["yellow"];
  const format = o.format || "quote";
  const headings = o.headings !== false;
  return colours.map((c) => {
    const head = headings ? "## " + c.charAt(0).toUpperCase() + c.slice(1) + "\n" : "";
    return head + '{{ highlights(colour="' + c + '", format="' + format + '") }}';
  }).join("\n\n") + "\n";
}

// ------------------------------------------------- frontmatter field builder
//
// The frontmatter panel ADDS a field (your key + a value source) and REMOVES a
// detected one — targeted line surgery that never rewrites YAML it doesn't model
// (a fully live two-way version is deferred). Pure helpers below.

// Value sources offered when adding a frontmatter field.
export const FRONTMATTER_VALUES = [
  { id: "title", label: "Title", expr: '"{{title}}"' },
  { id: "year", label: "Year", expr: "\"{{date | format('YYYY')}}\"" },
  { id: "journal", label: "Journal", expr: '"{{publicationTitle}}"' },
  { id: "itemType", label: "Item type", expr: '"{{itemType}}"' },
  { id: "dateAdded", label: "Date added", expr: '"{{dateAdded}}"' },
  { id: "abstract", label: "Abstract", expr: '"{{abstractNote}}"' },
  { id: "citekey", label: "Citekey", expr: '"{{citekey}}"' },
  { id: "desktopURI", label: "Zotero link", expr: '"{{desktopURI}}"' },
  { id: "openPdf", label: "Open-PDF link", expr: '"{{openPdf}}"' },
  { id: "tagsList", label: "Tags (list)", list: "{% for t in allTags.split(', ') %}\n  - \"{{t}}\"\n{% endfor %}" },
  { id: "authorsList", label: "Authors (list)", list: '{% for c in creators %}\n  - "{{c.lastName}}, {{c.firstName}}"\n{% endfor %}' },
  { id: "empty", label: "Empty (my own field)", empty: true },
  { id: "custom", label: "Custom expression…", custom: true },
];

// Build the YAML line(s) for one field from a key + a chosen value source.
export function frontmatterFieldText(key, value, customExpr) {
  const k = String(key == null ? "" : key).trim() || "Field";
  const v = value || {};
  if (v.list) return k + ":\n" + v.list;
  if (v.empty) return k + ":";
  if (v.custom) return k + ": " + (customExpr || '""');
  return k + ": " + (v.expr || '""');
}

// The leading `--- … ---` block, split into its parts. null if none.
export function frontmatterRange(text) {
  const md = String(text == null ? "" : text);
  const m = md.match(/^(---\r?\n)([\s\S]*?)(\r?\n---)/);
  if (!m) return null;
  return { start: 0, end: m[0].length, fence1: m[1], inner: m[2], fence2: m[3] };
}

// Top-level field keys present in the frontmatter (for the remove list).
export function frontmatterFieldKeys(text) {
  const r = frontmatterRange(text);
  if (!r) return [];
  const keys = [];
  r.inner.split("\n").forEach((line) => { const km = line.match(/^([A-Za-z0-9_-]+):/); if (km) keys.push(km[1]); });
  return keys;
}

// Insert a field before the closing `---` (creating the frontmatter if absent).
export function addFrontmatterField(text, fieldText) {
  const md = String(text == null ? "" : text);
  const field = String(fieldText).replace(/\s+$/, "");
  const r = frontmatterRange(md);
  if (!r) return "---\n" + field + "\n---\n\n" + md.replace(/^\n+/, "");
  const inner = r.inner.replace(/\s+$/, "");
  return r.fence1 + (inner ? inner + "\n" : "") + field + r.fence2 + md.slice(r.end);
}

// Remove a top-level field (its key line plus any continuation/loop lines, up to
// the next top-level key). Leaves everything else verbatim.
export function removeFrontmatterField(text, key) {
  const md = String(text == null ? "" : text);
  const r = frontmatterRange(md);
  if (!r) return md;
  const out = [];
  let skipping = false;
  for (const line of r.inner.split("\n")) {
    const km = line.match(/^([A-Za-z0-9_-]+):/);
    if (km) { skipping = km[1] === key; if (skipping) continue; }
    else if (skipping) continue;
    out.push(line);
  }
  const newInner = out.join("\n").replace(/^\n+/, "").replace(/\s+$/, "");
  return r.fence1 + newInner + r.fence2 + md.slice(r.end);
}

// ---------------------------------------------------------------- palette data

// Per-annotation (block) variables — valid inside an annotations block.
export const BLOCK_VARIABLES = [
  { token: "{{text}}", label: "Highlighted text" },
  { token: "{{comment}}", label: "Your annotation comment" },
  { token: "{{page}}", label: "Page label (e.g. 12, iv)" },
  { token: "{{link}}", label: "open-pdf deep link to the page" },
  { token: "{{colour}}", label: "Colour name (yellow, red, …)" },
  { token: "{{type}}", label: "highlight / underline / image / note" },
  { token: "{{tags}}", label: "The highlight's own tags (a list)" },
  { token: "{{tagList}}", label: "Those tags, comma-joined" },
  { token: "{{citekey}}", label: "The item's citekey" },
  { token: "{{imageBaseName}}", label: "Filename of an image annotation" },
];

// Whole-item variables — valid in the frontmatter or the body (and in field
// blocks). NOT valid inside an annotations block (context is one highlight there).
export const ITEM_VARIABLES = [
  { token: "{{citekey}}", label: "Citekey" },
  { token: "{{title}}", label: "Title" },
  { token: "{{date}}", label: "Publication date" },
  { token: "{{dateAdded}}", label: "Date added (YYYY-MM-DD)" },
  { token: "{{dateModified}}", label: "Date modified (YYYY-MM-DD)" },
  { token: "{{itemType}}", label: "Item type" },
  { token: "{{publicationTitle}}", label: "Journal / publication" },
  { token: "{{abstractNote}}", label: "Abstract" },
  { token: "{{bibliography}}", label: "Formatted citation" },
  { token: "{{desktopURI}}", label: "select link (highlights item in Library)" },
  { token: "{{openPdf}}", label: "open-pdf link (opens the PDF in the reader)" },
  { token: "{{allTags}}", label: "Item-level tags, comma-joined" },
];

// Frontmatter-field lines to insert — you rename the KEY to your own convention
// (`Topics` instead of `Tags`, etc.); the value is a variable expression.
export const FRONTMATTER_FIELDS = [
  { label: "Title", text: 'Title: "{{title}}"' },
  { label: "Year", text: "Year: \"{{date | format('YYYY')}}\"" },
  { label: "Authors", text: 'Authors:\n{% for c in creators %}\n  - "{{c.lastName}}, {{c.firstName}}"\n{% endfor %}' },
  { label: "Journal", text: 'Journal: "{{publicationTitle}}"' },
  { label: "Item type", text: 'Type: "{{itemType}}"' },
  { label: "Date added", text: 'Added: "{{dateAdded}}"' },
  { label: "Tags", text: 'Tags:\n{% for t in allTags.split(\', \') %}\n  - "{{t}}"\n{% endfor %}' },
  { label: "Citekey", text: 'citekey: "{{citekey}}"' },
  { label: "Zotero link", text: 'ZoteroLink: "{{desktopURI}}"' },
];

// UPDATABLE body fields — a `kind=field` block renders the named item-field format
// once and refreshes on Update (like an annotation block). One per FIELD_FORMATS.
export const FIELD_BLOCKS = [
  { label: "Citation (updatable)", text: "%% zon kind=field sync=on format=citation %%\n%% /zon %%" },
  { label: "Abstract (updatable)", text: "%% zon kind=field sync=on format=abstract %%\n%% /zon %%" },
  { label: "Title (updatable)", text: "%% zon kind=field sync=on format=title %%\n%% /zon %%" },
  { label: "Authors (updatable)", text: "%% zon kind=field sync=on format=authors %%\n%% /zon %%" },
];

// Annotation-block presets to drop into the body. The markers stay editable in
// the editor, so colour/tag/type/format can be tweaked after inserting.
export const ANNOTATION_BLOCKS = [
  { label: "All highlights", text: "%% zon kind=annotations colour=all sync=on format=quote %%\n%% /zon %%" },
  { label: "One colour (yellow)", text: "%% zon kind=annotations colour=yellow sync=on format=quote %%\n%% /zon %%" },
  { label: "By tag (method)", text: "%% zon kind=annotations tag=method sync=on format=quote %%\n%% /zon %%" },
  { label: "Colour-routed section", text: '{{ highlights(colour="yellow", format="quote") }}' },
];

// Clean starting points the editor can open with (or you can clear and compose).
export const STARTER_NOTE = `---
ZoteroLink: "{{desktopURI}}"
citekey: "{{citekey}}"
Title: "{{title}}"
---

## Notes

## Highlights

%% zon kind=annotations colour=all sync=on format=quote %%
%% /zon %%
`;

export const STARTER_FORMAT = `> {{text}}
> — [p.{{page}}]({{link}})`;

// ---------------------------------------------------------------- preview

// Strip `%% … %%` Obsidian comments (block markers + ann: anchors) and collapse
// the blank lines they leave behind — so the preview reads like the rendered note
// (Obsidian hides these comments in reading view), not the raw source.
export function cleanPreview(markdown) {
  return String(markdown == null ? "" : markdown)
    .replace(/[ \t]*%%[^\n]*?%%[ \t]*/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+$/gm, "")
    .replace(/^\n+/, "")
    .replace(/\s+$/, "");
}

// Render `templateText` the way the real write path would, for the live preview.
// ctx = { itemData, annotations, citekey, formats, attachmentFolder }. Returns
// { kind, raw, preview } where `raw` is the faithful engine output (= what
// Insert/Save writes) and `preview` is the comment-stripped view. Never throws —
// a template error becomes the preview text so the editor can show it inline.
export function previewTemplate(templateText, ctx = {}) {
  const text = String(templateText || "");
  // A template invoking the highlights() global is a whole-note template even
  // without frontmatter or a literal %% zon %% block (templateKind keys off those
  // two signals). Treat it as a document so the colour-routed blocks get filled.
  let kind = templateKind(text);
  if (kind === "format" && /\bhighlights\s*\(/.test(text)) kind = "document";
  const anns = ctx.annotations || [];
  const itemData = ctx.itemData || {};
  const citekey = ctx.citekey || itemData.citekey || "";
  const attachmentFolder = ctx.attachmentFolder || "References/Attachments";
  let raw;
  try {
    if (kind === "format") {
      // A per-annotation body: wrap it as the active format of an annotations
      // block and let makeBlock render+filter+anchor it, exactly like Insert.
      const { item, sep, defaults } = parseTemplateFile(text);
      const config = {
        kind: "annotations",
        sync: defaults.sync || "on",
        format: "__preview",
        ...(defaults.colour ? { colour: defaults.colour } : { colour: "all" }),
        ...(defaults.type ? { type: defaults.type } : {}),
      };
      const formats = { ...DEFAULT_FORMATS, ...FIELD_FORMATS, ...(ctx.formats || {}), __preview: { item, sep } };
      raw = makeBlock(config, anns, { citekey, formats, itemData, attachmentFolder });
    } else {
      // A whole-note template: render once over item data, then fill its blocks.
      const rendered = render(text, itemData);
      raw = syncBlocks(rendered, anns, {
        citekey,
        formats: { ...DEFAULT_FORMATS, ...FIELD_FORMATS, ...(ctx.formats || {}) },
        itemData,
        attachmentFolder,
      });
    }
  } catch (e) {
    raw = `⚠️ Template error:\n${e && e.message ? e.message : String(e)}`;
    return { kind, raw, preview: raw, error: true };
  }
  return { kind, raw, preview: cleanPreview(raw) };
}

// ---------------------------------------------------------------- sample data

// De-personalised fallback for the preview when no item is selected. Shape mirrors
// buildItemData's output + gatherAnnotations' annotation objects.
export const SAMPLE_ITEM = {
  citekey: "doe2023example",
  title: "A Worked Example of Coproduction in Practice",
  date: "2023-05-01",
  dateAdded: "2023-06-12",
  dateModified: "2024-01-08",
  itemType: "journalArticle",
  publicationTitle: "Journal of Sample Studies",
  abstractNote: "A short sample abstract used to preview templates.",
  bibliography: "Doe J and Smith A (2023) A Worked Example of Coproduction in Practice. Journal of Sample Studies.",
  desktopURI: "zotero://select/library/items/SAMPLE01",
  openPdf: "zotero://open-pdf/library/items/SAMPLEPDF",
  allTags: "coproduction, methods, sample",
  creators: [{ firstName: "Jane", lastName: "Doe" }, { firstName: "Alex", lastName: "Smith" }],
  annotations: [],
};

export const SAMPLE_ANNOTATIONS = [
  {
    key: "SAMP0001", type: "highlight", attachmentKey: "SAMPLEPDF",
    pageLabel: "3", pageIndex: 2, sortIndex: "1",
    annotatedText: "Coproduction reshapes the clinician–patient relationship.",
    comment: "core claim", colourName: "yellow", tags: ["finding", "method"],
  },
  {
    key: "SAMP0002", type: "highlight", attachmentKey: "SAMPLEPDF",
    pageLabel: "5", pageIndex: 4, sortIndex: "2",
    annotatedText: "a clean, quotable sentence worth keeping verbatim",
    comment: "", colourName: "blue", tags: ["quote"],
  },
  {
    key: "SAMP0003", type: "highlight", attachmentKey: "SAMPLEPDF",
    pageLabel: "8", pageIndex: 7, sortIndex: "3",
    annotatedText: "a second yellow point for testing colour routing",
    comment: "compare with ch.2", colourName: "yellow", tags: [],
  },
];
