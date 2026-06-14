# RFC: Self-describing live elements (v2 engine)

> Status: **draft for discussion**. Not implemented. Supersedes the current
> note.md-field-name merge for frontmatter and the annotations-only live block.

## Goals

1. **Maximum editability / compatibility.** The note stays a plain, portable
   `.md` — self-describing, no sidecar. Move/copy/sync it and nothing is lost.
2. **Blank-note workflow.** Start empty; insert *elements* or *bundles of
   elements*; choose per element whether it syncs.
3. **Per-element sync, toggleable.** Each element is `sync=on` (auto-refresh from
   Zotero) or `sync=off` (frozen snapshot); flip any time.
4. **Deletion sticks.** Delete an element → it stays gone. No re-adding, no
   tombstones.
5. **Readable in BOTH apps.** Invisible in Obsidian reading mode *and* presented
   cleanly in the Zotero editor — without removing the provenance from the file.
6. **No retroactive surprises.** Editing a template later must not silently
   change the behaviour of notes already created from it.

## Core idea

Provenance lives **inside the note**, as invisible markers, not in a shadow
folder. The note *is* the manifest. Two carriers:

- **Body elements** → wrapped in Obsidian comment markers (`%% zon … %%`), which
  are already invisible in Obsidian reading mode.
- **Frontmatter fields** → can't hold `%%` cleanly, so a reserved `zon:` map in
  the YAML records which keys are managed and how.

The plugin only ever acts on what's present in the note. Absent = unmanaged →
deletion is free.

## Marker schema

### Body element
```
%% zon id=a1 kind=annotations sync=on format=list colour=all %%
- [p.51](zotero://open-pdf/…?page=51&annotation=HXQB) "…" %% ann:HXQB %%
%% /zon %%
```
- `id` — short stable id (referenced by undo/migration; unique per note).
- `kind` — `annotations` | `section` | `field` | `custom` (extensible).
- `sync` — `on` | `off`.
- kind-specific keys — `format`, `colour`, …
- Per-item anchors inside (`%% ann:KEY %%`) stay, so annotation-level manual
  edits can be preserved by key (see Open Q3).

### Frontmatter manifest (two options — **decision needed**)

**Option A — light list.** Names the managed keys; the *source* of each comes
from a built-in field map (Title→title, Year→date, Author→creators, Topics→tags)
or the active `note.md`:
```yaml
zon-sync: [Title, Year, Author, Topics]
```
**Option B — self-contained map (recommended).** Stores each managed field's
source expression *in the note*, so behaviour never depends on the current
`note.md` (kills the "retroactive surprise" fragility — Goal 6):
```yaml
zon:
  Year: "{{date | format('YYYY')}}"
  Topics: "{{tags}}"
```
Either way: remove a key from the manifest (or delete it) → it stops syncing.

## Presentation layer (Zotero CodeMirror editor)

The Zotero pane shows raw source, so a CM6 decoration layer makes markers behave
like Obsidian reading mode **without** changing the file:

- **Hide or chip** the `%% zon %%` / `%% /zon %%` / `%% ann:… %%` lines and the
  `zon:` frontmatter block. A chip could read `⟳ Annotations · synced` with a
  click-to-freeze toggle.
- **Reveal-on-cursor** — entering a marker line shows its raw text for editing,
  then re-hides (Obsidian Live-Preview behaviour).
- **Atomic ranges** — arrow keys / backspace treat a hidden marker as one unit,
  so editing feels natural.
- **Global "Show markers" toggle** (requested) — a toolbar button / command that
  turns decorations off to reveal all raw markers + the `zon:` block, and back.
  Applies to both inline markers and the frontmatter manifest.

## Flows

- **Insert** — toolbar offers single *elements* (a field, an annotations block, a
  section) and *bundles* (a template = several elements). Each insert chooses
  `sync=on/off` (default configurable); writes the marker(s) + a `zon:` entry for
  any managed frontmatter field.
- **Refresh** — scan the note for `%% zon %%` blocks + the `zon:` map; regenerate
  `sync=on` blocks in place (idempotent; annotations merged by key); update only
  the managed frontmatter keys; never touch prose, frozen blocks, or absent
  elements.
- **Auto-sync** (notifier) — same, in the background. Decision: all elements, or
  annotation blocks only? (Open Q4.)
- **Toggle sync** — flip an element's chip (or its marker / its `zon:` entry).
- **Delete** — remove the block (or the `zon:` key). Stays gone.

## Migration

- Existing annotation blocks already use `%% zon … %%` → forward-compatible.
- Existing field-name frontmatter → on first v2 refresh (or a one-click
  "Convert"), write a `zon:` map for the recognised template fields; keep the old
  field-name matching as a fallback so nothing breaks pre-migration.

## Risks / caveats

- **Atomic-range editing UX** needs care (the main implementation risk).
- **Obsidian *source* mode** still shows markers (expected; reading mode hides).
- **Decoration performance** on very large notes (mitigate: only decorate the
  viewport).
- **YAML can't carry `%%`** → the reserved `zon:` key is the chosen workaround;
  it's hidden by the presentation layer.

## Phasing

- **A.** Generalise the block engine to all element kinds + per-element `sync`
  flag + insert UI (extends today's annotations-only engine).
- **B.** Frontmatter `zon:` manifest + field mappings + migration.
- **C.** CodeMirror presentation layer (hide/chip, reveal-on-cursor, atomic
  ranges, Show-markers toggle).
- **D — later.** Richer "presentation mode": render headings / bold / links
  inline (Obsidian-Live-Preview-lite) in the Zotero editor. Nice-to-have; larger.

## Open questions (need your call)

1. **Frontmatter manifest:** Option A (light list) or B (self-contained map)?
   B is more robust/portable; A is lighter.
2. **Marker verbosity:** full inline metadata, or minimal `%%zon:a1%%` id in the
   body with metadata in the frontmatter map?
3. **Annotation-level edits:** preserve manual edits *inside* a `sync=on` block
   (by `%% ann:KEY %%`), or treat `sync=on` blocks as fully regenerated?
4. **Auto-sync scope:** background-refresh all elements, or annotation blocks
   only (metadata on manual Refresh)?
5. **Default on insert:** `sync=on` or `sync=off`?
