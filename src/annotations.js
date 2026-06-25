// Render Zotero annotations into the user's existing Obsidian note format, with
// an invisible `%% ann:KEY %%` anchor appended so the idempotent merge layer
// (src/merge.js) can dedupe by Zotero annotation key.
//
// The user's real notes use this shape under `## Annotations`:
//
//   - [p.1](zotero://open-pdf/library/items/MFZCGEC3?page=) "highlighted text" — *my comment*
//
// i.e. a clickable page link (deep-links into Zotero's PDF reader), the quoted
// annotated text, and an optional italic comment after an em dash. We keep that
// exactly and just append the hidden anchor. Obsidian renders `%% ... %%` as a
// hidden comment, so the source stays clean.

import { hexToColorName } from "./colors.js";

const ATTACH_FOLDER_DEFAULT = "References/Attachments";

// A Zotero annotation, as the (future) Zotero adapter will hand it to us:
//   { key, type, annotatedText, comment, pageLabel, pageIndex, attachmentKey, imageBaseName, sortIndex }
// type is one of: highlight | underline | image | ink | text | note

function esc(s) {
  return String(s == null ? "" : s).replace(/\s+/g, " ").trim();
}

export function pdfLink(a) {
  // Zotero's open-pdf `?page=` is the DISPLAYED page number (the label), not the
  // 0-based index — passing the index lands one page early. Prefer the label;
  // fall back to pageIndex+1. Also append `&annotation=<key>` so Zotero jumps to
  // the exact annotation regardless of any page-label quirks.
  let page = "";
  if (a.pageLabel != null && String(a.pageLabel).trim() !== "") page = String(a.pageLabel).trim();
  else if (a.pageIndex != null) page = a.pageIndex + 1;
  let url = `zotero://open-pdf/library/items/${a.attachmentKey}?page=${encodeURIComponent(page)}`;
  if (a.key) url += `&annotation=${a.key}`;
  return url;
}

function anchor(a) {
  return `%% ann:${a.key} %%`;
}

function commentSuffix(a) {
  const c = esc(a.comment);
  return c ? ` — *${c}*` : "";
}

// Render a single annotation to one markdown list item (its block), ending in
// the hidden key anchor. Returns null for annotation types we don't emit.
export function renderAnnotationLine(a, opts = {}) {
  const citekey = opts.citekey || "";
  const attachFolder = opts.attachmentFolder || ATTACH_FOLDER_DEFAULT;
  const page = `p.${esc(a.pageLabel)}`;
  const link = pdfLink(a);

  if (a.type === "highlight" || a.type === "underline") {
    const text = esc(a.annotatedText);
    if (!text) return null;
    return `- [${page}](${link}) "${text}"${commentSuffix(a)} ${anchor(a)}`;
  }
  if (a.type === "image") {
    if (!a.imageBaseName) return null; // nothing exported to embed
    const embed = `![[${attachFolder}/${citekey}/${esc(a.imageBaseName)}]]`;
    return `- [${page}](${link}) ${embed}${commentSuffix(a)} ${anchor(a)}`;
  }
  if (a.type === "text" || a.type === "note") {
    // A standalone note/comment with no highlighted text.
    const c = esc(a.comment);
    if (!c) return null;
    return `- [${page}](${link}) *Note:* ${c} ${anchor(a)}`;
  }
  return null;
}

// Render the body of the `## Annotations` section: one block per annotation, in
// Zotero sort order, separated by blank lines. (No per-import "Imported:"
// heading — that is what proliferates in the mgmeyers flow.)
function sortAnnotations(annotations) {
  return [...(annotations || [])].sort((x, y) => {
    const sx = String(x.sortIndex ?? ""), sy = String(y.sortIndex ?? "");
    if (sx !== sy) return sx < sy ? -1 : 1;
    return String(x.key).localeCompare(String(y.key));
  });
}

export function renderAnnotationsSection(annotations, opts = {}) {
  const sorted = sortAnnotations(annotations);
  const lines = sorted.map((a) => renderAnnotationLine(a, opts)).filter(Boolean);
  return lines.join("\n\n");
}

// LLM-context formatter — a DIFFERENT concern from the note-rendering
// functions above: produces clean structured markdown for an LLM prompt,
// with NO `%% ann:KEY %%` anchors and NO `![[…]]` embeds. Image-only
// annotations (no text AND no comment) are omitted. Returns "" when no
// usable annotations remain (caller treats that as CONTEXT_MISSING).
export function renderAnnotationsContext(annotations) {
  const usable = sortAnnotations(annotations)
    .filter((a) => esc(a.annotatedText) !== "" || esc(a.comment) !== "");
  if (usable.length === 0) return "";
  const blocks = usable.map((a) => {
    const page = esc(a.pageLabel) || (a.pageIndex != null ? String(a.pageIndex + 1) : "");
    const colour = esc(a.colourName);
    const type = String(a.type || "");
    const header = `### p.${page || "?"} — ${type}${colour ? ` (${colour})` : ""}`;
    const parts = [header];
    const text = esc(a.annotatedText);
    if (text) parts.push(`> "${text}"`);
    const comment = esc(a.comment);
    if (comment) parts.push(`Comment: ${comment}`);
    return parts.join("\n\n");
  });
  return blocks.join("\n\n");
}
// Map a Zotero annotation item to the shape renderAnnotationLine consumes.
// Pure: pass an annotation-like object (the fields Zotero exposes) plus its
// parent PDF attachment key. annotationPosition is JSON holding the pageIndex.
export function mapZoteroAnnotation(a, attachmentKey) {
  let pageIndex = 0;
  try {
    const pos = typeof a.annotationPosition === "string"
      ? JSON.parse(a.annotationPosition)
      : (a.annotationPosition || {});
    if (pos && pos.pageIndex != null) pageIndex = pos.pageIndex;
  } catch (e) {}
  return {
    key: a.key,
    type: a.annotationType,
    annotatedText: a.annotationText || "",
    comment: a.annotationComment || "",
    pageLabel: a.annotationPageLabel || "",
    pageIndex,
    attachmentKey,
    color: a.annotationColor || "",
    colourName: hexToColorName(a.annotationColor),
    imageBaseName: a.imageBaseName || "",
    sortIndex: a.annotationSortIndex || "",
  };
}
