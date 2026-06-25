import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { render } from "../src/render.js";
import { templateKind, parseTemplateFile } from "../src/templates.js";

// The starter templates ship as a literal in addon/bootstrap.js (privileged
// scope, can't be imported here). Extract the BUILTIN_TEMPLATES object literal
// from the source text and validate it against the SAME engine the plugin uses,
// so a Nunjucks typo or a misclassification can't ship to every new user.
function extractBuiltins() {
  const src = readFileSync(fileURLToPath(new URL("../addon/bootstrap.js", import.meta.url)), "utf8");
  const start = src.indexOf("BUILTIN_TEMPLATES: {");
  const docAt = src.indexOf("BUILTIN_TEMPLATES_DOC:");
  expect(start).toBeGreaterThan(-1);
  expect(docAt).toBeGreaterThan(start);
  let chunk = src.slice(src.indexOf("{", start), docAt); // object + trailing comma + comment
  const objText = chunk.slice(0, chunk.lastIndexOf("}") + 1); // drop the trailing comma/comment
  // eslint-disable-next-line no-eval
  return eval("(" + objText + ")");
}

const SAMPLE = {
  citekey: "doe2020thing", title: "A Thing", date: "2020-03-01",
  creators: [{ firstName: "Jane", lastName: "Doe" }, { firstName: "John", lastName: "Smith" }],
  publicationTitle: "Journal of Things", itemType: "journalArticle",
  allTags: "alpha, beta", desktopURI: "zotero://select/library/items/ABCD1234",
  bibliography: "Doe, J. (2020). A Thing.", abstractNote: "An abstract.",
  // annotation-block fields
  text: "highlighted text", comment: "a note", page: "12",
  link: "zotero://open-pdf/library/items/ABCD1234?page=12", colour: "yellow",
};

describe("BUILTIN_TEMPLATES (shipped starter templates)", () => {
  const builtins = extractBuiltins();

  it("ships exactly the expected set", () => {
    expect(Object.keys(builtins).sort()).toEqual(
      [
        "abstract",
        "critique",
        "highlight",
        "key-quote",
        "note",
        "note-by-colour",
        "note-minimal",
        "research-questions",
        "snapshot",
      ]
    );
  });

  it("classifies note scaffolds as documents and the rest as formats", () => {
    expect(templateKind(builtins["note"])).toBe("document");
    expect(templateKind(builtins["note-minimal"])).toBe("document");
    expect(templateKind(builtins["note-by-colour"])).toBe("document");
    expect(templateKind(builtins["research-questions"])).toBe("document");
    for (const n of ["abstract", "critique", "key-quote", "highlight", "snapshot"]) {
      expect(templateKind(builtins[n])).toBe("format");
    }
  });

  it("research-questions ships the exact heading, context, and prompt", () => {
    expect(builtins["research-questions"]).toBe(
      `## Research Questions

{% llm context="fulltext" %}What is/are the research question(s) the paper answers? Render as concrete bullet points.{% endllm %}
`
    );
  });

  it("every template renders through the engine without throwing", () => {
    for (const [name, text] of Object.entries(builtins)) {
      const body = templateKind(text) === "document" ? text : parseTemplateFile(text).item;
      expect(() => render(body, SAMPLE), `render ${name}`).not.toThrow();
    }
  });

  it("the note scaffold renders item data into its frontmatter + body", () => {
    const out = render(builtins["note"], SAMPLE);
    expect(out).toContain('citekey: "doe2020thing"');
    expect(out).toContain("[[Jane Doe]]");
    expect(out).toContain("**Citation:** Doe, J. (2020). A Thing.");
    expect(out).toContain("%% zon kind=annotations colour=all sync=on format=list %%");
  });
});
