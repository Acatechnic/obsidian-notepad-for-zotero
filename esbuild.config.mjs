import { build } from "esbuild";

// Bundle the CodeMirror editor into a single IIFE that defines a global
// `ZOSEditorLib` in whatever scope it's loaded into. bootstrap.js loads it into
// the Zotero main-window scope via Services.scriptloader.loadSubScript, then
// calls ZOSEditorLib.create({ parent, doc, onChange }).
await build({
  entryPoints: ["editor/editor.js"],
  bundle: true,
  format: "iife",
  globalName: "ZOSEditorLib",
  outfile: "plugin/content/editor.bundle.js",
  target: "firefox115", // Zotero 7+ runs on a Gecko 115-era platform
  legalComments: "none",
  logLevel: "info",
});

console.log("editor bundle built -> plugin/content/editor.bundle.js");

// Bundle the pure template/merge core (nunjucks + dayjs) into a global ZONCore.
// platform:browser + an fs/path shim keeps nunjucks' optional node-loader from
// pulling in modules that don't exist in the Gecko sandbox.
await build({
  entryPoints: ["core/core.js"],
  bundle: true,
  format: "iife",
  globalName: "ZONCore",
  outfile: "plugin/content/core.bundle.js",
  platform: "browser",
  target: "firefox115",
  legalComments: "none",
  logLevel: "info",
  define: { "process.env.NODE_ENV": '"production"' },
});

console.log("core bundle built -> plugin/content/core.bundle.js");
