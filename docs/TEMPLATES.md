# Zotero → Obsidian Notes — Templates

This folder holds the templates the **Obsidian Notes** Zotero plugin uses. There
are two kinds of file here, distinguished only by name:

- **`note.md`** (and any **`note-*.md`**) — *whole-note scaffolds*. Used by
  **Create note from template** when an item has no note yet. Renders the
  frontmatter, citation, abstract, and empty section headings. You can keep
  several (`note.md`, `note-book.md`, `note-minimal.md`, …); the **default** is
  set in Settings → Obsidian Notes → *Default note template*, and the Create
  panel lets you pick a different one per note when you have more than one.
- **Every other file** (`highlight.md`, `key-quote.md`, …) — an *insertable block
  template*. Each appears in the **Template** dropdown in the item pane by its
  filename (without the extension). When you click **Insert**, the selected
  template renders the item's annotations into a live block.

You manage all of this from Obsidian: add a file → it shows up in the dropdown;
edit a file → the new look applies on the next Insert/Refresh.

---

## The language is Nunjucks

Templates are written in **Nunjucks** — the *same* templating language as your
existing `Zotero Template.md`. Nothing new to learn. You have `{{ variable }}`,
`{% if %}` / `{% for %}`, and filters like `{{ date | format("YYYY") }}`.

### Variables available in a *block* template (per annotation)

| Variable        | Meaning                                                |
|-----------------|--------------------------------------------------------|
| `{{text}}`      | the highlighted text                                   |
| `{{comment}}`   | your note on the annotation (may be empty)             |
| `{{page}}`      | page label shown in the PDF (e.g. `12`, `iv`)          |
| `{{link}}`      | `zotero://open-pdf/...` deep link back to that page    |
| `{{colour}}`    | annotation colour name (`yellow`, `red`, …)            |
| `{{type}}`      | `highlight`, `note`, `image`                           |
| `{{citekey}}`   | the item's citekey                                     |
| `{{imageBaseName}}` | filename for an image annotation                   |

### Variables in `note.md` (whole-item)

`{{citekey}}`, `{{title}}`, `{{date}}`, `{{itemType}}`, `{{publicationTitle}}`,
`{{abstractNote}}`, `{{bibliography}}`, `{{desktopURI}}`, `{{creators}}` (each has
`.firstName` / `.lastName`), `{{allTags}}`.

---

## The optional first-line directive: `%%! … %%`

A block template *may* begin with one special line that pins its defaults:

```
%%! colour=yellow sync=on sep=blank %%
> {{text}}
> — [p.{{page}}]({{link}})
```

- `%%! … %%` is read by the plugin and **stripped** before rendering — it never
  appears in your note. (The `!` is what marks it as a directive, so it isn't
  confused with a `%% zon %%` block marker.)
- Keys:
  - **`colour`** — pin this template to one annotation colour (`yellow`, `red`,
    `green`, `blue`, `purple`, `magenta`, `orange`, `grey`, or `all`). This is how
    a "yellow key-quotes" preset is always available in the dropdown.
  - **`sync`** — `on` (default) keeps the block refreshing from Zotero; `off`
    inserts a frozen one-time snapshot.
  - **`sep`** — how rendered annotations are joined: `blank` (blank line between)
    or `newline`. If omitted it's inferred (multi-line bodies get a blank line).

Anything you set in the toolbar at Insert time overrides these defaults.

---

## What `%% zon … %%` is (in your finished notes)

When you Insert, the plugin wraps the rendered annotations in an invisible marker:

```
%% zon kind=annotations colour=yellow sync=on format=key-quote %%
> …your annotations…
%% /zon %%
```

`%% … %%` is **Obsidian's own comment syntax** — it's invisible in reading view.
It's there so **Refresh** can find the block and regenerate it from Zotero without
touching your prose or any frozen (`sync=off`) blocks. You don't write these by
hand — Insert does it. `format=` records which template produced the block.

---

## Example templates in this folder

- **`highlight.md`** — plain list, colour chosen in the toolbar.
- **`key-quote.md`** — blockquote, pinned to `yellow` (`%%! colour=yellow %%`).
- **`critique.md`** — red callout, pinned to `red`.
- **`snapshot.md`** — a frozen one-time list (`%%! sync=off %%`).

Copy any of these to make your own. Rename freely — the filename is the label.
The built-in templates `list`, `quote`, `callout`, `compact` are always present
even if this folder is empty.
