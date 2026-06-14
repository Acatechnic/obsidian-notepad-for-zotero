# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

First public release. Highlights:

### Added
- **In-pane Obsidian note editor** — each item's linked vault `.md` note opens in
  a CodeMirror markdown editor in the Zotero item pane (works in the library and
  in reader tabs).
- **Annotation sync into live blocks** — pull PDF highlights into customisable,
  idempotent `%% zon … %%` blocks that re-sync without touching your prose.
- **Auto-sync** — optional: highlights flow into the open note as you annotate.
- **Create note from template** — for items with no note yet, populated with
  metadata and a formatted bibliography (via Zotero QuickCopy / APA fallback).
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
