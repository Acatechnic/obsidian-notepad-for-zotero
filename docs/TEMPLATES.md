# Obsidian Notepad for Zotero — Templates

This folder holds the templates the **Obsidian Notepad for Zotero** plugin uses.
There are two kinds of file here, distinguished only by name:

- **`note.md`** (and any **`note-*.md`**) — *whole-note scaffolds*. Used by
  **Create note from template** when an item has no note yet. Renders the
  frontmatter, citation, abstract, and empty section headings. You can keep
  several (`note.md`, `note-book.md`, `note-minimal.md`, …); the **default** is
  set in Settings → Obsidian Notepad → *Default note template* (which can be **any**
  template, not just `note-*` — including a per-annotation or field template, in
  which case a created note is just that block), and the Create panel lets you pick
  a different one per note.
- **Every other file** (`highlight.md`, `key-quote.md`, …) — an *insertable block
  template*. Each appears in the **Template** dropdown in the item pane by its
  filename (without the extension). When you click **Insert**, the selected
  template renders the item's annotations into a live block.

You manage all of this from Obsidian: add a file → it shows up in the dropdown;
edit a file → the new look applies on the next Insert/Update. Changes are picked
up when you switch back to Zotero — no restart needed.

---

## The language is Nunjucks

Templates are written in **Nunjucks**.You have `{{ variable }}`,
`{% if %}` / `{% for %}`, and filters like `{{ date | format("YYYY") }}`.

### Variables available in a *block* template (per annotation)

| Variable        | Meaning                                                |
|-----------------|--------------------------------------------------------|
| `{{text}}`      | the highlighted text                                   |
| `{{comment}}`   | your note on the annotation (may be empty)             |
| `{{page}}`      | page label shown in the PDF (e.g. `12`, `iv`)          |
| `{{link}}`      | `zotero://open-pdf/...` deep link back to that page    |
| `{{colour}}`    | annotation colour name (`yellow`, `red`, …)            |
| `{{type}}`      | `highlight`, `underline`, `image`, `note` (ink isn't rendered) |
| `{{citekey}}`   | the item's citekey                                     |
| `{{imageBaseName}}` | filename for an image annotation                   |
| `{{tags}}`      | the **highlight's own** tags, as a list (loop/filter it) |
| `{{tagList}}`   | the same tags as a comma-joined string                 |

`{{tags}}` is the annotation's *own* tags (the ones you add to a highlight in the
Zotero reader), distinct from the item-level `{{allTags}}` in a note template. Use
it to carry per-highlight role markers into the note — e.g. tag highlights
`method` / `finding` / `quote` and render or filter on them:

```nunjucks
%%! sync=on %%
> {{text}}{% if tags %} {% for t in tags %}#{{t}} {% endfor %}{% endif %}
> — [p.{{page}}]({{link}})
```

### Variables in `note.md` and in a `kind=field` element (whole-item)

`{{citekey}}`, `{{title}}`, `{{date}}`, `{{dateAdded}}`, `{{dateModified}}`,
`{{itemType}}`, `{{publicationTitle}}`, `{{abstractNote}}`, `{{bibliography}}`,
`{{desktopURI}}`, `{{openPdf}}`, `{{creators}}` (each has `.firstName` /
`.lastName`), `{{allTags}}`.

`{{dateAdded}}` and `{{dateModified}}` are the Zotero "Date Added" / "Date
Modified" timestamps as `YYYY-MM-DD`. (These are whole-item variables — they
work in `note.md` and `kind=field` elements, **not** inside a per-annotation
block, whose context is the highlight, not the item.)

`{{desktopURI}}` is a `zotero://select/…` link that highlights the item in the
Zotero **Library**; `{{openPdf}}` is a `zotero://open-pdf/…` link that opens the
item's PDF in the **reader** (empty when the item has no PDF, so guard it with
`{% if openPdf %}`). For example: `[Open PDF]({{openPdf}})`.

---

## Routing highlights by colour in a *note* template

A whole-note template can place annotation blocks wherever you want — so you can
send, say, blue highlights to one section and yellow to another. Use the
`highlights(...)` helper: each call drops in a block that fills with the matching
highlights and **stays in sync** on every Update.

