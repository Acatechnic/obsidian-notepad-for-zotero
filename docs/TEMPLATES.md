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

### Variables in `note.md` and in a `kind=field` element (whole-item)

`{{citekey}}`, `{{title}}`, `{{date}}`, `{{dateAdded}}`, `{{dateModified}}`,
`{{itemType}}`, `{{publicationTitle}}`, `{{abstractNote}}`, `{{bibliography}}`,
`{{desktopURI}}`, `{{creators}}` (each has `.firstName` / `.lastName`),
`{{allTags}}`.

`{{dateAdded}}` and `{{dateModified}}` are the Zotero "Date Added" / "Date
Modified" timestamps as `YYYY-MM-DD`.

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

---

## LLM-assisted templates (`{% llm %}` blocks)

Templates can include **LLM blocks** — prompt-marked regions that are sent to an
LLM endpoint and replaced by the model's response. This lets you summarise,
rewrite, classify, or translate content without leaving Zotero.

**Requirements:**
- An LLM provider must be configured in Settings → Obsidian Notes → LLM.
- The template containing an `{% llm %}` block is treated as a
  **once-per-item** (document) template — it is never rendered once per
  annotation, even if it lives in a file named like an annotation template.
- The provider is OpenAI-compatible Chat Completions. Point it at any compatible
  endpoint — local Ollama (default, `http://localhost:11434/v1`), OpenAI,
  LM Studio, etc. The model name and optional API key are set in Settings. The
  plugin does not ship a model or key.

### Syntax

```
{% llm context="<ctx>" %}
<prompt body>
{% endllm %}
```

- **`context`** (required) — which item data to prepend as context for the prompt.
- **Prompt body** — free-form text; must be non-empty.
- **`{% endllm %}`** (required) — closes the block.

Example:

```
{% llm context="abstract" %}
Summarise the following in three bullet points:
{% endllm %}
```

### Supported contexts

| Context         | Data source                                          |
|-----------------|------------------------------------------------------|
| `abstract`      | The item's `abstractNote` field                      |
| `annotations`   | PDF annotations rendered to text                     |
| `fulltext`      | Primary PDF's extracted text (from Zotero's FT cache) |

Each context injects its data into the prompt as part of the request payload.
### Comma-separated contexts

You may list more than one context, comma-separated:

```
{% llm context="abstract,annotations" %}Summarise how the abstract and annotations relate.{% endllm %}
```

Each requested context is resolved in template order and labeled in the
assembled prompt:

```
## Context: abstract
<abstract text>

## Context: annotations
<annotations text>
```

The combined context text (excluding the task prompt) must fit within the
configured `maxContextChars` limit; if it exceeds the limit the run fails with
a `CONTEXT_TOO_LARGE` error. If **any** requested context is missing for an
item (e.g. no extracted full text), the **entire block** fails with
`CONTEXT_MISSING` — there is no partial assembly or silent fallback to the
available contexts.

### Unresolved placeholders

Placeholders in the prompt body (`{{variable}}`) are resolved by Nunjucks
against item data when the note is rendered, before the LLM block is executed.
This works exactly like the rest of the template — use variables that exist in
the item data (see [Variables in `note.md`](#variables-in-notemd-and-in-a-kindfield-element-whole-item)).

Undefined variables render as the empty string (Nunjucks default behaviour;
`autoescape` is off). For example, if `{{title}}` is defined it will be
substituted; if `{{nonexistent}}` is used it will vanish silently.

### Run LLM (manual execution)

Open a note containing one or more `{% llm %}` blocks and choose **Run LLM**
from the note-pane toolbar or context menu.

- Blocks execute in document order.
- Each block's result replaces the block in-place.
- **All-or-nothing:** if any block fails (context missing, HTTP error, empty
  response, etc.), *no* block results are written and all original `{% llm %}`
  blocks are left intact. The error is surfaced to the user.

### Auto-run

When **Auto-run LLM** is enabled in Settings (and an LLM is configured), blocks
run automatically when:
- A note is created from a template.
- A template block is inserted into an existing note (via the Insert toolbar).

With auto-run off, blocks are preserved as-is and left for manual execution.
Note that auto-run still honours all-or-nothing semantics — if auto-run fails,
the note is left in its un-run state so the user can diagnose and retry.

### Missing-context failure

If the requested context exists (e.g. `abstract`) but the item's corresponding
data is empty (the item has no `abstractNote`), the run fails with a **clear
error naming the missing context**. No fallback to a different context, no
placeholder insertion. The block is left untouched and the error is shown.

### Body-only restrictions

LLM blocks are subject to the following validation rules. Any violation is a
parse error — the block is not executed and the error is surfaced:

| Restriction                     | Detail                                              |
|---------------------------------|-----------------------------------------------------|
| **Frontmatter**                 | LLM blocks are rejected inside YAML frontmatter.    |
| **Inside `%% zon %%`**         | LLM blocks are rejected inside live annotation blocks. |
| **Empty body**                  | The prompt body must be non-empty.                  |
| **Missing / empty context**     | `context` attribute is required and must be set.    |
| **Unknown context**             | A context name not in the supported list is rejected. |
| **Unclosed block**              | `{% endllm %}` missing → parse error.               |
| **Stray close**                 | `{% endllm %}` without a matching open → parse error. |

### No silent fallback

The interpreter **never guesses**. Every error scenario — parse errors, missing
context, HTTP failures (timeout, network error, non-200 status), empty model
responses, malformed JSON — **aborts the whole run**. The note is not modified
and the error is surfaced to the user with a descriptive message. There is no
fallback to "remove the block" or "insert a best-effort guess".

This means a template with LLM blocks always produces exactly the intended
output on success, and preserves the template source on failure for diagnosis.
