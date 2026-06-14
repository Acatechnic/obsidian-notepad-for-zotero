import { describe, it, expect } from "vitest";
import { renderAnnotationsSection, renderAnnotationLine, mapZoteroAnnotation } from "../src/annotations.js";
import { mergeNote } from "../src/merge.js";

const ANNS = [
  {
    key: "HXQBPCWS", type: "highlight", attachmentKey: "MFZCGEC3",
    pageLabel: "1", pageIndex: 0, sortIndex: 1,
    annotatedText: "counter-democracy and depoliticisation.", comment: "",
  },
  {
    key: "AB12CD34", type: "highlight", attachmentKey: "MFZCGEC3",
    pageLabel: "2", pageIndex: 2, sortIndex: 2,
    annotatedText: "Custodial sites are by default closed worlds",
    comment: "engages with the ontology of prison",
  },
  {
    key: "NOTE0001", type: "text", attachmentKey: "MFZCGEC3",
    pageLabel: "7", pageIndex: 7, sortIndex: 3,
    annotatedText: "", comment: "follow up on this method",
  },
];

const noteWith = (annsBody) =>
  `---\ncitekey: aitken2021\nKeyIdea:\n---\n\n## Notes\n\n## Annotations\n${annsBody}\n`;

const countAnchors = (md) => (md.match(/%% ann:[A-Za-z0-9]+ %%/g) || []).length;

describe("annotation rendering (user's real format)", () => {
  it("renders a highlight as a page-linked quote with hidden key anchor", () => {
    const line = renderAnnotationLine(ANNS[0], { citekey: "aitken2021" });
    expect(line).toBe(
      '- [p.1](zotero://open-pdf/library/items/MFZCGEC3?page=0) "counter-democracy and depoliticisation." %% ann:HXQBPCWS %%'
    );
  });

  it("renders a highlight-with-comment using the em-dash italic form", () => {
    const line = renderAnnotationLine(ANNS[1], {});
    expect(line).toContain('"Custodial sites are by default closed worlds"');
    expect(line).toContain("— *engages with the ontology of prison*");
    expect(line).toContain("%% ann:AB12CD34 %%");
  });

  it("renders a standalone note/comment", () => {
    const line = renderAnnotationLine(ANNS[2], {});
    expect(line).toContain("*Note:* follow up on this method");
    expect(line).toContain("%% ann:NOTE0001 %%");
  });

  it("orders by sortIndex and anchors every block", () => {
    const body = renderAnnotationsSection(ANNS, { citekey: "aitken2021" });
    expect(countAnchors(body)).toBe(3);
    expect(body.indexOf("HXQBPCWS")).toBeLessThan(body.indexOf("AB12CD34"));
  });
});

describe("mapZoteroAnnotation (Zotero annotation item -> our shape)", () => {
  it("extracts fields and the pageIndex from the JSON position", () => {
    const z = {
      key: "HXQBPCWS",
      annotationType: "highlight",
      annotationText: "some text",
      annotationComment: "a note",
      annotationPageLabel: "64",
      annotationSortIndex: "00012|000453|00231",
      annotationPosition: JSON.stringify({ pageIndex: 3, rects: [[1, 2, 3, 4]] }),
    };
    const m = mapZoteroAnnotation(z, "MFZCGEC3");
    expect(m).toMatchObject({
      key: "HXQBPCWS", type: "highlight", annotatedText: "some text",
      comment: "a note", pageLabel: "64", pageIndex: 3, attachmentKey: "MFZCGEC3",
      sortIndex: "00012|000453|00231",
    });
  });

  it("defaults pageIndex to 0 on a malformed position", () => {
    const m = mapZoteroAnnotation({ key: "K", annotationType: "note", annotationPosition: "{bad" }, "ATT");
    expect(m.pageIndex).toBe(0);
  });

  it("renders Zotero sortIndex order correctly via the string comparator", () => {
    const anns = [
      mapZoteroAnnotation({ key: "B", annotationType: "highlight", annotationText: "b", annotationSortIndex: "00002|0|0", annotationPosition: "{}" }, "A"),
      mapZoteroAnnotation({ key: "A", annotationType: "highlight", annotationText: "a", annotationSortIndex: "00001|0|0", annotationPosition: "{}" }, "A"),
    ];
    const body = renderAnnotationsSection(anns, {});
    expect(body.indexOf('"a"')).toBeLessThan(body.indexOf('"b"'));
  });
});

describe("annotations merge end-to-end", () => {
  it("is idempotent: re-rendering + merging the same annotations is byte-identical", () => {
    const note1 = mergeNote(null, noteWith(renderAnnotationsSection(ANNS, {})));
    const note2 = mergeNote(note1, noteWith(renderAnnotationsSection(ANNS, {})));
    expect(note2).toBe(note1);
    expect(countAnchors(note2)).toBe(3);
  });

  it("adds a new annotation once and preserves a manual edit to an existing one", () => {
    let note = mergeNote(null, noteWith(renderAnnotationsSection(ANNS, {})));
    // user adds their own aside to the first annotation:
    note = note.replace(
      "depoliticisation.\"",
      "depoliticisation.\" >> central to my argument"
    );
    const moreAnns = [
      ...ANNS,
      {
        key: "NEW99999", type: "highlight", attachmentKey: "MFZCGEC3",
        pageLabel: "9", pageIndex: 9, sortIndex: 4,
        annotatedText: "small-world topology", comment: "compare ch.2",
      },
    ];
    const after = mergeNote(note, noteWith(renderAnnotationsSection(moreAnns, {})));
    expect(countAnchors(after)).toBe(4);
    expect(after).toContain(">> central to my argument"); // manual edit survived
    expect(after).toContain("%% ann:NEW99999 %%");
    // no duplicate of the originals:
    for (const k of ["HXQBPCWS", "AB12CD34", "NOTE0001"]) {
      expect((after.match(new RegExp(`ann:${k} `, "g")) || []).length).toBe(1);
    }
  });
});
