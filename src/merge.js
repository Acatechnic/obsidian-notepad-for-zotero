// Idempotent merge of a freshly-rendered literature note into the existing
// note on disk.
//
// This is the piece the current tooling gets wrong. mgmeyers' {% persist %}
// appends new annotations under a fresh "Imported:" heading each run, which
// produces duplicate headings and drift; the raw zotero-obsidian-export plugin
// just dump-appends the whole note after a "---". Neither is idempotent.
//
// Strategy here: structural, anchor-based merge.
//   - Frontmatter: Zotero-owned keys refreshed from the render; user-owned keys
//     (KeyIdea, Topics) and any unknown keys the user added are preserved.
//   - "## Notes" (or any prose section): existing body wins — never clobbered.
//   - "## Annotations": each annotation block is anchored with `%% ann:KEY %%`
//     (KEY = stable Zotero annotation key). Merge is a keyed union: existing
//     blocks are preserved (so manual tweaks survive), new annotations are
//     inserted in Zotero's canonical order, and the whole thing is stable —
//     re-running with no new annotations yields a byte-identical file.
//
// Guarantee: merge(existing, fresh) is idempotent — merge(merge(e,f), f) === merge(e,f).

import { renderAnnotationsSection } from "./annotations.js";

const ANN_ANCHOR = /%%\s*ann:([A-Za-z0-9]+)\s*%%/;

const DEFAULTS = {
  // Frontmatter keys the user owns; never overwritten from the render if the
  // existing note already has a value for them.
  userOwnedKeys: ["KeyIdea", "Topics"],
  // Section headings (case-insensitive) whose body is preserved verbatim.
  proseSections: ["notes"],
  // Section headings merged by annotation anchor.
  annotationSections: ["annotations"],
};

// ── note <-> structure ──────────────────────────────────────────────────────

