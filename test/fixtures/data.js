// A sample item-data object shaped like what the Zotero adapter will pass to
// the renderer. Annotations carry a stable `key` (Zotero annotation key).

export const item = {
  citekey: "Doe2023",
  title: "Thinking in Networks",
  date: "2023-04-15",
  itemType: "journalArticle",
  publicationTitle: "Journal of Network Science",
  desktopURI: "zotero://select/library/items/ABCD1234",
  bibliography: "Doe, J. (2023). Thinking in Networks. JNS, 4(2), 101–120.",
  abstractNote: "A study of how networks shape cognition.",
  allTags: "cognition, networks, methodology",
  markdownNotes: "",
  creators: [
    { firstName: "Jane", lastName: "Doe" },
    { firstName: "Alan", lastName: "Smith" },
  ],
  // lastImportDate null => render all annotations; merge handles novelty.
  lastImportDate: null,
  importDate: "2026-06-13T10:00:00Z",
  annotations: [
    {
      key: "AAA111",
      type: "highlight",
      annotatedText: "networks shape cognition",
      comment: "central claim",
      pageLabel: "3",
      date: "2026-06-10T09:00:00Z",
    },
    {
      key: "BBB222",
      type: "highlight",
      annotatedText: "degree distribution matters",
      comment: "",
      pageLabel: "5",
      date: "2026-06-10T09:05:00Z",
    },
    {
      key: "CCC333",
      type: "text",
      annotatedText: "",
      comment: "follow up on this method",
      pageLabel: "7",
      date: "2026-06-10T09:10:00Z",
    },
  ],
};

// The same item after the user adds one more annotation in Zotero.
export const itemAfterNewAnnotation = {
  ...item,
  annotations: [
    ...item.annotations,
    {
      key: "DDD444",
      type: "highlight",
      annotatedText: "small-world topology",
      comment: "compare to chapter 2",
      pageLabel: "9",
      date: "2026-06-12T11:00:00Z",
    },
  ],
};
