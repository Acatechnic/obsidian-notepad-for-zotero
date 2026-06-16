import { describe, it, expect } from "vitest";
import { findFrontmatterRange, findHeadingRanges, findLinkRanges, findEmphasisRanges } from "../src/preview.js";

describe("findFrontmatterRange", () => {
  it("spans the leading --- … --- block inclusive of both fences", () => {
    const t = '---\ntitle: "X"\n---\n\nBody';
    const r = findFrontmatterRange(t);
    expect(r).toEqual({ from: 0, to: t.indexOf("---\n\n") + 3 });
    expect(t.slice(r.from, r.to)).toBe('---\ntitle: "X"\n---');
  });
  it("returns null when there is no frontmatter", () => {
    expect(findFrontmatterRange("# Heading\nBody")).toBeNull();
  });
  it("does not match a --- that is not at the very top", () => {
    expect(findFrontmatterRange("Body\n---\nx\n---")).toBeNull();
  });
});

describe("findHeadingRanges", () => {
  it("finds ATX headings and the prefix range to hide", () => {
    const t = "# One\n\n### Three\ntext";
    const r = findHeadingRanges(t);
    expect(r.length).toBe(2);
    expect(r[0].level).toBe(1);
    expect(t.slice(r[0].markFrom, r[0].markTo)).toBe("# ");
    expect(r[1].level).toBe(3);
    expect(t.slice(r[1].markFrom, r[1].markTo)).toBe("### ");
    expect(t.slice(r[1].lineFrom, r[1].lineTo)).toBe("### Three");
  });
  it("ignores headings inside frontmatter and code fences", () => {
    const t = '---\n# not a heading\n---\n\n```\n# also not\n```\n# real';
    const r = findHeadingRanges(t);
    expect(r.length).toBe(1);
    expect(t.slice(r[0].lineFrom, r[0].lineTo)).toBe("# real");
  });
  it("ignores a bare # with no text", () => {
    expect(findHeadingRanges("#\n#nospace").length).toBe(0);
  });
});

describe("findLinkRanges", () => {
  it("locates the syntax and label of an inline link", () => {
    const t = "see [p.51](zotero://select/items/ABC) here";
    const r = findLinkRanges(t);
    expect(r.length).toBe(1);
    const l = r[0];
    expect(l.label).toBe("p.51");
    expect(l.target).toBe("zotero://select/items/ABC");
    expect(t.slice(l.openFrom, l.openTo)).toBe("[");
    expect(t.slice(l.labelFrom, l.labelTo)).toBe("p.51");
    expect(t.slice(l.closeFrom, l.closeTo)).toBe("](zotero://select/items/ABC)");
    expect(t.slice(l.from, l.to)).toBe("[p.51](zotero://select/items/ABC)");
  });
  it("finds multiple links on a line", () => {
    const r = findLinkRanges("[a](u1) and [b](u2)");
    expect(r.map((x) => x.label)).toEqual(["a", "b"]);
    expect(r.map((x) => x.target)).toEqual(["u1", "u2"]);
  });
  it("skips images and empty-label links", () => {
    expect(findLinkRanges("![alt](img.png)").length).toBe(0);
    expect(findLinkRanges("[](u)").length).toBe(0);
  });
  it("skips links inside a code fence", () => {
    const t = "```\n[x](y)\n```\n[real](z)";
    const r = findLinkRanges(t);
    expect(r.length).toBe(1);
    expect(r[0].label).toBe("real");
  });
});

describe("findEmphasisRanges", () => {
  const kinds = (t) => findEmphasisRanges(t).map((e) => e.kind);
  const content = (t) => findEmphasisRanges(t).map((e) => t.slice(e.contentFrom, e.contentTo));

  it("finds ** and __ strong, hiding the delimiters", () => {
    const t = "**Abstract:** and __bold__";
    const r = findEmphasisRanges(t);
    expect(r.map((e) => e.kind)).toEqual(["strong", "strong"]);
    expect(t.slice(r[0].openFrom, r[0].openTo)).toBe("**");
    expect(t.slice(r[0].contentFrom, r[0].contentTo)).toBe("Abstract:");
    expect(t.slice(r[0].closeFrom, r[0].closeTo)).toBe("**");
    expect(content(t)).toEqual(["Abstract:", "bold"]);
  });

  it("finds * and _ emphasis", () => {
    expect(content("*italic* and _slanted_")).toEqual(["italic", "slanted"]);
    expect(kinds("*italic*")).toEqual(["em"]);
  });

  it("does NOT treat snake_case or intra-word underscores as emphasis", () => {
    expect(findEmphasisRanges("query_date and a_b_c").length).toBe(0);
  });

  it("does not read the ** of strong as two single-* emphases", () => {
    expect(kinds("**bold**")).toEqual(["strong"]);
  });

  it("ignores emphasis inside frontmatter and code fences", () => {
    const t = '---\nx: "**no**"\n---\n\n```\n**no**\n```\n**yes**';
    const r = findEmphasisRanges(t);
    expect(r.length).toBe(1);
    expect(t.slice(r[0].contentFrom, r[0].contentTo)).toBe("yes");
  });
});
