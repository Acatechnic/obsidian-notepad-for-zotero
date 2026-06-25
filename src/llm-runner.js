// Pure LLM run planner — parses blocks, resolves context, assembles messages,
// normalizes output, applies replacements. No DOM, no Zotero, no fetch.

import { parseLLMBlocks } from "./llm-blocks.js";
import { renderAnnotationsContext } from "./annotations.js";
import { renderFulltextContext } from "./fulltext.js";
import { LLM_DEFAULTS } from "./llm.js";
import { render } from "./render.js";
import {
  canAutoRun,
  sanitizeLLMSettings,
  buildChatCompletionsURL,
  buildLLMHeaders,
  buildChatCompletionsPayload,
  parseChatCompletionsResponse,
} from "./llm.js";

export const GROUNDING_SYSTEM_PROMPT =
  "You are a research assistant embedded in a Zotero literature note. " +
  "Complete the task given in the user message and output only Markdown that " +
  "fulfills it. Ground your answer strictly in the context provided in the user " +
  "message; do not introduce facts, interpretations, or citations that are not " +
  "present there. Output only the task result — no preface, no commentary, no " +
  "explanation outside the requested content. If the provided context is not " +
  "sufficient to complete the task, respond with a brief Markdown note stating " +
  "what is missing.";

export const RUNNABLE_CONTEXTS = ["abstract", "annotations", "fulltext"];

export const LLM_RUN_ERRORS = {
  NO_BLOCKS: "llm.run.noBlocks",
  PARSE_ERRORS: "llm.run.parseErrors",
  CONTEXT_UNSUPPORTED: "llm.run.contextUnsupported",
  CONTEXT_MISSING: "llm.run.contextMissing",
  CONTEXT_TOO_LARGE: "llm.run.contextTooLarge",
  RENDER_FAILED: "llm.run.renderFailed",
  EMPTY_RESPONSE: "llm.run.emptyResponse",
  HTTP_FAILED: "llm.run.httpFailed",
};

export function buildLLMMessages(systemPrompt, taskText, contextText) {
  const task = String(taskText ?? "");
  const ctx = String(contextText ?? "");
  const user = `Task:\n${task}\n\nContext:\n${ctx}`;
  return [
    { role: "system", content: String(systemPrompt ?? "") },
    { role: "user", content: user },
  ];
}

export function normalizeLLMOutput(raw) {
  return String(raw ?? "").replace(/\r\n?/g, "\n").trim();
}

export function classifyLLMOutput(content) {
  const c = String(content ?? "").trim();
  if (c.length === 0) return { ok: false, code: LLM_RUN_ERRORS.EMPTY_RESPONSE };
  return { ok: true, output: normalizeLLMOutput(c) };
}

function resolveContext(kind, itemData) {
  if (kind === "abstract") {
    const text = String(itemData?.abstractNote ?? "").trim();
    if (text === "") {
      return { text: "", missingReason: "abstract is empty for this item" };
    }
    return { text, missingReason: null };
  }
  if (kind === "annotations") {
    const text = renderAnnotationsContext(itemData?.annotations || []);
    if (text === "") {
      return { text: "", missingReason: "no usable annotations for this item" };
    }
    return { text, missingReason: null };
  }
  if (kind === "fulltext") {
    const text = renderFulltextContext(itemData);
    if (text === "") {
      return { text: "", missingReason: "no extracted full text available for the primary PDF" };
    }
    return { text, missingReason: null };
  }
  // Unknown kind — fail closed (validation pass should catch this first)
  return {
    text: "",
    missingReason:
      "context '" + kind + "' is not yet supported by Run LLM (only '" + RUNNABLE_CONTEXTS.join("', '") + "')",
  };
}

