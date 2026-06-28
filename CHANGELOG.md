# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- **The Template Builder opens on your note.** It now starts from the right
  content for the selected item instead of a generic scaffold: if the item has
  **no note yet**, the editor begins with **your default note template** (tweak
  it, then Create note); if a **note already exists**, it **loads that note** so
  you can edit it with the builder's tools and **Save to note** writes it back
  (re-syncing its `%% zon %%` blocks). "Save to folder" still turns whatever's in
  the editor into a reusable template.

## [1.0.0-beta.16] — 2026-06-27

### Fixed
- **Template Builder: arrow keys now move the caret.** In the builder's editor,
  pressing the arrow keys (and Home/End/PageUp/PageDown) did nothing — the caret
  wouldn't move (typing and shortcuts worked). The editor now handles caret
  navigation itself so it works reliably in the builder window.

### Added
- **The Template Builder is now available to everyone** (previously behind the
  experimental-features toggle). Open it from the **Template Builder…** button in
  an item's note actions, or **Build a note…** from the empty state — a dedicated
  window to compose and edit note & highlight templates with a live preview.
- **Template Builder: "Comment first" for composed blocks.** In the annotation
  block's Compose mode you can now lead with **your comment** and put the quote
  underneath as support (works for the list, blockquote and callout styles). It
  writes `order=comment-first` on the block marker.
- **Template Builder: split into separate blocks per tag.** Alongside "Separate
  block per colour", inserting an annotation block can now emit one block **per
  tag** (when the tag filter lists more than one), and the two splits combine into
  a colour × tag grid of blocks.

### Changed
- **Template Builder: richer updatable-field picker.** The field picker now
  groups **formatted presets** (citation/abstract/title/authors — which carry
  their own label, e.g. "**Citation:**") apart from **any field** (a bare value
  you label yourself), shows what the chosen field renders as, and lets you pick
  live vs static. This clarifies the "Citation appears twice" case — the formatted
  preset already includes its own `Citation:` label, so you don't add one.

## [1.0.0-beta.15] — 2026-06-26

### Added
- **Filter an annotations block by tag.** A block can now pull only the highlights
  carrying a given annotation tag: `%% zon kind=annotations tag=method … %%`
  (comma list = OR, e.g. `tag=method,finding`). Combines with `colour`/`type`.

### Changed
- **Update no longer imposes the template's heading structure on your note.** A
  note is free-form: your prose and `%% zon %%` blocks can go **anywhere**, with
  or without headings — you might have a freestyle note with several annotation
  blocks and nothing else. Update now refreshes **only** the YAML frontmatter
  (Zotero-owned keys) and syncs the `%% zon %%` blocks; the rest of the body is
  left byte-for-byte. Previously the non-manifest Update path re-merged the note
  against the template by heading, which could overwrite anything that didn't fit
  the template's `## Notes` / `## Annotations` shape (e.g. notes above the first
  heading). Frontmatter that should keep refreshing belongs in a `{{ }}`
  expression; plainly-filled keys are preserved as yours.

### Fixed
- **Settings → “Default note template” now lists your Templates-folder files
  first time.** The dropdown could come up with only the built-in options until
  you restarted Zotero; it now loads your folder's templates reliably when the
  pane opens.

## [1.0.0-beta.14] — 2026-06-25

### Added
- **Per-annotation tags in block templates.** A highlight's own tags (the ones
  you add to an annotation in the Zotero reader, e.g. `method` / `finding` /
  `quote`) are now available inside a block template as `{{tags}}` (a list to
  loop or filter) and `{{tagList}}` (a comma-joined string) — distinct from the
  item-level `{{allTags}}`. Lets you carry per-highlight role markers into the
  note. See docs/TEMPLATES.md.
- **`{{openPdf}}` template variable.** A whole-item variable (for `note.md` and
  `kind=field` elements) holding a `zotero://open-pdf/…` link that opens the
  item's PDF in Zotero's reader — complementing `{{desktopURI}}`, which only
  selects the item in the Library. Empty when the item has no PDF, so guard with
  `{% if openPdf %}`.

## [1.0.0-beta.13] — 2026-06-23

### Added
- **Route highlights by colour in a note template.** A new `highlights(...)`
  helper lets a whole-note template place annotation blocks where you want them —
  e.g. yellow highlights in one section, blue in another — each filled and kept
  in sync automatically: `{{ highlights(colour="blue", format="quote") }}`.
  Accepts `colour`, `type`, `format` and `sync`. A ready-made **`note-by-colour`**
  starter template demonstrates it. See docs/TEMPLATES.md.

## [1.0.0-beta.12] — 2026-06-23

### Changed
- **Templates refresh without a restart.** When you edit or add a template in
  another app and switch back to Zotero, the plugin re-reads the templates
  folder: edited template content is used by the next Insert, and added/renamed/
  removed templates update the Insert dropdown automatically. (Previously the
  template list was read only at startup.)

## [1.0.0-beta.11] — 2026-06-23

### Added
- **`{{dateAdded}}` and `{{dateModified}}` template variables** — the Zotero
  "Date Added" / "Date Modified" timestamps (as `YYYY-MM-DD`), usable in
  whole-note and `kind=field` templates.
- **Settings-pane icon** — the Obsidian Notepad crystal logo now appears next to
  the plugin in Zotero → Settings.

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
