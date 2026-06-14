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
