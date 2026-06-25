import { describe, it, expect } from "vitest";
import { renderAnnotationsSection, renderAnnotationLine, mapZoteroAnnotation, renderAnnotationsContext } from "../src/annotations.js";
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
    // page = the LABEL ("1"), not the 0-based index, + the annotation key so
    // Zotero jumps to the exact annotation (fixes the off-by-one page open).
    expect(line).toBe(
      '- [p.1](zotero://open-pdf/library/items/MFZCGEC3?page=1&annotation=HXQBPCWS) "counter-democracy and depoliticisation." %% ann:HXQBPCWS %%'
    );
  });

  it("falls back to pageIndex+1 in the link when there is no page label", () => {
    const line = renderAnnotationLine(
      { key: "K", type: "highlight", attachmentKey: "ATT", pageLabel: "", pageIndex: 4, annotatedText: "x" }, {});
    expect(line).toContain("?page=5&annotation=K");
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

describe("renderAnnotationsContext (LLM context formatter)", () => {
  const HIGHLIGHT_WITH_COLOUR = {
    key: "ANN001", type: "highlight", attachmentKey: "ATT",
    pageLabel: "3", pageIndex: 2, sortIndex: 1,
    annotatedText: "networks shape cognition", comment: "central claim",
    colourName: "yellow",
  };

  const IMAGE_WITH_COMMENT = {
    key: "ANN003", type: "image", attachmentKey: "ATT",
    pageLabel: "9", pageIndex: 8, sortIndex: 3,
    annotatedText: "", comment: "this figure shows the topology",
    colourName: "blue",
    imageBaseName: "fig1.png",
  };
  const IMAGE_ONLY = {
    key: "ANN004", type: "image", attachmentKey: "ATT",
    pageLabel: "10", pageIndex: 9, sortIndex: 4,
    annotatedText: "", comment: "",
    colourName: "",
    imageBaseName: "fig2.png",
  };
  const TEXT_WITH_COMMENT = {
    key: "ANN005", type: "text", attachmentKey: "ATT",
    pageLabel: "7", pageIndex: 6, sortIndex: 5,
    annotatedText: "", comment: "follow up on this method",
    colourName: "",
  };

  it("produces structured markdown with header, quote, and comment", () => {
    const result = renderAnnotationsContext([HIGHLIGHT_WITH_COLOUR]);
    expect(result).toBe(
      '### p.3 — highlight (yellow)\n\n' +
      '> "networks shape cognition"\n\n' +
      'Comment: central claim'
    );
  });

  it("orders by sortIndex then key when input is out of order", () => {
    const outOfOrder = [
      { key: "B", type: "highlight", sortIndex: "3", pageLabel: "1", pageIndex: 0, annotatedText: "B text", comment: "", colourName: "", attachmentKey: "ATT" },
      { key: "A", type: "highlight", sortIndex: "1", pageLabel: "1", pageIndex: 0, annotatedText: "A text", comment: "", colourName: "", attachmentKey: "ATT" },
      { key: "C", type: "highlight", sortIndex: "2", pageLabel: "1", pageIndex: 0, annotatedText: "C text", comment: "", colourName: "", attachmentKey: "ATT" },
    ];
    const result = renderAnnotationsContext(outOfOrder);
    expect(result.indexOf("A text")).toBeLessThan(result.indexOf("C text"));
    expect(result.indexOf("C text")).toBeLessThan(result.indexOf("B text"));
  });

  it("includes Comment: line when comment is set", () => {
    const result = renderAnnotationsContext([HIGHLIGHT_WITH_COLOUR]);
    expect(result).toContain("Comment: central claim");
  });

  it("includes image annotation with comment (no blockquote, only header + Comment)", () => {
    const result = renderAnnotationsContext([IMAGE_WITH_COMMENT]);
    expect(result).toContain("### p.9 — image (blue)");
    expect(result).toContain("Comment: this figure shows the topology");
    expect(result).not.toContain('> "');
  });

  it("omits image-only annotation (empty text AND empty comment)", () => {
    expect(renderAnnotationsContext([IMAGE_ONLY])).toBe("");
  });

  it("includes text/note annotation with only a comment (header + Comment)", () => {
    const result = renderAnnotationsContext([TEXT_WITH_COMMENT]);
    expect(result).toContain("### p.7 — text");
    expect(result).toContain("Comment: follow up on this method");
    expect(result).not.toContain('> "');
  });

  it("handles missing fields (no sortIndex, colourName, or pageLabel)", () => {
    const a1 = {
      key: "BB", type: "underline", attachmentKey: "ATT",
      pageLabel: "", pageIndex: 2, sortIndex: undefined, colourName: undefined,
      annotatedText: "second", comment: "",
    };
    const a2 = {
      key: "AA", type: "highlight", attachmentKey: "ATT",
      pageLabel: "", pageIndex: undefined, sortIndex: undefined, colourName: undefined,
      annotatedText: "first", comment: "",
    };
    const result = renderAnnotationsContext([a1, a2]);
    expect(result.indexOf("p.?")).toBeLessThan(result.indexOf("p.3"));
    expect(result).toContain("### p.? — highlight");
    expect(result).toContain("### p.3 — underline");
    expect(result).not.toContain("(");
  });

  it("returns empty string for empty annotations array", () => {
    expect(renderAnnotationsContext([])).toBe("");
  });

  it("returns empty string when all annotations are image-only", () => {
    const result = renderAnnotationsContext([
      IMAGE_ONLY,
      { ...IMAGE_ONLY, key: "ANN006", sortIndex: 6 },
    ]);
    expect(result).toBe("");
  });

  it("output contains neither %% ann: nor ![[", () => {
    const result = renderAnnotationsContext([HIGHLIGHT_WITH_COLOUR, IMAGE_WITH_COMMENT, TEXT_WITH_COMMENT]);
    expect(result).not.toContain("%% ann:");
    expect(result).not.toContain("![[");
  });
});
