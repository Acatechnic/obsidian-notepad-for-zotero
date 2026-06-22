// Keep the README's version mentions + pinned .xpi download links in step with
// package.json. Run automatically during `npm run release` (wired into
// `release.bumpp.execute` in zotero-plugin.config.ts), AFTER bumpp has written
// the new version — so it reads the freshly-bumped package.json.
//
// Why pinned links at all: GitHub's permanent `/releases/latest/download/…` URL
// only resolves to a NON-prerelease, and every beta is a prerelease, so it 404s.
// Until the first stable (non-prerelease) v1.0.0 we link to the version-pinned
// asset and rewrite it here on each release. Once stable, switch the README to
// `/releases/latest/download/…` and this script becomes a no-op (and can go).
//
// Idempotent: re-running with no version change rewrites nothing.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const version = pkg.version;
const readmePath = join(root, "README.md");

const before = readFileSync(readmePath, "utf8");
let after = before;

// 1) Version-pinned .xpi asset links: …/releases/download/v<anything>/<file>.xpi
after = after.replace(
  /(\/releases\/download\/)v[^/]+(\/[^/\s)]+\.xpi)/g,
  `$1v${version}$2`,
);

// 2) Status line: **public beta** (v1.2.3-beta.4)
after = after.replace(
  /(\*\*public beta\*\*\s*\()v[0-9][^)]*(\))/g,
  `$1v${version}$2`,
);

if (after === before) {
  console.log(`[sync-readme-version] README already at v${version} — no change.`);
} else {
  writeFileSync(readmePath, after);
  console.log(`[sync-readme-version] README updated to v${version}.`);
}
