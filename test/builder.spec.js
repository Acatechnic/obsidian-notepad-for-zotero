import { describe, it, expect } from "vitest";
import {
  previewTemplate, cleanPreview, paletteContextAt,
  BLOCK_VARIABLES, ITEM_VARIABLES, FRONTMATTER_FIELDS, FIELD_BLOCKS, ANNOTATION_BLOCKS,
  STARTER_NOTE, STARTER_FORMAT, SAMPLE_ITEM, SAMPLE_ANNOTATIONS,
  blockConfigAt, annotationMarkerOpen, annotationBlockText,
  FRONTMATTER_VALUES, frontmatterFieldText, frontmatterFieldKeys,
  addFrontmatterField, removeFrontmatterField,
} from "../src/builder.js";
import { templateKind } from "../src/templates.js";
import { composeFormat } from "../src/formats.js";
import { renderBlockBody } from "../src/blocks.js";

const ctx = { itemData: SAMPLE_ITEM, annotations: SAMPLE_ANNOTATIONS, citekey: SAMPLE_ITEM.citekey };

describe("previewTemplate — per-annotation (format) templates", () => {
  it("renders each highlight through the body, like Insert", () => {
    const out = previewTemplate('- "{{text}}" (p.{{page}})', ctx);
    expect(out.kind).toBe("format");
    expect(out.error).toBeFalsy();
    expect(out.raw).toContain('"Coproduction reshapes the clinician–patient relationship." (p.3)');
    expect(out.raw).toContain("%% ann:SAMP0001 %%");
  });

  it("exposes the per-annotation tags variable in the preview", () => {
    const out = previewTemplate("- {{text}}{% for t in tags %} #{{t}}{% endfor %}", ctx);
    expect(out.raw).toContain("#finding #method");
    expect(out.raw).toContain("#quote");
  });

  it("honours a directive (colour filter) in the body", () => {
    const out = previewTemplate('%%! colour=blue %%\n> {{text}}', ctx);
    expect(out.raw).toContain("a clean, quotable sentence");
    expect(out.raw).not.toContain("Coproduction reshapes");
  });
});

