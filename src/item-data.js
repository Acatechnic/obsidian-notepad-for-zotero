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

export function zoteroSelectURI(item) {
  const isGroup = item.library && item.library.libraryType === "group";
  return isGroup
    ? `zotero://select/groups/${item.libraryID}/items/${item.key}`
    : `zotero://select/library/items/${item.key}`;
}

// Ensure a created note carries a durable `ZoteroLink` (the item KEY) so it stays
// linked even if the citekey/filename later changes — the item key never does. A
// whole-note scaffold usually renders its own ZoteroLink, so this is a no-op when
// one is already present; a block-only note (no frontmatter) gets a minimal
// frontmatter property added. `uri` = the item's zotero://select link.
export function ensureZoteroLink(markdown, uri) {
  const md = String(markdown);
  if (!uri) return md;
  if (/^\s*ZoteroLink\s*:/im.test(md)) return md; // already has one (scaffold-rendered or manual)
  const line = `ZoteroLink: "${uri}"`;
  const fm = md.match(/^---\r?\n/);
  if (fm) {
    // Insert as the first key inside the existing frontmatter block.
    return md.slice(0, fm[0].length) + line + "\n" + md.slice(fm[0].length);
  }
  // No frontmatter — prepend a minimal block.
  return `---\n${line}\n---\n\n${md.replace(/^\n+/, "")}`;
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
  // Zotero stores dateAdded/dateModified as UTC SQL datetimes
  // ("2023-01-15 14:30:00"); expose just the YYYY-MM-DD for clean templates.
  const dateOnly = (v) => {
    const m = String(v || "").match(/^(\d{4}-\d{2}-\d{2})/);
    return m ? m[1] : String(v || "");
  };
  return {
    citekey: opts.citekey || "",
    title: f("title"),
    date: f("date"),
    dateAdded: dateOnly(f("dateAdded")),
    dateModified: dateOnly(f("dateModified")),
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
    fulltext: opts.fulltext ?? null,
    lastImportDate: opts.lastImportDate ?? null,
    importDate: opts.importDate || "",
  };
}

// Convenience single-value scalars derived from buildItemData's output, handy for
// filename patterns (where `creators` (an array) and `date` (a full string) are
// awkward): `year` = the first 4-digit run of the date; `author` = the first
// author's surname; `journal` = the per-type publication title. Pure.
export function filenameFields(data) {
  const year = (String((data && data.date) || "").match(/\d{4}/) || [""])[0];
  const c = (data && data.creators && data.creators[0]) || null;
  const author = c ? (c.lastName || c.firstName || "") : "";
  return { year, author, journal: (data && data.publicationTitle) || "" };
}
