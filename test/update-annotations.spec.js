import { describe, it, expect } from "vitest";
import { updateNoteAnnotations } from "../src/merge.js";

const ANNS = [
  { key: "AAA111", type: "highlight", attachmentKey: "PDF1", pageLabel: "3", pageIndex: 3, sortIndex: 1, annotatedText: "first point", comment: "" },
  { key: "BBB222", type: "highlight", attachmentKey: "PDF1", pageLabel: "5", pageIndex: 5, sortIndex: 2, annotatedText: "second point", comment: "matters" },
];

// A freshly-created note: populated frontmatter, user prose, empty annotations.
const NOTE = `---
citekey: "x2021"
KeyIdea: my key idea
---

## Notes
My reading notes here.

## Annotations
`;

const countAnchors = (md) => (md.match(/%% ann:[A-Za-z0-9]+ %%/g) || []).length;

describe("updateNoteAnnotations (sync annotations into an existing note)", () => {
  it("fills an empty Annotations section without touching frontmatter or prose", () => {
    const out = updateNoteAnnotations(NOTE, ANNS, {});
    expect(countAnchors(out)).toBe(2);
    expect(out).toContain("KeyIdea: my key idea");
    expect(out).toContain("My reading notes here.");
    expect(out).toContain('"first point"');
  });

  it("is idempotent: syncing the same annotations again is byte-identical", () => {
    const once = updateNoteAnnotations(NOTE, ANNS, {});
    const twice = updateNoteAnnotations(once, ANNS, {});
    expect(twice).toBe(once);
    expect(countAnchors(twice)).toBe(2);
  });

  it("adds a new annotation once and preserves a manual edit to an existing one", () => {
    let note = updateNoteAnnotations(NOTE, ANNS, {});
    note = note.replace('"first point"', '"first point" >> my aside');
    const more = [...ANNS, { key: "CCC333", type: "highlight", attachmentKey: "PDF1", pageLabel: "9", pageIndex: 9, sortIndex: 3, annotatedText: "third point", comment: "" }];
    const after = updateNoteAnnotations(note, more, {});
    expect(countAnchors(after)).toBe(3);
    expect(after).toContain(">> my aside");
    expect(after).toContain("%% ann:CCC333 %%");
    for (const k of ["AAA111", "BBB222"]) {
      expect((after.match(new RegExp(`ann:${k} `, "g")) || []).length).toBe(1);
    }
  });

  it("appends an Annotations section if the note has none", () => {
    const noSection = `---\ncitekey: "y"\n---\n\n## Notes\nstuff\n`;
    const out = updateNoteAnnotations(noSection, ANNS, {});
    expect(out).toContain("## Annotations");
    expect(countAnchors(out)).toBe(2);
    expect(out).toContain("stuff");
  });
});
