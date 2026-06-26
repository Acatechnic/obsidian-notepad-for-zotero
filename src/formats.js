// Pre-designed per-annotation formats that ship with the plugin. A block picks
// one via `format=<name>`. Each is a Nunjucks template rendering ONE annotation
// plus a separator used to join them. Fully customisable: users can override
// these or add their own (later, by pointing at a folder of templates).
//
// Available variables per annotation: text, comment, page (= pageLabel),
// pageIndex, key, colour, type, link (zotero://open-pdf deep link), citekey,
// imageBaseName, attachmentFolder.
//
// Image (area) annotations have no `text`; they carry an `imageBaseName` pointing
// at the PNG the plugin exported to `<attachmentFolder>/<citekey>/`. Each format
// emits an Obsidian embed `![[…]]` in that case, and the plain text version
// otherwise — so for text highlights the output is byte-identical to before.
export const DEFAULT_FORMATS = {
  list: {
    item: `- [p.{{page}}]({{link}}) {% if imageBaseName %}![[{{attachmentFolder}}/{{citekey}}/{{imageBaseName}}]]{% else %}"{{text}}"{% endif %}{% if comment %} — *{{comment}}*{% endif %}`,
    sep: "\n",
  },
  quote: {
    item: `> {% if imageBaseName %}![[{{attachmentFolder}}/{{citekey}}/{{imageBaseName}}]]{% else %}{{text}}{% endif %}\n> — [p.{{page}}]({{link}}){% if comment %}\n>\n> {{comment}}{% endif %}`,
    sep: "\n\n",
  },
  callout: {
    item: `> [!quote] p.{{page}}\n> {% if imageBaseName %}![[{{attachmentFolder}}/{{citekey}}/{{imageBaseName}}]]{% else %}{{text}}{% endif %}{% if comment %}\n>\n> {{comment}}{% endif %}`,
    sep: "\n\n",
  },
  compact: {
    item: `- {% if imageBaseName %}![[{{attachmentFolder}}/{{citekey}}/{{imageBaseName}}]]{% else %}"{{text}}"{% endif %} (p.{{page}}){% if comment %} — {{comment}}{% endif %}`,
    sep: "\n",
  },
  // Foregrounds YOUR comment; the quote + page sit underneath as support.
  "comment-first": {
    item: `{% if comment %}{{comment}}\n{% endif %}- {% if imageBaseName %}![[{{attachmentFolder}}/{{citekey}}/{{imageBaseName}}]]{% else %}"{{text}}"{% endif %} — [p.{{page}}]({{link}})`,
    sep: "\n\n",
  },
};

export const DEFAULT_FORMAT_NAME = "list";

// Item-FIELD formats, for `%% zon kind=field … %%` blocks — an updatable piece of
// item metadata placed in the note body (rendered ONCE over the item's data and
// refreshed on Update, exactly like an annotation block). These let citation /
// abstract / title / authors live in the body and stay in sync — not just
// annotations. Always available (merged into the format map regardless of the
// user's Templates folder), but a same-named file in that folder overrides them.
// Variables: title, date, dateAdded, dateModified, itemType, publicationTitle,
// abstractNote, bibliography, citekey, desktopURI, openPdf, allTags, creators[].
// Compose a per-annotation format from a base STYLE + optional PARTS — the engine
// behind the block configurator's "advanced" mode. A block can carry
// `style=quote parts=page,comment,tags` instead of a named `format=…`, and the
// renderer composes the body from these (the highlight `text` is always shown).
// Pure; returns a `{ item, sep }` format object like the named ones.
export function composeFormat(style, parts) {
  const list = Array.isArray(parts)
    ? parts
    : String(parts == null ? "" : parts).split(",").map((s) => s.trim()).filter(Boolean);
  const p = { page: list.indexOf("page") !== -1, comment: list.indexOf("comment") !== -1, tags: list.indexOf("tags") !== -1 };
  const tagBit = p.tags ? " {% for t in tags %}#{{t}} {% endfor %}" : "";
  // Image (area) annotations have no `text` — they carry an `imageBaseName`. Emit
  // an Obsidian embed for those and the (optionally quoted) text otherwise, mirroring
  // the built-in named formats so composed formats don't blank out image highlights.
  const body = (quoted) =>
    "{% if imageBaseName %}![[{{attachmentFolder}}/{{citekey}}/{{imageBaseName}}]]{% else %}"
    + (quoted ? '"{{text}}"' : "{{text}}") + "{% endif %}";
  if (style === "list") {
    return { item: "- " + (p.page ? "[p.{{page}}]({{link}}) " : "") + body(true) + (p.comment ? "{% if comment %} — *{{comment}}*{% endif %}" : "") + tagBit, sep: "\n" };
  }
  if (style === "callout") {
    return { item: "> [!quote]" + (p.page ? " p.{{page}}" : "") + "\n> " + body(false) + tagBit + (p.comment ? "{% if comment %}\n>\n> {{comment}}{% endif %}" : ""), sep: "\n\n" };
  }
  // quote (default)
  return { item: "> " + body(false) + tagBit + (p.page ? "\n> — [p.{{page}}]({{link}})" : "") + (p.comment ? "\n{% if comment %}>\n> {{comment}}{% endif %}" : ""), sep: "\n\n" };
}

export const FIELD_FORMATS = {
  citation: { item: `**Citation:** {{bibliography}}`, sep: "\n" },
  abstract: { item: `> [!abstract] Abstract\n> {% if abstractNote %}{{abstractNote}}{% else %}(no abstract){% endif %}`, sep: "\n" },
  title: { item: `# {{title}}`, sep: "\n" },
  authors: { item: `**Authors:** {% for c in creators %}[[{{c.lastName}}, {{c.firstName}}]]{% if not loop.last %}, {% endif %}{% endfor %}`, sep: "\n" },
};
