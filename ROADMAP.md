# Roadmap

A living view of where Obsidian Notepad for Zotero is heading. Priorities shift
with feedback and nothing here is a promise of timing — if something matters to
you, please open or upvote a
[Discussion](https://github.com/Acatechnic/obsidian-notepad-for-zotero/discussions).

## In progress

- **Template Builder** — a visual way to build note and highlight-format
  templates. Pick what you want (which frontmatter fields, how each highlight is
  formatted, routing highlights by colour) and see a **live preview** rendered
  against the selected item, then insert it into a note or save it to your
  Templates folder. Currently behind *Settings → experimental features* while it's
  being finished.

## Planned

- **Synthesis notes (across sources).** Create a note that pulls **filtered
  annotations from several items at once** — for example, every highlight you
  tagged `method` across a whole project — each carrying its own citation and a
  link back to the source. Select items in Zotero, choose a filter, and pull their
  annotations into one note. This is the "notes about *ideas*, not just papers"
  layer, kept in sync like any other block.
- **Self-describing notes.** Make a note carry enough of its own structure that
  **Update doesn't need the whole-note template** — so updating is fully
  self-contained and templates are only needed when you first create a note.
- **Tag filtering in the Template Builder** — surface the `tag=` block filter in
  the builder's options.

## Exploring / maybe

- **Sync Metadata, rethought** — keep a note's existing frontmatter fields in sync
  with Zotero for *any* template, by reading the note's own structure rather than
  a pre-baked manifest.
- **Richer image-annotation embeds** — resolve `![[name]]` by filename,
  click-to-open, captions.
- **Ink / freehand annotations** — currently skipped (Zotero caches only the
  strokes, with no underlying page content); revisit if there's a good way to
  render them.
- **Scheduled / background refresh.**

## Recently shipped

See the [CHANGELOG](CHANGELOG.md) for the full history. A few highlights:

- **Filter an annotations block by tag** (`tag=method`, or `tag=method,finding`).
- **Free-form notes** — Update only refreshes the frontmatter and syncs your
  `%% zon %%` blocks; everything else in the body is left exactly as you wrote it,
  with or without headings.
- **Per-annotation tags** (`{{tags}}`) and an **`{{openPdf}}`** link variable.
- **Route highlights by colour** into different sections of a note.
- **Image (area) annotation import** with inline display in the note pane.

---

Have an idea, or a workflow that doesn't fit yet? Feedback is very welcome —
open a [Discussion](https://github.com/Acatechnic/obsidian-notepad-for-zotero/discussions).
