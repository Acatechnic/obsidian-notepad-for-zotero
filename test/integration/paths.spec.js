import { assert } from "chai";

// Exercises the ZONCore bundle (src/* compiled into content/core.bundle.js) in
// the real Zotero realm — catches bundling / cross-realm wiring problems that
// the Node unit tests can't (they import src/ directly).

describe("ZONCore helpers (in Zotero runtime)", function () {
  let C;

  before(async function () {
    const win = Zotero.getMainWindow();
    await Zotero.ZON.injectCore(win);
    C = win.ZONCore;
  });

  it("exposes the path + safety helpers", function () {
    ["vaultRelative", "vaultName", "buildObsidianUri", "sanitizeFilename",
     "isUnder", "parseObsidianVaults", "obsidianConfigPath", "syncBlocks",
     "applyManifest", "setManifestEntry", "buildManifestFromScaffold"]
      .forEach((k) => assert.isFunction(C[k], k + " should be a function"));
  });

  it("computes vault-relative paths and obsidian:// URLs", function () {
    assert.equal(C.vaultRelative("/v/Vault/Refs/@x.md", "/v/Vault"), "Refs/@x");
    assert.equal(
      C.buildObsidianUri("My Vault", "Refs/@x"),
      "obsidian://open?vault=My%20Vault&file=Refs%2F%40x",
    );
  });

  it("sanitizes filenames and confines paths", function () {
    assert.notMatch(C.sanitizeFilename("../../etc/passwd"), /[\\/]/);
    assert.isTrue(C.isUnder("/n/Notes/@x.md", "/n/Notes"));
    assert.isFalse(C.isUnder("/n/Other/@x.md", "/n/Notes"));
  });

  it("runs the merge engine idempotently through the bundle", function () {
    const md = "---\ncitekey: x\n---\n\n"
      + "%% zon kind=annotations colour=all sync=on format=list %%\n%% /zon %%\n";
    const a = C.syncBlocks(md, [], { citekey: "x" });
    const b = C.syncBlocks(a, [], { citekey: "x" });
    assert.equal(a, b, "syncBlocks should be idempotent");
  });

  it("applies a frontmatter manifest idempotently through the bundle", function () {
    let md = "---\nTitle: \"old\"\n---\nbody\n";
    md = C.setManifestEntry(md, "Title", "\"{{title}}\"");
    const a = C.applyManifest(md, { title: "Fresh Title" });
    const b = C.applyManifest(a, { title: "Fresh Title" });
    assert.include(a, 'Title: "Fresh Title"', "manifest should refresh the key");
    assert.equal(a, b, "applyManifest should be idempotent");
  });
});
