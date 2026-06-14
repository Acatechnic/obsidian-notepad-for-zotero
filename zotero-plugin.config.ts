import { defineConfig } from "zotero-plugin-scaffold";
import pkg from "./package.json" with { type: "json" };

export default defineConfig({
  source: ["addon", "editor", "core", "src"],
  dist: ".scaffold/build",
  name: pkg.config.addonName,
  id: pkg.config.addonID,
  namespace: pkg.config.addonRef,

  // Finalised in Phase 6 once the GitHub repo exists ({{owner}}/{{repo}} are
  // resolved from the git remote at release time).
  updateURL: `https://github.com/{{owner}}/{{repo}}/releases/download/release/${
    pkg.version.includes("-") ? "update-beta.json" : "update.json"
  }`,
  xpiDownloadLink:
    "https://github.com/{{owner}}/{{repo}}/releases/download/v{{version}}/{{xpiName}}.xpi",

  build: {
    assets: ["addon/**/*.*"],
    // Our Fluent message ids are already namespaced (`zon-*`) and the code
    // references a fixed filename + ids in JS, so keep them verbatim rather than
    // letting scaffold rewrite them to `<namespace>-…`.
    fluent: {
      prefixLocaleFiles: false,
      prefixFluentMessages: false,
    },
    // __key__ tokens replaced in non-script addon files (manifest.json, .ftl …).
    define: {
      ...pkg.config,
      author: pkg.author,
      description: pkg.description,
      homepage: pkg.homepage,
      buildVersion: pkg.version,
      buildTime: "{{buildTime}}",
    },
    // Two pre-existing IIFE bundles, reproduced from the old esbuild.config.mjs:
    //  - editor: CodeMirror 6 → global ZOSEditorLib (loaded inside the note iframe)
    //  - core:   nunjucks + dayjs template/merge engine → global ZONCore
    esbuildOptions: [
      {
        entryPoints: ["editor/editor.js"],
        bundle: true,
        format: "iife",
        globalName: "ZOSEditorLib",
        target: "firefox115",
        legalComments: "none",
        outfile: ".scaffold/build/addon/content/editor.bundle.js",
      },
      {
        entryPoints: ["core/core.js"],
        bundle: true,
        format: "iife",
        globalName: "ZONCore",
        platform: "browser",
        target: "firefox115",
        legalComments: "none",
        define: { "process.env.NODE_ENV": '"production"' },
        outfile: ".scaffold/build/addon/content/core.bundle.js",
      },
    ],
  },

  test: {
    // The dev handle is exposed as Zotero.ZON in bootstrap init().
    waitForPlugin: "() => !!Zotero.ZON",
  },
});
