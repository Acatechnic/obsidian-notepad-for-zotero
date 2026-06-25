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

describe("image annotations render Obsidian embeds", () => {
  const IMG = [
    { key: "IMG1", type: "image", attachmentKey: "PDF", pageLabel: "2", pageIndex: 2, sortIndex: "1", annotatedText: "", comment: "", colourName: "yellow", imageBaseName: "armstrong2018-p2-IMG1.png" },
  ];
  const opts = { citekey: "armstrong2018", attachmentFolder: "References/Attachments" };

  it("emits ![[folder/citekey/imageBaseName]] instead of empty quotes (list)", () => {
    const body = renderBlockBody({ colour: "all", format: "list" }, IMG, opts);
    expect(body).toContain("![[References/Attachments/armstrong2018/armstrong2018-p2-IMG1.png]]");
    expect(body).not.toContain('""'); // the old empty-text bug
    expect(body).toContain("?page=2&annotation=IMG1"); // page link preserved
  });

  it("honours a per-note attachment folder + comment", () => {
    const img = [{ ...IMG[0], comment: "key figure" }];
    const body = renderBlockBody({ colour: "all", format: "list" }, img, { citekey: "armstrong2018", attachmentFolder: "Z/imgs" });
    expect(body).toContain("![[Z/imgs/armstrong2018/armstrong2018-p2-IMG1.png]]");
    expect(body).toContain("— *key figure*");
  });

  it("embeds in quote/callout/compact too", () => {
    for (const format of ["quote", "callout", "compact"]) {
      const body = renderBlockBody({ colour: "all", format }, IMG, opts);
      expect(body, format).toContain("![[References/Attachments/armstrong2018/armstrong2018-p2-IMG1.png]]");
    }
  });

  it("falls back to the default folder when none is given", () => {
    const body = renderBlockBody({ colour: "all", format: "list" }, IMG, { citekey: "armstrong2018" });
    expect(body).toContain("![[References/Attachments/armstrong2018/armstrong2018-p2-IMG1.png]]");
  });

  it("leaves text annotations as quotes (no embed)", () => {
    const body = renderBlockBody({ colour: "all", format: "list" }, ANNS, {});
    expect(body).not.toContain("![[");
    expect(body).toContain('"yellow point"');
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

  it("excludes ink annotations by default (they'd render as empty items)", () => {
    const anns = [
      ...ANNS,
      { key: "INK", type: "ink", attachmentKey: "PDF", pageLabel: "9", pageIndex: 8, sortIndex: "4", annotatedText: "", comment: "scribble", colourName: "yellow" },
    ];
    const body = renderBlockBody({ colour: "all", format: "list" }, anns, {});
    expect(body).not.toContain("ann:INK");   // ink dropped
    expect(body).not.toContain('""');         // no empty-quote item
    expect(body).toContain("ann:A");          // text highlights still there
    // ...unless a block explicitly asks for type=ink.
    const inkOnly = renderBlockBody({ colour: "all", type: "ink", format: "list" }, anns, {});
    expect(inkOnly).toContain("ann:INK");
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

describe("sync=on mirrors Zotero (regenerates on Refresh)", () => {
  // A fresh sync anchors each annotation with %% ann:KEY %%.
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

  it("propagates an EDITED annotation (extended/contracted text) on the next sync", () => {
    const first = syncBlocks(noteWith(""), ANNS, {});
    expect(first).toContain('"yellow point"');
    // Zotero-side edit: annotation A's highlighted text is extended.
    const edited = ANNS.map((a) => (a.key === "A" ? { ...a, annotatedText: "yellow point, now extended" } : a));
    const resynced = syncBlocks(first, edited, {});
    expect(resynced).toContain("yellow point, now extended"); // new text pulled in
    expect(resynced).not.toContain('"yellow point"');          // stale text replaced
    expect(resynced.match(/%% zon /g).length).toBe(1);
  });

  it("propagates an edited comment too", () => {
    const first = syncBlocks(noteWith(""), ANNS, {});
    const edited = ANNS.map((a) => (a.key === "B" ? { ...a, comment: "now reconsidered" } : a));
    const resynced = syncBlocks(first, edited, {});
    expect(resynced).toContain("now reconsidered");
    expect(resynced).not.toContain("important");
  });

  it("inserts new annotations in Zotero order and drops removed ones", () => {
    const first = syncBlocks(noteWith(""), ANNS.filter((a) => a.key !== "C"), {});
    expect(first).not.toContain("another yellow");
    const more = syncBlocks(first, ANNS, {}); // C added in Zotero
    expect(more).toContain("another yellow");
    const fewer = syncBlocks(more, ANNS.filter((a) => a.key !== "A"), {}); // A removed
    expect(fewer).not.toContain('"yellow point"');
    expect(fewer).toContain("red point");
  });

  it("preserves free prose written AFTER the last annotation", () => {
    const first = syncBlocks(noteWith(""), ANNS, {});
    const edited = first.replace(/(%% ann:C %%)/, "$1\n\nSynthesis: these three points connect.");
    const resynced = syncBlocks(edited, ANNS, {});
    expect(resynced).toContain("Synthesis: these three points connect.");
    expect(resynced.match(/%% zon /g).length).toBe(1);
  });

  it("DROPS prose typed BETWEEN annotations (only the tail survives)", () => {
    // The documented, data-losing contract: a sync=on block is regenerated from
    // Zotero, so notes between two annotations are replaced — only post-last-anchor
    // prose is kept. (Guards against a refactor accidentally re-preserving it.)
    const first = syncBlocks(noteWith(""), ANNS, {});
    const edited = first
      .replace(/(%% ann:A %%)/, "$1\n\nMy note on A — should NOT survive.")
      .replace(/(%% ann:C %%)/, "$1\n\nTail after C — should survive.");
    const resynced = syncBlocks(edited, ANNS, {});
    expect(resynced).not.toContain("My note on A — should NOT survive."); // between-anchor prose dropped
    expect(resynced).toContain("Tail after C — should survive.");          // tail kept
  });

  it("is idempotent", () => {
    const once = syncBlocks(noteWith(""), ANNS, {});
    expect(syncBlocks(once, ANNS, {})).toBe(once);
  });

  it("sync=off freezes the block (no regeneration)", () => {
    const note = `---\ncitekey: "x"\n---\n\n%% zon kind=annotations colour=all sync=off format=list %%\n- hand-curated, frozen\n%% /zon %%\n`;
    const out = syncBlocks(note, ANNS, {});
    expect(out).toContain("hand-curated, frozen");
    expect(out).not.toContain("yellow point");
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

describe("per-annotation tags variable", () => {
  // Highlight-level tags (role markers like method/finding/quote) added in the
  // Zotero reader, distinct from the item's own tags.
  const TAGGED = [
    { key: "A", type: "highlight", attachmentKey: "PDF", pageLabel: "3", pageIndex: 3, sortIndex: "1", annotatedText: "a claim", comment: "", colourName: "yellow", tags: ["finding", "method"] },
    { key: "B", type: "highlight", attachmentKey: "PDF", pageLabel: "5", pageIndex: 5, sortIndex: "2", annotatedText: "a quote", comment: "", colourName: "yellow", tags: ["quote"] },
    { key: "C", type: "highlight", attachmentKey: "PDF", pageLabel: "7", pageIndex: 7, sortIndex: "3", annotatedText: "untagged", comment: "", colourName: "yellow", tags: [] },
  ];

  it("exposes {{tags}} as a loopable list of the highlight's own tags", () => {
    const formats = { roles: { item: "- {{text}}{% for t in tags %} #{{t}}{% endfor %}", sep: "\n" } };
    const body = renderBlockBody({ colour: "all", format: "roles" }, TAGGED, { formats });
    expect(body).toContain("- a claim #finding #method");
    expect(body).toContain("- a quote #quote");
    expect(body).toContain("- untagged %% ann:C %%"); // no tags → nothing appended before the anchor
    expect(body).not.toContain("untagged #");
  });

  it("exposes {{tagList}} as a comma-joined string", () => {
    const formats = { csv: { item: "{{text}} [{{tagList}}]", sep: "\n" } };
    const body = renderBlockBody({ colour: "all", format: "csv" }, TAGGED, { formats });
    expect(body).toContain("a claim [finding, method]");
    expect(body).toContain("untagged []");
  });

  it("can filter highlights by their own tag inside a template", () => {
    const formats = { quotesOnly: { item: "{% if 'quote' in tags %}> {{text}}{% endif %}", sep: "\n" } };
    const body = renderBlockBody({ colour: "all", format: "quotesOnly" }, TAGGED, { formats });
    expect(body).toContain("> a quote");
    expect(body).not.toContain("a claim");
  });

  it("defaults to an empty list when an annotation carries no tags field", () => {
    const formats = { roles: { item: "- {{text}}{% for t in tags %} #{{t}}{% endfor %}", sep: "\n" } };
    const noTagField = [{ key: "X", type: "highlight", attachmentKey: "PDF", pageLabel: "1", pageIndex: 1, sortIndex: "1", annotatedText: "plain", colourName: "yellow" }];
    expect(() => renderBlockBody({ colour: "all", format: "roles" }, noTagField, { formats })).not.toThrow();
    expect(renderBlockBody({ colour: "all", format: "roles" }, noTagField, { formats })).toContain("- plain");
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

  // A field/section/custom element inserts and refreshes from item data the same
  // way an annotations block refreshes from highlights — the insert UX relies on
  // this end-to-end round-trip (Phase C).
  it("round-trips a kind=field element through makeBlock + syncBlocks", () => {
    const formats = { abstract: { item: "> {{abstract}}", sep: "\n" } };
    const cfg = { kind: "field", sync: "on", format: "abstract" };
    const blk = makeBlock(cfg, [], { formats, itemData: { abstract: "first" } });
    expect(blk).toMatch(/^%% zon kind=field sync=on format=abstract %%\n/);
    expect(blk).toContain("> first");

    // Re-sync over CHANGED item data regenerates the body...
    const note = `# Notes\n\n${blk}\n`;
    const refreshed = syncBlocks(note, [], { formats, itemData: { abstract: "second" } });
    expect(refreshed).toContain("> second");
    expect(refreshed).not.toContain("> first");
    // ...and is idempotent over identical data.
    expect(syncBlocks(refreshed, [], { formats, itemData: { abstract: "second" } })).toBe(refreshed);
  });

  it("freezes a sync=off field element on refresh", () => {
    const formats = { abstract: { item: "> {{abstract}}", sep: "\n" } };
    const blk = makeBlock({ kind: "field", sync: "off", format: "abstract" }, [], { formats, itemData: { abstract: "frozen" } });
    const out = syncBlocks(`x\n\n${blk}\n`, [], { formats, itemData: { abstract: "changed" } });
    expect(out).toContain("> frozen");
    expect(out).not.toContain("> changed");
  });
});
