# Obsidian Notepad for Zotero

Open, edit, and keep an item's **Obsidian vault markdown note right inside the
Zotero item pane** — and sync your PDF highlights into it as you read.

<p align="center">
  <img src="docs/images/00-demo.gif" alt="Toggling reading view: the note renders like Obsidian, or shows raw markdown" width="380">
</p>

[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-support-FFDD00?logo=buymeacoffee&logoColor=black)](https://buymeacoffee.com/acatechnic)

> Status: **public beta** (v1.0.0-beta.15). Cross-platform
> (Windows / macOS / Linux), Zotero 7+, [AGPL-3.0](LICENSE).
>
> **Install:** download **[`obsidian-notepad-for-zotero.xpi`](https://github.com/Acatechnic/obsidian-notepad-for-zotero/releases/download/v1.0.0-beta.15/obsidian-notepad-for-zotero.xpi)**
> (or browse [all releases](https://github.com/Acatechnic/obsidian-notepad-for-zotero/releases)),
> then in Zotero: Tools → Plugins → gear icon → *Install Plugin From File…*
> It auto-updates after that.
>
> Like it? [**Buy me a coffee ☕**](https://buymeacoffee.com/acatechnic)

## Screenshots

| The note, in Zotero | Synced highlights | Settings |
| --- | --- | --- |
| ![The Obsidian note rendered in the Zotero item pane](docs/images/01-editor-pane.png) | ![PDF highlights synced into the note](docs/images/02-annotation-sync.png) | ![Obsidian Notepad settings](docs/images/03-setup.png) |

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
- **Group highlights by colour.** A note template can route each annotation colour
  into its own section — yellow key passages here, blue follow-ups there — with the
  `highlights(colour="…")` helper (try the built-in `note-by-colour` template).
- **Image annotations too.** Area/image annotations are exported into your vault
  and embedded in the note (`![[…]]`) — and shown inline in the pane's reading view.
- **Auto-sync (optional).** Turn it on and highlights flow into the open note as
  you annotate — no clicking Update.
- **Links to your existing notes** by a `citekey:`/`ZoteroLink:` frontmatter field
  or a **configurable filename pattern** (`{{author}} {{year}} - {{title}}`, …),
  with a **Rescan** button to pick up notes added outside Zotero.
- **Create a note from a template** for items that don't have one yet, populated
  with the item's metadata and a formatted bibliography.
- **Open in Obsidian** — jump to the note in the Obsidian app.
- **Push tags back to Zotero** *(opt-in, experimental)* — mirror a note's tag
  field to the Zotero item, previewing every change first.
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

1. Download **[`obsidian-notepad-for-zotero.xpi`](https://github.com/Acatechnic/obsidian-notepad-for-zotero/releases/download/v1.0.0-beta.15/obsidian-notepad-for-zotero.xpi)**
   (latest beta) — or pick a build from [all releases](https://github.com/Acatechnic/obsidian-notepad-for-zotero/releases).
2. In Zotero: **Tools → Plugins → gear menu → Install Plugin From File…** and choose the `.xpi`.
3. That's it — the plugin **auto-updates** from GitHub Releases from then on.

_A listing in the Zotero plugins directory is coming later._

If it saves you time, you can [**buy me a coffee ☕**](https://buymeacoffee.com/acatechnic) — much appreciated, never required.

## First-run setup

Open any item and look at the **Obsidian Notepad** section in the item pane. If
nothing's configured yet you'll see a **Set up…** button — it detects your
installed Obsidian vaults, lets you pick one, and then pick the folder your
literature notes live in. You can change these later in **Settings → Obsidian
Notepad** (with **Browse…** folder pickers).

## Templates

Notes and annotation blocks are authored in **Nunjucks** (the same templating
language as the popular Zotero-to-Obsidian export templates). A templates folder
holds your whole-note scaffold (`note.md`) and any insertable annotation-block
templates. Built-in block formats (`list`, `quote`, `callout`, `compact`) are
always available even with no folder. A note template can also drop annotation
blocks into specific sections — including one per colour — with
`{{ highlights(colour="…") }}`. Edit or add a template in Obsidian and the change
is picked up when you switch back to Zotero (no restart needed).

See **[docs/TEMPLATES.md](docs/TEMPLATES.md)** for the full guide: the available
variables, the optional `%%! … %%` template directive, a reference for the
**`%% zon … %%` blocks** the plugin writes into your notes (every attribute, the
`ann:` anchors, how Update regenerates them) and the **`zon:` frontmatter** that
keeps managed fields synced — useful if you're translating templates from another
tool.

## How it works / safety

The note is a normal markdown file in your vault — nothing is stored in a
hidden database. Annotation blocks are delimited by invisible Obsidian comments
(`%% zon … %%`), so Update can regenerate just those blocks and leave your
writing alone. Every write goes to a temporary file and is then renamed over the
target (atomic), and the plugin tracks each open note's modified-time so it can
detect and reconcile changes made outside Zotero.

## Known limitations (beta)

This is an early public beta — please report anything odd, and:

- **Back up your notes, and consider pointing it at a *test* Zotero library first**
  — especially before trying **Push tags → Zotero**, which is the one feature that
  writes to your library.
- **Sync is one-way by default** (Zotero → note). Reverse sync (note → Zotero) is
  currently **tags only**, opt-in (behind *Settings → Enable experimental features*),
  and previews every change before writing. Pushing other fields (title, authors, …)
  back to Zotero isn't supported yet.
- **Not yet in the Zotero plugins directory** — install the `.xpi` from Releases
  (it auto-updates from there).
- Templates are written in **Nunjucks**; there's a small learning curve if you
  want to customise them (built-in templates work out of the box).
- A note must live **inside your configured notes folder** for the plugin to link
  and sync it.

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

## Feedback

Trying the beta? **First impressions, questions, and ideas** are very welcome in
[**GitHub Discussions**](https://github.com/Acatechnic/obsidian-notepad-for-zotero/discussions);
clear, reproducible bugs are best as [Issues](https://github.com/Acatechnic/obsidian-notepad-for-zotero/issues).
Curious where it's heading? See the [**Roadmap**](ROADMAP.md).

## Contributing

Issues and PRs welcome. Please run `npm test` before submitting. Translations are
welcome — UI strings are centralised (see `STRINGS` in `addon/bootstrap.js`).

## Support

This plugin is free and open source. If it's useful to you and you'd like to
support its development, you can [**buy me a coffee ☕**](https://buymeacoffee.com/acatechnic).
Entirely optional — bug reports and PRs are just as welcome.

## License

[AGPL-3.0](LICENSE).
