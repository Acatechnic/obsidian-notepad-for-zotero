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

  release: {
    github: {
      // Releases are cut locally (`npm run release`), not from CI — "local"
      // enables the GitHub release step when run outside CI. Needs GITHUB_TOKEN
      // in the environment (e.g. `GITHUB_TOKEN=$(gh auth token) npm run release`).
      enable: "local",
    },
    bumpp: {
      // After bumpp writes the new version (and before it commits/tags/pushes):
      // rewrite the README's version-pinned .xpi links, then build. `all: true`
      // makes the release commit include the README change alongside the version
      // files. (Until we ship a stable, non-prerelease v1.0.0, GitHub's permanent
      // /releases/latest/download/ URL 404s, so the README must pin the version —
      // sync-version keeps it current. See scripts/sync-readme-version.mjs.)
      execute: "npm run sync-version && npm run build",
      all: true,
    },
  },

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
    // Integration tests (Mocha-in-Zotero) live here; kept separate from the
    // Node/Vitest unit tests in test/*.spec.js (which import vitest and can't run
    // inside Zotero). Vitest is configured to ignore this folder.
    entries: ["test/integration"],
    mocha: { timeout: 20000 },
    // The dev handle is exposed as Zotero.ZON in bootstrap init().
    waitForPlugin: "() => !!Zotero.ZON",
  },
});
