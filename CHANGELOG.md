# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0-beta.10] — 2026-06-22

### Changed
- **Consistent naming.** The item-pane section, Settings pane and docs now all read
  **"Obsidian Notepad"** (was a mix of "Obsidian Notes"/"Obsidian Notepad").
- **"Refresh" → "Update" everywhere.** The button was renamed in an earlier beta;
  its tooltips, statuses, errors and docs now match (e.g. the status reads
  "Updated metadata + N annotation(s)").

### Fixed
- **Ink (freehand) annotations no longer create empty `""` items** in annotation
  blocks. They're excluded by default (Zotero caches only the strokes, with no
  text or page content), unless a block explicitly sets `type=ink`.
- **CRLF notes work.** Frontmatter detection accepted only `\n`; notes saved with
  Windows-style `\r\n` line endings silently failed tag-push ("no tag field"),
  manifest refresh, and reading-view frontmatter hiding. Detection now accepts
  `\r?\n`.

### Docs
- README Features list updated (image annotations + inline display, configurable
  filename patterns + Rescan, tag push). Clarified that Push tags and the ⋯ More
  menu live behind *Enable experimental features*.

### Internal
- Extracted the filename-pattern resolution into a pure, unit-tested
  `src/filename.js` (`resolveNoteFilename`); removed dead code
  (`loadCustomFormats`, the unused `auto-update` label); exported
  `findImageEmbedRanges` / `resolveNoteFilename` from the core bundle. Tests: 189.

## [1.0.0-beta.9] — 2026-06-22

### Changed
- **A custom filename pattern now outranks the bare-citekey filename guess** when
  linking a note. If you keep, say, `@<citekey>.md` for one purpose and
  `@<citekey> (litnote).md` for another, set the pattern to the suffixed form and
  it links the right file (a plain `@<citekey>.md` sibling no longer wins). Order
  is now: `ZoteroLink:` → `citekey:` frontmatter → your filename pattern →
  legacy `@?<citekey>.md`.

### Docs
- **`%% zon … %%` block reference** added to TEMPLATES.md (and linked from the
  README): every block attribute (`kind`/`colour`/`type`/`sync`/`format`), the
  `ann:` anchors, how Update regenerates `sync=on` vs frozen `sync=off` blocks,
  and the `zon:` frontmatter map — for migrating templates from other tools.
- Corrected the prose-preservation note: a `sync=on` block is regenerated from
  Zotero, so only prose **after the last annotation** survives; per-highlight
  notes belong in the annotation's Zotero comment.

## [1.0.0-beta.8] — 2026-06-22

