import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { buildItemData, filenameFields, zoteroSelectURI, zoteroOpenPdfURI, ensureZoteroLink } from "../src/item-data.js";
import { render } from "../src/render.js";

const TEMPLATE = readFileSync(
  fileURLToPath(new URL("./fixtures/user-template.njk", import.meta.url)),
  "utf8"
);

// A mock Zotero item exposing just the methods buildItemData uses.
function mockItem(overrides = {}) {
  const fields = {
    title: "Investigating prison suicides: The politics of independent oversight",
    date: "2021-03-15",
    publicationTitle: "Punishment & Society",
    abstractNote: "This article examines the institutional arrangements...",
    ...(overrides.fields || {}),
  };
  return {
    itemType: overrides.itemType || "journalArticle",
    key: overrides.key || "3FWSQYCT",
    libraryID: 1,
    library: { libraryType: "user" },
    getField: (k) => fields[k] || "",
    getCreators: () => overrides.creators || [
      { firstName: "Dominic", lastName: "Aitken", creatorType: "author" },
    ],
    getTags: () => overrides.tags || [{ tag: "Regulation" }, { tag: "PPO" }, { tag: "Prison" }],
  };
}

describe("buildItemData (Zotero item -> template data)", () => {
  it("maps core fields from the item", () => {
    const d = buildItemData(mockItem(), { citekey: "aitkenInvestigatingPrisonSuicides2021" });
    expect(d.citekey).toBe("aitkenInvestigatingPrisonSuicides2021");
    expect(d.title).toContain("Investigating prison suicides");
    expect(d.itemType).toBe("journalArticle");
    expect(d.publicationTitle).toBe("Punishment & Society");
    expect(d.desktopURI).toBe("zotero://select/library/items/3FWSQYCT");
    expect(d.creators).toEqual([{ firstName: "Dominic", lastName: "Aitken" }]);
    expect(d.allTags).toBe("Regulation, PPO, Prison");
  });

  it("builds a group-library select URI when in a group", () => {
    const item = mockItem();
    item.library = { libraryType: "group" };
    item.libraryID = 99;
    expect(buildItemData(item, {}).desktopURI).toBe("zotero://select/groups/99/items/3FWSQYCT");
  });

  it("builds an open-pdf link when a PDF attachment key is supplied", () => {
    const d = buildItemData(mockItem(), { citekey: "x", pdfAttachmentKey: "PDFKEY99" });
    expect(d.openPdf).toBe("zotero://open-pdf/library/items/PDFKEY99");
  });

  it("leaves openPdf empty when the item has no PDF (no key passed)", () => {
    expect(buildItemData(mockItem(), { citekey: "x" }).openPdf).toBe("");
  });

  it("builds a group-library open-pdf link in a group", () => {
    const item = mockItem();
    item.library = { libraryType: "group" };
    item.libraryID = 42;
    expect(zoteroOpenPdfURI(item, "PDFKEY99")).toBe("zotero://open-pdf/groups/42/items/PDFKEY99");
    expect(zoteroOpenPdfURI(item, "")).toBe(""); // no attachment → empty
  });

  it("picks the right 'journal' field per item type", () => {
    const book = mockItem({ itemType: "book", fields: { publisher: "Routledge" } });
    expect(buildItemData(book, {}).publicationTitle).toBe("Routledge");
  });
});

describe("filenameFields (scalars for filename patterns)", () => {
  it("derives year (4-digit), author surname, and journal", () => {
    const d = buildItemData(mockItem(), { citekey: "x" });
    expect(filenameFields(d)).toEqual({ year: "2021", author: "Aitken", journal: "Punishment & Society" });
  });

  it("renders a multi-field pattern into a real filename", () => {
    const d = buildItemData(mockItem(), { citekey: "aitken2021" });
    const data = { ...d, ...filenameFields(d), citekey: "aitken2021" };
    expect(render("{{author}} {{year}} - {{title}}", data))
      .toBe("Aitken 2021 - Investigating prison suicides: The politics of independent oversight");
    expect(render("@{{citekey}}", data)).toBe("@aitken2021");
  });

  it("is empty-safe when date/creators are missing", () => {
    expect(filenameFields({})).toEqual({ year: "", author: "", journal: "" });
    expect(filenameFields(null)).toEqual({ year: "", author: "", journal: "" });
  });
});

