// Selective metadata refresh: re-pull Zotero-driven frontmatter fields while
// preserving the user's own fields (KeyIdea), their prose (## Notes), and their
// annotation edits — and keep the YAML clean for Obsidian Bases.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { buildItemData } from "../src/item-data.js";
import { render } from "../src/render.js";
import { mergeNote } from "../src/merge.js";
import { templateUserOwnedKeys, templateKind } from "../src/templates.js";

const SCAFFOLD = readFileSync(
  fileURLToPath(new URL("./fixtures/note-scaffold.md", import.meta.url)),
  "utf8"
);

function mockItem(overrides = {}) {
  const fields = {
    title: "But Who Oversees The Overseers?",
    date: "2020-01-01",
    publicationTitle: "American Journal of Criminal Law",
    abstractNote: "A survey of prison and jail oversight.",
    ...(overrides.fields || {}),
  };
  return {
    itemType: "journalArticle",
    key: "R6DILCWU",
    libraryID: 1,
    library: { libraryType: "user" },
    getField: (k) => fields[k] || "",
    getCreators: () => overrides.creators || [{ firstName: "Michele", lastName: "Deitch", creatorType: "author" }],
    getTags: () => overrides.tags || [{ tag: "oversight" }, { tag: "prisons" }],
  };
}

// Refresh = re-render the scaffold from the item, merge preserving the user's
// stuff. ## Annotations is treated as preserved prose (the zon block engine owns
// it separately), so the merge never clobbers filled annotations.
function refresh(existing, item) {
  const fresh = render(SCAFFOLD, buildItemData(item, { citekey: "deitchWhoOverseesOverseers2020", bibliography: "Deitch, M. (2020)..." }));
  return mergeNote(existing, fresh, {
    userOwnedKeys: templateUserOwnedKeys(SCAFFOLD),
    proseSections: ["notes", "annotations"],
    annotationSections: [],
  });
}

describe("selective metadata refresh", () => {
  it("detects KeyIdea as the only user-owned (expression-free) field", () => {
    expect(templateUserOwnedKeys(SCAFFOLD)).toEqual(["KeyIdea"]);
  });

  it("classifies the scaffold as a document template", () => {
    expect(templateKind(SCAFFOLD)).toBe("document");
    expect(templateKind('> {{text}}\n> — p.{{page}}')).toBe("format");
  });

  it("updates Zotero fields but preserves KeyIdea, prose and annotations", () => {
    // 1. Create the note, then the user fills KeyIdea + writes prose + edits an annotation.
    let note = refresh("", mockItem());
    note = note
      .replace(/^KeyIdea:.*$/m, "KeyIdea: Oversight reduces the US anomaly.")
      .replace("## Notes\n", "## Notes\nMy own paragraph about this paper.\n")
      .replace("%% /zon %%", '- [p.5](zotero://x) "a highlight I tweaked" %% ann:ABC %%\n%% /zon %%');

    // 2. The user corrects the title and adds a tag in Zotero, then hits Refresh.
    const updated = refresh(note, mockItem({
      fields: { title: "But Who Oversees The Overseers? (corrected)" },
      tags: [{ tag: "oversight" }, { tag: "prisons" }, { tag: "accountability" }],
    }));

    // Zotero-driven fields refreshed:
    expect(updated).toMatch(/Title: "But Who Oversees The Overseers\? \(corrected\)"/);
    expect(updated).toContain('[[accountability]]'); // new tag flowed into Topics
    // User-owned + prose + annotation edit preserved:
    expect(updated).toContain("KeyIdea: Oversight reduces the US anomaly.");
    expect(updated).toContain("My own paragraph about this paper.");
    expect(updated).toContain('a highlight I tweaked');
  });

  it("is idempotent — refresh with no Zotero change is byte-identical", () => {
    const note = refresh("", mockItem());
    expect(refresh(note, mockItem())).toBe(note);
  });

  it("keeps frontmatter parseable as clean YAML key/value pairs", () => {
    const note = refresh("", mockItem());
    const fm = note.match(/^---\n([\s\S]*?)\n---/)[1];
    // Every non-blank, non-continuation line is `Key:` — no stray/garbled lines.
    for (const line of fm.split("\n")) {
      if (line.trim() === "" || /^\s/.test(line) || /^- /.test(line)) continue;
      expect(line).toMatch(/^[A-Za-z0-9_-]+:/);
    }
    expect(fm).toMatch(/KeyIdea:/);
    expect(fm).toMatch(/citekey: "deitchWhoOverseesOverseers2020"/);
  });
});
