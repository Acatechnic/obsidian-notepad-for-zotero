// Map a Zotero item to the data object the user's Nunjucks template consumes.
//
// Kept provider-agnostic: it only calls the small set of item methods Zotero
// exposes (getField, getCreators, getTags, itemType, key, libraryID, library),
// so it can be unit-tested in Node with a mock item. The few values that need
// async Zotero services (Better BibTeX citekey, formatted bibliography, the
// import timestamp, child notes) are passed in via `opts` by the plugin.

// publicationTitle varies by item type — mirror the user's existing
// zotero-obsidian-export logic so the "Journal" field is sensible per type.
function journalFor(item, f) {
  switch (item.itemType) {
    case "journalArticle": return f("publicationTitle") || f("journalAbbreviation");
    case "book": return f("publisher");
    case "bookSection": return f("publicationTitle");
    case "thesis": return f("university");
    case "conferencePaper": return f("conferenceName") || f("proceedingsTitle");
    default: return f("publicationTitle");
  }
}

function zoteroSelectURI(item) {
  const isGroup = item.library && item.library.libraryType === "group";
  return isGroup
    ? `zotero://select/groups/${item.libraryID}/items/${item.key}`
    : `zotero://select/library/items/${item.key}`;
}

// Authors only (skip editors/translators), as { firstName, lastName }.
function authors(item) {
  const creators = item.getCreators ? item.getCreators() : [];
  return creators
    .filter((c) => c.creatorType === undefined || c.creatorType === "author" || c.creatorTypeID === undefined ? true : c.creatorType === "author")
    .map((c) => ({
      firstName: c.firstName || "",
      lastName: c.lastName || c.name || "",
    }))
    .filter((c) => c.firstName || c.lastName);
}

function tagString(item, opts) {
  if (opts.allTags != null) return opts.allTags;
  const tags = item.getTags ? item.getTags() : [];
  return tags.map((t) => (typeof t === "string" ? t : t.tag)).filter(Boolean).join(", ");
}

export function buildItemData(item, opts = {}) {
  const f = (k) => {
    try { return (item.getField && item.getField(k)) || ""; } catch (e) { return ""; }
  };
  return {
    citekey: opts.citekey || "",
    title: f("title"),
    date: f("date"),
    itemType: item.itemType || "",
    publicationTitle: journalFor(item, f) || "",
    desktopURI: zoteroSelectURI(item),
    bibliography: opts.bibliography || "",
    abstractNote: f("abstractNote"),
    allTags: tagString(item, opts),
    markdownNotes: opts.markdownNotes || "",
    creators: authors(item),
    // Their template's annotation block; empty on first creation (annotations
    // are brought in by the sync path). lastImportDate null => render all.
    annotations: opts.annotations || [],
    lastImportDate: opts.lastImportDate ?? null,
    importDate: opts.importDate || "",
  };
}
