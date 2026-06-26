// Template Builder — the in-iframe app (plain script, no bundler).
//
// Runs INSIDE the builder window's srcdoc iframe, after core.bundle.js (global
// ZONCore) and editor.bundle.js (global ZOSEditorLib) have loaded. The parent
// (bootstrap.js) polls for window.startBuilder and calls it once with the preview
// context + a bridge of privileged callbacks (insert/save/close).
//
// Everything the builder knows about templates — the variable/snippet catalogs,
// the scaffold, the live-preview engine — comes from ZONCore, which is the SAME
// pure code the real write paths use. So the preview is faithful: what you see is
// what Insert/Save produces.

(function () {
  "use strict";

  // The parent calls this once the bundles are loaded.
  // opts = { previewCtx, bridge: {insert, save, close}, dark }
  window.startBuilder = function (opts) {
    opts = opts || {};
    var Core = window.ZONCore;
    var Ed = window.ZOSEditorLib;
    if (!Core || !Ed || !Core.previewTemplate) return false;

    var bridge = opts.bridge || {};
    // Fall back to bundled sample data when no item is selected, so the preview is
    // never empty.
    var ctx = (opts.previewCtx && opts.previewCtx.itemData)
      ? opts.previewCtx
      : { itemData: Core.SAMPLE_ITEM, annotations: Core.SAMPLE_ANNOTATIONS, citekey: (Core.SAMPLE_ITEM || {}).citekey };
    var usingSample = !(opts.previewCtx && opts.previewCtx.itemData);

    var doc = document;
    var root = doc.getElementById("zon-builder-root");
    if (!root) { root = doc.body; }
    root.textContent = "";

    var el = function (tag, cls, text) {
      var n = doc.createElement(tag);
      if (cls) n.className = cls;
      if (text != null) n.textContent = text;
      return n;
    };

    // ---- layout: header / [palette | editor | preview] / footer -------------
    var header = el("div", "b-header");
    header.append(el("span", "b-title", "Template Builder"));
    var sub = el("span", "b-sub", usingSample
      ? "previewing with sample data (no item selected)"
      : "previewing: " + (ctx.itemData.title || ctx.citekey || "selected item"));
    header.append(sub);
    var closeX = el("button", "b-x", "✕");
    closeX.title = "Close (Esc)";
    header.append(closeX);

    var body = el("div", "b-body");
    var paletteCol = el("div", "b-palette");
    var editorCol = el("div", "b-editor");
    var previewCol = el("div", "b-preview");
    body.append(paletteCol, editorCol, previewCol);

    var editorHost = el("div", "b-editor-host");
    editorCol.append(el("div", "b-colhead", "Template"), editorHost);

    var kindBadge = el("span", "b-kind");
    var previewHead = el("div", "b-colhead");
    previewHead.append(doc.createTextNode("Live preview "), kindBadge);
    var previewOut = el("pre", "b-preview-out");
    previewCol.append(previewHead, previewOut);

    var footer = el("div", "b-footer");
    var nameInput = el("input", "b-name");
    nameInput.type = "text";
    nameInput.placeholder = "template name";
    nameInput.value = "my-template";
    var saveBtn = el("button", "b-btn", "Save to folder");
    var insertBtn = el("button", "b-btn b-primary", "Insert into note");
    var closeBtn = el("button", "b-btn", "Close");
    var status = el("span", "b-status");
    footer.append(el("span", "b-name-label", "Save as:"), nameInput, saveBtn, insertBtn, closeBtn, status);

    root.append(header, body, footer);

    // ---- editor -------------------------------------------------------------
    var view = Ed.create({
      parent: editorHost,
      doc: Core.BUILDER_SCAFFOLD,
      dark: !!opts.dark,
      readMode: false,        // show raw template syntax — you're editing source
      showMarkers: true,      // show %% zon %% markers
      showFrontmatter: true,
      onChange: function () { schedulePreview(); },
    });

    // ---- palette ------------------------------------------------------------
    var insertToken = function (text) {
      try { Ed.insertAtCursor(view, text); } catch (e) {}
      try { view.focus(); } catch (e) {}
      schedulePreview();
    };
    var addGroup = function (title, items, getText, getLabel) {
      paletteCol.append(el("div", "b-pal-head", title));
      var wrap = el("div", "b-pal-group");
      items.forEach(function (it) {
        var chip = el("button", "b-chip", getLabel(it));
        chip.title = getText(it);
        chip.addEventListener("click", function () { insertToken(getText(it)); });
        wrap.append(chip);
      });
      paletteCol.append(wrap);
    };
    addGroup("Highlight variables", Core.BLOCK_VARIABLES || [],
      function (v) { return v.token; }, function (v) { return v.token; });
    addGroup("Item variables", Core.ITEM_VARIABLES || [],
      function (v) { return v.token; }, function (v) { return v.token; });
    addGroup("Snippets", Core.BUILDER_SNIPPETS || [],
      function (s) { return s.text; }, function (s) { return s.label; });

    // ---- live preview -------------------------------------------------------
    var previewTimer = null;
    var renderPreview = function () {
      var text = "";
      try { text = Ed.getDoc(view) || ""; } catch (e) {}
      var r = Core.previewTemplate(text, ctx);
      kindBadge.textContent = r.kind === "document" ? "whole-note" : "per-highlight";
      kindBadge.className = "b-kind" + (r.error ? " b-kind-err" : "");
      previewOut.textContent = r.preview || "(empty)";
      previewOut.classList.toggle("b-err", !!r.error);
    };
    var schedulePreview = function () {
      if (previewTimer) clearTimeout(previewTimer);
      previewTimer = setTimeout(renderPreview, 180);
    };
    renderPreview();

    // ---- actions ------------------------------------------------------------
    var flash = function (msg, isErr) {
      status.textContent = msg;
      status.className = "b-status" + (isErr ? " b-err" : "");
    };
    var doClose = function () { try { Ed.destroy && Ed.destroy(view); } catch (e) {} if (bridge.close) bridge.close(); };

    insertBtn.addEventListener("click", function () {
      var text = "";
      try { text = Ed.getDoc(view) || ""; } catch (e) {}
      var r = Core.previewTemplate(text, ctx);
      if (r.error) { flash("Fix the template error first", true); return; }
      if (!bridge.insert) return;
      Promise.resolve(bridge.insert(r.raw)).then(
        function () { flash("Inserted into the note"); },
        function (e) { flash("Insert failed: " + e, true); }
      );
    });

    saveBtn.addEventListener("click", function () {
      var name = (nameInput.value || "").trim().replace(/\.md$/i, "");
      if (!name) { flash("Enter a template name", true); nameInput.focus(); return; }
      var text = "";
      try { text = Ed.getDoc(view) || ""; } catch (e) {}
      if (!bridge.save) return;
      Promise.resolve(bridge.save(name, text)).then(
        function (res) { flash(res || ("Saved ‘" + name + "’")); },
        function (e) { flash("Save failed: " + e, true); }
      );
    });

    closeBtn.addEventListener("click", doClose);
    closeX.addEventListener("click", doClose);
    doc.addEventListener("keydown", function (e) { if (e.key === "Escape") doClose(); });

    try { view.focus(); } catch (e) {}
    return true;
  };
})();
