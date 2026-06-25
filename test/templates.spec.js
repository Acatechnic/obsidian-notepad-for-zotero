import { describe, it, expect } from "vitest";
import { parseTemplateFile, templateKind } from "../src/templates.js";
import { renderBlockBody } from "../src/blocks.js";

describe("parseTemplateFile", () => {
  it("parses a body with no directive (sep inferred)", () => {
    const t = parseTemplateFile(`- [p.{{page}}]({{link}}) "{{text}}"`);
    expect(t.defaults).toEqual({});
    expect(t.item).toBe(`- [p.{{page}}]({{link}}) "{{text}}"`);
    expect(t.sep).toBe("\n"); // single-line body → newline join
  });

  it("infers blank-line separator for a multi-line body", () => {
    const t = parseTemplateFile(`> {{text}}\n> — p.{{page}}`);
    expect(t.sep).toBe("\n\n");
  });

  it("reads a directive header and strips it from the body", () => {
    const t = parseTemplateFile(`%%! colour=yellow sync=on %%\n> {{text}}`);
    expect(t.defaults).toEqual({ colour: "yellow", sync: "on" });
    expect(t.item).toBe(`> {{text}}`);
  });

  it("normalises color→colour and honours sep=blank", () => {
    const t = parseTemplateFile(`%%! color=red sep=blank %%\n- {{text}}`);
    expect(t.defaults).toEqual({ colour: "red" });
    expect(t.sep).toBe("\n\n");
  });

  it("honours sep=newline even for a multi-line body", () => {
    const t = parseTemplateFile(`%%! sep=newline %%\n- a {{text}}\n  continued`);
    expect(t.sep).toBe("\n");
  });

  it("a parsed template renders through renderBlockBody", () => {
    const t = parseTemplateFile(`%%! colour=yellow %%\n- "{{text}}" (p.{{page}})`);
    const anns = [
      { annotatedText: "hello", pageLabel: "3", attachmentKey: "AK", pageIndex: 2, key: "K1", colourName: "yellow", sortIndex: "00001" },
      { annotatedText: "skipme", pageLabel: "4", attachmentKey: "AK", pageIndex: 3, key: "K2", colourName: "red", sortIndex: "00002" },
    ];
    // colour filter applied via the block config (not the template defaults)
    const out = renderBlockBody({ colour: "yellow", format: "t" }, anns, {
      formats: { t: { item: t.item, sep: t.sep } },
    });
    expect(out).toBe(`- "hello" (p.3) %% ann:K1 %%`); // only the yellow one, anchored (A2)
  });
});

describe("templateKind with LLM blocks", () => {
  it("classifies a template with an LLM block as document", () => {
    expect(templateKind('{% llm context="abstract" %}x{% endllm %}')).toBe("document");
  });

  it("classifies a plain per-annotation format as format", () => {
    expect(templateKind("> {{text}}")).toBe("format");
  });

  it("LLM block beats format-only body (no frontmatter, no zon)", () => {
    const t = "- {{text}}\n{% llm context=\"abstract\" %}p{% endllm %}";
    expect(templateKind(t)).toBe("document");
  });
});
