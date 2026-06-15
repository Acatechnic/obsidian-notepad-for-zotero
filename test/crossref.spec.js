import { describe, it, expect } from "vitest";
import {
  normalizeTitle,
  titleSimilarity,
  normalizeDOI,
  extractYear,
  crossrefYear,
  buildCrossrefURL,
  pickBestMatch,
} from "../src/crossref.js";

describe("normalizeTitle", () => {
  it("lowercases, strips markup/entities and collapses punctuation", () => {
    expect(normalizeTitle("The <i>Regularity</i> of OPCAT &amp; Visits!"))
      .toBe("the regularity of opcat visits");
  });
  it("is null-safe", () => {
    expect(normalizeTitle(null)).toBe("");
    expect(normalizeTitle(undefined)).toBe("");
  });
});

describe("titleSimilarity", () => {
  it("is 1 for titles equal after normalisation", () => {
    expect(titleSimilarity("Hello World", "hello   world.")).toBe(1);
  });
  it("is high for near-identical titles", () => {
    expect(titleSimilarity(
      "Regularity of OPCAT visits by NPMs in Europe",
      "Regularity of OPCAT visits by NPMs in Europe.")).toBeGreaterThan(0.95);
  });
  it("is low for unrelated titles", () => {
    expect(titleSimilarity("Cats and dogs", "Quantum chromodynamics")).toBeLessThan(0.5);
  });
  it("is 0 when either side is empty", () => {
    expect(titleSimilarity("", "anything")).toBe(0);
  });
});

describe("normalizeDOI", () => {
  it("strips url and doi: prefixes", () => {
    expect(normalizeDOI("https://doi.org/10.1080/123.456")).toBe("10.1080/123.456");
    expect(normalizeDOI("http://dx.doi.org/10.1/x")).toBe("10.1/x");
    expect(normalizeDOI("doi: 10.2/y")).toBe("10.2/y");
    expect(normalizeDOI("  10.3/z  ")).toBe("10.3/z");
  });
});

describe("extractYear / crossrefYear", () => {
  it("extractYear pulls the first 4-digit run", () => {
    expect(extractYear("2019-01-02")).toBe(2019);
    expect(extractYear("March 2021")).toBe(2021);
    expect(extractYear("n.d.")).toBe(null);
  });
  it("crossrefYear reads issued then published fallbacks", () => {
    expect(crossrefYear({ issued: { "date-parts": [[2019, 1, 2]] } })).toBe(2019);
    expect(crossrefYear({ "published-print": { "date-parts": [[2018]] } })).toBe(2018);
    expect(crossrefYear({})).toBe(null);
  });
});

describe("buildCrossrefURL", () => {
  it("encodes the bibliographic query from title + author and trims the response", () => {
    const url = buildCrossrefURL({ title: "Regularity of OPCAT", author: "Hardwick" });
    expect(url).toContain("https://api.crossref.org/works?");
    expect(url).toContain("query.bibliographic=Regularity+of+OPCAT+Hardwick");
    expect(url).toContain("rows=5");
    expect(url).toContain("select=DOI");
  });
  it("respects a custom row count", () => {
    expect(buildCrossrefURL({ title: "x" }, { rows: 3 })).toContain("rows=3");
  });
});

describe("pickBestMatch", () => {
  const resp = (items) => ({ message: { items } });

  it("returns the high-similarity candidate and normalises its DOI", () => {
    const json = resp([
      { title: ["Something else entirely"], DOI: "10.0/wrong", score: 50 },
      { title: ["Regularity of OPCAT visits by NPMs in Europe"], DOI: "https://doi.org/10.1080/RIGHT", issued: { "date-parts": [[2019]] }, score: 80 },
    ]);
    const m = pickBestMatch(json, { title: "Regularity of OPCAT visits by NPMs in Europe", year: 2019 });
    expect(m).not.toBeNull();
    expect(m.doi).toBe("10.1080/RIGHT");
    expect(m.year).toBe(2019);
  });

  it("returns null when nothing clears the similarity threshold", () => {
    const json = resp([{ title: ["Totally different paper"], DOI: "10.0/x" }]);
    expect(pickBestMatch(json, { title: "Regularity of OPCAT visits by NPMs in Europe" })).toBeNull();
  });

  it("rejects a title match whose year is out of tolerance", () => {
    const json = resp([
      { title: ["Regularity of OPCAT visits by NPMs in Europe"], DOI: "10.1/x", issued: { "date-parts": [[2005]] } },
    ]);
    expect(pickBestMatch(json, { title: "Regularity of OPCAT visits by NPMs in Europe", year: 2019 })).toBeNull();
  });

  it("ignores candidates missing a DOI or title", () => {
    const json = resp([
      { title: ["Regularity of OPCAT visits by NPMs in Europe"] }, // no DOI
      { DOI: "10.1/x" }, // no title
    ]);
    expect(pickBestMatch(json, { title: "Regularity of OPCAT visits by NPMs in Europe" })).toBeNull();
  });

  it("handles an empty / malformed response", () => {
    expect(pickBestMatch(resp([]), { title: "x" })).toBeNull();
    expect(pickBestMatch(null, { title: "x" })).toBeNull();
    expect(pickBestMatch({}, { title: "x" })).toBeNull();
  });
});
