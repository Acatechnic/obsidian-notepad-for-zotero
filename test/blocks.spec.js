import { describe, it, expect } from "vitest";
import { parseBlocks, parseConfig, renderBlockBody, syncBlocks, makeBlock, migrateLegacyAnnotations } from "../src/blocks.js";

const ANNS = [
  { key: "A", type: "highlight", attachmentKey: "PDF", pageLabel: "3", pageIndex: 3, sortIndex: "1", annotatedText: "yellow point", comment: "", colourName: "yellow" },
  { key: "B", type: "highlight", attachmentKey: "PDF", pageLabel: "5", pageIndex: 5, sortIndex: "2", annotatedText: "red point", comment: "important", colourName: "red" },
  { key: "C", type: "highlight", attachmentKey: "PDF", pageLabel: "7", pageIndex: 7, sortIndex: "3", annotatedText: "another yellow", comment: "", colourName: "yellow" },
];

describe("config parsing", () => {
  it("parses key=value tokens and bare flags", () => {
    expect(parseConfig("kind=annotations colour=yellow sync=on format=quote"))
      .toEqual({ kind: "annotations", colour: "yellow", sync: "on", format: "quote" });
  });
});

describe("renderBlockBody filtering + format", () => {
  it("filters by colour and renders the chosen format", () => {
    const body = renderBlockBody({ colour: "yellow", format: "list" }, ANNS, {});
    expect(body).toContain("yellow point");
    expect(body).toContain("another yellow");
    expect(body).not.toContain("red point");
  });

  it("renders all annotations when colour=all", () => {
    const body = renderBlockBody({ colour: "all", format: "compact" }, ANNS, {});
    expect(body.match(/- "/g).length).toBe(3);
  });

  it("includes comments via the format's conditional", () => {
    const body = renderBlockBody({ colour: "red", format: "list" }, ANNS, {});
    expect(body).toContain("— *important*");
  });

  it("links use the page LABEL + annotation key (no off-by-one)", () => {
    const a = [{ key: "K", type: "highlight", attachmentKey: "PDF", pageLabel: "51", pageIndex: 50, sortIndex: "1", annotatedText: "x", colourName: "yellow" }];
    const body = renderBlockBody({ colour: "all", format: "list" }, a, {});
    expect(body).toContain("?page=51&annotation=K");
    expect(body).not.toContain("?page=50");
  });

  it("renders a non-annotation 'field' kind once over item data", () => {
    const formats = { year: { item: "Year: {{date}}", sep: "\n" } };
    const body = renderBlockBody({ kind: "field", format: "year" }, [], { formats, itemData: { date: "2023" } });
    expect(body).toBe("Year: 2023");
  });

  it("returns empty for an unknown non-annotation template", () => {
    expect(renderBlockBody({ kind: "section", format: "nope" }, [], { formats: {} })).toBe("");
  });
});

describe("syncBlocks", () => {
  const note = `---
citekey: "x"
KeyIdea: my idea
---

## Notes
My free-written thoughts — keep these.

%% zon kind=annotations colour=yellow sync=on format=list %%
%% /zon %%

## Scratch
%% zon kind=annotations colour=red sync=off format=list %%
- (manually curated, frozen) red note I edited
%% /zon %%
`;

  it("fills sync=on blocks, leaves sync=off blocks and prose untouched", () => {
    const out = syncBlocks(note, ANNS, {});
    expect(out).toContain("yellow point");          // synced block filled
    expect(out).toContain("another yellow");
    expect(out).not.toMatch(/colour=yellow[\s\S]*red point/); // red excluded from yellow block
    expect(out).toContain("My free-written thoughts — keep these."); // prose intact
    expect(out).toContain("(manually curated, frozen) red note I edited"); // sync=off intact
    expect(out).toContain("KeyIdea: my idea");
  });

  it("is idempotent", () => {
    const once = syncBlocks(note, ANNS, {});
    const twice = syncBlocks(once, ANNS, {});
    expect(twice).toBe(once);
  });

  it("reflects added/removed annotations in the synced block only", () => {
    const once = syncBlocks(note, ANNS, {});
    const fewer = syncBlocks(once, ANNS.filter((a) => a.key !== "C"), {});
    expect(fewer).toContain("yellow point");
    expect(fewer).not.toContain("another yellow"); // C removed from the live block
    expect(fewer).toContain("(manually curated, frozen) red note I edited"); // frozen still there
  });
});

describe("A2 — preserve manual edits inside sync=on blocks", () => {
  // A fresh sync now anchors each annotation with %% ann:KEY %%.
  it("anchors each rendered annotation so it can be tracked", () => {
    const body = renderBlockBody({ colour: "all", format: "list" }, ANNS, {});
    expect(body).toContain("%% ann:A %%");
    expect(body).toContain("%% ann:B %%");
    expect(body).toContain("%% ann:C %%");
  });

  const noteWith = (block) => `---
citekey: "x"
---

%% zon kind=annotations colour=all sync=on format=list %%
${block}
%% /zon %%
`;

  it("preserves user text appended after an annotation's anchor across a sync", () => {
    const first = syncBlocks(noteWith(""), ANNS, {});
    // User edits inside the block: add a note line after annotation B's anchor.
    const edited = first.replace(
      /(%% ann:B %%)/,
      "$1\n  - my own follow-up thought on this point"
    );
    const resynced = syncBlocks(edited, ANNS, {});
    expect(resynced).toContain("my own follow-up thought on this point");
    // All three annotations still present, single block.
    expect(resynced).toContain("yellow point");
    expect(resynced).toContain("red point");
    expect(resynced.match(/%% zon /g).length).toBe(1);
  });

  it("is idempotent once anchored, even with a manual edit present", () => {
    const first = syncBlocks(noteWith(""), ANNS, {});
    const edited = first.replace(/(%% ann:A %%)/, "$1\n  - note on A");
    const once = syncBlocks(edited, ANNS, {});
    const twice = syncBlocks(once, ANNS, {});
    expect(twice).toBe(once);
  });

  it("drops an annotation removed from Zotero but keeps surviving edits", () => {
    const first = syncBlocks(noteWith(""), ANNS, {});
    const edited = first.replace(/(%% ann:A %%)/, "$1\n  - note on A");
    const fewer = syncBlocks(edited, ANNS.filter((a) => a.key !== "C"), {});
    expect(fewer).toContain("note on A");        // edit on a surviving annotation kept
    expect(fewer).toContain("yellow point");     // A kept
    expect(fewer).not.toContain("another yellow"); // C gone
  });

  it("cleanly re-renders a pre-A2 (anchorless) block on first sync", () => {
    // A block authored before A2: rendered items with NO %% ann %% anchors.
    const legacyBody = `- [p.3](zotero://open-pdf/library/items/PDF?page=3) "yellow point"`;
    const out = syncBlocks(noteWith(legacyBody), ANNS, {});
    expect(out).toContain("%% ann:A %%"); // now anchored
    // No duplication of the old anchorless line.
    expect(out.match(/yellow point/g).length).toBe(1);
  });
});

describe("custom (user-supplied) formats", () => {
  it("renders a block with a user-defined Nunjucks format", () => {
    const myFormats = {
      mine: { item: "> {{text}} ({{colour}}, p.{{page}}){% if comment %} // {{comment}}{% endif %}", sep: "\n\n" },
    };
    const body = renderBlockBody({ colour: "all", format: "mine" }, ANNS, { formats: myFormats });
    expect(body).toContain("> yellow point (yellow, p.3)");
    expect(body).toContain("// important"); // red point's comment
    expect(body.split("\n\n").length).toBe(3); // sep applied
  });
});

describe("migrateLegacyAnnotations", () => {
  const legacy = `---
citekey: x
KeyIdea: my idea
---

## Notes
my prose

## Annotations

%% begin annotations %%

### Imported: 2026-05-06 10:57 am

- [p.1](zotero://open-pdf/library/items/MFZ?page=) "old highlight"
- [p.2](zotero://open-pdf/library/items/MFZ?page=2) "another" — *comment*

%% end annotations %%

%% Import Date: 2026-05-06T10:57:28.934+01:00 %%
`;

  it("replaces the legacy dump with an empty live block, preserving prose", () => {
    const { markdown, changed } = migrateLegacyAnnotations(legacy, {});
    expect(changed).toBe(true);
    expect(markdown).toContain("%% zon kind=annotations colour=all sync=on format=list %%");
    expect(markdown).toContain("%% /zon %%");
    expect(markdown).not.toContain("%% begin annotations %%");
    expect(markdown).not.toContain("### Imported:");
    expect(markdown).not.toContain("Import Date:");
    expect(markdown).toContain("my prose");      // prose kept
    expect(markdown).toContain("KeyIdea: my idea");
    expect(markdown).toContain("## Annotations"); // heading kept
  });

  it("leaves a note without legacy markers unchanged", () => {
    const note = `---\ncitekey: y\n---\n\n## Notes\nstuff\n`;
    const { markdown, changed } = migrateLegacyAnnotations(note, {});
    expect(changed).toBe(false);
    expect(markdown).toBe(note);
  });

  it("the migrated block then fills on sync", () => {
    const { markdown } = migrateLegacyAnnotations(legacy, {});
    const anns = [{ key: "A", type: "highlight", attachmentKey: "MFZ", pageLabel: "1", pageIndex: 1, sortIndex: "1", annotatedText: "fresh", colourName: "yellow" }];
    const synced = syncBlocks(markdown, anns, {});
    expect(synced).toContain('"fresh"');
    expect(synced).toContain("my prose"); // still preserved
  });
});

describe("makeBlock", () => {
  it("produces an insertable block with markers and rendered body", () => {
    const blk = makeBlock({ kind: "annotations", colour: "yellow", sync: "on", format: "list" }, ANNS, {});
    expect(blk).toMatch(/^%% zon kind=annotations colour=yellow sync=on format=list %%\n/);
    expect(blk).toMatch(/\n%% \/zon %%$/);
    expect(blk).toContain("yellow point");
  });
});
