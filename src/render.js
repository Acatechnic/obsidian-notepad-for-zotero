// Template renderer for literature notes.
//
// Goal: render the user's *existing* Nunjucks template (the mgmeyers
// "Zotero Integration" dialect) without modification, so the new plugin is a
// drop-in for their current workflow. We re-implement the handful of custom
// helpers that dialect adds on top of stock Nunjucks:
//
//   - `format`   date filter  (e.g. {{ date | format("YYYY") }})
//   - `filterby` array filter (e.g. annotations | filterby("date","dateafter",lastImportDate))
//   - `{% persist %}` block tag
//
// Crucially, `{% persist %}` is rendered *transparently* (body passed through).
// In the mgmeyers tool, persist preserves manual edits across re-imports. Here
// that job moves to the idempotent merge layer (src/merge.js), which is more
// robust — so the tag becomes a no-op wrapper and the template stays compatible.

import nunjucks from "nunjucks";
import dayjs from "dayjs";
import { DEFAULT_FORMAT_NAME } from "./formats.js";

// `{% persist "key" %} ... {% endpersist %}` -> renders its body, ignores the key.
function PersistExtension() {
  this.tags = ["persist"];
  this.parse = function (parser, nodes) {
    const tok = parser.nextToken();
    const args = parser.parseSignature(null, true); // consume the "key" arg
    parser.advanceAfterBlockEnd(tok.value);
    const body = parser.parseUntilBlocks("endpersist");
    parser.advanceAfterBlockEnd();
    return new nodes.CallExtension(this, "run", args, [body]);
  };
  this.run = function (_context, _key, body) {
    return new nunjucks.runtime.SafeString(body());
  };
}

// `{% llm context="..." %} ... {% endllm %}` -> renders body, then reconstructs an LLM
// wrapper so the merging layer can find it later. Note: the wrapper is normalized
// to `{% llm context="..." %}\n...\n{% endllm %}` (it is not byte-for-byte identical
// to the author's original tag formatting). The template author writes a prompt as
// the block body; this extension renders it (resolving {{variables}}) then wraps
// the result back in `{% llm %}` / `{% endllm %}` tags so the final merged note
// retains the prompt structure.
function LLMExtension() {
  this.tags = ["llm"];
  this.parse = function (parser, nodes) {
    const tok = parser.nextToken();
    const args = parser.parseSignature(null, true);
    parser.advanceAfterBlockEnd(tok.value);
    const body = parser.parseUntilBlocks("endllm");
    parser.advanceAfterBlockEnd();
    return new nodes.CallExtension(this, "run", args, [body]);
  };
  this.run = function (_context, ...rest) {
    const body = rest[rest.length - 1];
    const renderedBody = typeof body === "function" ? body() : String(body || "");
    let context = "";
    for (let i = 0; i < rest.length - 1; i++) {
      const a = rest[i];
      if (a && typeof a === "object" && typeof a.context === "string") context = a.context;
      else if (typeof a === "string" && a) context = a;
    }
    const raw = `{% llm context="${context}" %}\n${renderedBody}\n{% endllm %}`;
    return new nunjucks.runtime.SafeString(raw);
  };
}

export function makeEnv() {
  const env = new nunjucks.Environment(null, {
    autoescape: false, // markdown, not HTML
    trimBlocks: false,
    lstripBlocks: false,
  });

  env.addExtension("PersistExtension", new PersistExtension());
  env.addExtension("LLMExtension", new LLMExtension());

  // {{ value | format("YYYY-MM-DD h:mm a") }}
  env.addFilter("format", (value, fmt) => {
    if (value === undefined || value === null || value === "") return "";
    const d = dayjs(value);
    return d.isValid() ? d.format(fmt) : String(value);
  });

  // {{ list | filterby("date", "dateafter", someDate) }}
  // Faithful to the mgmeyers semantics so legacy templates behave. In the new
  // model lastImportDate is typically null (render everything; merge dedupes),
  // in which case this passes the whole list through.
  env.addFilter("filterby", (arr, prop, op, value) => {
    if (!Array.isArray(arr)) return [];
    if (value === undefined || value === null || value === "") return arr;
    return arr.filter((x) => {
      const left = x?.[prop];
      switch (op) {
        case "dateafter":
          return new Date(left) > new Date(value);
        case "datebefore":
          return new Date(left) < new Date(value);
        case "equals":
          return left === value;
        default:
          return true;
      }
    });
  });

  // {{ highlights(colour="blue", format="quote") }} — used in a WHOLE-NOTE
  // template to drop in a managed annotations block that the sync layer then
  // fills with the matching highlights (and keeps in sync on every Update). This
  // is how a note template routes, e.g., blue highlights to one section and
  // yellow to another: call it once per section with a different colour. It
  // returns the `%% zon … %%` marker pair with an empty body; renderDocument
  // runs syncBlocks right after rendering, which populates it.
  //
  // Args (all optional, named or first-positional colour):
  //   colour  yellow|red|green|blue|purple|magenta|orange|grey|all (default all)
  //   type    highlight|underline|image|note|all (default all)
  //   format  a format template name (default the built-in default)
  //   sync    on (default) | off (insert a frozen one-time snapshot)
  env.addGlobal("highlights", function (...args) {
    // nunjucks passes named args as a trailing { __keywords: true, ... } object.
    let kw = {};
    const last = args[args.length - 1];
    let positional = args;
    if (last && typeof last === "object" && last.__keywords) {
      kw = last;
      positional = args.slice(0, -1);
    }
    const cfg = { kind: "annotations" };
    const colour = kw.colour || kw.color || positional[0];
    if (colour && colour !== "all") cfg.colour = colour;
    if (kw.type && kw.type !== "all") cfg.type = kw.type;
    cfg.format = kw.format || DEFAULT_FORMAT_NAME;
    cfg.sync = kw.sync === "off" ? "off" : "on";
    const attrs = Object.entries(cfg)
      .map(([k, v]) => (v === true ? k : `${k}=${v}`))
      .join(" ");
    return new nunjucks.runtime.SafeString(`%% zon ${attrs} %%\n%% /zon %%`);
  });

  return env;
}

// Render a template string against a data object.
export function render(templateString, data) {
  const env = makeEnv();
  return env.renderString(templateString, data);
}
