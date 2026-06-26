import { describe, it, expect } from "vitest";
import {
  previewTemplate, cleanPreview, BUILDER_SCAFFOLD, BUILDER_SNIPPETS,
  BLOCK_VARIABLES, ITEM_VARIABLES, SAMPLE_ITEM, SAMPLE_ANNOTATIONS,
  buildNoteTemplate, buildFormatTemplate, STARTER_NOTE, STARTER_FORMAT,
  FORMAT_STYLES, NOTE_FIELDS,
} from "../src/builder.js";
import { templateKind } from "../src/templates.js";

const ctx = { itemData: SAMPLE_ITEM, annotations: SAMPLE_ANNOTATIONS, citekey: SAMPLE_ITEM.citekey };

describe("previewTemplate — per-annotation (format) templates", () => {
  it("renders each highlight through the body, like Insert", () => {
    const out = previewTemplate('- "{{text}}" (p.{{page}})', ctx);
    expect(out.kind).toBe("format");
    expect(out.error).toBeFalsy();
    expect(out.raw).toContain('"Coproduction reshapes the clinician–patient relationship." (p.3)');
    expect(out.raw).toContain('(p.5)');
    // makeBlock wraps it in a live zon block with per-annotation anchors.
    expect(out.raw).toMatch(/%% zon kind=annotations/);
    expect(out.raw).toContain("%% ann:SAMP0001 %%");
  });

  it("exposes the new per-annotation tags variable in the preview", () => {
    const out = previewTemplate("- {{text}}{% for t in tags %} #{{t}}{% endfor %}", ctx);
    expect(out.raw).toContain("#finding #method"); // SAMP0001
    expect(out.raw).toContain("#quote");            // SAMP0002
  });

  it("honours a directive (colour filter) in the body", () => {
    const out = previewTemplate('%%! colour=blue %%\n> {{text}}', ctx);
    expect(out.raw).toContain("a clean, quotable sentence"); // the blue one
    expect(out.raw).not.toContain("Coproduction reshapes");  // yellow excluded
  });
});

describe("previewTemplate — whole-note (document) templates", () => {
  it("renders frontmatter from item data and fills annotation blocks", () => {
    const out = previewTemplate(BUILDER_SCAFFOLD, ctx);
    expect(out.kind).toBe("document");
    expect(out.error).toBeFalsy();
    expect(out.raw).toContain('citekey: "doe2023example"');
    expect(out.raw).toContain('Title: "A Worked Example of Coproduction in Practice"');
    expect(out.raw).toContain('Year: "2023"');                 // date | format('YYYY')
    expect(out.raw).toContain("[Open PDF in Zotero](zotero://open-pdf/library/items/SAMPLEPDF)");
    // highlights(colour="yellow") routed only the yellow highlights into its block
    expect(out.raw).toContain("a second yellow point");
  });

  it("colour routing keeps blue out of the yellow block and vice-versa", () => {
    const tpl = '## Y\n{{ highlights(colour="yellow", format="quote") }}\n\n## B\n{{ highlights(colour="blue", format="quote") }}';
    const out = previewTemplate(tpl, ctx);
    const yIdx = out.raw.indexOf("## Y");
    const bIdx = out.raw.indexOf("## B");
    const yellowBlock = out.raw.slice(yIdx, bIdx);
    expect(yellowBlock).toContain("Coproduction reshapes");        // yellow
    expect(yellowBlock).not.toContain("a clean, quotable sentence"); // blue not here
  });
});

describe("previewTemplate — robustness", () => {
  it("never throws on a broken template; returns the error as preview text", () => {
    const out = previewTemplate("{{ oops(", ctx);
    expect(out.error).toBe(true);
    expect(out.preview).toContain("Template error");
  });

  it("works with no annotations and no item (empty ctx)", () => {
    const out = previewTemplate('- "{{text}}"', {});
    expect(out.error).toBeFalsy();
    expect(typeof out.raw).toBe("string");
  });
});

describe("cleanPreview", () => {
  it("strips %% … %% comments and collapses the gaps", () => {
    const raw = '%% zon kind=annotations colour=all sync=on format=list %%\n- "x" %% ann:A %%\n%% /zon %%';
    const clean = cleanPreview(raw);
    expect(clean).not.toContain("%%");
    expect(clean).toContain('- "x"');
    expect(clean).not.toMatch(/\n{3,}/);
  });
});

