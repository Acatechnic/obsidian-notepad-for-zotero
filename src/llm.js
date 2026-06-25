// Pure LLM interpreter provider — OpenAI-compatible Chat Completions with
// Ollama-friendly defaults. All functions are stateless pure logic (no network,
// no DOM, no Zotero globals) so they unit-test in Node.

// ---------------------------------------------------------------------------
// Helpers (not exported)
// ---------------------------------------------------------------------------

function clamp(val, min, max, fallback) {
  if (typeof val === "string" && val.trim() !== "") val = Number(val);
  if (typeof val !== "number" || Number.isNaN(val)) return fallback;
  return Math.min(Math.max(val, min), max);
}

function clampInt(val, min, max, fallback) {
  if (typeof val === "string" && val.trim() !== "") val = Number(val);
  if (typeof val !== "number" || Number.isNaN(val)) return fallback;
  return Math.round(clamp(val, min, max, val));
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export const LLM_DEFAULTS = {
  baseURL: "http://localhost:11434/v1",
  model: "",
  apiKey: "",
  temperature: 0.2,
  maxTokens: 2048,
  maxContextChars: 100000,
  timeoutSeconds: 60,
  autoRun: false,
};

export function isLLMConfigured(settings) {
  if (!settings || typeof settings !== "object") return false;
  const baseURL = String(settings.baseURL || "").trim();
  const model = String(settings.model || "").trim();
  return baseURL.length > 0 && model.length > 0;
}

export function canAutoRun(settings) {
  return isLLMConfigured(settings) && !!settings.autoRun;
}

export function sanitizeLLMSettings(settings) {
  const merged = { ...LLM_DEFAULTS, ...settings };
  merged.baseURL = "baseURL" in settings && settings.baseURL != null
    ? String(settings.baseURL).trim()
    : LLM_DEFAULTS.baseURL;
  merged.model = String(merged.model || "").trim();
  merged.apiKey = String(merged.apiKey || ""); // keep as-is, may be empty
  merged.temperature = clamp(merged.temperature, 0, 2, LLM_DEFAULTS.temperature);
  merged.maxTokens = clampInt(merged.maxTokens, 1, 128000, LLM_DEFAULTS.maxTokens);
  merged.maxContextChars = clampInt(merged.maxContextChars, 1, Infinity, LLM_DEFAULTS.maxContextChars);
  merged.timeoutSeconds = clampInt(merged.timeoutSeconds, 1, 600, LLM_DEFAULTS.timeoutSeconds);
  if (!isLLMConfigured(merged)) merged.autoRun = false;
  return merged;
}

export function buildChatCompletionsURL(baseURL) {
  const trimmed = String(baseURL || "").trim().replace(/\/+$/, "");
  return trimmed ? trimmed + "/chat/completions" : "chat/completions";
}

export function buildLLMHeaders(settings) {
  const headers = { "Content-Type": "application/json" };
  const key = String(settings.apiKey || "").trim();
  if (key.length > 0) {
    headers["Authorization"] = "Bearer " + key;
  }
  return headers;
}

export function buildChatCompletionsPayload(settings, messages) {
  const s = sanitizeLLMSettings(settings);
  return {
    model: s.model,
    messages: messages,
    temperature: s.temperature,
    max_tokens: s.maxTokens,
    stream: false,
  };
}

export function buildTestConnectionPayload(settings) {
  return buildChatCompletionsPayload(settings, [
    { role: "user", content: "Reply with the single word: ok" },
  ]);
}

export function parseChatCompletionsResponse(json) {
  let data;
  if (typeof json === "string") {
    try { data = JSON.parse(json); } catch (e) { return ""; }
  } else if (json && typeof json === "object") {
    data = json;
  } else {
    return "";
  }
  if (!data || typeof data !== "object") return "";
  const choices = data.choices;
  if (!Array.isArray(choices) || choices.length === 0) return "";
  const content = choices[0]?.message?.content;
  if (typeof content !== "string") return "";
  const trimmed = content.trim();
  return trimmed.length > 0 ? trimmed : "";
}

export function sanitizeError(error) {
  let msg;
  if (typeof error === "string") {
    msg = error;
  } else if (error && typeof error === "object" && typeof error.message === "string") {
    msg = error.message;
  } else {
    msg = String(error);
  }

  msg = msg.replace(/Bearer\s+[A-Za-z0-9._\-]+/gi, "Bearer [redacted]");
  msg = msg.replace(/(api[_-]?key["']?\s*[:=]\s*["']?)[A-Za-z0-9._\-]+/gi, "$1[redacted]");
  msg = msg.replace(/(Authorization["']?\s*[:=]\s*["']?Bearer\s+)[A-Za-z0-9._\-]+/gi, "$1[redacted]");

  if (msg.length > 500) {
    msg = msg.slice(0, 500) + "\u2026";
  }
  return msg;
}

export function sanitizeLogMetadata(settings) {
  const s = sanitizeLLMSettings(settings);
  return {
    configured: isLLMConfigured(s),
    baseURL: s.baseURL,
    model: s.model,
    hasApiKey: String(s.apiKey || "").trim().length > 0,
    temperature: s.temperature,
    maxTokens: s.maxTokens,
    maxContextChars: s.maxContextChars,
    timeoutSeconds: s.timeoutSeconds,
    autoRun: s.autoRun,
  };
}
