# Obsidian Notepad for Zotero

Open, edit, and keep an item's **Obsidian vault markdown note right inside the
Zotero item pane** — and sync your PDF highlights into it as you read.

> Status: preparing the first public release. Cross-platform
> (Windows / macOS / Linux), Zotero 7+, [AGPL-3.0](LICENSE).

<!-- TODO: screenshots — item-pane editor, annotation sync, onboarding -->

## Why

If you read in Zotero but write in Obsidian, your literature notes live in two
places. This plugin puts the Obsidian note *in* Zotero: you read the PDF, take
notes, and pull highlights into the note without leaving the reader — and the
file on disk stays a clean, plain-markdown Obsidian note.

## Features

- **Edit the Obsidian note in Zotero.** Each item's linked `.md` note opens in a
  real markdown editor (CodeMirror) in the item pane, with live wiki-link and
  markdown highlighting. Saves straight to the file in your vault.
- **Sync PDF annotations into the note** as customisable **live blocks**. Re-syncs
  are *idempotent*: your prose and any frozen blocks are never touched.
- **Auto-sync (optional).** Turn it on and highlights flow into the open note as
  you annotate — no clicking Refresh.
- **Create a note from a template** for items that don't have one yet, populated
  with the item's metadata and a formatted bibliography.
- **Open in Obsidian** — jump to the note in the Obsidian app.
- **Safe by design.** Writes are atomic, and if a note changed on disk (e.g. you
  edited it in Obsidian) the plugin never silently overwrites it — it offers to
  reload or overwrite.

## Requirements

- Zotero 7 or later.
- An Obsidian vault (the plugin reads/writes plain `.md` files; Obsidian itself
  doesn't need to be running).
- Optional: [Better BibTeX](https://retorque.re/zotero-better-bibtex/) for stable
  citekeys (otherwise a citekey is derived from author + year).

## Install

_Coming soon_ via the Zotero plugins directory and GitHub Releases. Until then,
download the `.xpi` from a release and install it with **Tools → Plugins →
gear menu → Install Plugin From File…**. The plugin auto-updates from GitHub
Releases.

## First-run setup

Open any item and look at the **Obsidian Note** section in the item pane. If
nothing's configured yet you'll see a **Set up…** button — it detects your
installed Obsidian vaults, lets you pick one, and then pick the folder your
literature notes live in. You can change these later in **Settings → Obsidian
Notes** (with **Browse…** folder pickers).

## Templates

Notes and annotation blocks are authored in **Nunjucks** (the same templating
language as the popular Zotero-to-Obsidian export templates). A templates folder
holds your whole-note scaffold (`note.md`) and any insertable annotation-block
templates. See **[docs/TEMPLATES.md](docs/TEMPLATES.md)** for the variables,
the optional `%%! … %%` directive, and examples. Built-in block formats
(`list`, `quote`, `callout`, `compact`) are always available even with no folder.

## How it works / safety

The note is a normal markdown file in your vault — nothing is stored in a
hidden database. Annotation blocks are delimited by invisible Obsidian comments
(`%% zon … %%`), so Refresh can regenerate just those blocks and leave your
writing alone. Every write goes to a temporary file and is then renamed over the
target (atomic), and the plugin tracks each open note's modified-time so it can
detect and reconcile changes made outside Zotero.

## Development

```bash
npm install
npm test            # unit tests (Vitest) — pure logic
npm run test:zotero # integration tests (Mocha inside a throwaway Zotero)
npm run build       # build the .xpi into .scaffold/build/
npm start           # launch Zotero with the plugin (hot reload)
```

Built with [zotero-plugin-scaffold](https://github.com/northword/zotero-plugin-scaffold).
Copy `.env.example` to `.env` and set your Zotero path for `start` / `test:zotero`.

## Contributing

Issues and PRs welcome. Please run `npm test` before submitting. Translations are
welcome — UI strings are centralised (see `STRINGS` in `addon/bootstrap.js`).

## License

[AGPL-3.0](LICENSE).
