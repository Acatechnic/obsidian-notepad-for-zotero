import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { render } from "../src/render.js";
import { item } from "./fixtures/data.js";

const read = (p) => readFileSync(fileURLToPath(new URL(p, import.meta.url)), "utf8");

describe("renderer", () => {
  it("renders the user's ORIGINAL mgmeyers-dialect template without error", () => {
    const out = render(read("./fixtures/original.njk"), item);
    // custom helpers resolved:
    expect(out).toContain('Year: "2023"'); // format("YYYY")
    expect(out).toContain('citekey: "Doe2023"');
    expect(out).toContain('  - "[[Jane Doe]]"'); // creators loop
    expect(out).toContain('  - "[[cognition]]"'); // allTags.split + loop
    expect(out).toContain("### Imported: 2026-06-13"); // format datetime
    // filterby with null lastImportDate passes all annotations through:
    expect(out).toContain('"networks shape cognition"');
    expect(out).toContain("Note: follow up on this method");
  });

  it("renders the new anchored template with stable annotation keys", () => {
    const out = render(read("./fixtures/note.njk"), item);
    expect(out).toContain("%% ann:AAA111 %%");
    expect(out).toContain("%% ann:BBB222 %%");
    expect(out).toContain("%% ann:CCC333 %%");
    // no per-import timestamp heading in the new design:
    expect(out).not.toContain("Imported:");
  });
});

describe("LLM block preservation", () => {
  it("preserves an {% llm %} block around the rendered body", () => {
    const out = render(
      '{% llm context="abstract" %}Summarise {{title}}.{% endllm %}',
      { title: "My Paper" }
    );
    expect(out).toContain('{% llm context="abstract" %}');
    expect(out).toContain("{% endllm %}");
    expect(out).toContain("Summarise My Paper.");
  });

  it("preserves a multi-context block", () => {
    const out = render(
      '{% llm context="abstract,annotations" %}prompt{% endllm %}',
      {}
    );
    expect(out).toContain('context="abstract,annotations"');
    expect(out).toContain("{% endllm %}");
  });

  it("preserves multiple LLM blocks in one template", () => {
    const tpl = [
      "Before",
      '{% llm context="abstract" %}A{% endllm %}',
      "Middle",
      '{% llm context="fulltext" %}B{% endllm %}',
      "After",
    ].join("\n");
    const out = render(tpl, {});
    expect(out).toContain('context="abstract"');
    expect(out).toContain('context="fulltext"');
    expect(out).toContain("Before");
    expect(out).toContain("After");
  });

  it("does not call any model (body is the prompt, preserved)", () => {
    const out = render('{% llm context="abstract" %}prompt{% endllm %}', {});
    expect(out).toMatch(/\{%\s*llm\s+context="abstract"\s*%\}/);
    expect(out).toMatch(/\{%\s*endllm\s*%\}/);
  });
});
