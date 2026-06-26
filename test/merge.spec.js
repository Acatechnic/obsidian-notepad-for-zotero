import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { render } from "../src/render.js";
import { mergeNote, refreshFrontmatter } from "../src/merge.js";
import { syncBlocks } from "../src/blocks.js";
import { item, itemAfterNewAnnotation } from "./fixtures/data.js";

const read = (p) => readFileSync(fileURLToPath(new URL(p, import.meta.url)), "utf8");
const TEMPLATE = read("./fixtures/note.njk");

const renderItem = (data) => render(TEMPLATE, data);
const countAnchors = (md) => (md.match(/%% ann:[A-Za-z0-9]+ %%/g) || []).length;

describe("refreshFrontmatter — the Update model: body is the user's, blocks anywhere", () => {
  // A genuinely free-form note: NO ## headings, the user's prose interleaved with
  // a %% zon %% block placed wherever they like. This is the plugin's core promise.
  const freestyle = [
    "---",
    'citekey: "x"',
    'Title: "OLD TITLE"',
    "KeyIdea: my own thesis",   // user-owned, plainly filled
    "---",
    "",
    "Some opening thoughts I wrote myself — keep these.",
    "",
    "%% zon kind=annotations colour=all sync=on format=list %%",
    "%% /zon %%",
    "",
    "A closing reflection, no heading in sight.",
    "",
  ].join("\n");

  // Fresh render of the scaffold (Title is a Zotero-owned, expression-filled key).
  const scaffoldRender = "---\ncitekey: \"x\"\nTitle: \"NEW TITLE\"\nKeyIdea: \n---\n\n(template body that must NOT appear)\n";

  it("refreshes Zotero-owned frontmatter keys but leaves the entire body byte-for-byte", () => {
    const out = refreshFrontmatter(freestyle, scaffoldRender, ["KeyIdea"]);
    expect(out).toContain('Title: "NEW TITLE"');            // Zotero key refreshed
    expect(out).toContain("KeyIdea: my own thesis");        // user-owned key preserved
    expect(out).toContain("Some opening thoughts I wrote myself — keep these."); // prose above any heading kept
    expect(out).toContain("A closing reflection, no heading in sight.");
    expect(out).not.toContain("template body that must NOT appear"); // body never templated
    // the body after the frontmatter is identical to the original's body
    const bodyOf = (s) => s.slice(s.indexOf("---", 3));
    expect(out.split("---\n\n")[1]).toBe(freestyle.split("---\n\n")[1]);
  });

  it("leaves a note with NO frontmatter completely unchanged", () => {
    const noFm = "Just my notes.\n\n%% zon kind=annotations colour=all sync=on format=list %%\n%% /zon %%\n";
    expect(refreshFrontmatter(noFm, scaffoldRender, [])).toBe(noFm);
  });

  it("full Update flow: refresh frontmatter, then syncBlocks fills the block — prose untouched, no headings needed", () => {
    const anns = [{ key: "A", type: "highlight", attachmentKey: "PDF", pageLabel: "3", pageIndex: 2, sortIndex: "1", annotatedText: "a synced point", colourName: "yellow" }];
    let merged = refreshFrontmatter(freestyle, scaffoldRender, ["KeyIdea"]);
    merged = syncBlocks(merged, anns, {});
    expect(merged).toContain('Title: "NEW TITLE"');
    expect(merged).toContain("Some opening thoughts I wrote myself — keep these.");
    expect(merged).toContain("A closing reflection, no heading in sight.");
    expect(merged).toContain("a synced point");            // the block filled in place
    // idempotent
    expect(syncBlocks(refreshFrontmatter(merged, scaffoldRender, ["KeyIdea"]), anns, {})).toBe(merged);
  });
});

describe("idempotent merge", () => {
  it("creates the note on first run (no existing file)", () => {
    const fresh = renderItem(item);
    const out = mergeNote(null, fresh);
    expect(out).toContain('citekey: "Doe2023"');
    expect(countAnchors(out)).toBe(3);
  });

  it("is IDEMPOTENT: re-importing identical state changes nothing", () => {
    const fresh = renderItem(item);
    const first = mergeNote(null, fresh);
    const second = mergeNote(first, renderItem(item));
    expect(second).toBe(first); // byte-identical — the core guarantee
    expect(countAnchors(second)).toBe(3); // no duplicated annotations
  });

  it("never duplicates annotation anchors or headings across runs", () => {
    const fresh = renderItem(item);
    let note = mergeNote(null, fresh);
    for (let i = 0; i < 5; i++) note = mergeNote(note, renderItem(item));
    expect(countAnchors(note)).toBe(3);
    expect((note.match(/## Annotations/g) || []).length).toBe(1);
    expect((note.match(/## Notes/g) || []).length).toBe(1);
  });

  it("adds a NEW annotation in place without touching existing ones", () => {
    const note1 = mergeNote(null, renderItem(item));
    const note2 = mergeNote(note1, renderItem(itemAfterNewAnnotation));
    expect(countAnchors(note2)).toBe(4);
    expect(note2).toContain("%% ann:DDD444 %%");
    expect(note2).toContain("small-world topology");
    // the three originals are still present, exactly once each:
    for (const k of ["AAA111", "BBB222", "CCC333"]) {
      expect((note2.match(new RegExp(`ann:${k} `, "g")) || []).length).toBe(1);
    }
  });

  it("preserves a manual edit to an annotation's text across re-import", () => {
    let note = mergeNote(null, renderItem(item));
    // user appends their own thought to annotation AAA111's line:
    note = note.replace(
      '"networks shape cognition" — central claim',
      '"networks shape cognition" — central claim >> KEY to my argument'
    );
    const after = mergeNote(note, renderItem(item));
    expect(after).toContain(">> KEY to my argument"); // survived
    expect(countAnchors(after)).toBe(3);
  });

  it("preserves user-owned frontmatter (KeyIdea) across re-import", () => {
    let note = mergeNote(null, renderItem(item));
    note = note.replace("KeyIdea:", "KeyIdea: networks are cognition scaffolds");
    const after = mergeNote(note, renderItem(item));
    expect(after).toContain("KeyIdea: networks are cognition scaffolds");
  });

  it("preserves prose typed into the Notes section", () => {
    let note = mergeNote(null, renderItem(item));
    note = note.replace(
      "## Notes\n",
      "## Notes\nMy reading: the network framing is doing real work here.\n"
    );
    const after = mergeNote(note, renderItem(itemAfterNewAnnotation));
    expect(after).toContain("My reading: the network framing is doing real work here.");
    expect(countAnchors(after)).toBe(4); // and the new annotation still landed
  });

  it("preserves an entire user-added section the template doesn't emit", () => {
    let note = mergeNote(null, renderItem(item));
    note = note.trimEnd() + "\n\n## Synthesis\nThis links to my thesis chapter 3.\n";
    const after = mergeNote(note, renderItem(item));
    expect(after).toContain("## Synthesis");
    expect(after).toContain("This links to my thesis chapter 3.");
  });
});
