import { describe, it, expect } from "vitest";
import { renderFulltextContext, resolvePrimaryPDFFulltext } from "../src/fulltext.js";
import { item } from "./fixtures/data.js";

// ---------------------------------------------------------------------------
// renderFulltextContext
// ---------------------------------------------------------------------------
describe("renderFulltextContext", () => {
  it("F10: formats Title/Citekey/Attachment header + blank line + text", () => {
    const data = {
      title: "Thinking in Networks",
      citekey: "Doe2023",
      fulltext: { ok: true, attachmentTitle: "Full Text.pdf", text: "body text" },
    };
    const result = renderFulltextContext(data);
    expect(result).toBe(
      "Title: Thinking in Networks\nCitekey: Doe2023\nAttachment: Full Text.pdf\n\nbody text"
    );
  });

  it("F11: omits Citekey line when citekey is empty", () => {
    const data = {
      title: "Thinking in Networks",
      citekey: "",
      fulltext: { ok: true, attachmentTitle: "Full Text.pdf", text: "body text" },
    };
    const result = renderFulltextContext(data);
    expect(result).toBe("Title: Thinking in Networks\nAttachment: Full Text.pdf\n\nbody text");
    expect(result).not.toContain("Citekey:");
  });

  it("F12: returns '' when fulltext is null", () => {
    const data = { title: "Thinking in Networks", fulltext: null };
    expect(renderFulltextContext(data)).toBe("");
  });

  it("F13: returns '' when fulltext.ok === false", () => {
    const data = { title: "Thinking in Networks", fulltext: { ok: false, reason: "noPrimaryPDF" } };
    expect(renderFulltextContext(data)).toBe("");
  });

  it("F14: returns '' when fulltext.text is empty/whitespace", () => {
    const data = {
      title: "Thinking in Networks",
      fulltext: { ok: true, attachmentTitle: "X.pdf", text: "   " },
    };
    expect(renderFulltextContext(data)).toBe("");
  });

  it("F15: does not mutate itemData", () => {
    const data = {
      title: "Thinking in Networks",
      citekey: "Doe2023",
      fulltext: { ok: true, attachmentTitle: "Full Text.pdf", text: "body text" },
    };
    const clone = JSON.parse(JSON.stringify(data));
    renderFulltextContext(data);
    expect(data).toEqual(clone);
  });
});

// ---------------------------------------------------------------------------
// resolvePrimaryPDFFulltext
// ---------------------------------------------------------------------------
describe("resolvePrimaryPDFFulltext", () => {
  function mockAdapter(overrides = {}) {
    const calls = { readUTF8: 0, exists: 0, getCacheFile: 0, isPDFAttachment: 0, getBestAttachment: 0, fileExists: 0, getAttachmentTitle: 0 };
    const defaults = {
      bestAttachment: { key: "ATT1" },
      isPDF: true,
      fileExists: true,
      cacheFile: "/cache/extracted.txt",
      cacheExists: true,
      readUTF8: "extracted text",
      attachmentTitle: "Full Text.pdf",
    };
    const effective = { ...defaults, ...overrides };
    const adapter = {
      getBestAttachment: async () => { calls.getBestAttachment++; return effective.bestAttachment; },
      isPDFAttachment: (att) => { calls.isPDFAttachment++; return effective.isPDF; },
      fileExists: async (att) => { calls.fileExists++; return effective.fileExists; },
      getCacheFile: (att) => { calls.getCacheFile++; return effective.cacheFile; },
      exists: async (path) => { calls.exists++; return effective.cacheExists; },
      readUTF8: async (path) => { calls.readUTF8++; if (overrides.readUTF8Throw) throw new Error(overrides.readUTF8Throw); return effective.readUTF8; },
      getAttachmentTitle: (att) => { calls.getAttachmentTitle++; return effective.attachmentTitle; },
      _calls: calls,
    };
    return adapter;
  }

  it("F1: success — returns {ok:true} with trimmed text and title", async () => {
    const adapter = mockAdapter();
    const result = await resolvePrimaryPDFFulltext({}, adapter);
    expect(result.ok).toBe(true);
    expect(result.text).toBe("extracted text");
    expect(result.attachmentTitle).toBe("Full Text.pdf");
  });

  it("F2: noPrimaryPDF when getBestAttachment returns falsy", async () => {
    const adapter = mockAdapter({ bestAttachment: null });
    const result = await resolvePrimaryPDFFulltext({}, adapter);
    expect(result).toEqual({ ok: false, reason: "noPrimaryPDF" });
  });

  it("F3: noPrimaryPDF when best attachment is not a PDF", async () => {
    const adapter = mockAdapter({ isPDF: false });
    const result = await resolvePrimaryPDFFulltext({}, adapter);
    expect(result).toEqual({ ok: false, reason: "noPrimaryPDF" });
  });

  it("F4: primaryPdfMissing when fileExists is false", async () => {
    const adapter = mockAdapter({ fileExists: false });
    const result = await resolvePrimaryPDFFulltext({}, adapter);
    expect(result).toEqual({ ok: false, reason: "primaryPdfMissing" });
  });

  it("F5: noExtractedText when cache file doesn't exist — readUTF8 not called", async () => {
    const adapter = mockAdapter({ cacheExists: false });
    const result = await resolvePrimaryPDFFulltext({}, adapter);
    expect(result).toEqual({ ok: false, reason: "noExtractedText" });
    expect(adapter._calls.readUTF8).toBe(0);
  });

  it("F6: noExtractedText when cache file is whitespace-only", async () => {
    const adapter = mockAdapter({ readUTF8: "   " });
    const result = await resolvePrimaryPDFFulltext({}, adapter);
    expect(result).toEqual({ ok: false, reason: "noExtractedText" });
  });

  it("F7: readFailed when readUTF8 throws", async () => {
    const adapter = mockAdapter({ readUTF8Throw: "disk error" });
    const result = await resolvePrimaryPDFFulltext({}, adapter);
    expect(result).toEqual({ ok: false, reason: "readFailed" });
  });

  it("F8: noExtractedText when getCacheFile returns null — readUTF8 not called", async () => {
    const adapter = mockAdapter({ cacheFile: null });
    const result = await resolvePrimaryPDFFulltext({}, adapter);
    expect(result).toEqual({ ok: false, reason: "noExtractedText" });
    expect(adapter._calls.readUTF8).toBe(0);
  });

  it("F9: trims surrounding whitespace from readUTF8 output", async () => {
    const adapter = mockAdapter({ readUTF8: "\n  hello world  \n" });
    const result = await resolvePrimaryPDFFulltext({}, adapter);
    expect(result.ok).toBe(true);
    expect(result.text).toBe("hello world");
  });
});
