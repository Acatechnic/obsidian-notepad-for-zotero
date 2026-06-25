import { describe, it, expect } from "vitest";
import {
  LLM_DEFAULTS,
  isLLMConfigured,
  canAutoRun,
  sanitizeLLMSettings,
  buildChatCompletionsURL,
  buildLLMHeaders,
  buildChatCompletionsPayload,
  buildTestConnectionPayload,
  parseChatCompletionsResponse,
  sanitizeError,
  sanitizeLogMetadata,
} from "../src/llm.js";

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------
describe("LLM_DEFAULTS", () => {
  it("has correct Ollama-friendly defaults", () => {
    expect(LLM_DEFAULTS).toEqual({
      baseURL: "http://localhost:11434/v1",
      model: "",
      apiKey: "",
      temperature: 0.2,
      maxTokens: 2048,
      maxContextChars: 100000,
      timeoutSeconds: 60,
      autoRun: false,
    });
  });
});

// ---------------------------------------------------------------------------
// isLLMConfigured
// ---------------------------------------------------------------------------
describe("isLLMConfigured", () => {
  it("returns false for null / undefined / empty settings", () => {
    expect(isLLMConfigured(null)).toBe(false);
    expect(isLLMConfigured(undefined)).toBe(false);
    expect(isLLMConfigured({})).toBe(false);
  });

  it("returns false when only baseURL is set (model empty)", () => {
    expect(isLLMConfigured({ baseURL: "http://localhost:11434" })).toBe(false);
  });

  it("returns false when only model is set (baseURL empty)", () => {
    expect(isLLMConfigured({ model: "llama3" })).toBe(false);
  });

  it("returns false when both are empty / whitespace", () => {
    expect(isLLMConfigured({ baseURL: "  ", model: "" })).toBe(false);
    expect(isLLMConfigured({ baseURL: "", model: "  \t  " })).toBe(false);
  });

  it("returns true when both baseURL and model are non-empty", () => {
    expect(isLLMConfigured({ baseURL: "http://localhost:11434", model: "llama3" })).toBe(true);
  });

  it("returns true even when apiKey is empty (API key is optional)", () => {
    expect(isLLMConfigured({ baseURL: "http://localhost:11434", model: "llama3", apiKey: "" })).toBe(true);
    expect(isLLMConfigured({ baseURL: "http://localhost:11434", model: "llama3" })).toBe(true);
  });

  it("returns true when values have surrounding whitespace (trims before checking)", () => {
    expect(isLLMConfigured({ baseURL: "  http://localhost:11434  ", model: "  llama3  " })).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// canAutoRun
// ---------------------------------------------------------------------------
describe("canAutoRun", () => {
  it("returns false when not configured", () => {
    expect(canAutoRun({})).toBe(false);
    expect(canAutoRun(null)).toBe(false);
  });

  it("returns false when configured but autoRun is false", () => {
    expect(canAutoRun({ baseURL: "http://localhost:11434", model: "llama3", autoRun: false })).toBe(false);
  });

  it("returns true when configured AND autoRun is true", () => {
    expect(canAutoRun({ baseURL: "http://localhost:11434", model: "llama3", autoRun: true })).toBe(true);
  });

  it("returns false when autoRun is true but not configured", () => {
    expect(canAutoRun({ baseURL: "", model: "", autoRun: true })).toBe(false);
    expect(canAutoRun({ model: "llama3", autoRun: true })).toBe(false);
    expect(canAutoRun({ baseURL: "http://localhost:11434", autoRun: true })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// sanitizeLLMSettings
// ---------------------------------------------------------------------------
describe("sanitizeLLMSettings", () => {
  it("merges partial settings with defaults", () => {
    const result = sanitizeLLMSettings({ model: "llama3" });
    expect(result.baseURL).toBe("http://localhost:11434/v1");
    expect(result.model).toBe("llama3");
    expect(result.apiKey).toBe("");
    expect(result.temperature).toBe(0.2);
    expect(result.maxTokens).toBe(2048);
    expect(result.autoRun).toBe(false);
  });

  it("trims baseURL and model", () => {
    const result = sanitizeLLMSettings({ baseURL: "  http://example.com/  ", model: "  llama3  " });
    expect(result.baseURL).toBe("http://example.com/");
    expect(result.model).toBe("llama3");
  });

  it("clamps temperature below 0 to 0, above 2 to 2", () => {
    expect(sanitizeLLMSettings({ baseURL: "x", model: "m", temperature: -1 }).temperature).toBe(0);
    expect(sanitizeLLMSettings({ baseURL: "x", model: "m", temperature: 5 }).temperature).toBe(2);
    expect(sanitizeLLMSettings({ baseURL: "x", model: "m", temperature: 1.5 }).temperature).toBe(1.5);
  });

  it("clamps maxTokens below 1 to 1, above 128000 to 128000", () => {
    expect(sanitizeLLMSettings({ baseURL: "x", model: "m", maxTokens: 0 }).maxTokens).toBe(1);
    expect(sanitizeLLMSettings({ baseURL: "x", model: "m", maxTokens: 999999 }).maxTokens).toBe(128000);
    expect(sanitizeLLMSettings({ baseURL: "x", model: "m", maxTokens: 4096 }).maxTokens).toBe(4096);
  });

  it("clamps timeoutSeconds below 1 to 1, above 600 to 600", () => {
    expect(sanitizeLLMSettings({ baseURL: "x", model: "m", timeoutSeconds: 0 }).timeoutSeconds).toBe(1);
    expect(sanitizeLLMSettings({ baseURL: "x", model: "m", timeoutSeconds: 1000 }).timeoutSeconds).toBe(600);
    expect(sanitizeLLMSettings({ baseURL: "x", model: "m", timeoutSeconds: 30 }).timeoutSeconds).toBe(30);
  });

  it("handles NaN / invalid numbers by falling back to defaults", () => {
    const result = sanitizeLLMSettings({ baseURL: "x", model: "m", temperature: NaN, maxTokens: "abc", timeoutSeconds: undefined });
    expect(result.temperature).toBe(LLM_DEFAULTS.temperature);
    expect(result.maxTokens).toBe(LLM_DEFAULTS.maxTokens);
    expect(result.timeoutSeconds).toBe(LLM_DEFAULTS.timeoutSeconds);
  });

  it("forces autoRun to false when not configured (even if autoRun was true in input)", () => {
    const result = sanitizeLLMSettings({ baseURL: "", model: "", autoRun: true });
    expect(result.autoRun).toBe(false);
  });

  it("keeps autoRun true when only model is set (default baseURL fills in)", () => {
    const result = sanitizeLLMSettings({ model: "llama3", autoRun: true });
    expect(result.autoRun).toBe(true);
    expect(result.baseURL).toBe("http://localhost:11434/v1");
  });

  it("forces autoRun false when baseURL is explicitly empty string", () => {
    const result = sanitizeLLMSettings({ baseURL: "", model: "llama3", autoRun: true });
    expect(result.autoRun).toBe(false);
  });

  it("keeps autoRun true when fully configured", () => {
    const result = sanitizeLLMSettings({ baseURL: "http://localhost:11434", model: "llama3", autoRun: true });
    expect(result.autoRun).toBe(true);
  });

  it("rounds non-integer maxTokens / timeoutSeconds / maxContextChars to integers", () => {
    const result = sanitizeLLMSettings({ baseURL: "x", model: "m", maxTokens: 2048.7, timeoutSeconds: 30.4, maxContextChars: 50000.3 });
    expect(result.maxTokens).toBe(2049);
    expect(result.timeoutSeconds).toBe(30);
    expect(result.maxContextChars).toBe(50000);
  });
});

// ---------------------------------------------------------------------------
// buildChatCompletionsURL
// ---------------------------------------------------------------------------
describe("buildChatCompletionsURL", () => {
  it("appends /chat/completions to base URL", () => {
    expect(buildChatCompletionsURL("http://localhost:11434/v1")).toBe("http://localhost:11434/v1/chat/completions");
  });

  it("strips trailing slashes: http://localhost:11434/v1/ -> .../chat/completions", () => {
    expect(buildChatCompletionsURL("http://localhost:11434/v1/")).toBe("http://localhost:11434/v1/chat/completions");
  });

  it("handles multiple trailing slashes", () => {
    expect(buildChatCompletionsURL("http://localhost:11434/v1///")).toBe("http://localhost:11434/v1/chat/completions");
  });

  it("handles empty / undefined input gracefully", () => {
    expect(buildChatCompletionsURL("")).toBe("chat/completions");
    expect(buildChatCompletionsURL(undefined)).toBe("chat/completions");
  });
});

// ---------------------------------------------------------------------------
// buildLLMHeaders
// ---------------------------------------------------------------------------
describe("buildLLMHeaders", () => {
  it("returns Content-Type header always", () => {
    const headers = buildLLMHeaders({ apiKey: "" });
    expect(headers).toEqual({ "Content-Type": "application/json" });
  });

  it("omits Authorization header when apiKey is empty", () => {
    const headers = buildLLMHeaders({ apiKey: "" });
    expect(headers).not.toHaveProperty("Authorization");
  });

  it('includes Authorization: Bearer <key> when apiKey is set', () => {
    const headers = buildLLMHeaders({ apiKey: "sk-test123" });
    expect(headers).toEqual({
      "Content-Type": "application/json",
      "Authorization": "Bearer sk-test123",
    });
  });

  it("does not include Authorization when apiKey is whitespace-only", () => {
    const headers = buildLLMHeaders({ apiKey: "   " });
    expect(headers).not.toHaveProperty("Authorization");
  });
});

// ---------------------------------------------------------------------------
// buildChatCompletionsPayload
// ---------------------------------------------------------------------------
describe("buildChatCompletionsPayload", () => {
  it("returns object with model, messages, temperature, max_tokens, stream: false", () => {
    const payload = buildChatCompletionsPayload(
      { baseURL: "http://localhost:11434", model: "llama3", temperature: 0.5, maxTokens: 4096 },
      [{ role: "user", content: "Hello" }],
    );
    expect(payload).toEqual({
      model: "llama3",
      messages: [{ role: "user", content: "Hello" }],
      temperature: 0.5,
      max_tokens: 4096,
      stream: false,
    });
  });

  it("uses sanitized model and temperature values", () => {
    const payload = buildChatCompletionsPayload(
      { baseURL: "  http://localhost:11434  ", model: "  llama3  ", temperature: 5 },
      [],
    );
    expect(payload.model).toBe("llama3");
    expect(payload.temperature).toBe(2);
  });

  it("passes messages array through as-is", () => {
    const msgs = [{ role: "user", content: "Hi" }, { role: "assistant", content: "Hello" }];
    const payload = buildChatCompletionsPayload({ baseURL: "x", model: "m" }, msgs);
    expect(payload.messages).toBe(msgs);
    expect(payload.messages).toEqual(msgs);
  });

  it("works with partial settings (fills from defaults)", () => {
    const payload = buildChatCompletionsPayload({ baseURL: "x", model: "m" }, []);
    expect(payload.temperature).toBe(LLM_DEFAULTS.temperature);
    expect(payload.max_tokens).toBe(LLM_DEFAULTS.maxTokens);
    expect(payload.stream).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// buildTestConnectionPayload
// ---------------------------------------------------------------------------
describe("buildTestConnectionPayload", () => {
  it("returns a payload with a single user message asking to reply ok", () => {
    const payload = buildTestConnectionPayload({ baseURL: "http://localhost:11434", model: "llama3" });
    expect(payload.messages).toEqual([{ role: "user", content: "Reply with the single word: ok" }]);
  });

  it("has correct model from settings", () => {
    const payload = buildTestConnectionPayload({ baseURL: "x", model: "gpt4" });
    expect(payload.model).toBe("gpt4");
  });

  it("has stream: false", () => {
    const payload = buildTestConnectionPayload({ baseURL: "x", model: "m" });
    expect(payload.stream).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// parseChatCompletionsResponse
// ---------------------------------------------------------------------------
describe("parseChatCompletionsResponse", () => {
  const validResponse = {
    choices: [{ message: { content: "Hello, world!" } }],
  };

  it("extracts content from a standard response object", () => {
    expect(parseChatCompletionsResponse(validResponse)).toBe("Hello, world!");
  });

  it("extracts content from a JSON string", () => {
    expect(parseChatCompletionsResponse(JSON.stringify(validResponse))).toBe("Hello, world!");
  });

  it("returns empty string for null / undefined input", () => {
    expect(parseChatCompletionsResponse(null)).toBe("");
    expect(parseChatCompletionsResponse(undefined)).toBe("");
  });

  it("returns empty string for malformed JSON string", () => {
    expect(parseChatCompletionsResponse("{bad json}")).toBe("");
  });

  it("returns empty string for JSON null", () => {
    expect(parseChatCompletionsResponse("null")).toBe("");
  });

  it("returns empty string for JSON number", () => {
    expect(parseChatCompletionsResponse("123")).toBe("");
  });

  it("returns empty string when choices[0] is null", () => {
    expect(parseChatCompletionsResponse({ choices: [null] })).toBe("");
  });

  it("returns empty string when choices array is missing", () => {
    expect(parseChatCompletionsResponse({})).toBe("");
    expect(parseChatCompletionsResponse({ foo: "bar" })).toBe("");
  });

  it("returns empty string when choices array is empty", () => {
    expect(parseChatCompletionsResponse({ choices: [] })).toBe("");
  });

  it("returns empty string when message.content is not a string", () => {
    expect(parseChatCompletionsResponse({ choices: [{ message: { content: 42 } }] })).toBe("");
    expect(parseChatCompletionsResponse({ choices: [{ message: { content: null } }] })).toBe("");
  });

  it("returns empty string when content is empty / whitespace-only", () => {
    expect(parseChatCompletionsResponse({ choices: [{ message: { content: "" } }] })).toBe("");
    expect(parseChatCompletionsResponse({ choices: [{ message: { content: "   " } }] })).toBe("");
  });

  it("trims whitespace from content", () => {
    expect(parseChatCompletionsResponse({ choices: [{ message: { content: "  trimmed  " } }] })).toBe("trimmed");
  });

  it("returns multi-line content correctly", () => {
    const content = "line1\nline2\nline3";
    expect(parseChatCompletionsResponse({ choices: [{ message: { content } }] })).toBe(content);
  });
});

// ---------------------------------------------------------------------------
// sanitizeError
// ---------------------------------------------------------------------------
describe("sanitizeError", () => {
  it("extracts message from Error objects", () => {
    expect(sanitizeError(new Error("something broke"))).toBe("something broke");
  });

  it("handles plain strings", () => {
    expect(sanitizeError("just a string")).toBe("just a string");
  });

  it("handles null / undefined (returns a string, not crash)", () => {
    expect(sanitizeError(null)).toBe("null");
    expect(sanitizeError(undefined)).toBe("undefined");
  });

  it("redacts Bearer tokens from the message", () => {
    const msg = "Authorization: Bearer sk-abc123.DEF456";
    expect(sanitizeError(msg)).toBe("Authorization: Bearer [redacted]");
  });

  it("redacts API key values in key-value patterns", () => {
    const msg = 'api_key = sk-abc123.def456';
    expect(sanitizeError(msg)).toBe('api_key = [redacted]');
  });

  it("redacts Authorization header values", () => {
    const msg = 'Authorization: Bearer sk-abc123';
    expect(sanitizeError(msg)).toBe('Authorization: Bearer [redacted]');
  });

  it("truncates very long messages to 500 chars + …", () => {
    const long = "x".repeat(600);
    const result = sanitizeError(long);
    expect(result.length).toBe(501); // 500 chars + …
    expect(result.endsWith("…")).toBe(true);
  });

  it("does NOT truncate short messages", () => {
    const msg = "short error";
    expect(sanitizeError(msg)).toBe("short error");
    expect(sanitizeError(msg).length).toBe("short error".length);
  });
});

// ---------------------------------------------------------------------------
// sanitizeLogMetadata
// ---------------------------------------------------------------------------
describe("sanitizeLogMetadata", () => {
  it("returns an object with the expected keys", () => {
    const meta = sanitizeLogMetadata({ baseURL: "http://localhost:11434", model: "llama3" });
    expect(meta).toHaveProperty("configured");
    expect(meta).toHaveProperty("baseURL");
    expect(meta).toHaveProperty("model");
    expect(meta).toHaveProperty("hasApiKey");
    expect(meta).toHaveProperty("temperature");
    expect(meta).toHaveProperty("maxTokens");
    expect(meta).toHaveProperty("maxContextChars");
    expect(meta).toHaveProperty("timeoutSeconds");
    expect(meta).toHaveProperty("autoRun");
  });

  it("does NOT include the actual apiKey value", () => {
    const meta = sanitizeLogMetadata({ baseURL: "http://localhost:11434", model: "llama3", apiKey: "supersecret" });
    expect(meta).not.toHaveProperty("apiKey");
    expect(meta.hasApiKey).toBe(true);
  });

  it("hasApiKey is true when apiKey is set, false when empty", () => {
    expect(sanitizeLogMetadata({ baseURL: "x", model: "m", apiKey: "sk-test" }).hasApiKey).toBe(true);
    expect(sanitizeLogMetadata({ baseURL: "x", model: "m", apiKey: "" }).hasApiKey).toBe(false);
  });

  it("configured matches isLLMConfigured result", () => {
    const configured = sanitizeLogMetadata({ baseURL: "http://localhost:11434", model: "llama3" });
    expect(configured.configured).toBe(true);
    const notConfigured = sanitizeLogMetadata({});
    expect(notConfigured.configured).toBe(false);
  });

  it("works with default settings (hasApiKey: false, configured: false)", () => {
    const meta = sanitizeLogMetadata({});
    expect(meta.hasApiKey).toBe(false);
    expect(meta.configured).toBe(false);
    expect(meta.baseURL).toBe(LLM_DEFAULTS.baseURL);
    expect(meta.model).toBe("");
  });

  it("works with fully configured settings", () => {
    const meta = sanitizeLogMetadata({
      baseURL: "http://localhost:11434",
      model: "llama3",
      apiKey: "sk-test",
      temperature: 0.7,
      maxTokens: 4096,
      timeoutSeconds: 120,
      autoRun: true,
    });
    expect(meta.configured).toBe(true);
    expect(meta.baseURL).toBe("http://localhost:11434");
    expect(meta.model).toBe("llama3");
    expect(meta.hasApiKey).toBe(true);
    expect(meta.temperature).toBe(0.7);
    expect(meta.maxTokens).toBe(4096);
    expect(meta.timeoutSeconds).toBe(120);
    expect(meta.autoRun).toBe(true);
  });
});
