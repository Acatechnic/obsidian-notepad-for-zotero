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

export function makeEnv() {
  const env = new nunjucks.Environment(null, {
    autoescape: false, // markdown, not HTML
    trimBlocks: false,
    lstripBlocks: false,
  });

  env.addExtension("PersistExtension", new PersistExtension());

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

  return env;
}

// Render a template string against a data object.
export function render(templateString, data) {
  const env = makeEnv();
  return env.renderString(templateString, data);
}
