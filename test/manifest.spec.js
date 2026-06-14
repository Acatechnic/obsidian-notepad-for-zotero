import { describe, it, expect } from "vitest";
import {
  parseManifest,
  hasManifest,
  applyManifest,
  setManifestEntry,
  removeManifestEntry,
  buildManifestFromScaffold,
  writeManifest,
} from "../src/manifest.js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const ITEM = {
  citekey: "doe2020",
  title: "A New Title",
  date: "2020-05-01",
  publicationTitle: "Journal of Things",
  desktopURI: "zotero://select/library/items/ABCD1234",
  allTags: "policing, accountability",
  creators: [{ firstName: "Jane", lastName: "Doe" }],
  itemType: "journalArticle",
};

const NOTE = `---
citekey: "old"
Title: "Old title"
Year: "1999"
KeyIdea: my own idea
zon:
  Title: "\\"{{title}}\\""
  Year: "\\"{{date | format('YYYY')}}\\""
---

## Notes
my prose
`;

describe("parseManifest", () => {
  it("reads the zon: map into key -> expression", () => {
    const { entries, present } = parseManifest(NOTE);
    expect(present).toBe(true);
    expect(entries.map((e) => e.key)).toEqual(["Title", "Year"]);
    expect(entries[0].expr).toBe(`"{{title}}"`);
    expect(entries[1].expr).toBe(`"{{date | format('YYYY')}}"`);
  });

  it("reports absent when there is no zon: map", () => {
    expect(hasManifest(`---\nTitle: "x"\n---\nbody`)).toBe(false);
    expect(hasManifest(`no frontmatter at all`)).toBe(false);
  });
});

describe("applyManifest", () => {
  it("refreshes managed keys, leaves everything else untouched", () => {
    const out = applyManifest(NOTE, ITEM);
    expect(out).toContain(`Title: "A New Title"`);
    expect(out).toContain(`Year: "2020"`);
    expect(out).toContain("KeyIdea: my own idea"); // unmanaged user key kept
    expect(out).toContain("my prose"); // body untouched
    expect(out).toContain("zon:"); // manifest preserved
  });

  it("is idempotent", () => {
    const once = applyManifest(NOTE, ITEM);
    const twice = applyManifest(once, ITEM);
    expect(twice).toBe(once);
  });

  it("is a no-op when the note has no manifest", () => {
    const plain = `---\nTitle: "x"\n---\nbody\n`;
    expect(applyManifest(plain, ITEM)).toBe(plain);
  });

  it("leaves a key untouched if its expression throws", () => {
    const bad = setManifestEntry(`---\nTitle: "x"\n---\nb\n`, "Title", "{{ oops( }}");
    const out = applyManifest(bad, ITEM);
    expect(out).toContain(`Title: "x"`); // unchanged, not blown up
  });
});

describe("setManifestEntry / removeManifestEntry", () => {
  it("adds a managed key, creating the map if absent", () => {
    const md = `---\nTitle: "x"\n---\nbody\n`;
    const out = setManifestEntry(md, "Title", `"{{title}}"`);
    expect(hasManifest(out)).toBe(true);
    expect(applyManifest(out, ITEM)).toContain(`Title: "A New Title"`);
  });

  it("replaces an existing entry rather than duplicating it", () => {
    let out = setManifestEntry(NOTE, "Year", `"changed"`);
    out = setManifestEntry(out, "Year", `"{{date | format('YYYY')}}"`);
    const { entries } = parseManifest(out);
    expect(entries.filter((e) => e.key === "Year").length).toBe(1);
  });

  it("removes a key and drops an empty map", () => {
    const one = removeManifestEntry(NOTE, "Title");
    expect(parseManifest(one).entries.map((e) => e.key)).toEqual(["Year"]);
    const none = removeManifestEntry(one, "Year");
    expect(hasManifest(none)).toBe(false);
    expect(none).toContain("KeyIdea: my own idea"); // other frontmatter intact
  });
});

describe("buildManifestFromScaffold", () => {
  const scaffold = readFileSync(
    fileURLToPath(new URL("./fixtures/note-scaffold.md", import.meta.url)),
    "utf8"
  );

  it("auto-manages single-line scalar fields only", () => {
    const map = buildManifestFromScaffold(scaffold);
    expect(Object.keys(map).sort()).toEqual(
      ["Journal", "Title", "Year", "ZoteroLink", "citekey"].sort()
    );
  });

  it("skips multi-line block-list fields (no silent reformatting)", () => {
    const map = buildManifestFromScaffold(scaffold);
    expect(map).not.toHaveProperty("Author");
    expect(map).not.toHaveProperty("Topics");
    expect(map).not.toHaveProperty("Tags");
  });

  it("skips reserved/empty keys (KeyIdea)", () => {
    expect(buildManifestFromScaffold(scaffold)).not.toHaveProperty("KeyIdea");
  });

  it("the built manifest round-trips and refreshes a note", () => {
    const map = buildManifestFromScaffold(scaffold);
    const note = `---\nTitle: "stale"\nYear: "1900"\nKeyIdea:\n---\nbody\n`;
    const managed = writeManifest(note, map);
    const out = applyManifest(managed, ITEM);
    expect(out).toContain(`Title: "A New Title"`);
    expect(out).toContain(`Year: "2020"`);
    // idempotent after migration too
    expect(applyManifest(out, ITEM)).toBe(out);
  });
});
