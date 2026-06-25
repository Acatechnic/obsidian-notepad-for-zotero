import { describe, it, expect } from "vitest";
import {
  SUPPORTED_CONTEXTS,
  parseLLMContext,
  hasLLMBlocks,
  parseLLMBlocks,
  validateLLMBlocks,
} from "../src/llm-blocks.js";

// ---------------------------------------------------------------------------
// SUPPORTED_CONTEXTS
// ---------------------------------------------------------------------------
describe("SUPPORTED_CONTEXTS", () => {
  it("equals the three known context types", () => {
    expect(SUPPORTED_CONTEXTS).toEqual(["abstract", "annotations", "fulltext"]);
  });
});

// ---------------------------------------------------------------------------
// parseLLMContext
// ---------------------------------------------------------------------------
describe("parseLLMContext", () => {
  it('parses context="abstract" — single context', () => {
    expect(parseLLMContext('context="abstract"')).toEqual({
      contexts: ["abstract"],
      raw: "abstract",
    });
  });

  it('parses context="abstract,fulltext" — multiple contexts', () => {
    expect(parseLLMContext('context="abstract,fulltext"')).toEqual({
      contexts: ["abstract", "fulltext"],
      raw: "abstract,fulltext",
    });
  });

  it('handles spaces around the = sign: context = "abstract"', () => {
    expect(parseLLMContext('context = "abstract"')).toEqual({
      contexts: ["abstract"],
      raw: "abstract",
    });
  });

  it("handles single-quoted attribute: context='abstract'", () => {
    expect(parseLLMContext("context='abstract'")).toEqual({
      contexts: ["abstract"],
      raw: "abstract",
    });
  });

  it('handles empty value: context=""', () => {
    expect(parseLLMContext('context=""')).toEqual({
      contexts: [],
      raw: "",
    });
  });

  it('returns null when no context attribute — model="x"', () => {
    expect(parseLLMContext('model="x"')).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(parseLLMContext("")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// hasLLMBlocks
// ---------------------------------------------------------------------------
describe("hasLLMBlocks", () => {
  it('returns true when text contains {% llm … %}', () => {
    expect(hasLLMBlocks('{% llm context="abstract" %}x{% endllm %}')).toBe(true);
  });

  it("returns false for plain text with no LLM markers", () => {
    expect(hasLLMBlocks("no llm here")).toBe(false);
  });

  it("returns true when LLM tag is inside a fenced block (naive by design)", () => {
    expect(hasLLMBlocks("```\n{% llm context=\"abstract\" %}\n```")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// parseLLMBlocks — valid blocks
// ---------------------------------------------------------------------------
describe("parseLLMBlocks — valid block", () => {
  it("parses a single block with correct fields (multi-line)", () => {
    const text = [
      '{% llm context="abstract" %}',
      "Summarize this.",
      "{% endllm %}",
    ].join("\n");
    const { blocks, errors } = parseLLMBlocks(text);
    expect(errors).toEqual([]);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].openRaw).toBe('{% llm context="abstract" %}');
    expect(blocks[0].closeRaw).toBe("{% endllm %}");
    expect(blocks[0].contexts).toEqual(["abstract"]);
    expect(blocks[0].body).toBe("Summarize this.");
    expect(blocks[0].lineFrom).toBe(0);
    expect(blocks[0].lineTo).toBe(2);
  });

  it("parses multiple blocks in order", () => {
    const text = [
      '{% llm context="abstract" %}',
      "First block",
      "{% endllm %}",
      "some prose",
      '{% llm context="annotations" %}',
      "Second block",
      "{% endllm %}",
    ].join("\n");
    const { blocks, errors } = parseLLMBlocks(text);
    expect(errors).toEqual([]);
    expect(blocks).toHaveLength(2);
    expect(blocks[0].contexts).toEqual(["abstract"]);
    expect(blocks[0].body).toBe("First block");
    expect(blocks[0].lineFrom).toBe(0);
    expect(blocks[0].lineTo).toBe(2);
    expect(blocks[1].contexts).toEqual(["annotations"]);
    expect(blocks[1].body).toBe("Second block");
    expect(blocks[1].lineFrom).toBe(4);
    expect(blocks[1].lineTo).toBe(6);
  });

  it("extracts blocks from text with surrounding prose", () => {
    const text = [
      "# Notes",
      "",
      '{% llm context="fulltext" %}',
      "What is the main idea?",
      "{% endllm %}",
      "",
      "And some other text.",
    ].join("\n");
    const { blocks, errors } = parseLLMBlocks(text);
    expect(errors).toEqual([]);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].body).toBe("What is the main idea?");
  });
});

// ---------------------------------------------------------------------------
// parseLLMBlocks — fenced code ignored
// ---------------------------------------------------------------------------
describe("parseLLMBlocks — fenced code ignored", () => {
  it("ignores LLM-like lines inside a backtick fenced code block", () => {
    const text = [
      '```',
      '{% llm context="abstract" %}inside fence{% endllm %}',
      '```',
    ].join("\n");
    const { blocks, errors } = parseLLMBlocks(text);
    expect(blocks).toEqual([]);
    expect(errors).toEqual([]);
  });

  it("ignores LLM-like lines inside a tilde fenced code block", () => {
    const text = [
      '~~~',
      '{% llm context="abstract" %}inside tilde{% endllm %}',
      '~~~',
    ].join("\n");
    const { blocks, errors } = parseLLMBlocks(text);
    expect(blocks).toEqual([]);
    expect(errors).toEqual([]);
  });

  it("finds a real block before the fence, ignores one inside", () => {
    const text = [
      '{% llm context="abstract" %}',
      "outside",
      "{% endllm %}",
      '```',
      '{% llm context="abstract" %}inside{% endllm %}',
      '```',
    ].join("\n");
    const { blocks, errors } = parseLLMBlocks(text);
    expect(errors).toEqual([]);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].body).toBe("outside");
    expect(blocks[0].lineFrom).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// parseLLMBlocks — frontmatter rejection
// ---------------------------------------------------------------------------
describe("parseLLMBlocks — frontmatter rejection", () => {
  it("rejects LLM tags inside YAML frontmatter", () => {
    const text = [
      '---',
      '{% llm context="abstract" %}',
      "x",
      "{% endllm %}",
      '---',
    ].join("\n");
    const { blocks, errors } = parseLLMBlocks(text);
    expect(blocks).toEqual([]);
    // Line 1 and line 3 both have LLM tags inside frontmatter
    expect(errors).toHaveLength(2);
    expect(errors[0].code).toBe("llm.inFrontmatter");
    expect(errors[0].line).toBe(1);
    expect(errors[1].code).toBe("llm.inFrontmatter");
    expect(errors[1].line).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// parseLLMBlocks — live-block rejection
// ---------------------------------------------------------------------------
describe("parseLLMBlocks — live-block rejection", () => {
  it("rejects LLM tags inside %% zon %% managed blocks", () => {
    const text = [
      '%% zon kind=annotations %%',
      '{% llm context="abstract" %}',
      "x",
      "{% endllm %}",
      '%% /zon %%',
    ].join("\n");
    const { blocks, errors } = parseLLMBlocks(text);
    expect(blocks).toEqual([]);
    expect(errors).toHaveLength(2);
    expect(errors[0].code).toBe("llm.inLiveBlock");
    expect(errors[0].line).toBe(1);
    expect(errors[1].code).toBe("llm.inLiveBlock");
    expect(errors[1].line).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// parseLLMBlocks — unclosed
// ---------------------------------------------------------------------------
describe("parseLLMBlocks — unclosed", () => {
  it("reports unclosed LLM block", () => {
    const text = [
      '{% llm context="abstract" %}',
      "prompt",
    ].join("\n");
    const { blocks, errors } = parseLLMBlocks(text);
    expect(blocks).toEqual([]);
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe("llm.unclosed");
    expect(errors[0].line).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// parseLLMBlocks — stray close
// ---------------------------------------------------------------------------
describe("parseLLMBlocks — stray close", () => {
  it("reports stray {% endllm %} without a preceding open", () => {
    const text = "{% endllm %}";
    const { blocks, errors } = parseLLMBlocks(text);
    expect(blocks).toEqual([]);
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe("llm.strayClose");
    expect(errors[0].line).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// parseLLMBlocks — missing context
// ---------------------------------------------------------------------------
describe("parseLLMBlocks — missing context", () => {
  it("reports missing context attribute", () => {
    const text = [
      '{% llm model="x" %}',
      "prompt",
      "{% endllm %}",
    ].join("\n");
    const { blocks, errors } = parseLLMBlocks(text);
    expect(blocks).toEqual([]);
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe("llm.missingContext");
    expect(errors[0].line).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// parseLLMBlocks — empty context
// ---------------------------------------------------------------------------
describe("parseLLMBlocks — empty context", () => {
  it("reports empty context attribute", () => {
    const text = [
      '{% llm context="" %}',
      "prompt",
      "{% endllm %}",
    ].join("\n");
    const { blocks, errors } = parseLLMBlocks(text);
    expect(blocks).toEqual([]);
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe("llm.emptyContext");
    expect(errors[0].line).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// parseLLMBlocks — unknown context
// ---------------------------------------------------------------------------
describe("parseLLMBlocks — unknown context", () => {
  it("reports unknown context name", () => {
    const text = [
      '{% llm context="summary" %}',
      "prompt",
      "{% endllm %}",
    ].join("\n");
    const { blocks, errors } = parseLLMBlocks(text);
    expect(blocks).toEqual([]);
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe("llm.unknownContext");
    expect(errors[0].line).toBe(0);
    expect(errors[0].message).toContain("summary");
  });
});

// ---------------------------------------------------------------------------
// parseLLMBlocks — empty body
// ---------------------------------------------------------------------------
describe("parseLLMBlocks — empty body", () => {
  it("reports empty body when open and close are adjacent lines", () => {
    const text = [
      '{% llm context="abstract" %}',
      "{% endllm %}",
    ].join("\n");
    const { blocks, errors } = parseLLMBlocks(text);
    expect(blocks).toEqual([]);
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe("llm.emptyBody");
    expect(errors[0].line).toBe(0);
  });

  it("reports empty body when body is whitespace-only", () => {
    const text = [
      '{% llm context="abstract" %}',
      "   ",
      "{% endllm %}",
    ].join("\n");
    const { blocks, errors } = parseLLMBlocks(text);
    expect(blocks).toEqual([]);
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe("llm.emptyBody");
    expect(errors[0].line).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// parseLLMBlocks — multiple contexts, one unknown
// ---------------------------------------------------------------------------
describe("parseLLMBlocks — multiple contexts, one unknown", () => {
  it("reports unknownContext when one of multiple contexts is unknown", () => {
    const text = [
      '{% llm context="abstract,summary" %}',
      "x",
      "{% endllm %}",
    ].join("\n");
    const { blocks, errors } = parseLLMBlocks(text);
    expect(blocks).toEqual([]);
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe("llm.unknownContext");
    expect(errors[0].message).toContain("summary");
  });
});

// ---------------------------------------------------------------------------
// parseLLMBlocks — line offsets
// ---------------------------------------------------------------------------
describe("parseLLMBlocks — line offsets", () => {
  it("lineFrom/lineTo are 0-based line indices of open and close lines", () => {
    const text = [
      "some prose",
      '{% llm context="abstract" %}',
      "This is the prompt body.",
      "It spans multiple lines.",
      "{% endllm %}",
      "more prose",
    ].join("\n");
    const { blocks, errors } = parseLLMBlocks(text);
    expect(errors).toEqual([]);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].lineFrom).toBe(1);
    expect(blocks[0].lineTo).toBe(4);
    expect(blocks[0].body).toBe("This is the prompt body.\nIt spans multiple lines.");
  });
});

// ---------------------------------------------------------------------------
// parseLLMBlocks — body content with fence/live-block markers
// ---------------------------------------------------------------------------
describe("parseLLMBlocks — body content with fence/live-block markers", () => {
  it("treats ``` inside a multi-line body as body text, not a fence", () => {
    const text = [
      '{% llm context="abstract" %}',
      "Line 1.",
      "```",
      "Line 3.",
      "```",
      "{% endllm %}",
    ].join("\n");
    const { blocks, errors } = parseLLMBlocks(text);
    expect(errors).toEqual([]);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].body).toBe("Line 1.\n```\nLine 3.\n```");
  });

  it("treats %% zon ``` / ```%% /zon %% inside a body as body text, not live-block markers", () => {
    const text = [
      '{% llm context="abstract" %}',
      "Line 1.",
      '%% zon kind=annotations %%',
      "Line 3.",
      '%% /zon %%',
      "Line 5.",
      "{% endllm %}",
    ].join("\n");
    const { blocks, errors } = parseLLMBlocks(text);
    expect(errors).toEqual([]);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].body).toBe("Line 1.\n%% zon kind=annotations %%\nLine 3.\n%% /zon %%\nLine 5.");
  });

  it("treats a literal {% llm %} tag inside a body as body text, not a nested open", () => {
    const text = [
      '{% llm context="abstract" %}',
      "The body mentions {% llm %} as a tag.",
      "{% endllm %}",
    ].join("\n");
    const { blocks, errors } = parseLLMBlocks(text);
    expect(errors).toEqual([]);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].body).toBe("The body mentions {% llm %} as a tag.");
  });
});

// ---------------------------------------------------------------------------
// parseLLMBlocks — single-line block
// ---------------------------------------------------------------------------
describe("parseLLMBlocks — single-line block", () => {
  it("parses a valid single-line block (open + body + close on one line)", () => {
    const text = '{% llm context="abstract" %}Summarise this.{% endllm %}';
    const { blocks, errors } = parseLLMBlocks(text);
    expect(errors).toEqual([]);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].contexts).toEqual(["abstract"]);
    expect(blocks[0].body).toBe("Summarise this.");
    expect(blocks[0].lineFrom).toBe(0);
    expect(blocks[0].lineTo).toBe(0);
  });

  it("parses a single-line block with multi-context", () => {
    const text = '{% llm context="abstract,annotations" %}prompt{% endllm %}';
    const { blocks, errors } = parseLLMBlocks(text);
    expect(errors).toEqual([]);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].contexts).toEqual(["abstract", "annotations"]);
  });

  it("parses multiple single-line blocks across separate lines", () => {
    const text = [
      '{% llm context="abstract" %}A{% endllm %}',
      "prose in between",
      '{% llm context="annotations" %}B{% endllm %}',
    ].join("\n");
    const { blocks, errors } = parseLLMBlocks(text);
    expect(errors).toEqual([]);
    expect(blocks).toHaveLength(2);
    expect(blocks[0].body).toBe("A");
    expect(blocks[1].body).toBe("B");
  });

  it("reports empty body for a single-line block with no body text", () => {
    const text = '{% llm context="abstract" %}{% endllm %}';
    const { blocks, errors } = parseLLMBlocks(text);
    expect(blocks).toHaveLength(0);
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe("llm.emptyBody");
    expect(errors[0].line).toBe(0);
  });

  it("reports unknown context for a single-line block", () => {
    const text = '{% llm context="summary" %}prompt{% endllm %}';
    const { blocks, errors } = parseLLMBlocks(text);
    expect(blocks).toHaveLength(0);
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe("llm.unknownContext");
    expect(errors[0].message).toContain("summary");
  });

  it("reports missing context for a single-line block with no context attr", () => {
    const text = '{% llm model="x" %}prompt{% endllm %}';
    const { blocks, errors } = parseLLMBlocks(text);
    expect(blocks).toHaveLength(0);
    expect(errors).toHaveLength(1);
    expect(errors[0].code).toBe("llm.missingContext");
  });

  it("ignores a single-line LLM-like text inside a fenced code block", () => {
    const text = [
      "```",
      '{% llm context="abstract" %}prompt{% endllm %}',
      "```",
    ].join("\n");
    const { blocks, errors } = parseLLMBlocks(text);
    expect(blocks).toEqual([]);
    expect(errors).toEqual([]);
  });

  it("does NOT detect a single-line block as a nested block when inside an outer block", () => {
    const text = [
      '{% llm context="abstract" %}',
      'The body mentions {% llm context="annotations" %}prompt{% endllm %} as a tag.',
      "{% endllm %}",
    ].join("\n");
    const { blocks, errors } = parseLLMBlocks(text);
    expect(errors).toEqual([]);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].body).toBe('The body mentions {% llm context="annotations" %}prompt{% endllm %} as a tag.');
  });
});

// ---------------------------------------------------------------------------
// validateLLMBlocks
// ---------------------------------------------------------------------------
describe("validateLLMBlocks", () => {
  it("valid template returns valid: true, errors: [], and blocks", () => {
    const text = [
      '{% llm context="abstract" %}',
      "Summarize this.",
      "{% endllm %}",
    ].join("\n");
    const result = validateLLMBlocks(text);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.blocks).toHaveLength(1);
  });

  it("invalid template returns valid: false, errors, and empty blocks", () => {
    const text = [
      '{% llm context="summary" %}',
      "prompt",
      "{% endllm %}",
    ].join("\n");
    const result = validateLLMBlocks(text);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.blocks).toEqual([]);
  });

  it("LLM-like text inside fenced code is valid with no blocks", () => {
    const text = [
      '```',
      '{% llm context="abstract" %}{% endllm %}',
      '```',
    ].join("\n");
    const result = validateLLMBlocks(text);
    expect(result.valid).toBe(true);
    expect(result.blocks).toEqual([]);
    expect(result.errors).toEqual([]);
  });
});
