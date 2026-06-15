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

  // Wire the Browse… buttons. Guarded so a failure here can never block the
  // Default-note-template population below.
  try {
    const map = [
      ["zon-vault-browse", "zon-vault", PREFIX + "vaultPath"],
      ["zon-notes-browse", "zon-notes", PREFIX + "notesDir"],
      ["zon-templates-browse", "zon-templates", PREFIX + "templatesDir"],
    ];
    for (const [btnId, inputId, prefKey] of map) {
      const btn = document.getElementById(btnId);
      if (btn) btn.addEventListener("click", () => browse(inputId, prefKey));
    }
  } catch (e) {}

  // Populate the "Default note template" dropdown from the note scaffolds
  // (note.md / note-*.md) in the Templates folder. Always includes "note" and
  // the current value so the control is never empty if the folder can't be read.
  // The pane's XHTML can be inserted a tick after the script runs, so retry until
  // the <select> exists rather than bailing once (which left it blank — bug b).
  const _io = (typeof IOUtils !== "undefined" && IOUtils) || (window && window.IOUtils);
  const _pu = (typeof PathUtils !== "undefined" && PathUtils) || (window && window.PathUtils);
  async function populateDefaultNote(tries) {
    const sel = document.getElementById("zon-default-note");
    if (!sel) {
      if ((tries || 0) < 40) window.setTimeout(() => populateDefaultNote((tries || 0) + 1), 50);
      return;
    }
    if (sel._zonPopulated) return;
    sel._zonPopulated = true;
    const cur = (Zotero.Prefs.get(PREFIX + "defaultNoteTemplate", true) || "note");
    const names = new Set(["note", cur]);
    try {
      const dir = Zotero.Prefs.get(PREFIX + "templatesDir", true) || "";
      if (dir && _io && _pu) {
        for (const p of await _io.getChildren(dir)) {
          const m = _pu.filename(p).match(/^(note(?:-[^.]+)?)\.(md|njk|txt)$/i);
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
