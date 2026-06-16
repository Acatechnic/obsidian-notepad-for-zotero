# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