export function prepareLLMRun(text, itemData, opts = {}) {
  const { blocks, errors } = parseLLMBlocks(text);

  if (errors.length > 0) {
    return { ok: false, code: LLM_RUN_ERRORS.PARSE_ERRORS, errors, blocks: [], tasks: [] };
  }

  if (blocks.length === 0) {
    return { ok: false, code: LLM_RUN_ERRORS.NO_BLOCKS, errors: [], blocks: [], tasks: [] };
  }

  const maxContextChars = (typeof opts?.maxContextChars === "number" && opts.maxContextChars > 0)
    ? Math.floor(opts.maxContextChars) : LLM_DEFAULTS.maxContextChars;

  const tasks = [];

  for (const block of blocks) {
    // Dedupe contexts while preserving order
    const seen = new Set();
    const kinds = [];
    for (const k of block.contexts) {
      if (!seen.has(k)) {
        seen.add(k);
        kinds.push(k);
      }
    }

    // Validation pass: all context kinds must be runnable
    const unsupported = kinds.filter(k => !RUNNABLE_CONTEXTS.includes(k));
    if (unsupported.length > 0) {
      return {
        ok: false,
        code: LLM_RUN_ERRORS.CONTEXT_UNSUPPORTED,
        errors: [{
          code: LLM_RUN_ERRORS.CONTEXT_UNSUPPORTED,
          message: "context '" + kinds.join(", ") + "' is not yet supported by Run LLM (only '" + RUNNABLE_CONTEXTS.join("', '") + "')",
          line: block.lineFrom,
        }],
        blocks,
        tasks: [],
      };
    }

    // Resolution loop: iterate contexts in template order
    const sections = [];
    for (const kind of kinds) {
      const { text, missingReason } = resolveContext(kind, itemData);
      if (missingReason !== null) {
        return {
          ok: false,
          code: LLM_RUN_ERRORS.CONTEXT_MISSING,
          errors: [{
            code: LLM_RUN_ERRORS.CONTEXT_MISSING,
            message: missingReason + " — cannot run with context='" + kinds.join(", ") + "'",
            line: block.lineFrom,
          }],
          blocks,
          tasks: [],
        };
      }
      sections.push("## Context: " + kind + "\n" + text);
    }

    // Build labeled context text and label
    const contextText = sections.join("\n\n");
    const contextLabel = kinds.join(", ");

    // Size enforcement on combined context text
    if (contextText.length > maxContextChars) {
      return {
        ok: false,
        code: LLM_RUN_ERRORS.CONTEXT_TOO_LARGE,
        errors: [{
          code: LLM_RUN_ERRORS.CONTEXT_TOO_LARGE,
          message: `context is ${contextText.length} characters, exceeds the configured limit of ${maxContextChars} — reduce the context or raise maxContextChars`,
          line: block.lineFrom,
        }],
        blocks,
        tasks: [],
      };
    }

    // Prompt rendering
    let rendered;
    try {
      rendered = render(block.body, itemData);
    } catch (e) {
      return {
        ok: false,
        code: LLM_RUN_ERRORS.RENDER_FAILED,
        errors: [{
          code: LLM_RUN_ERRORS.RENDER_FAILED,
          message: "prompt render failed (check template variables)",
          line: block.lineFrom,
          detail: String(e && e.message || e),
        }],
        blocks,
        tasks: [],
      };
    }

    // Message assembly
    const messages = buildLLMMessages(GROUNDING_SYSTEM_PROMPT, rendered, contextText);
    tasks.push({ block, messages, contextLabel });
  }

  return { ok: true, code: "ok", errors: [], blocks, tasks };
}

export function applyLLMOutputs(text, blocks, outputs) {
  const lines = String(text ?? "").split("\n");
  const order = blocks.map((b, i) => i).sort((a, b) => blocks[b].lineFrom - blocks[a].lineFrom);
  for (const i of order) {
    const blk = blocks[i];
    const out = String(outputs[i] ?? "");
    const outLines = out.length ? out.split("\n") : [];
    lines.splice(blk.lineFrom, blk.lineTo - blk.lineFrom + 1, ...outLines);
  }
  return lines.join("\n");
}

export function decideLLMAction(md, settings) {
  const { blocks } = parseLLMBlocks(String(md || ""));
  if (blocks.length === 0) return { action: "none", count: 0 };
  if (canAutoRun(settings)) return { action: "run", count: blocks.length };
  return { action: "preserve", count: blocks.length };
}

export async function executeLLMBlocks(text, itemData, settings, fetchFn, onProgress) {
  const prepared = prepareLLMRun(text, itemData);
  if (!prepared.ok) {
    return { ok: false, code: prepared.code, errors: prepared.errors, blocks: prepared.blocks };
  }

  const s = sanitizeLLMSettings(settings);
  const url = buildChatCompletionsURL(s.baseURL);
  const headers = buildLLMHeaders(s);
  const outputs = [];
  const { tasks, blocks } = prepared;
  const n = tasks.length;

  for (let i = 0; i < n; i++) {
    if (typeof onProgress === "function") {
      try { onProgress(i + 1, n); } catch { /* ignore callback errors */ }
    }
    const payload = buildChatCompletionsPayload(s, tasks[i].messages);
    let content;
    try {
      content = parseChatCompletionsResponse(await fetchFn(url, headers, payload, s.timeoutSeconds));
    } catch (e) {
      return { ok: false, code: LLM_RUN_ERRORS.HTTP_FAILED, error: e, blockIndex: i, n };
    }
    const res = classifyLLMOutput(content);
    if (!res.ok) {
      return { ok: false, code: LLM_RUN_ERRORS.EMPTY_RESPONSE, blockIndex: i, n };
    }
    outputs.push(res.output);
  }

  const md = applyLLMOutputs(text, blocks, outputs);
  return { ok: true, md, blocks };
}
