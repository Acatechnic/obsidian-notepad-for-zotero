// Template-builder core (pure, Node + Vitest).
//
// Phase 1 backs a dedicated "Template Builder" window: a CM editor pre-filled
// with a documented scaffold, a palette of clickable variable/snippet chips, and
// a LIVE PREVIEW rendered against the selected item (or sample data). All the UI
// does is edit a string and call previewTemplate(); this module is everything
// that can be unit-tested without Zotero.
//
// The preview faithfully reuses the SAME engine the real write paths use:
//   - a per-annotation body ("format" kind) → makeBlock (filters + renders each
//     highlight + wraps in a %% zon %% block), exactly what Insert produces;
//   - a whole-note template ("document" kind) → render() then syncBlocks(), the
//     same pipeline as renderDocument in bootstrap.js.
// So what the user sees in the preview is what they get in the note.

import { makeBlock, syncBlocks } from "./blocks.js";
import { render } from "./render.js";
import { parseTemplateFile, templateKind } from "./templates.js";
import { DEFAULT_FORMATS } from "./formats.js";

// ---------------------------------------------------------------- palettes

// Per-annotation (block) variables — valid inside a format body / annotations
// block, where the context is one highlight.
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

// Whole-item variables — valid in a note template or a kind=field element, where
// the context is the item (NOT a single highlight).
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

// Insertable multi-line snippets, grouped for the palette. `kind` is advisory for
// the UI (which group/heading); the engine classifies the whole template itself.
export const BUILDER_SNIPPETS = [
  {
    id: "annotations-block",
    label: "Annotations block (all colours)",
    kind: "block",
    text: "%% zon kind=annotations colour=all sync=on format=list %%\n%% /zon %%",
  },
  {
    id: "colour-route",
    label: "Colour-routed section",
    kind: "note",
    text: '{{ highlights(colour="yellow", format="quote") }}',
  },
  {
    id: "format-list",
    label: "Format: list item",
    kind: "format",
    text: '- [p.{{page}}]({{link}}) "{{text}}"{% if comment %} — *{{comment}}*{% endif %}',
  },
  {
    id: "format-quote",
    label: "Format: blockquote",
    kind: "format",
    text: "> {{text}}\n> — [p.{{page}}]({{link}})",
  },
  {
    id: "format-callout",
    label: "Format: callout",
    kind: "format",
    text: "> [!quote] p.{{page}}\n> {{text}}{% if comment %}\n>\n> {{comment}}{% endif %}",
  },
  {
    id: "tags-loop",
    label: "Render the highlight's tags as #hashtags",
    kind: "format",
    text: "{% for t in tags %}#{{t}} {% endfor %}",
  },
];

// The "all options" starter the editor opens with. A whole-note template that
// demonstrates frontmatter, free-note prose, and a colour-routed annotations
// block. `{# … #}` are Nunjucks comments — stripped at render, so they guide the
// author without showing up in the note.
export const BUILDER_SCAFFOLD = `---
ZoteroLink: "{{desktopURI}}"
citekey: "{{citekey}}"
Title: "{{title}}"
Year: "{{date | format('YYYY')}}"
Journal: "{{publicationTitle}}"
Tags:
{% for t in allTags.split(', ') %}
  - "{{t}}"
{% endfor %}
---

{# Whole-item variables (title, openPdf, …) work out here in the note body. #}
[Open PDF in Zotero]({{openPdf}})

## Notes
{# Your own prose — the plugin never overwrites text outside the blocks below. #}

## Highlights
{# Each highlights(...) call becomes a live block filled with that colour. #}
{{ highlights(colour="yellow", format="quote") }}

{{ highlights(colour="blue", format="quote") }}
`;

// ------------------------------------------------- guided "compose" generators
//
// These turn a few tick-box choices into a working template, so someone who
// doesn't know Nunjucks can still produce one. The output is plain template text
// the editor shows and previewTemplate renders — exactly what hand-authoring
// would yield, just generated. Pure + unit-tested.

// Frontmatter fields offered when composing a NOTE template. `fm` is the literal
// YAML line(s); loop fields keep `{% for %}` / `{% endfor %}` and the value on
// SEPARATE lines (and the generator always puts the closing `---` on its own
// line) so templateKind sees the frontmatter — see the note.md gotcha.
export const NOTE_FIELDS = [
  { id: "title", label: "Title", fm: 'Title: "{{title}}"' },
  { id: "year", label: "Year", fm: "Year: \"{{date | format('YYYY')}}\"" },
  { id: "authors", label: "Authors", fm: 'Authors:\n{% for c in creators %}\n  - "{{c.lastName}}, {{c.firstName}}"\n{% endfor %}' },
  { id: "journal", label: "Journal", fm: 'Journal: "{{publicationTitle}}"' },
  { id: "itemType", label: "Item type", fm: 'Type: "{{itemType}}"' },
  { id: "dateAdded", label: "Date added", fm: 'Added: "{{dateAdded}}"' },
  { id: "tags", label: "Zotero tags", fm: 'Tags:\n{% for t in allTags.split(\', \') %}\n  - "{{t}}"\n{% endfor %}' },
];

