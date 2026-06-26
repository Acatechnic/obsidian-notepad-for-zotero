// Template Builder — the in-iframe app (plain script, no bundler).
//
// Runs INSIDE the builder window's srcdoc iframe, after core.bundle.js (global
// ZONCore) and editor.bundle.js (global ZOSEditorLib) have loaded. The parent
// (bootstrap.js) polls for window.startBuilder and calls it once with the preview
// context, the existing-templates map, and a bridge of privileged callbacks.
//
// Flow (the guided layer): a START step asks WHAT you're making — a note
// template, a highlight format, or edit an existing one. That choice loads a
// clean starter, scopes the palette, and shows a COMPOSE form whose tick-boxes
// GENERATE the template for you. The live preview (ZONCore.previewTemplate, the
// same engine the write paths use) means what you see is what Insert/Save yields.

(function () {
  "use strict";

  window.startBuilder = function (opts) {
    opts = opts || {};
    var Core = window.ZONCore;
    var Ed = window.ZOSEditorLib;
    if (!Core || !Ed || !Core.previewTemplate) return false;

    var bridge = opts.bridge || {};
    var dark = !!opts.dark;
    var templates = opts.templates || {};
    var ctx = (opts.previewCtx && opts.previewCtx.itemData)
      ? opts.previewCtx
      : { itemData: Core.SAMPLE_ITEM, annotations: Core.SAMPLE_ANNOTATIONS, citekey: (Core.SAMPLE_ITEM || {}).citekey };
    var usingSample = !(opts.previewCtx && opts.previewCtx.itemData);

    var doc = document;
    var root = doc.getElementById("zon-builder-root") || doc.body;
    var el = function (tag, cls, text) {
      var n = doc.createElement(tag);
      if (cls) n.className = cls;
      if (text != null) n.textContent = text;
      return n;
    };
    var view = null; // the CM editor, created when the workspace opens

    // ---- shared chrome: header + footer -------------------------------------
    var subText = usingSample
      ? "previewing with sample data (no item selected)"
      : "previewing: " + (ctx.itemData.title || ctx.citekey || "selected item");

    var doClose = function () { try { Ed.destroy && view && Ed.destroy(view); } catch (e) {} if (bridge.close) bridge.close(); };
    doc.addEventListener("keydown", function (e) { if (e.key === "Escape") doClose(); });

    // ===================================================== START / TYPE CHOOSER
    function renderChooser() {
      root.textContent = "";
      var header = el("div", "b-header");
      header.append(el("span", "b-title", "Template Builder"));
      header.append(el("span", "b-sub", subText));
      var x = el("button", "b-x", "✕"); x.title = "Close (Esc)"; x.addEventListener("click", doClose);
      header.append(x);

      var wrap = el("div", "b-chooser");
      wrap.append(el("div", "b-chooser-q", "What do you want to make?"));
      var cards = el("div", "b-cards");
      var card = function (title, desc, onClick) {
        var c = el("div", "b-card");
        c.append(el("div", "b-card-t", title));
        c.append(el("div", "b-card-d", desc));
        c.addEventListener("click", onClick);
        return c;
      };
      cards.append(card("Note template",
        "The whole file a new note is created from — frontmatter, your prose, and where highlights go.",
        function () { renderWorkspace("note"); }));
      cards.append(card("Highlight format",
        "How each PDF highlight is written into a note — a list item, a blockquote, or a callout.",
        function () { renderWorkspace("format"); }));
      var names = Object.keys(templates).sort();
      var editCard = card("Edit existing",
        names.length ? "Open one of your " + names.length + " templates and tweak it." : "No saved templates yet.",
        function () { if (names.length) renderWorkspace("edit"); });
      if (!names.length) editCard.className += " b-card-off";
      cards.append(editCard);
      wrap.append(cards);

      root.append(header, wrap);
    }

    // ===================================================== WORKSPACE
    function renderWorkspace(mode) {
      root.textContent = "";

      // header (with a Back to chooser)
      var header = el("div", "b-header");
      var back = el("button", "b-back", "‹ Back"); back.title = "Choose a different type";
      back.addEventListener("click", function () { try { Ed.destroy && view && Ed.destroy(view); } catch (e) {} view = null; renderChooser(); });
      header.append(back, el("span", "b-title", titleFor(mode)), el("span", "b-sub", subText));
      var x = el("button", "b-x", "✕"); x.title = "Close (Esc)"; x.addEventListener("click", doClose);
      header.append(x);

      // body: side (compose + palette) | editor | preview
      var body = el("div", "b-body");
      var side = el("div", "b-side");
      var editorCol = el("div", "b-editor");
      var previewCol = el("div", "b-preview");
      body.append(side, editorCol, previewCol);

      var editorHost = el("div", "b-editor-host");
      editorCol.append(el("div", "b-colhead", "Template"), editorHost);

      var kindBadge = el("span", "b-kind");
      var pHead = el("div", "b-colhead"); pHead.append(doc.createTextNode("Live preview "), kindBadge);
      var previewOut = el("pre", "b-preview-out");
      previewCol.append(pHead, previewOut);

      // footer
      var footer = el("div", "b-footer");
      var nameInput = el("input", "b-name"); nameInput.type = "text";
      nameInput.placeholder = "template name"; nameInput.value = mode === "format" ? "my-format" : "my-note";
      var saveBtn = el("button", "b-btn", "Save to folder");
      var insertBtn = el("button", "b-btn b-primary", "Insert into note");
      var closeBtn = el("button", "b-btn", "Close");
      var status = el("span", "b-status");
      footer.append(el("span", "b-name-label", "Save as:"), nameInput, saveBtn, insertBtn, closeBtn, status);

      root.append(header, body, footer);

      // initial doc
      var initialDoc = mode === "format" ? Core.STARTER_FORMAT
        : (mode === "edit" ? (templates[Object.keys(templates).sort()[0]] || "") : Core.STARTER_NOTE);

      view = Ed.create({
        parent: editorHost, doc: initialDoc, dark: dark,
        readMode: false, showMarkers: true, showFrontmatter: true,
        onChange: function () { schedulePreview(); },
      });

      // ---- compose / palette (left side) ----
      buildSide(side, mode, function (text) { Ed.setDoc(view, text); renderPreview(); try { view.focus(); } catch (e) {} },
        function (token) { try { Ed.insertAtCursor(view, token); view.focus(); } catch (e) {} schedulePreview(); });

      // ---- live preview ----
      var previewTimer = null;
      function renderPreview() {
        var text = ""; try { text = Ed.getDoc(view) || ""; } catch (e) {}
        var r = Core.previewTemplate(text, ctx);
        kindBadge.textContent = r.kind === "document" ? "whole-note" : "per-highlight";
        kindBadge.className = "b-kind" + (r.error ? " b-kind-err" : "");
        previewOut.textContent = r.preview || "(empty)";
        previewOut.classList.toggle("b-err", !!r.error);
      }
      function schedulePreview() { if (previewTimer) clearTimeout(previewTimer); previewTimer = setTimeout(renderPreview, 180); }
      // expose so buildSide's generate can refresh immediately
      renderWorkspace._render = renderPreview;
      renderPreview();

      // ---- actions ----
      function flash(msg, isErr) { status.textContent = msg; status.className = "b-status" + (isErr ? " b-err" : ""); }
      insertBtn.addEventListener("click", function () {
        var text = ""; try { text = Ed.getDoc(view) || ""; } catch (e) {}
        var r = Core.previewTemplate(text, ctx);
        if (r.error) { flash("Fix the template error first", true); return; }
        if (!bridge.insert) return;
        Promise.resolve(bridge.insert(r.raw)).then(function () { flash("Inserted into the note"); }, function (e) { flash("Insert failed: " + e, true); });
      });
      saveBtn.addEventListener("click", function () {
        var name = (nameInput.value || "").trim().replace(/\.md$/i, "");
        if (!name) { flash("Enter a template name", true); nameInput.focus(); return; }
        var text = ""; try { text = Ed.getDoc(view) || ""; } catch (e) {}
        if (!bridge.save) return;
        Promise.resolve(bridge.save(name, text)).then(function (res) { flash(res || "Saved"); }, function (e) { flash("Save failed: " + e, true); });
      });
      closeBtn.addEventListener("click", doClose);
      try { view.focus(); } catch (e) {}
    }

    function titleFor(mode) {
      return mode === "format" ? "Template Builder — highlight format"
        : (mode === "edit" ? "Template Builder — edit" : "Template Builder — note template");
    }

    // ===================================================== LEFT SIDE
    // setDoc(text) regenerates the editor from the compose form; insert(token)
    // drops a palette chip at the cursor.
    function buildSide(side, mode, setDoc, insert) {
      side.textContent = "";

      if (mode === "edit") {
        side.append(el("div", "b-pal-head", "Open a template"));
        var sel = el("select", "b-select");
        Object.keys(templates).sort().forEach(function (n) { var o = el("option"); o.value = n; o.textContent = n; sel.append(o); });
        sel.addEventListener("change", function () { setDoc(templates[sel.value] || ""); });
        side.append(sel);
      } else {
        // ---- COMPOSE form ----
        side.append(el("div", "b-pal-head", "Compose"));
        var form = el("div", "b-form");
        side.append(form);
        var regenerate;

        if (mode === "note") regenerate = buildNoteForm(form);
        else regenerate = buildFormatForm(form);

        var gen = el("button", "b-btn b-primary b-gen", "Generate template ↻");
        gen.title = "Write the template from these choices (replaces the editor)";
        gen.addEventListener("click", function () { setDoc(regenerate()); });
        side.append(gen);
        side.append(el("div", "b-hint", "Generate writes a fresh template from your choices. Then tweak it by hand or drop in pieces below — the preview updates live."));
      }

      // ---- palette (scoped) ----
      var addGroup = function (title, items, getText, getLabel, getDesc) {
        side.append(el("div", "b-pal-head", title));
        var wrap = el("div", "b-pal-group");
        items.forEach(function (it) {
          var chip = el("button", "b-chip");
          chip.append(el("span", "b-chip-l", getLabel(it)));
          chip.title = getText(it) + (getDesc && getDesc(it) ? "  —  " + getDesc(it) : "");
          chip.addEventListener("click", function () { insert(getText(it)); });
          wrap.append(chip);
        });
        side.append(wrap);
      };
      var vText = function (v) { return v.token; }, vLabel = function (v) { return v.label || v.token; }, vDesc = function (v) { return v.token; };
      if (mode === "format" || mode === "edit") addGroup("Highlight variables", Core.BLOCK_VARIABLES || [], vText, vLabel, vDesc);
      if (mode === "note" || mode === "edit") addGroup("Item variables", Core.ITEM_VARIABLES || [], vText, vLabel, vDesc);
      addGroup("Snippets", scopedSnippets(mode), function (s) { return s.text; }, function (s) { return s.label; });
    }

    function scopedSnippets(mode) {
      var all = Core.BUILDER_SNIPPETS || [];
      if (mode === "note") return all.filter(function (s) { return s.kind === "note" || s.kind === "block"; });
      if (mode === "format") return all.filter(function (s) { return s.kind === "format"; });
      return all;
    }

    // ---- the NOTE compose form: returns a regenerate() → template text -------
    function buildNoteForm(form) {
      var fieldChk = checkGroup(form, "Frontmatter fields", (Core.NOTE_FIELDS || []).map(function (f) {
        return { id: f.id, label: f.label, on: ["title", "year", "authors", "journal", "tags"].indexOf(f.id) !== -1 };
      }));
      var incChk = checkGroup(form, "Include", [
        { id: "openPdf", label: "“Open PDF” link", on: true },
        { id: "citation", label: "Formatted citation", on: true },
        { id: "abstract", label: "Abstract", on: false },
        { id: "notes", label: "“Notes” heading", on: true },
      ]);
      var fmtSel = selectRow(form, "Highlight style", (Core.FORMAT_STYLES || []).map(function (s) { return [s.id, s.label]; }), "quote");
      var routeSel = selectRow(form, "Highlights", [["single", "One block (all colours)"], ["colour", "Route by colour"]], "single");
      var colWrap = checkGroup(form, "Colours to route", (Core.COLOUR_CHOICES || []).map(function (c) {
        return { id: c, label: c, on: c === "yellow" || c === "blue" };
      }));
      colWrap.groupEl.style.display = "none";
      routeSel.addEventListener("change", function () { colWrap.groupEl.style.display = routeSel.value === "colour" ? "" : "none"; });

      return function () {
        return Core.buildNoteTemplate({
          fields: fieldChk(),
          openPdf: incChk().indexOf("openPdf") !== -1,
          citation: incChk().indexOf("citation") !== -1,
          abstract: incChk().indexOf("abstract") !== -1,
          notes: incChk().indexOf("notes") !== -1,
          highlights: true,
          byColour: routeSel.value === "colour",
          colours: colWrap(),
          highlightFormat: fmtSel.value,
        });
      };
    }

    // ---- the FORMAT compose form -------------------------------------------
    function buildFormatForm(form) {
      var styleSel = selectRow(form, "Style", (Core.FORMAT_STYLES || []).map(function (s) { return [s.id, s.label]; }), "quote");
      var partChk = checkGroup(form, "Include", (Core.FORMAT_PARTS || []).map(function (p) {
        return { id: p.id, label: p.label, on: p.id !== "tags" };
      }));
      var colSel = selectRow(form, "Colour filter", [["", "All colours"]].concat((Core.COLOUR_CHOICES || []).map(function (c) { return [c, c + " only"]; })), "");
      return function () {
        var on = partChk();
        return Core.buildFormatTemplate({
          style: styleSel.value,
          colour: colSel.value,
          parts: { page: on.indexOf("page") !== -1, comment: on.indexOf("comment") !== -1, tags: on.indexOf("tags") !== -1 },
        });
      };
    }

    // ---- tiny form helpers --------------------------------------------------
    // checkGroup → fn() returning the checked ids. Returns the group wrapper too
    // (via .parentNode of the returned fn? no) — so we attach it on the fn.
    function checkGroup(form, title, items) {
      var group = el("div", "b-form-group");
      group.append(el("div", "b-form-h", title));
      var wrap = el("div", "b-checks");
      var boxes = [];
      items.forEach(function (it) {
        var lab = el("label", "b-check");
        var cb = doc.createElement("input"); cb.type = "checkbox"; cb.checked = !!it.on; cb.value = it.id;
        lab.append(cb, el("span", null, it.label));
        wrap.append(lab); boxes.push(cb);
      });
      group.append(wrap);
      form.append(group);
      var fn = function () { return boxes.filter(function (b) { return b.checked; }).map(function (b) { return b.value; }); };
      fn.groupEl = group; // so callers can show/hide the whole group (header + checks)
      return fn;
    }
    function selectRow(form, title, pairs, def) {
      var row = el("div", "b-form-row");
      row.append(el("span", "b-form-rl", title));
      var sel = el("select", "b-select");
      pairs.forEach(function (p) { var o = el("option"); o.value = p[0]; o.textContent = p[1]; if (p[0] === def) o.selected = true; sel.append(o); });
      row.append(sel); form.append(row);
      return sel;
    }

    renderChooser();
    return true;
  };
})();