### Changed
- **Filename pattern accepts more fields.** New-note filenames can now use
  `{{author}}` (first author's surname), `{{year}}`, `{{title}}`, `{{journal}}`,
  `{{date}}`, and `{{itemType}}` in addition to `{{citekey}}` — so you can match
  how your vault already names notes (e.g. `{{author}} {{year}} - {{title}}.md`).
  Previously only `{{citekey}}` was substituted. Illegal filename characters are
  still stripped automatically, and `.md` is appended if omitted.
- **Existing notes link by your filename pattern too.** Note↔item matching now has
  a third step: after a `citekey:` / `ZoteroLink:` frontmatter field (preferred and
  most reliable), the plugin also matches an existing note whose filename equals the
  pattern rendered for that item. So a vault named `{{author}} {{year}} - {{title}}`
  links without per-note frontmatter. The empty-state and Settings now explain that
  `citekey:`/`ZoteroLink:` is matched first.
- **Re-links without a restart.** The note index rebuilds and re-links open panes
  automatically when you change the **notes folder** or **filename pattern** in
  Settings, and there's a new **Rescan** button (in the "no note found" state) to
  pick up notes you added or renamed outside Zotero. Rescanning only reads files —
  it never writes or disturbs unsaved edits.

### Fixed
- **Release builds reliably.** A release-flow bug could upload a stale build; the
  build step now runs as a single command so the published `.xpi` always matches
  the tag. (beta.7 was re-published with the correct artifacts.)

## [1.0.0-beta.7] — 2026-06-22

### Added
- **Image (area) annotations are imported.** On sync, each image/area annotation's
  cached PNG is copied into a per-note folder in your vault (default
  `References/Attachments/<citekey>/`) and linked in the note with an Obsidian
  embed `![[…]]`, which renders in Obsidian. Previously these showed as an empty
  `""`. The snapshot includes the underlying page content (text/figures), like the
  Zotero Integration plugin. The folder is set in **Settings → Image-annotation
  folder** and can be overridden per-note via `zon: attachments:` (same
  global-default-plus-per-note pattern as tag sync). Export is idempotent —
  re-syncing won't duplicate files, and an image annotation that's **resized or
  moved** is re-exported so the embedded picture stays current. *(Ink/drawing
  annotations are not exported yet: Zotero only caches the strokes, with no
  underlying page content.)*
- **Image embeds render in the note pane.** In Reading view, a vault-relative
  image embed (`![[…png]]` / `![](…png)`) now displays as an inline picture in the
  editor — so imported image annotations are visible without switching to Obsidian.
  Purely presentational (toggle Reading view off to see the raw `![[…]]`); the file
  on disk is untouched. Restricted to images that resolve **inside** the vault.
  A re-exported image (e.g. an annotation **resized/moved** — same filename, new
  content) now reloads in the pane via a cache-bust token, instead of showing the
  stale picture until the tab is closed and reopened.

## [1.0.0-beta.6] — 2026-06-22

### Fixed
- **Edited annotations now update on Refresh.** A `sync=on` block now *mirrors*
  Zotero: if you extend/contract a highlight or change its comment in the PDF,
  the new text replaces the old on the next Refresh (previously the in-block text
  was kept, so edits never showed). New annotations still appear in Zotero order
  and removed ones drop; free prose written *after* the last annotation is
  preserved. To hand-curate and freeze a block against resync, set `sync=off`.
- **Duplicate section header removed.** Zotero dumps a plugin section's label as a
  bare, unstyled text node (it does *not* build a native styled head for custom
  sections), so it showed as a second, plain "Obsidian Notes" beneath our styled
  one. The bare dump is now suppressed (empty label + strip), leaving a single
  header — our crystal logo, muted-bold title, and collapse chevron, matching the
  native Tags/Related heads.

### Changed
- **Toolbar tidied.** *Update* (was *Refresh*), *Open in Obsidian*, and *Reload*
  now share one row.
- **"⋯ More" menu is now opt-in.** The advanced/early actions (*Sync Metadata*,
  *Migrate*, *Push tags → Zotero*) are hidden by default to keep the toolbar tidy.
  Turn them on with **Settings → Enable experimental features** (reopen the item
  or restart Zotero to apply).

## [1.0.0-beta.5] — 2026-06-16

### Added
- **Push tags → Zotero (beta, reverse sync).** A first step toward bidirectional
  metadata: read the tags from a note's frontmatter and update the Zotero item's
  tags to match. Under **⋯ More → Push tags → Zotero**. Always previews the exact
  add/remove changes and asks before writing; only *manual* item tags can be
  removed (automatic tags are never touched); aborts if the mapped field is absent
  (so it can't wipe all tags). The mapped field is **per-note** — set globally in
  *Settings → Tag sync field* (default `Topics`), and once you push, the choice is
  recorded in the note's `zon: tags:` map so each note carries its own mapping.

## [1.0.0-beta.4] — 2026-06-16

### Added
- **Auto-detect external edits.** Edit a note in Obsidian, switch back to Zotero,
  and the pane now reloads automatically (like Obsidian's own file watching) — no
  unsaved edits are ever clobbered (you get the conflict bar instead).

### Changed
- **Section header aligned** with Zotero's native Tags/Related heads (flush-left
  logo + title), and the collapse chevron is now a proper-sized control.
- **Live/static selector** labels simplified to `live` / `static`.
- **"Open in Obsidian" + "Reload"** moved to their own row.
- **Migrate + Sync Metadata** moved into a **"⋯ More"** menu (both are advanced /
  rarely needed — Refresh already syncs metadata from your template).

## [1.0.0-beta.3] — 2026-06-16

### Changed
- **Item-pane section redesign.** The section now has a proper header (crystal
  logo + title, matching Zotero's Tags/Related headers) and is retitled
  **"Obsidian Notes"**, with a chevron to collapse/expand it (persisted). The
  toolbar is regrouped: template + colour + a live/static selector lead into the
  **Insert** button; note actions (Refresh / Migrate / Sync Metadata / Open in
  Obsidian / Reload) form their own row; and the view toggles (Reading view /
  Frontmatter / Show markers) are grouped under a hairline divider above the editor.
- **"auto-update" is now a dropdown** — `live-field` (re-syncs on Refresh) /
  `static-field` (frozen snapshot) — styled like the template and colour selectors.
- **"Manage fields" renamed to "Sync Metadata"** (clearer).
- **Auto-sync moved to Settings.** The live auto-sync toggle was global, so it now
  lives only in *Settings → Obsidian Notes* rather than in every item's pane.

## [1.0.0-beta.2] — 2026-06-16

### Added
- **Starter templates ship with the plugin.** A default note scaffold (`note`,
  `note-minimal`) plus block templates (`abstract`, `critique`, `key-quote`,
  `highlight`, `snapshot`) are now built in. First-run setup offers to copy them
  into a Templates folder in your vault (which you then own and edit in Obsidian),
  and Settings has an **Install starter templates…** button to do the same later.
  Existing files are never overwritten.

### Fixed
- **Create note no longer produces an empty note on a fresh install.** Previously,
  with no Templates folder configured, *Create note* rendered an empty scaffold.
  The built-in templates now act as a zero-config fallback, so Create note / Insert
  work out of the box even before any folder is set.

## [1.0.0-beta.1] — 2026-06-16

First public beta. Highlights:

### Added
- **In-pane Obsidian note editor** — each item's linked vault `.md` note opens in
  a CodeMirror markdown editor in the Zotero item pane (works in the library and
  in reader tabs).
- **Annotation sync into live blocks** — pull PDF highlights into customisable,
  idempotent `%% zon … %%` blocks that re-sync without touching your prose.
- **Auto-sync** — optional: highlights flow into the open note as you annotate.
- **Create note from template** — for items with no note yet, populated with
  metadata and a formatted bibliography (via Zotero QuickCopy / APA fallback).
- **Bulk note creation** — right-click one or more items in the library →
  *Create Obsidian note(s)* to make a note for each (default template; existing
  notes are skipped, never overwritten).
- **Find DOI (Crossref)** — right-click items missing a DOI → look one up on
  Crossref by title/author/year and fill it in. Only writes a confident match
  (high title similarity + year check); never overwrites an existing DOI.
- **Reading view** — render inline links `[label](target)`, `#` headings, and
  `**bold**` / `*italic*` emphasis in the editor like Obsidian (the markdown
  syntax is hidden, links are clickable). Toggle it off for raw source. A separate
  **Frontmatter** toggle shows/hides the YAML block. Both are presentational — the
  file on disk is never changed.
- **Open in Obsidian** and **Migrate** (convert legacy annotation dumps to blocks).
- **First-run onboarding** — detects your Obsidian vaults (`obsidian.json`) and
  lets you pick the vault + notes folder; **Browse…** folder pickers in Settings.
- **Unified templates** — Nunjucks note scaffolds + insertable block templates,
  with an optional `%%! … %%` defaults directive. See `docs/TEMPLATES.md`.
- Cross-platform (Windows / macOS / Linux) path handling.
- Centralised, translation-ready UI strings.

### Safety
- **Atomic writes** (temp file + rename) so a crash can't truncate a note.
- **External-change detection** — never silently overwrites a note edited in
  Obsidian; offers Reload / Overwrite, and auto-reloads when you have no unsaved
  edits.
- Filename sanitisation and writes confined to the configured notes folder.

### Tooling
- `zotero-plugin-scaffold` build/release; Vitest unit tests + headless
  Mocha-in-Zotero integration tests; GitHub Actions CI.

### Fixed
- Item-pane sidenav icon no longer renders its label text over the icon.