describe("ensureZoteroLink (durable item-key link on create)", () => {
  const URI = "zotero://select/library/items/3FWSQYCT";
  // The note↔item index regex from bootstrap.js buildIndex — the injected link
  // MUST satisfy it, or a created note won't resolve back to its item.
  const INDEX_RE = /ZoteroLink:[^\n]*items\/([A-Z0-9]+)/i;

  it("prepends a frontmatter block to a block-only note (no frontmatter)", () => {
    const md = "%% zon kind=annotations colour=all sync=on format=list %%\n%% /zon %%";
    const out = ensureZoteroLink(md, URI);
    expect(out.startsWith(`---\nZoteroLink: "${URI}"\n---\n`)).toBe(true);
    expect(out).toContain("%% zon kind=annotations");
    expect(INDEX_RE.exec(out)[1]).toBe("3FWSQYCT");
  });

  it("inserts into an existing frontmatter block that lacks a ZoteroLink", () => {
    const md = "---\ncitekey: \"x2021\"\nTitle: \"T\"\n---\n\nbody";
    const out = ensureZoteroLink(md, URI);
    expect(out).toBe(`---\nZoteroLink: "${URI}"\ncitekey: "x2021"\nTitle: "T"\n---\n\nbody`);
    expect(INDEX_RE.test(out)).toBe(true);
  });

  it("is a no-op when a ZoteroLink is already present (no duplicate key)", () => {
    const md = `---\nZoteroLink: "${URI}"\ncitekey: "x"\n---\n\nbody`;
    const out = ensureZoteroLink(md, "zotero://select/library/items/OTHER");
    expect(out).toBe(md);
    expect((out.match(/ZoteroLink:/g) || []).length).toBe(1);
  });

  it("derives the URI from a group-library item", () => {
    const item = mockItem();
    item.library = { libraryType: "group" };
    item.libraryID = 42;
    expect(zoteroSelectURI(item)).toBe("zotero://select/groups/42/items/3FWSQYCT");
  });
});

describe("render the user's REAL template with mapped data", () => {
  it("produces correctly populated frontmatter", () => {
    const d = buildItemData(mockItem(), {
      citekey: "aitkenInvestigatingPrisonSuicides2021",
      bibliography: "Aitken D (2021) Investigating prison suicides. Punishment & Society.",
    });
    const out = render(TEMPLATE, d);
    expect(out).toContain('citekey: "aitkenInvestigatingPrisonSuicides2021"');
    expect(out).toContain('Year: "2021"');               // date | format("YYYY")
    expect(out).toContain('- "[[Dominic Aitken]]"');      // creators loop
    expect(out).toContain('Journal: "[[J. Punishment & Society ]]"');
    expect(out).toContain("- Reference");
    expect(out).toContain("- journalArticle");
    expect(out).toContain('- "[[Regulation]]"');          // allTags.split loop
    expect(out).toContain('ZoteroLink: "zotero://select/library/items/3FWSQYCT"');
    expect(out).toContain("**Citation:** Aitken D (2021)");
    expect(out).toContain("**Abstract:**");
    expect(out).toContain("## Notes");
    expect(out).toContain("## Annotations");
  });

  it("renders with no annotations cleanly (fresh note)", () => {
    const d = buildItemData(mockItem(), { citekey: "x2021" });
    const out = render(TEMPLATE, d);
    expect(out).not.toContain("Imported:"); // no annotations => no import heading
  });
});