// Body blocks offered for a NOTE template (each is optional).
export const NOTE_BODY_OPTIONS = [
  { id: "openPdf", label: "“Open PDF” link" },
  { id: "citation", label: "Formatted citation" },
  { id: "abstract", label: "Abstract" },
  { id: "notes", label: "“Notes” heading (your prose)" },
  { id: "highlights", label: "Highlights section", always: true },
];

export const FORMAT_STYLES = [
  { id: "list", label: "List item" },
  { id: "quote", label: "Blockquote" },
  { id: "callout", label: "Callout" },
];

// Parts of each highlight that can be toggled in the format composer.
export const FORMAT_PARTS = [
  { id: "page", label: "Page link" },
  { id: "comment", label: "Your comment" },
  { id: "tags", label: "Highlight tags" },
];

export const COLOUR_CHOICES = ["yellow", "red", "green", "blue", "purple", "magenta", "orange", "grey"];

// Generate a whole-note template from compose options.
//   { fields:[ids], openPdf, citation, abstract, notes, highlights,
//     byColour, colours:[names], highlightFormat }
export function buildNoteTemplate(opts = {}) {
  const o = opts || {};
  const fields = o.fields || ["title", "year", "authors", "journal", "tags"];
  const fmt = o.highlightFormat || "quote";
  const out = [];
  out.push("---");
  out.push('ZoteroLink: "{{desktopURI}}"');
  out.push('citekey: "{{citekey}}"');
  for (const f of NOTE_FIELDS) if (fields.indexOf(f.id) !== -1) out.push(f.fm);
  out.push("---");
  out.push("");
  if (o.openPdf) out.push("{% if openPdf %}[Open PDF in Zotero]({{openPdf}}){% endif %}\n");
  if (o.citation) out.push("**Citation:** {{bibliography}}\n");
  if (o.abstract) out.push("**Abstract:** {% if abstractNote %}{{abstractNote}}{% endif %}\n");
  if (o.notes) { out.push("## Notes"); out.push(""); }
  if (o.highlights !== false) {
    out.push("## Highlights");
    out.push("");
    if (o.byColour && o.colours && o.colours.length) {
      for (const c of o.colours) { out.push('{{ highlights(colour="' + c + '", format="' + fmt + '") }}'); out.push(""); }
    } else {
      out.push("%% zon kind=annotations colour=all sync=on format=" + fmt + " %%");
      out.push("%% /zon %%");
    }
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").replace(/\s+$/, "") + "\n";
}

// Generate a per-highlight FORMAT body from compose options.
//   { style:"list"|"quote"|"callout", parts:{page,comment,tags}, colour:"" }
export function buildFormatTemplate(opts = {}) {
  const o = opts || {};
  const style = FORMAT_STYLES.some((s) => s.id === o.style) ? o.style : "quote";
  const parts = o.parts || { page: true, comment: true, tags: false };
  const tagBit = parts.tags ? " {% for t in tags %}#{{t}} {% endfor %}" : "";
  const out = [];
  if (o.colour) out.push("%%! colour=" + o.colour + " sync=on %%");
  if (style === "list") {
    let s = "- ";
    if (parts.page) s += "[p.{{page}}]({{link}}) ";
    s += '"{{text}}"';
    if (parts.comment) s += "{% if comment %} — *{{comment}}*{% endif %}";
    s += tagBit;
    out.push(s);
  } else if (style === "callout") {
    out.push("> [!quote]" + (parts.page ? " p.{{page}}" : ""));
    out.push("> {{text}}" + tagBit);
    if (parts.comment) out.push("> {% if comment %}\n>\n> {{comment}}{% endif %}");
  } else {
    out.push("> {{text}}" + tagBit);
    if (parts.page) out.push("> — [p.{{page}}]({{link}})");
    if (parts.comment) out.push("{% if comment %}>\n> {{comment}}{% endif %}");
  }
  return out.join("\n");
}

// Clean per-type starting points (simpler than the full BUILDER_SCAFFOLD), used
// when you pick a type but don't run the composer.
export const STARTER_NOTE = buildNoteTemplate({ fields: ["title", "year", "authors", "journal", "tags"], notes: true, highlights: true, highlightFormat: "quote" });
export const STARTER_FORMAT = buildFormatTemplate({ style: "quote", parts: { page: true, comment: true, tags: false } });

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
// { kind, raw, preview } where `raw` is the faithful engine output (markers and
// all, = what Insert/Create writes) and `preview` is the comment-stripped view.
// Never throws — a template error becomes the preview text so the editor can show
// it inline instead of blanking.
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
      const formats = { ...DEFAULT_FORMATS, ...(ctx.formats || {}), __preview: { item, sep } };
      raw = makeBlock(config, anns, { citekey, formats, itemData, attachmentFolder });
    } else {
      // A whole-note template: render once over item data, then fill its blocks.
      const rendered = render(text, itemData);
      raw = syncBlocks(rendered, anns, {
        citekey,
        formats: { ...DEFAULT_FORMATS, ...(ctx.formats || {}) },
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
