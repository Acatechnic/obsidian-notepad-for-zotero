# Obsidian Notepad for Zotero

Open, edit, and keep an item's **Obsidian vault markdown note right inside the
Zotero item pane** — and sync your PDF highlights into it.

> Status: pre-1.0, preparing for public release. Cross-platform
> (Windows / macOS / Linux), AGPL-3.0.

## What it does

- Shows each Zotero item's linked Obsidian note in an item-pane section, edited
  with a real markdown editor (CodeMirror) — no leaving Zotero.
- Syncs PDF annotations into customisable **live blocks** in the note. Re-syncs
  are idempotent: your prose and frozen blocks are never touched.
- **Auto-sync** (optional): highlight in the reader and the note updates itself.
- Create a note from a template, "Open in Obsidian", and migrate legacy
  annotation dumps into live blocks.

## Install

_Coming soon_ via the Zotero plugins directory and GitHub Releases. The plugin
targets Zotero 7+.

## Configuration

On first run you'll point the plugin at your Obsidian vault and the folder where
your literature notes live. See **Settings → Obsidian Notepad** (folder pickers).

## Templates

Notes and annotation blocks are authored in Nunjucks. See
[`docs/TEMPLATES.md`](docs/TEMPLATES.md) _(to be added)_ for the variables and
directives.

## Development

```bash
npm install
npm test          # unit tests (Vitest)
npm run build     # build the .xpi
npm start         # launch Zotero with the plugin (hot reload)
```

## License

[AGPL-3.0](LICENSE).