// Split a note into { frontmatter (raw string or null), preamble, sections }.
// A section is { heading (full "## ..." line), level, body (string) }.
export function parseNote(md) {
  let frontmatter = null;
  let rest = md;

  const fm = md.match(/^---\n([\s\S]*?)\n---\n?/);
  if (fm) {
    frontmatter = fm[1];
    rest = md.slice(fm[0].length);
  }

  const lines = rest.split("\n");
  const sections = [];
  let preambleLines = [];
  let current = null;

  for (const line of lines) {
    const h = line.match(/^(#{1,6})\s/);
    if (h) {
      if (current) sections.push(current);
      else preambleLines = preambleLines;
      current = { heading: line, level: h[1].length, bodyLines: [] };
    } else if (current) {
      current.bodyLines.push(line);
    } else {
      preambleLines.push(line);
    }
  }
  if (current) sections.push(current);

  return {
    frontmatter,
    preamble: preambleLines.join("\n"),
    sections: sections.map((s) => ({
      heading: s.heading,
      level: s.level,
      body: s.bodyLines.join("\n"),
    })),
  };
}

function sectionName(heading) {
  return heading.replace(/^#{1,6}\s+/, "").trim().toLowerCase();
}

// ── frontmatter merge ───────────────────────────────────────────────────────

// Parse YAML-ish frontmatter into ordered [{ key, lines }]. A key owns its line
// plus any following indented / list continuation lines.
function parseFrontmatter(fm) {
  if (!fm) return [];
  const lines = fm.split("\n");
  const entries = [];
  let current = null;
  for (const line of lines) {
    const m = line.match(/^([A-Za-z0-9_-]+):/);
    if (m && !/^\s/.test(line)) {
      if (current) entries.push(current);
      current = { key: m[1], lines: [line] };
    } else if (current) {
      current.lines.push(line);
    }
  }
  if (current) entries.push(current);
  return entries;
}

function mergeFrontmatter(existingFM, freshFM, userOwnedKeys) {
  const existing = parseFrontmatter(existingFM);
  const fresh = parseFrontmatter(freshFM);
  const existingByKey = new Map(existing.map((e) => [e.key, e]));
  const freshKeys = new Set(fresh.map((e) => e.key));
  const owned = new Set(userOwnedKeys);

  const out = [];
  for (const e of fresh) {
    if (owned.has(e.key) && existingByKey.has(e.key)) {
      out.push(existingByKey.get(e.key)); // preserve user's value
    } else {
      out.push(e); // refresh from render
    }
  }
  // Keep any keys the user added that the template doesn't emit.
  for (const e of existing) {
    if (!freshKeys.has(e.key)) out.push(e);
  }
  return out.map((e) => e.lines.join("\n")).join("\n");
}

// ── annotation-section merge ────────────────────────────────────────────────

// Split an annotation-section body into keyed blocks. A block is the run of
// lines ending at a line containing an `%% ann:KEY %%` anchor. Lines before the
// first anchor (e.g. stray prose) are returned as `lead`.
function parseAnnotationBlocks(body) {
  const lines = body.split("\n");
  const blocks = [];
  let buf = [];
  let lead = [];
  let seenAnchor = false;
  for (const line of lines) {
    buf.push(line);
    const m = line.match(ANN_ANCHOR);
    if (m) {
      seenAnchor = true;
      // trim leading blank lines inside the block
      while (buf.length && buf[0].trim() === "") buf.shift();
      blocks.push({ key: m[1], text: buf.join("\n").replace(/\s+$/, "") });
      buf = [];
    }
  }
  if (!seenAnchor) lead = lines; // no anchors at all -> all lead
  else if (buf.join("").trim() !== "") {
    // trailing non-anchored lines (rare) -> ignore for ordering but keep nothing
  }
  return { lead: seenAnchor ? [] : lead, blocks };
}

function mergeAnnotationSection(existingBody, freshBody) {
  const existing = parseAnnotationBlocks(existingBody);
  const fresh = parseAnnotationBlocks(freshBody);
  const existingByKey = new Map(existing.blocks.map((b) => [b.key, b]));

  const merged = fresh.blocks.map((fb) =>
    existingByKey.has(fb.key) ? existingByKey.get(fb.key) : fb
  );

  const parts = [];
  const lead = fresh.lead.join("\n").trim();
  if (lead) parts.push(lead);
  parts.push(...merged.map((b) => b.text));
  return parts.join("\n\n");
}

// ── top-level merge ─────────────────────────────────────────────────────────

export function mergeNote(existingMd, freshMd, opts = {}) {
  const o = { ...DEFAULTS, ...opts };
  // First run (no existing file): merge the fresh render into itself so the
  // output is already in canonical/normalized form. Without this, run #1 would
  // emit the renderer's verbatim whitespace and run #2 the re-assembled form,
  // and the two would differ — breaking idempotency on the very first re-import.
  if (existingMd == null || existingMd.trim() === "") existingMd = freshMd;

  const existing = parseNote(existingMd);
  const fresh = parseNote(freshMd);

  const frontmatter = mergeFrontmatter(
    existing.frontmatter,
    fresh.frontmatter,
    o.userOwnedKeys
  );

  const existingByName = new Map(
    existing.sections.map((s) => [sectionName(s.heading), s])
  );
  const freshNames = new Set(fresh.sections.map((s) => sectionName(s.heading)));

  const outSections = [];
  for (const fs of fresh.sections) {
    const name = sectionName(fs.heading);
    const es = existingByName.get(name);
    if (o.proseSections.includes(name) && es && es.body.trim() !== "") {
      outSections.push({ heading: fs.heading, body: es.body }); // user prose wins
    } else if (o.annotationSections.includes(name)) {
      outSections.push({
        heading: fs.heading,
        body: mergeAnnotationSection(es ? es.body : "", fs.body),
      });
    } else {
      outSections.push({ heading: fs.heading, body: fs.body }); // refresh
    }
  }
  // Preserve user-added sections the template doesn't emit (e.g. "## Synthesis").
  for (const es of existing.sections) {
    if (!freshNames.has(sectionName(es.heading))) {
      outSections.push({ heading: es.heading, body: es.body });
    }
  }

  return assembleNote(frontmatter, fresh.preamble, outSections);
}

// Reassemble a note from its parts with canonical spacing.
function assembleNote(frontmatter, preamble, sections) {
  const parts = [];
  if (frontmatter != null) parts.push(`---\n${frontmatter}\n---`);
  const pre = (preamble || "").trim();
  if (pre) parts.push(pre);
  for (const s of sections) {
    const body = (s.body || "").replace(/^\n+/, "").replace(/\s+$/, "");
    parts.push(body ? `${s.heading}\n${body}` : s.heading);
  }
  return parts.join("\n\n") + "\n";
}

// Sync annotations into an existing note: render the current Zotero annotations
// (anchored) and merge them into the note's "## Annotations" section, leaving
// frontmatter, prose, and every other section untouched. Idempotent — running
// it again with the same annotations yields a byte-identical file. This is the
// "update annotations from Zotero" action (distinct from full-note creation).
export function updateNoteAnnotations(existingMd, annotations, opts = {}) {
  const o = { ...DEFAULTS, ...opts };
  const freshBody = renderAnnotationsSection(annotations, opts);
  const parsed = parseNote(existingMd);

  let found = false;
  const sections = parsed.sections.map((s) => {
    if (o.annotationSections.includes(sectionName(s.heading))) {
      found = true;
      return { heading: s.heading, body: mergeAnnotationSection(s.body, freshBody) };
    }
    return s;
  });
  if (!found) sections.push({ heading: "## Annotations", body: freshBody });

  return assembleNote(parsed.frontmatter, parsed.preamble, sections);
}