describe("palettes + scaffold are well-formed", () => {
  it("the scaffold is classified as a whole-note (document) template", () => {
    expect(templateKind(BUILDER_SCAFFOLD)).toBe("document");
  });

  it("every snippet text is a non-empty string with a stable id + label", () => {
    const ids = new Set();
    for (const s of BUILDER_SNIPPETS) {
      expect(s.id, JSON.stringify(s)).toBeTruthy();
      expect(ids.has(s.id)).toBe(false);
      ids.add(s.id);
      expect(s.label).toBeTruthy();
      expect(typeof s.text).toBe("string");
      expect(s.text.length).toBeGreaterThan(0);
    }
  });

  it("variable tokens are {{…}} Nunjucks expressions", () => {
    for (const v of [...BLOCK_VARIABLES, ...ITEM_VARIABLES]) {
      expect(v.token, v.label).toMatch(/^\{\{.*\}\}$/);
      expect(v.label).toBeTruthy();
    }
  });

  it("every block snippet renders without error through the preview", () => {
    for (const s of BUILDER_SNIPPETS) {
      const out = previewTemplate(s.text, ctx);
      expect(out.error, `${s.id}: ${out.raw}`).toBeFalsy();
    }
  });

  it("the documented format snippets actually emit the highlight text", () => {
    for (const id of ["format-list", "format-quote", "format-callout"]) {
      const s = BUILDER_SNIPPETS.find((x) => x.id === id);
      const out = previewTemplate(s.text, ctx);
      expect(out.raw, id).toContain("Coproduction reshapes");
    }
  });
});

describe("buildNoteTemplate (compose → whole-note template)", () => {
  it("is a valid whole-note template that renders against item data", () => {
    const tpl = buildNoteTemplate({ fields: ["title", "year", "authors", "tags"], notes: true, highlights: true, highlightFormat: "quote" });
    expect(templateKind(tpl)).toBe("document"); // frontmatter detected (closing --- on its own line)
    const out = previewTemplate(tpl, ctx);
    expect(out.error).toBeFalsy();
    expect(out.raw).toContain('Title: "A Worked Example of Coproduction in Practice"');
    expect(out.raw).toContain('Year: "2023"');
    expect(out.raw).toContain('"Doe, Jane"');        // authors loop
    expect(out.raw).toContain("## Notes");
    expect(out.raw).toContain("## Highlights");
    expect(out.raw).toContain("Coproduction reshapes"); // single all-colour block filled
  });

  it("only includes the frontmatter fields you ticked", () => {
    const tpl = buildNoteTemplate({ fields: ["title"], highlights: true });
    expect(tpl).toContain('Title: "{{title}}"');
    expect(tpl).not.toContain("Journal:");
    expect(tpl).not.toContain("Authors:");
  });

  it("routes by colour when asked, with one block per chosen colour", () => {
    const tpl = buildNoteTemplate({ fields: ["title"], highlights: true, byColour: true, colours: ["yellow", "blue"], highlightFormat: "quote" });
    expect(tpl).toContain('highlights(colour="yellow"');
    expect(tpl).toContain('highlights(colour="blue"');
    const out = previewTemplate(tpl, ctx);
    expect(out.error).toBeFalsy();
    expect(out.raw).toContain("Coproduction reshapes");        // yellow
    expect(out.raw).toContain("a clean, quotable sentence");   // blue
  });

  it("adds the openPdf / citation / abstract body blocks when ticked", () => {
    const tpl = buildNoteTemplate({ fields: ["title"], openPdf: true, citation: true, abstract: true, highlights: false });
    const out = previewTemplate(tpl, ctx);
    expect(out.raw).toContain("[Open PDF in Zotero](zotero://open-pdf/library/items/SAMPLEPDF)");
    expect(out.raw).toContain("Doe J and Smith A (2023)"); // bibliography
    expect(out.raw).toContain("A short sample abstract");
  });
});

describe("buildFormatTemplate (compose → per-highlight body)", () => {
  it("each style renders the highlight text without error", () => {
    for (const s of FORMAT_STYLES) {
      const tpl = buildFormatTemplate({ style: s.id, parts: { page: true, comment: true, tags: true } });
      const out = previewTemplate(tpl, ctx);
      expect(out.error, s.id + ": " + out.raw).toBeFalsy();
      expect(out.raw, s.id).toContain("Coproduction reshapes");
      expect(out.raw, s.id).toContain("#finding"); // tags part on
    }
  });

  it("drops the page link and comment when those parts are off", () => {
    const tpl = buildFormatTemplate({ style: "list", parts: { page: false, comment: false, tags: false } });
    expect(tpl).not.toContain("{{link}}");
    expect(tpl).not.toContain("{{comment}}");
    expect(tpl).toContain('"{{text}}"');
  });

  it("pins a colour via a directive when chosen", () => {
    const tpl = buildFormatTemplate({ style: "quote", colour: "blue", parts: { page: true } });
    expect(tpl).toMatch(/^%%! colour=blue/);
    const out = previewTemplate(tpl, ctx);
    expect(out.raw).toContain("a clean, quotable sentence"); // blue highlight only
    expect(out.raw).not.toContain("Coproduction reshapes");  // yellow excluded
  });
});

describe("starters are valid and classify correctly", () => {
  it("STARTER_NOTE is a document template that renders", () => {
    expect(templateKind(STARTER_NOTE)).toBe("document");
    expect(previewTemplate(STARTER_NOTE, ctx).error).toBeFalsy();
  });
  it("STARTER_FORMAT is a per-highlight body that renders", () => {
    expect(templateKind(STARTER_FORMAT)).toBe("format");
    const out = previewTemplate(STARTER_FORMAT, ctx);
    expect(out.error).toBeFalsy();
    expect(out.raw).toContain("Coproduction reshapes");
  });
});
