import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { buildItemData } from "../src/item-data.js";
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

  it("picks the right 'journal' field per item type", () => {
    const book = mockItem({ itemType: "book", fields: { publisher: "Routledge" } });
    expect(buildItemData(book, {}).publicationTitle).toBe("Routledge");
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
