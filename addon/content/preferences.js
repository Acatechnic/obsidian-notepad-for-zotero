// Loaded into the Zotero preferences window by PreferencePanes.register({scripts}).
// Wires the "Browse…" buttons next to the folder fields to a native folder
// picker. Runs in the prefs-window scope (window / document / Components / Zotero).
{
  const Cc = Components.classes;
  const Ci = Components.interfaces;

  function browse(inputId, prefKey) {
    const input = document.getElementById(inputId);
    let fp;
    try { fp = Cc["@mozilla.org/filepicker;1"].createInstance(Ci.nsIFilePicker); }
    catch (e) { return; }
    fp.init(window.browsingContext || window, "Choose a folder", fp.modeGetFolder);
    try {
      const cur = input && input.value;
      if (cur) {
        const d = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsIFile);
        d.initWithPath(cur);
        if (d.exists()) fp.displayDirectory = d;
      }
    } catch (e) {}
    fp.open((rv) => {
      if (rv !== Ci.nsIFilePicker.returnOK || !fp.file) return;
      const path = fp.file.path;
      try { Zotero.Prefs.set(prefKey, path, true); } catch (e) {}
      if (input) {
        input.value = path;
        input.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });
  }

  const PREFIX = "extensions.zotero-obsidian-notes.";
  const map = [
    ["zon-vault-browse", "zon-vault", PREFIX + "vaultPath"],
    ["zon-notes-browse", "zon-notes", PREFIX + "notesDir"],
    ["zon-templates-browse", "zon-templates", PREFIX + "templatesDir"],
  ];
  for (const [btnId, inputId, prefKey] of map) {
    const btn = document.getElementById(btnId);
    if (btn) btn.addEventListener("click", () => browse(inputId, prefKey));
  }

  // Populate the "Default note template" dropdown from the note scaffolds
  // (note.md / note-*.md) in the Templates folder. Always includes "note" and
  // the current value so the control is never empty if the folder can't be read.
  async function populateDefaultNote() {
    const sel = document.getElementById("zon-default-note");
    if (!sel) return;
    const cur = (Zotero.Prefs.get(PREFIX + "defaultNoteTemplate", true) || "note");
    const names = new Set(["note", cur]);
    try {
      const dir = Zotero.Prefs.get(PREFIX + "templatesDir", true) || "";
      if (dir) {
        for (const p of await IOUtils.getChildren(dir)) {
          const m = PathUtils.filename(p).match(/^(note(?:-[^.]+)?)\.(md|njk|txt)$/i);
          if (m) names.add(m[1]);
        }
      }
    } catch (e) {}
    sel.textContent = "";
    for (const n of [...names].sort()) {
      const o = document.createElementNS("http://www.w3.org/1999/xhtml", "option");
      o.value = n; o.textContent = n;
      sel.appendChild(o);
    }
    sel.value = cur;
    sel.addEventListener("change", () => {
      try { Zotero.Prefs.set(PREFIX + "defaultNoteTemplate", sel.value, true); } catch (e) {}
    });
  }
  populateDefaultNote();
}