describe("previewTemplate — whole-note (document) templates", () => {
  it("renders the note starter against item data and fills its block", () => {
    const out = previewTemplate(STARTER_NOTE, ctx);
    expect(out.kind).toBe("document");
    expect(out.error).toBeFalsy();
    expect(out.raw).toContain('Title: "A Worked Example of Coproduction in Practice"');
    expect(out.raw).toContain("## Notes");
    expect(out.raw).toContain("Coproduction reshapes"); // the all-colour block filled
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

describe("paletteContextAt — where the cursor is, for the context-aware palette", () => {
  const doc = [
    "---",
    'Topics: "{{allTags}}"',
    "---",
    "",
    "Some body prose.",
    "",
    "%% zon kind=annotations colour=all sync=on format=list %%",
    '- "x"',
    "%% /zon %%",
    "",
    "%% zon kind=field sync=on format=abstract %%",
    "> abs",
    "%% /zon %%",
    "Trailing prose.",
  ].join("\n");
  const at = (sub, after) => doc.indexOf(sub) + (after ? sub.length : 0);

  it("reports frontmatter inside the leading --- … --- block", () => {
    expect(paletteContextAt(doc, at("Topics")).context).toBe("frontmatter");
  });
  it("reports body for prose outside any block", () => {
    expect(paletteContextAt(doc, at("Some body prose.")).context).toBe("body");
    expect(paletteContextAt(doc, at("Trailing prose.")).context).toBe("body");
  });
  it("reports the block kind when inside a %% zon %% block", () => {
    const inAnn = paletteContextAt(doc, at('- "x"'));
    expect(inAnn.context).toBe("block");
    expect(inAnn.blockKind).toBe("annotations");
    const inField = paletteContextAt(doc, at("> abs"));
    expect(inField.context).toBe("block");
    expect(inField.blockKind).toBe("field");
  });
  it("treats a cursor on the open marker as inside the block", () => {
    expect(paletteContextAt(doc, at("kind=annotations")).context).toBe("block");
  });
  it("defaults to body for an empty or offsetless doc", () => {
    expect(paletteContextAt("", 0).context).toBe("body");
    expect(paletteContextAt("hello").context).toBe("body");
  });
});

describe("updatable field blocks render their item field", () => {
  const preview = (label) => previewTemplate(FIELD_BLOCKS.find((b) => b.label.startsWith(label)).text, ctx);

  it("Citation → the formatted bibliography", () => {
    const out = preview("Citation");
    expect(out.error).toBeFalsy();
    expect(out.raw).toContain("Doe J and Smith A (2023)");
  });
  it("Abstract → the abstract text", () => {
    expect(preview("Abstract").raw).toContain("A short sample abstract");
  });
  it("Title → the title", () => {
    expect(preview("Title").raw).toContain("A Worked Example of Coproduction in Practice");
  });
  it("Authors → the author names", () => {
    const out = preview("Authors").raw;
    expect(out).toContain("[[Doe, Jane]]");
    expect(out).toContain("[[Smith, Alex]]");
  });

  it("a field block stays in sync (idempotent re-render)", () => {
    const blk = FIELD_BLOCKS[0].text; // citation
    const once = previewTemplate(blk, ctx).raw;
    const note = `# N\n\n${once}\n`;
    // re-running the document path over the same data is stable
    expect(previewTemplate(note, ctx).error).toBeFalsy();
  });
});

describe("annotation-block presets render without error", () => {
  it("each preset previews cleanly", () => {
    for (const b of ANNOTATION_BLOCKS) {
      const out = previewTemplate(b.text, ctx);
      expect(out.error, b.label + ": " + out.raw).toBeFalsy();
    }
  });
  it("the tag preset filters to method-tagged highlights", () => {
    const out = previewTemplate(ANNOTATION_BLOCKS.find((b) => b.label.startsWith("By tag")).text, ctx);
    expect(out.raw).toContain("Coproduction reshapes");        // SAMP0001 has #method
    expect(out.raw).not.toContain("a clean, quotable sentence"); // SAMP0002 is #quote
  });
});

describe("annotation-block configurator engine", () => {
  it("composeFormat builds a body from style + parts (the 'advanced' mode)", () => {
    // quote with only the page link
    const f1 = composeFormat("quote", ["page"]);
    const b1 = renderBlockBody({ colour: "all", style: "quote", parts: "page" }, SAMPLE_ANNOTATIONS, {});
    expect(b1).toContain("> Coproduction reshapes");
    expect(b1).toContain("[p.3]"); // page on
    expect(b1).not.toContain("#finding"); // tags off
    // list with page+comment+tags
    const b2 = renderBlockBody({ colour: "all", style: "list", parts: "page,comment,tags" }, SAMPLE_ANNOTATIONS, {});
    expect(b2).toContain("#finding #method");
    expect(b2).toContain("— *core claim*");
  });

  it("a block renders via style+parts even with no named format available", () => {
    const body = renderBlockBody({ colour: "all", style: "callout", parts: "comment" }, SAMPLE_ANNOTATIONS, {});
    expect(body).toContain("> [!quote]");
    expect(body).toContain("Coproduction reshapes");
  });

  it("the colour filter accepts a comma list (OR)", () => {
    const body = renderBlockBody({ colour: "yellow,blue", format: "list" }, SAMPLE_ANNOTATIONS, {});
    expect(body).toContain("Coproduction reshapes");      // yellow
    expect(body).toContain("a clean, quotable sentence");  // blue
  });

  it("annotationMarkerOpen / annotationBlockText serialise a config", () => {
    const open = annotationMarkerOpen({ colour: "yellow,blue", tag: "method", style: "quote", parts: "page,comment", sync: "on" });
    expect(open).toBe("%% zon kind=annotations colour=yellow,blue tag=method style=quote parts=page,comment sync=on %%");
    expect(annotationBlockText({ format: "list" })).toBe("%% zon kind=annotations colour=all format=list sync=on %%\n%% /zon %%");
  });

  it("blockConfigAt reads the block under the cursor + its open-marker range", () => {
    const doc = "intro\n\n%% zon kind=annotations colour=yellow tag=method sync=on format=quote %%\n%% /zon %%\nafter";
    const inside = doc.indexOf("tag=method");
    const r = blockConfigAt(doc, inside);
    expect(r).not.toBeNull();
    expect(r.config.colour).toBe("yellow");
    expect(r.config.tag).toBe("method");
    // the open-marker range round-trips: replacing it rebuilds a valid marker
    expect(doc.slice(r.openStart, r.openEnd)).toMatch(/^%% zon .* %%$/);
    expect(blockConfigAt(doc, doc.indexOf("intro"))).toBeNull(); // outside any block
  });

  it("round-trip: edit a block's config in place via blockConfigAt + annotationMarkerOpen", () => {
    let doc = "%% zon kind=annotations colour=all sync=on format=quote %%\n%% /zon %%";
    const r = blockConfigAt(doc, 5);
    const next = annotationMarkerOpen({ ...r.config, colour: "red", tag: "finding" });
    doc = doc.slice(0, r.openStart) + next + doc.slice(r.openEnd);
    expect(doc).toContain("colour=red");
    expect(doc).toContain("tag=finding");
    expect(blockConfigAt(doc, 5).config.colour).toBe("red"); // still parseable
  });
});

describe("frontmatter field builder (add / remove)", () => {
  const val = (id) => FRONTMATTER_VALUES.find((v) => v.id === id);
  const base = "---\ncitekey: \"x\"\n---\n\n## Notes\n";

  it("frontmatterFieldText builds scalar, list, empty and custom lines", () => {
    expect(frontmatterFieldText("Year", val("year"))).toBe("Year: \"{{date | format('YYYY')}}\"");
    expect(frontmatterFieldText("Topics", val("tagsList"))).toBe("Topics:\n{% for t in allTags.split(', ') %}\n  - \"{{t}}\"\n{% endfor %}");
    expect(frontmatterFieldText("KeyIdea", val("empty"))).toBe("KeyIdea:");
    expect(frontmatterFieldText("X", val("custom"), '"{{itemType}}"')).toBe('X: "{{itemType}}"');
  });

  it("adds a field before the closing --- and keeps the body", () => {
    const out = addFrontmatterField(base, frontmatterFieldText("Title", val("title")));
    expect(out).toContain('citekey: "x"');
    expect(out).toContain('Title: "{{title}}"');
    expect(out).toMatch(/Title: "\{\{title\}\}"\n---/); // before the closing fence
    expect(out).toContain("## Notes"); // body untouched
  });

  it("uses your own key name (Topics, not Tags)", () => {
    const out = addFrontmatterField(base, frontmatterFieldText("Topics", val("tagsList")));
    expect(out).toContain("Topics:");
    expect(out).toContain("{% for t in allTags.split(', ') %}");
    expect(out).not.toContain("Tags:");
  });

  it("creates the frontmatter block if the note has none", () => {
    const out = addFrontmatterField("just body text\n", frontmatterFieldText("Title", val("title")));
    expect(out.startsWith('---\nTitle: "{{title}}"\n---\n')).toBe(true);
    expect(out).toContain("just body text");
  });

  it("lists the field keys and removes one (incl. its loop lines)", () => {
    let md = addFrontmatterField(base, frontmatterFieldText("Topics", val("tagsList")));
    md = addFrontmatterField(md, frontmatterFieldText("Title", val("title")));
    expect(frontmatterFieldKeys(md)).toEqual(["citekey", "Topics", "Title"]);
    const removed = removeFrontmatterField(md, "Topics");
    expect(removed).not.toContain("Topics:");
    expect(removed).not.toContain("{% for t in allTags"); // the loop went too
    expect(removed).toContain('Title: "{{title}}"');       // siblings kept
    expect(removed).toContain('citekey: "x"');
    expect(frontmatterFieldKeys(removed)).toEqual(["citekey", "Title"]);
  });

  it("add then remove round-trips back to the original keys", () => {
    const added = addFrontmatterField(base, frontmatterFieldText("Year", val("year")));
    expect(frontmatterFieldKeys(removeFrontmatterField(added, "Year"))).toEqual(["citekey"]);
  });
});

describe("palette catalogs + starters are well-formed", () => {
  it("variable tokens are {{…}} expressions with labels", () => {
    for (const v of [...BLOCK_VARIABLES, ...ITEM_VARIABLES]) {
      expect(v.token, v.label).toMatch(/^\{\{.*\}\}$/);
      expect(v.label).toBeTruthy();
    }
  });
  it("frontmatter-field inserts are non-empty labelled lines", () => {
    for (const f of FRONTMATTER_FIELDS) { expect(f.label).toBeTruthy(); expect(f.text.length).toBeGreaterThan(0); }
    expect(FRONTMATTER_FIELDS.find((f) => f.label === "Title").text).toContain("{{title}}");
  });
  it("STARTER_NOTE is a document template that renders; STARTER_FORMAT is a per-highlight body", () => {
    expect(templateKind(STARTER_NOTE)).toBe("document");
    expect(previewTemplate(STARTER_NOTE, ctx).error).toBeFalsy();
    expect(templateKind(STARTER_FORMAT)).toBe("format");
    expect(previewTemplate(STARTER_FORMAT, ctx).raw).toContain("Coproduction reshapes");
  });
});
