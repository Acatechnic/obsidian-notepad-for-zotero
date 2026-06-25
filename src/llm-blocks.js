// LLM block parser/validator — pure ES module, no DOM, no Zotero, no nunjucks.
//
// Detects and validates {% llm context="..." %}...{% endllm %} blocks in markdown
// note text, with awareness of frontmatter, fenced code blocks, and %% zon %% live
// blocks (to reject LLM tags in contexts where they don't belong).

export const SUPPORTED_CONTEXTS = ["abstract", "annotations", "fulltext"];

// ---------------------------------------------------------------------------
// Regexes (inlined to stay dependency-free — do NOT import from blocks.js)
// ---------------------------------------------------------------------------

// LLM open tag:  {% llm context="abstract,fulltext" %}
// NOTE: [^%]*? ensures the capture doesn't cross a %} boundary, preventing
// the regex from swallowing subsequent {% endllm %} on the same line.
const LLM_OPEN_RE  = /^\s*\{%\s*llm\s+([^%]*?)\s*%\}\s*$/;
// LLM close tag:  {% endllm %}
const LLM_CLOSE_RE = /^\s*\{%\s*endllm\s*%\}\s*$/;
// Single-line LLM block: {% llm context="..." %}body{% endllm %} (entire line).
// [^%]*? for the argString mirrors LLM_OPEN_RE so a literal %} inside the
// arg doesn't confuse the parser. (.*?) for the body is non-greedy, so the
// FIRST {% endllm %} is treated as the close (matches how authors typically
// write single-line blocks: no nested tags, no embedded %} in the body).
const LLM_SINGLE_RE = /^\s*\{%\s*llm\s+([^%]*?)\s*%\}\s*(.*?)\s*\{%\s*endllm\s*%\}\s*$/;
// Managed live block markers (mirrors blocks.js patterns)
const ZON_OPEN_RE  = /^\s*%%\s*zon\s+([^%]*?)\s*%%\s*$/;
const ZON_CLOSE_RE = /^\s*%%\s*\/zon\s*%%\s*$/;
// Frontmatter detection
const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---/;
// Fenced code detection (same pattern as preview.js)
const FENCE_RE = /^\s*(`{3,}|~{3,})/;

// ---------------------------------------------------------------------------
// parseLLMContext — parse the context="..." attribute from an open-tag arg string
// ---------------------------------------------------------------------------

/**
 * @param {string} argString — the captured text between `{% llm ` and ` %}`
 * @returns {{ contexts: string[], raw: string } | null}
 */
export function parseLLMContext(argString) {
  const s = String(argString || "");
  const m = s.match(/context\s*=\s*["']([^"']*)["']/);
  if (!m) return null;
  const raw = m[1];
  const contexts = raw.split(",").map((c) => c.trim()).filter(Boolean);
  return { contexts, raw };
}

// ---------------------------------------------------------------------------
// hasLLMBlocks — cheap boolean, no fence/frontmatter awareness
// ---------------------------------------------------------------------------

/**
 * @param {string} text
 * @returns {boolean}
 */
export function hasLLMBlocks(text) {
  return /\{%\s*llm\b/.test(String(text || ""));
}

// ---------------------------------------------------------------------------
// parseLLMBlocks — fenced-code + frontmatter + live-block-aware scanner
// ---------------------------------------------------------------------------

/**
 * @param {string} text — full note markdown
 * @returns {{ blocks: Array, errors: Array }}
 *
 * blocks: array of { openRaw, closeRaw, contextArg, contexts, body, lineFrom, lineTo }
 * errors: array of { code, message, line }
 *
 * Scanner algorithm (line-by-line, single pass):
 *   1. Detect frontmatter range via FRONTMATTER_RE.
 *   2. Walk lines tracking inFence/fenceTok, inLiveBlock, openLLM.
 *   3. Per line: frontmatter → fence → inFence → live block → LLM open → LLM close
 *   4. After loop: check for unclosed open.
 */
export function parseLLMBlocks(text) {
  const s = String(text || "");
  const lines = s.split("\n");
  const blocks = [];
  const errors = [];

  // --- 1. Detect frontmatter range ---
  let fmStartLine = -1;
  let fmEndLine = -1;
  const fmMatch = s.match(FRONTMATTER_RE);
  if (fmMatch) {
    // The match is anchored at the start, so first line is 0.
    fmStartLine = 0;
    fmEndLine = fmMatch[0].split("\n").length - 1;
  }

  // --- 2. Walk lines ---
  let inFence = false;
  let fenceTok = "";
  let inLiveBlock = false;
  /** @type {{ openRaw, contextArg, contexts, raw, lineFrom, bodyLines, hasContext } | null} */
  let openLLM = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 3a. Inside frontmatter — LLM tags are rejected
    if (i >= fmStartLine && i <= fmEndLine && fmStartLine >= 0) {
      if (LLM_OPEN_RE.test(line) || LLM_CLOSE_RE.test(line)) {
        errors.push({
          code: "llm.inFrontmatter",
          message: "LLM blocks are not allowed in YAML frontmatter",
          line: i,
        });
      }
      continue;
    }

    // If we're inside an open LLM block, treat everything as body text except a closing tag.
    if (openLLM && !LLM_CLOSE_RE.test(line)) {
      openLLM.bodyLines.push(line);
      continue;
    }

    // Single-line LLM block: {% llm context="..." %}body{% endllm %} on one line.
    // NOTE: this runs only when we are NOT inside an outer open LLM block (the early
    // return above already handles body accumulation) and not inside a fenced code
    // block (checked via inFence, set by the fence detection below).
    const singleM = !inFence && line.match(LLM_SINGLE_RE);
    if (singleM) {
      const argString = singleM[1];
      const body = singleM[2];
      const parsed = parseLLMContext(argString);
      const blockErrors = [];

      // Validate context
      if (!parsed) {
        blockErrors.push({
          code: "llm.missingContext",
          message: "{% llm %} block is missing the required context=\"...\" attribute",
          line: i,
        });
      } else if (parsed.contexts.length === 0) {
        blockErrors.push({
          code: "llm.emptyContext",
          message: "{% llm %} block has an empty context=\"\" attribute",
          line: i,
        });
      } else {
        for (const ctx of parsed.contexts) {
          if (!SUPPORTED_CONTEXTS.includes(ctx)) {
            blockErrors.push({
              code: "llm.unknownContext",
              message: `Unknown LLM context: "${ctx}" — must be one of: ${SUPPORTED_CONTEXTS.join(", ")}`,
              line: i,
            });
          }
        }
      }

      // Validate body
      if (body.trim() === "") {
        blockErrors.push({
          code: "llm.emptyBody",
          message: "{% llm %} block has an empty body",
          line: i,
        });
      }

      errors.push(...blockErrors);

      // Only add to blocks if NO errors for this block
      if (blockErrors.length === 0) {
        blocks.push({
          openRaw: `{% llm ${argString} %}`,
          closeRaw: "{% endllm %}",
          contextArg: argString,
          contexts: parsed ? parsed.contexts : null,
          body,
          lineFrom: i,
          lineTo: i,
        });
      }

      continue;
    }

    // 3b. Fence delimiter → toggle state
    const fenceM = line.match(FENCE_RE);
    if (fenceM) {
      if (!inFence) {
        inFence = true;
        fenceTok = fenceM[1][0];
      } else if (fenceM[1][0] === fenceTok) {
        inFence = false;
        fenceTok = "";
      }
      continue;
    }

    // 3c. Inside fenced code — LLM-like lines are silently ignored
    if (inFence) {
      continue;
    }

    // 3d. ZON open → enter live block
    if (ZON_OPEN_RE.test(line)) {
      inLiveBlock = true;
      continue;
    }
    // 3e. ZON close → exit live block
    if (ZON_CLOSE_RE.test(line)) {
      inLiveBlock = false;
      continue;
    }

    // 3f. Inside live block — LLM tags are rejected
    if (inLiveBlock) {
      if (LLM_OPEN_RE.test(line) || LLM_CLOSE_RE.test(line)) {
        errors.push({
          code: "llm.inLiveBlock",
          message: "LLM blocks are not allowed inside managed %% zon %% blocks",
          line: i,
        });
      }
      continue;
    }

    // 3g. LLM open tag
    const openM = line.match(LLM_OPEN_RE);
    if (openM) {
      // If there's already a pending open, report it as unclosed
      if (openLLM) {
        errors.push({
          code: "llm.unclosed",
          message: "Unclosed {% llm %} block — missing {% endllm %}",
          line: openLLM.lineFrom,
        });
      }
      const argString = openM[1];
      const parsed = parseLLMContext(argString);
      openLLM = {
        openRaw: line,
        contextArg: argString,
        contexts: parsed ? parsed.contexts : null,
        raw: parsed ? parsed.raw : null,
        lineFrom: i,
        bodyLines: [],
        hasContext: parsed !== null,
      };
      continue;
    }

    // 3h. LLM close tag
    const closeM = line.match(LLM_CLOSE_RE);
    if (closeM) {
      if (!openLLM) {
        errors.push({
          code: "llm.strayClose",
          message: "Unexpected {% endllm %} without a matching {% llm %}",
          line: i,
        });
        continue;
      }

      const body = openLLM.bodyLines.join("\n");
      const blockErrors = [];

      // Validate context
      if (!openLLM.hasContext) {
        blockErrors.push({
          code: "llm.missingContext",
          message: "{% llm %} block is missing the required context=\"...\" attribute",
          line: openLLM.lineFrom,
        });
      } else if (openLLM.contexts.length === 0) {
        blockErrors.push({
          code: "llm.emptyContext",
          message: "{% llm %} block has an empty context=\"\" attribute",
          line: openLLM.lineFrom,
        });
      } else {
        for (const ctx of openLLM.contexts) {
          if (!SUPPORTED_CONTEXTS.includes(ctx)) {
            blockErrors.push({
              code: "llm.unknownContext",
              message: `Unknown LLM context: "${ctx}" — must be one of: ${SUPPORTED_CONTEXTS.join(", ")}`,
              line: openLLM.lineFrom,
            });
          }
        }
      }

      // Validate body
      if (body.trim() === "") {
        blockErrors.push({
          code: "llm.emptyBody",
          message: "{% llm %} block has an empty body",
          line: openLLM.lineFrom,
        });
      }

      errors.push(...blockErrors);

      // Only add to blocks if NO errors for this block
      if (blockErrors.length === 0) {
        blocks.push({
          openRaw: openLLM.openRaw,
          closeRaw: line,
          contextArg: openLLM.contextArg,
          contexts: openLLM.contexts,
          body,
          lineFrom: openLLM.lineFrom,
          lineTo: i,
        });
      }

      openLLM = null;
      continue;
    }

    // Accumulate body lines if inside an open LLM block
    if (openLLM) {
      openLLM.bodyLines.push(line);
    }
  }

  // 4. After loop: check for unclosed open
  if (openLLM) {
    errors.push({
      code: "llm.unclosed",
      message: "Unclosed {% llm %} block — missing {% endllm %}",
      line: openLLM.lineFrom,
    });
  }

  return { blocks, errors };
}

// ---------------------------------------------------------------------------
// validateLLMBlocks — full validation wrapper
// ---------------------------------------------------------------------------

/**
 * @param {string} text — full note markdown
 * @param {object} [opts] — unused (reserved for future options)
 * @returns {{ valid: boolean, errors: Array, blocks: Array }}
 */
export function validateLLMBlocks(text, opts = {}) {
  const { blocks, errors } = parseLLMBlocks(text);
  // Filter out non-actionable fenced-code "errors" (future-proof; currently
  // parseLLMBlocks never emits llm.inFencedCode, but the filter is harmless).
  const realErrors = errors.filter((e) => e.code !== "llm.inFencedCode");
  return {
    valid: realErrors.length === 0,
    errors: realErrors,
    blocks: realErrors.length === 0 ? blocks : [],
  };
}