```nunjucks
---
Title: "{{title}}"
Year: "{{date | format("YYYY")}}"
---

## Key passages (yellow)
{{ highlights(colour="yellow", format="quote") }}

## Critiques (red)
{{ highlights(colour="red", format="quote") }}

## To follow up (blue)
{{ highlights(colour="blue", format="quote") }}
```

When you create a note from this template, each `highlights(...)` expands into a
managed block and is filled with just that colour's highlights, in the right
place. (The shipped **`note-by-colour`** starter template is exactly this — copy
and tweak it.)

`highlights(...)` options (all optional):

| Argument  | Example | Meaning |
| --- | --- | --- |
| `colour`  | `highlights(colour="blue")` or `highlights("blue")` | Only this colour (`yellow`/`red`/`green`/`blue`/`purple`/`magenta`/`orange`/`grey`). Omit for **all** colours. |
| `type`    | `type="image"` | Only this annotation type. Omit for all. |
| `format`  | `format="quote"` | Which per-annotation format to render with (`list`, `quote`, `callout`, `compact`, or your own). Defaults to `list`. |
| `sync`    | `sync="off"` | `off` inserts a frozen one-time snapshot instead of a live block. |

This is the same machinery as the Insert dropdown — `highlights()` just lets a
note template lay the blocks out for you up front.

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
  - **`kind`** — what *kind* of element this template inserts:
    - omitted / `annotations` (default) — a live annotations block (everything
      above): the body is rendered once **per highlight**, filtered by colour.
    - `field` / `section` / `custom` — a **metadata element**: the body is rendered
      **once over the item's data** (Title, abstract, citation, …) and refreshes
      from Zotero like an annotations block does. Use this for, e.g., an abstract
      panel or a formatted citation that stays in sync. A `kind=field` template
      uses the *whole-item* variables below, not the per-annotation ones, and
      ignores `colour` (there are no highlights to filter).

Anything you set in the toolbar at Insert time overrides these defaults.

---

## `%% zon … %%` blocks — reference

This is the part to read if you're migrating templates from another tool and want
to understand what ends up *in* your notes.

When you Insert, the plugin wraps the rendered output in a pair of invisible
markers — **Obsidian's own comment syntax** (`%% … %%`), so they don't show in
reading view:

```
%% zon kind=annotations colour=yellow type=highlight sync=on format=key-quote %%
> "A highlighted sentence." %% ann:ABCD1234 %%
> — [p.12](zotero://open-pdf/library/items/KEY?page=12&annotation=ABCD1234)
%% /zon %%
```

You never write these by hand — **Insert** creates them and **Update** regenerates
them. The open marker carries the block's settings as `key=value` attributes:

| Attribute | Values | What it does |
| --- | --- | --- |
| `kind` | `annotations` (default), `field`, `section`, `custom` | `annotations` renders the body once **per highlight**; the others render **once over the item's data** (abstract, citation, a metadata field) — see the directive section above. |
| `colour` | `all`, `yellow`, `red`, `green`, `blue`, `purple`, `magenta`, `orange`, `grey` | Only pull highlights of this colour (`annotations` blocks only). |
| `type` | `all`, `highlight`, `underline`, `image`, `ink`, `note` | Only pull annotations of this type. Omitted = all types. |
| `tag` | a tag name, or a comma list (`tag=method` / `tag=method,finding`) | Only pull highlights carrying one of these **annotation tags** (the tags you add to a highlight in the Zotero reader). Comma list = OR. Combines with `colour`/`type` (AND across filters). Omitted = any. `tags=` is an alias. |
| `sync` | `on` (default), `off` | `on` = the block **mirrors Zotero** and is regenerated on every Update. `off` = a **frozen** one-time snapshot Update never touches — use it to hand-curate. |
| `format` | a template name (`list`, `quote`, `callout`, `compact`, or your own file) | Which per-annotation template rendered the body, so Update can re-render it the same way. |

### The `%% ann:KEY %%` anchors

