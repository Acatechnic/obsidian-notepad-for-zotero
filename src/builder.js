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
