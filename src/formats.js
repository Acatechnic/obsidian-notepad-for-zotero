// Pre-designed per-annotation formats that ship with the plugin. A block picks
// one via `format=<name>`. Each is a Nunjucks template rendering ONE annotation
// plus a separator used to join them. Fully customisable: users can override
// these or add their own (later, by pointing at a folder of templates).
//
// Available variables per annotation: text, comment, page (= pageLabel),
// pageIndex, key, colour, type, link (zotero://open-pdf deep link), citekey,
// imageBaseName.
export const DEFAULT_FORMATS = {
  list: {
    item: `- [p.{{page}}]({{link}}) "{{text}}"{% if comment %} — *{{comment}}*{% endif %}`,
    sep: "\n",
  },
  quote: {
    item: `> {{text}}\n> — [p.{{page}}]({{link}}){% if comment %}\n>\n> {{comment}}{% endif %}`,
    sep: "\n\n",
  },
  callout: {
    item: `> [!quote] p.{{page}}\n> {{text}}{% if comment %}\n>\n> {{comment}}{% endif %}`,
    sep: "\n\n",
  },
  compact: {
    item: `- "{{text}}" (p.{{page}}){% if comment %} — {{comment}}{% endif %}`,
    sep: "\n",
  },
};

export const DEFAULT_FORMAT_NAME = "list";