Inside an `annotations` block, each rendered highlight ends in an invisible
`%% ann:<annotationKey> %%` anchor marking where that annotation's entry ends.
Its job is to let the plugin find the **end of the last annotation**, so prose you
add *after* it can be kept (see below).

### How Update treats a block

- `sync=on` → **mirrors Zotero**. The *whole block body is regenerated* from the
  item's current annotations every time you Update: edited highlight text / changed
  comments update, new annotations appear in Zotero's order, removed ones disappear.
  **The only writing of your own the block keeps is free prose after the last
  annotation** (a closing/synthesis paragraph). Text you type *between* annotations
  is part of the regenerated body and will be replaced — that's expected.
- `sync=off` → **left exactly as-is**. Flip a block to `sync=off` once you've
  hand-edited it and want it frozen against further Updates.
- Everything **outside** `%% zon %%` blocks — your own writing, headings, links —
  is never touched.

### What's yours vs. what refreshes

The note body is **yours**. It's free-form markdown: write whatever you like,
with whatever headings you like — or none. Put `%% zon %%` blocks **anywhere**
you want; you can have a freestyle note with several annotation blocks and
nothing else. **Update only ever changes two things:**

1. **The YAML frontmatter** — Zotero-owned keys (those filled by a `{{ }}`
   expression in your template) are refreshed; keys you fill in plainly are
   treated as yours and preserved, as are any keys you add. A note with no
   frontmatter is left without one.
2. **The inside of `sync=on` `%% zon %%` blocks** — regenerated from Zotero's
   current annotations, wherever the block sits.

**Everything else in the body is left byte-for-byte** — prose above, below, or
between blocks; your headings; links; text with no heading at all. There is no
required `## Notes` or `## Annotations` structure. If you want a value to keep
refreshing from Zotero, drive it from a `{{ }}` expression (in the frontmatter or
a `%% zon kind=field %%` block); anything you type as plain text stays put.

### Where to put your own notes

Because a `sync=on` block belongs to Zotero, put your writing where it survives:

- **A thought on one specific highlight** → add it as that annotation's **comment
  in Zotero**. It renders under the highlight (via `{{comment}}`) and re-syncs on
  every Update — the durable home for per-annotation notes.
- **A synthesis / summary** → *after* the last annotation in the block (kept as the
  trailing prose), or anywhere **outside** the block.
- **Want to hand-curate a block freely?** → set it `sync=off` to freeze it.

## The `zon:` frontmatter (managed fields)

Separately from blocks, a note's YAML frontmatter can carry a reserved `zon:` map
that records **which frontmatter fields stay synced from Zotero, and how** — each
as a one-line Nunjucks expression:

```yaml
---
Title: "Policing the Crisis"
Year: "1978"
zon:
  Title: "\"{{title}}\""
  Year: "\"{{date | format('YYYY')}}\""
  tags: Topics          # reverse sync: this note's `Topics` field → Zotero tags
  attachments: References/Attachments   # where image annotations export to
---
```

On Update, each managed key is re-rendered from the item; unmanaged keys, the
`zon:` map itself, and the note body are left alone. Because the expression lives
**in the note**, editing a template later never retroactively rewrites existing
notes. The reserved keys `tags:` and `attachments:` configure reverse tag sync and
the image-export folder per-note (both have global defaults in Settings).

---

## Example templates in this folder

- **`highlight.md`** — plain list, colour chosen in the toolbar.
- **`key-quote.md`** — blockquote, pinned to `yellow` (`%%! colour=yellow %%`).
- **`critique.md`** — red callout, pinned to `red`.
- **`snapshot.md`** — a frozen one-time list (`%%! sync=off %%`).
- **`abstract.md`** — a `kind=field` element: the item's abstract in a callout,
  kept in sync (`%%! kind=field %%`).
- **`note-by-colour.md`** — a whole-note scaffold that routes each highlight
  colour into its own section using `highlights(colour="…")` (see above).

Copy any of these to make your own. Rename freely — the filename is the label.
The built-in templates `list`, `quote`, `callout`, `compact` are always present
even if this folder is empty.
