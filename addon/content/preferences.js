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

  // `Services` is not a reliable global in the Zotero prefs scope, so prefer
  // Zotero's own alert helper; fall back through other options just in case.
  function notify(msg) {
    try { if (Zotero && Zotero.alert) { Zotero.alert(window, "Note templates", msg); return; } } catch (e) {}
    try { if (typeof Services !== "undefined") { Services.prompt.alert(window, "Note templates", msg); return; } } catch (e) {}
    try { window.alert(msg); } catch (e) {}
  }
  function pickFolderAsync() {
    return new Promise((resolve) => {
      let fp;
      try { fp = Cc["@mozilla.org/filepicker;1"].createInstance(Ci.nsIFilePicker); }
      catch (e) { return resolve(""); }
      fp.init(window.browsingContext || window, "Choose or create a folder for your note templates", fp.modeGetFolder);
      fp.open((rv) => resolve(rv === Ci.nsIFilePicker.returnOK && fp.file ? fp.file.path : ""));
    });
  }

  // Wire the Browse… buttons + "Install starter templates…". The pane's XHTML can
  // be inserted a tick AFTER this script runs (same race as the dropdown below),
  // so retry until the controls exist instead of bailing once — otherwise the
  // listeners silently never attach. Each button is flagged so retries don't
  // double-bind.
  function wireControls(tries) {
    const instBtn = document.getElementById("zon-templates-install");
    if (!instBtn) {
      if ((tries || 0) < 40) window.setTimeout(() => wireControls((tries || 0) + 1), 50);
      return;
    }
    const wire = (el, fn) => { if (el && !el._zonWired) { el._zonWired = true; el.addEventListener("click", fn); } };
    const map = [
      ["zon-vault-browse", "zon-vault", PREFIX + "vaultPath"],
      ["zon-notes-browse", "zon-notes", PREFIX + "notesDir"],
      ["zon-templates-browse", "zon-templates", PREFIX + "templatesDir"],
    ];
    for (const [btnId, inputId, prefKey] of map) {
      wire(document.getElementById(btnId), () => browse(inputId, prefKey));
    }
    wire(instBtn, async () => {
      const ZON = Zotero.ZON;
      if (!ZON || !ZON.installBuiltinTemplates) { notify("Plugin not ready — try reopening Settings."); return; }
      const input = document.getElementById("zon-templates");
      let dir = (input && input.value) || Zotero.Prefs.get(PREFIX + "templatesDir", true) || "";
      if (!dir) {
        dir = await pickFolderAsync();
        if (!dir) return;
        try { Zotero.Prefs.set(PREFIX + "templatesDir", dir, true); } catch (e) {}
        if (input) { input.value = dir; input.dispatchEvent(new Event("change", { bubbles: true })); }
      }
      let n = 0;
      try { n = await ZON.installBuiltinTemplates(dir); } catch (e) {}
      try { await ZON.loadTemplates(); } catch (e) {}
      // Refresh the Default-note dropdown to include any newly added scaffolds.
      try { const sel = document.getElementById("zon-default-note"); if (sel) { sel._zonPopulated = false; populateDefaultNote(); } } catch (e) {}
      notify(n > 0 ? ("Added " + n + " template file(s) to:\n" + dir)
                   : ("No new files — templates already present in:\n" + dir));
    });
  }
  wireControls();

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
    // The default note template can be ANY template — a whole-note scaffold OR a
    // per-annotation/field template (creating from one yields a note that's just
    // that block; it links by its @<citekey>.md filename and its blocks still sync).
    // Offer the built-in formats plus every file in the Templates folder, minus the
    // reserved docs files.
    const RESERVED = new Set(["templates", "readme"]);
    const names = new Set(["note", "list", "quote", "callout", "compact", cur]);
    try {
      const dir = Zotero.Prefs.get(PREFIX + "templatesDir", true) || "";
      if (dir && _io && _pu) {
        for (const p of await _io.getChildren(dir)) {
          const m = _pu.filename(p).match(/^(.+)\.(md|njk|txt)$/i);
          if (m && !RESERVED.has(m[1].toLowerCase())) names.add(m[1]);
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

  // Wire the "Test LLM connection" button to call Zotero.ZON.testLLMConnection().
  function wireLLMTest(tries) {
    const testBtn = document.getElementById("zon-llm-test");
    if (!testBtn) {
      if ((tries || 0) < 40) window.setTimeout(() => wireLLMTest((tries || 0) + 1), 50);
      return;
    }
    if (testBtn._zonWired) return;
    testBtn._zonWired = true;
    testBtn.addEventListener("click", async () => {
      const resultEl = document.getElementById("zon-llm-test-result");
      if (resultEl) { resultEl.textContent = "Testing…"; resultEl.style.color = "#888"; }
      testBtn.disabled = true;
      try {
        const baseURLEl = document.getElementById("zon-llm-baseurl");
        const modelEl = document.getElementById("zon-llm-model");
        const apiKeyEl = document.getElementById("zon-llm-apikey");
        const tempEl = document.getElementById("zon-llm-temperature");
        const maxTokensEl = document.getElementById("zon-llm-maxtokens");
        const maxContextEl = document.getElementById("zon-llm-maxcontext");
        const timeoutEl = document.getElementById("zon-llm-timeout");
        const autoRunEl = document.getElementById("zon-llm-autorun");
        const settings = {
          baseURL: baseURLEl ? baseURLEl.value : "",
          model: modelEl ? modelEl.value : "",
          apiKey: apiKeyEl ? apiKeyEl.value : "",
          temperature: tempEl ? parseFloat(tempEl.value) : 0.2,
          maxTokens: maxTokensEl ? parseInt(maxTokensEl.value, 10) : 2048,
          maxContextChars: maxContextEl ? parseInt(maxContextEl.value, 10) : 100000,
          timeoutSeconds: timeoutEl ? parseInt(timeoutEl.value, 10) : 60,
          autoRun: autoRunEl ? autoRunEl.checked : false,
        };
        const result = await Zotero.ZON.testLLMConnection(settings);
        if (resultEl) {
          resultEl.textContent = result.message;
          resultEl.style.color = result.ok ? "#080" : "#c00";
        }
      } catch (e) {
        if (resultEl) {
          resultEl.textContent = "Test failed: " + (e && e.message ? e.message : String(e));
          resultEl.style.color = "#c00";
        }
      } finally {
        testBtn.disabled = false;
      }
    });
  }
  wireLLMTest();

  // Gate the auto-run checkbox: disabled + unchecked when base URL or model is empty.
  function wireLLMAutoRunGate(tries) {
    const baseURLInput = document.getElementById("zon-llm-baseurl");
    const modelInput = document.getElementById("zon-llm-model");
    const autoRunChk = document.getElementById("zon-llm-autorun");
    if (!baseURLInput || !modelInput || !autoRunChk) {
      if ((tries || 0) < 40) window.setTimeout(() => wireLLMAutoRunGate((tries || 0) + 1), 50);
      return;
    }
    if (autoRunChk._zonGated) return;
    autoRunChk._zonGated = true;

    function updateGate() {
      const configured = !!(baseURLInput.value.trim() && modelInput.value.trim());
      if (!configured) {
        autoRunChk.disabled = true;
        if (autoRunChk.checked) {
          autoRunChk.checked = false;
          try { Zotero.Prefs.set(PREFIX + "llmAutoRun", false, true); } catch (e) {}
        }
      } else {
        autoRunChk.disabled = false;
      }
    }

    baseURLInput.addEventListener("input", updateGate);
    modelInput.addEventListener("input", updateGate);
    updateGate();
  }
  wireLLMAutoRunGate();
}
