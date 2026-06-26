// Template Builder — the in-iframe app (plain script, no bundler).
//
// Runs INSIDE the builder window's srcdoc iframe, after core.bundle.js (global
// ZONCore) and editor.bundle.js (global ZOSEditorLib) have loaded. The parent
// (bootstrap.js) polls for window.startBuilder and calls it once with the preview
// context, the existing-templates map, and a bridge of privileged callbacks.
//
// Design: pure editor + a CONTEXT-AWARE palette. You compose freely in the
// editor; the palette watches where the cursor sits (via ZONCore.paletteContextAt)
// and offers only what's valid there — frontmatter fields (you name the keys),
// item variables, highlight variables inside an annotations block, and one-click
// UPDATABLE field blocks (citation/abstract/title/authors) + annotation blocks in
// the body. Live preview throughout (the same engine the write paths use).

(function () {
  "use strict";

  window.startBuilder = function (opts) {
    opts = opts || {};
    var Core = window.ZONCore, Ed = window.ZOSEditorLib;
    if (!Core || !Ed || !Core.previewTemplate) return false;

    var bridge = opts.bridge || {};
    var dark = !!opts.dark;
    var templates = opts.templates || {};
    // Per-annotation format names for the block configurator's Named dropdown
    // (built-ins + the user's own formats), supplied by the plugin.
    var formatNames = (opts.formatNames && opts.formatNames.length) ? opts.formatNames : (Core.NAMED_FORMATS || []);
    var ctx = (opts.previewCtx && opts.previewCtx.itemData)
      ? opts.previewCtx
      : { itemData: Core.SAMPLE_ITEM, annotations: Core.SAMPLE_ANNOTATIONS, citekey: (Core.SAMPLE_ITEM || {}).citekey };
    var usingSample = !(opts.previewCtx && opts.previewCtx.itemData);

    var doc = document;
    var root = doc.getElementById("zon-builder-root") || doc.body;
    root.textContent = "";
    var el = function (tag, cls, text) {
      var n = doc.createElement(tag);
      if (cls) n.className = cls;
      if (text != null) n.textContent = text;
      return n;
    };

    // ---- header -------------------------------------------------------------
    var header = el("div", "b-header");
    header.append(el("span", "b-title", "Template Builder"));
    header.append(el("span", "b-sub", usingSample
      ? "previewing with sample data (no item selected)"
      : "previewing: " + (ctx.itemData.title || ctx.citekey || "selected item")));
    // Preview toggles — these control how the LIVE PREVIEW renders (not the editor,
    // where you author raw source): hide/show the %% zon %% markers, and reading
    // view (render links/headings inline). Default = clean rendered note.
    var pvToggle = function (label, on) {
      var lab = el("label", "b-toggle"); var cb = doc.createElement("input"); cb.type = "checkbox"; cb.checked = !!on;
      lab.append(cb, el("span", null, label)); header.append(lab); return cb;
    };
    var pvMarkers = pvToggle("Markers", false);
    var pvRead = pvToggle("Reading view", true);
    var closeX = el("button", "b-x", "✕"); closeX.title = "Close (Esc)";
    header.append(closeX);

    // One-line orientation for first-timers.
    var help = el("div", "b-help", "The panel on the left offers pieces for wherever your cursor is. The right shows a live preview. When it looks right, use Create / Insert / Save below.");

    // ---- body: palette | editor | preview -----------------------------------
    var body = el("div", "b-body");
    var side = el("div", "b-side");
    var editorCol = el("div", "b-editor");
    var previewCol = el("div", "b-preview");
    body.append(side, editorCol, previewCol);

    var editorHost = el("div", "b-editor-host");
    editorCol.append(el("div", "b-colhead", "Template"), editorHost);

    var kindBadge = el("span", "b-kind");
    var pHead = el("div", "b-colhead"); pHead.append(doc.createTextNode("Live preview "), kindBadge);
    var previewHost = el("div", "b-preview-host");
    previewCol.append(pHead, previewHost);

    // ---- footer -------------------------------------------------------------
    var footer = el("div", "b-footer");
    var startSel = el("select", "b-select"); startSel.title = "Replace the editor with a starting point";
    var addOpt = function (v, t) { var o = el("option"); o.value = v; o.textContent = t; startSel.append(o); };
    addOpt("__note", "Note starter"); addOpt("__format", "Highlight-format starter"); addOpt("__blank", "Blank");
    Object.keys(templates).sort().forEach(function (n) { addOpt("t:" + n, "Edit: " + n); });
    var nameInput = el("input", "b-name"); nameInput.type = "text"; nameInput.value = "my-template";
    var saveBtn = el("button", "b-btn", "Save to folder");
    var defaultLab = el("label", "b-toggle"); var defaultChk = doc.createElement("input"); defaultChk.type = "checkbox";
    defaultLab.title = "Also make this the template Create/Build uses by default";
    defaultLab.append(defaultChk, el("span", null, "default"));
    // No note yet → "Create note"; an open note → "Insert into note".
    var createBtn = opts.canCreate ? el("button", "b-btn b-primary", "Create note") : null;
    var insertBtn = opts.canInsert ? el("button", "b-btn" + (opts.canCreate ? "" : " b-primary"), "Insert into note") : null;
    var closeBtn = el("button", "b-btn", "Close");
    var status = el("span", "b-status");
    footer.append(el("span", "b-name-label", "Start:"), startSel, el("span", "b-name-label", "Save as:"), nameInput, saveBtn, defaultLab);
    if (createBtn) footer.append(createBtn);
    if (insertBtn) footer.append(insertBtn);
    footer.append(closeBtn, status);

    root.append(header, help, body, footer);

    // ---- editor -------------------------------------------------------------
    var view = Ed.create({
      parent: editorHost, doc: Core.STARTER_NOTE, dark: dark,
      readMode: false, showMarkers: true, showFrontmatter: true,
      onChange: function () { schedulePreview(); renderPalette(); },
      onCursor: function () { renderPalette(); },
    });

    // ---- live preview (a read-only editor so the toggles can reuse its engine) --
    var previewView = Ed.create({
      parent: previewHost, doc: "", editable: false, dark: dark,
      readMode: true, showMarkers: false, showFrontmatter: true,
    });
    pvMarkers.addEventListener("change", function () { try { Ed.setShowMarkers(previewView, pvMarkers.checked); } catch (e) {} });
    pvRead.addEventListener("change", function () { try { Ed.setReadMode(previewView, pvRead.checked); } catch (e) {} });

    var previewTimer = null;
    function renderPreview() {
      var text = ""; try { text = Ed.getDoc(view) || ""; } catch (e) {}
      var r = Core.previewTemplate(text, ctx);
      kindBadge.textContent = r.error ? "not valid yet" : (r.kind === "document" ? "whole-note" : "per-highlight");
      kindBadge.className = "b-kind" + (r.error ? " b-kind-err" : "");
      // Show r.raw (markers + filled content); the preview editor's view engine
      // hides markers / renders reading view per the toggles.
      var out = r.error ? "⚠️ The template isn't valid yet — keep editing.\n\n" + (r.raw || "") : (r.raw || "");
      try { Ed.setDoc(previewView, out); } catch (e) {}
    }
    function schedulePreview() { if (previewTimer) clearTimeout(previewTimer); previewTimer = setTimeout(renderPreview, 180); }

    // ---- context-aware palette ---------------------------------------------
    function insert(text) {
      try { Ed.insertAtCursor(view, text); } catch (e) {}
      schedulePreview(); renderPalette(true);
    }
    function group(title, items, getText, getLabel) {
      side.append(el("div", "b-section", title));
      var wrap = el("div", "b-pal-group");
      items.forEach(function (it) {
        var chip = el("button", "b-chip");
        chip.append(el("span", "b-chip-l", getLabel(it)));
        chip.title = getText(it);
        chip.addEventListener("click", function () { insert(getText(it)); });
        wrap.append(chip);
      });
      side.append(wrap);
    }
    var vText = function (v) { return v.token; }, vLabel = function (v) { return v.label || v.token; };
    var tText = function (t) { return t.text; }, tLabel = function (t) { return t.label; };

    // Variable chips with a "renders as …" tooltip so beginners can see what a
    // variable produces for the current item. getValue is optional (item vars).
    function itemValue(v) {
      try {
        var s = Core.render ? Core.render(v.token, ctx.itemData || {}) : "";
        s = String(s == null ? "" : s).replace(/\s+/g, " ").trim();
        return s ? (s.length > 44 ? s.slice(0, 44) + "…" : s) : "";
      } catch (e) { return ""; }
    }
    function varGroup(title, vars, getValue) {
      side.append(el("div", "b-section", title));
      var wrap = el("div", "b-pal-group");
      vars.forEach(function (v) {
        var chip = el("button", "b-chip");
        chip.append(el("span", "b-chip-l", v.label || v.token));
        var val = getValue ? getValue(v) : "";
        chip.title = v.token + (val ? "  →  " + val : (v.label ? "  —  " + v.label : ""));
        chip.addEventListener("click", function () { insert(v.token); });
        wrap.append(chip);
      });
      side.append(wrap);
    }

    // ---- annotation-block configurator state -------------------------------
    var cfgState = { colours: [], tag: "", commentOnly: false, type: "", mode: "compose", format: "quote", style: "quote", parts: ["page", "comment"], sync: "on" };
    function toConfig(s) {
      var cfg = { colour: s.colours.length ? s.colours.join(",") : "all", tag: s.tag || "", type: s.type || "", sync: s.sync };
      if (s.commentOnly) cfg.comment = "yes";
      if (s.mode === "compose") { cfg.style = s.style; cfg.parts = s.parts.join(","); } else { cfg.format = s.format; }
      return cfg;
    }
    function configToState(c) {
      var s = { colours: (c.colour && c.colour !== "all") ? c.colour.split(",") : [], tag: c.tag || "", commentOnly: c.comment === "yes", type: c.type || "", sync: c.sync === "off" ? "off" : "on", format: "quote", style: "quote", parts: ["page", "comment"], mode: "compose" };
      if (c.style) { s.mode = "compose"; s.style = c.style; s.parts = (c.parts || "").split(",").filter(Boolean); }
      else { s.mode = "named"; s.format = c.format || "quote"; }
      return s;
    }
    // In edit mode, rewrite the block under the cursor live; in add mode the
    // Insert button drops a fresh block. Re-finds the block each time so the range
    // stays correct as the marker grows/shrinks.
    function applyEdit() {
      var cur = ""; try { cur = Ed.getDoc(view) || ""; } catch (e) {}
      var pos = 0; try { pos = Ed.getCursor(view); } catch (e) {}
      var b = Core.blockConfigAt(cur, pos);
      if (!b) return;
      try { Ed.replaceRange(view, b.openStart, b.openEnd, Core.annotationMarkerOpen(toConfig(cfgState))); } catch (e) {}
      schedulePreview();
    }

    function buildConfigurator(mode) {
      var onChange = mode === "edit" ? applyEdit : function () {};
      // Colours (multi-select)
      side.append(el("div", "b-pal-head", "Colours"));
      var colWrap = el("div", "b-pal-group");
      (Core.BLOCK_COLOURS || []).forEach(function (col) {
        var on = cfgState.colours.indexOf(col) !== -1;
        var chip = el("button", "b-chip b-col" + (on ? " b-on" : ""), col);
        chip.addEventListener("click", function () {
          var i = cfgState.colours.indexOf(col);
          if (i === -1) cfgState.colours.push(col); else cfgState.colours.splice(i, 1);
          chip.classList.toggle("b-on"); onChange();
        });
        colWrap.append(chip);
      });
      side.append(colWrap, el("div", "b-hint", cfgState.colours.length ? "" : "none selected = all colours"));

      // Tags
      side.append(el("div", "b-pal-head", "Filter by tag(s)"));
      var tagIn = el("input", "b-name"); tagIn.type = "text"; tagIn.placeholder = "e.g. method, finding"; tagIn.value = cfgState.tag;
      tagIn.style.width = "100%";
      tagIn.addEventListener("input", function () { cfgState.tag = tagIn.value.replace(/\s/g, ""); onChange(); });
      side.append(tagIn);

      // Only highlights that have a comment
      var coLab = el("label", "b-check");
      var coCb = doc.createElement("input"); coCb.type = "checkbox"; coCb.checked = !!cfgState.commentOnly;
      coCb.addEventListener("change", function () { cfgState.commentOnly = coCb.checked; onChange(); });
      coLab.append(coCb, el("span", null, "Only highlights with a comment"));
      side.append(coLab);

      // Type
      var typeSel = selectRow("Type", Core.BLOCK_TYPES || [], cfgState.type, function (v) { cfgState.type = v; onChange(); });

      // Format: Named vs Compose
      side.append(el("div", "b-pal-head", "Format"));
      var modeWrap = el("div", "b-pal-group");
      var fmtBody = el("div");
      ["named", "compose"].forEach(function (mname) {
        var b = el("button", "b-chip" + (cfgState.mode === mname ? " b-on" : ""), mname === "named" ? "Named" : "Compose");
        b.addEventListener("click", function () { cfgState.mode = mname; renderFmtBody(); for (var k = 0; k < modeWrap.children.length; k++) modeWrap.children[k].classList.remove("b-on"); b.classList.add("b-on"); onChange(); });
        modeWrap.append(b);
      });
      side.append(modeWrap, fmtBody);
      function renderFmtBody() {
        fmtBody.textContent = "";
        if (cfgState.mode === "named") {
          selectInto(fmtBody, "Format", formatNames.map(function (n) { return [n, n]; }), cfgState.format, function (v) { cfgState.format = v; onChange(); });
        } else {
          selectInto(fmtBody, "Style", Core.BLOCK_STYLES || [], cfgState.style, function (v) { cfgState.style = v; onChange(); });
          var pWrap = el("div", "b-checks");
          (Core.BLOCK_PARTS || []).forEach(function (p) {
            var lab = el("label", "b-check");
            var cb = doc.createElement("input"); cb.type = "checkbox"; cb.checked = cfgState.parts.indexOf(p[0]) !== -1;
            cb.addEventListener("change", function () {
              var i = cfgState.parts.indexOf(p[0]);
              if (cb.checked && i === -1) cfgState.parts.push(p[0]); else if (!cb.checked && i !== -1) cfgState.parts.splice(i, 1);
              onChange();
            });
            lab.append(cb, el("span", null, p[1])); pWrap.append(lab);
          });
          fmtBody.append(pWrap);
        }
      }
      renderFmtBody();

      // Updates (sync)
      selectRow("Updates", [["on", "live (re-syncs from Zotero)"], ["off", "static (frozen snapshot)"]], cfgState.sync, function (v) { cfgState.sync = v; onChange(); });

      if (mode === "add") {
        // "Separate block per colour": instead of one block filtered to several
        // colours, emit one block per selected colour (no headings, just blocks).
        var sep = { on: false };
        var sepLab = el("label", "b-check");
        var sepCb = doc.createElement("input"); sepCb.type = "checkbox";
        sepCb.addEventListener("change", function () { sep.on = sepCb.checked; });
        sepLab.append(sepCb, el("span", null, "Separate block per colour"));
        side.append(sepLab);
        var ins = el("button", "b-btn b-primary b-gen", "Insert annotation block");
        ins.addEventListener("click", function () {
          if (sep.on && cfgState.colours.length > 1) {
            var blocks = cfgState.colours.map(function (col) {
              var c = toConfig(cfgState); c.colour = col; return Core.annotationBlockText(c);
            }).join("\n\n");
            insert(blocks);
          } else {
            insert(Core.annotationBlockText(toConfig(cfgState)));
          }
        });
        side.append(ins);
      } else {
        side.append(el("div", "b-hint", "Editing the block at your cursor — changes apply live."));
      }
    }

    // ---- updatable field block picker + in-block field configurator ---------
    function buildUpdatableFieldBlock() {
      side.append(el("div", "b-section", "Updatable field block"));
      var box = el("div");
      var first = (Core.UPDATABLE_FIELDS && Core.UPDATABLE_FIELDS[0]) ? Core.UPDATABLE_FIELDS[0].id : "citation";
      var sel = selectInto(box, "Field", (Core.UPDATABLE_FIELDS || []).map(function (f) { return [f.id, f.label]; }), first, function () {});
      side.append(box);
      var btn = el("button", "b-btn b-primary b-gen", "Insert field block");
      btn.addEventListener("click", function () {
        var opt = (Core.UPDATABLE_FIELDS || []).filter(function (f) { return f.id === sel.value; })[0];
        if (opt) insert(Core.fieldBlockTextFor(opt));
      });
      side.append(btn);
    }
    function buildFieldConfigurator(fb) {
      side.append(el("div", "b-section", "Field block"));
      var box = el("div");
      var curId = fb ? Core.fieldOptionId(fb.config) : null;
      var first = (Core.UPDATABLE_FIELDS && Core.UPDATABLE_FIELDS[0]) ? Core.UPDATABLE_FIELDS[0].id : "citation";
      selectInto(box, "Field", (Core.UPDATABLE_FIELDS || []).map(function (f) { return [f.id, f.label]; }), curId || first, function (v) {
        var cur = ""; try { cur = Ed.getDoc(view) || ""; } catch (e) {}
        var pos = 0; try { pos = Ed.getCursor(view); } catch (e) {}
        var b = Core.blockConfigAt(cur, pos);
        var opt = (Core.UPDATABLE_FIELDS || []).filter(function (f) { return f.id === v; })[0];
        if (b && opt) { try { Ed.replaceRange(view, b.openStart, b.openEnd, Core.fieldBlockMarkerOpen(opt)); } catch (e) {} schedulePreview(); }
      });
      side.append(box);
      side.append(el("div", "b-hint", "Editing the field block at your cursor — changes apply live."));
    }
    // ---- frontmatter field builder (add / remove) --------------------------
    // Apply a frontmatter change, keeping the cursor in the frontmatter so the
    // panel stays put. Replaces just the frontmatter region when it existed.
    function applyFm(newDoc) {
      var doc0 = ""; try { doc0 = Ed.getDoc(view) || ""; } catch (e) {}
      var r = Core.frontmatterRange ? Core.frontmatterRange(doc0) : null;
      if (r) { var nr = Core.frontmatterRange(newDoc); try { Ed.replaceRange(view, 0, r.end, newDoc.slice(0, nr.end)); } catch (e) {} }
      else { try { Ed.setDoc(view, newDoc); } catch (e) {} }
      var nr2 = Core.frontmatterRange(newDoc);
      try { Ed.setCursor(view, nr2 ? nr2.start + nr2.fence1.length : 0); } catch (e) {}
      schedulePreview();
      // Rebuild from the KNOWN new document (don't read it back from the editor —
      // that read was stale). So the toggles + remove list reflect it immediately.
      lastCtxKey = null; side.textContent = ""; buildFrontmatterPanel(newDoc);
    }
    function keyOf(line) { return (String(line).split(":")[0] || "").trim(); }
    function buildFrontmatterPanel(docText) {
      var cur = docText != null ? docText : ((function () { try { return Ed.getDoc(view) || ""; } catch (e) { return ""; } })());
      var present = {}; Core.frontmatterFieldKeys(cur).forEach(function (k) { present[k] = true; });

      // Standard synced fields — one-click on/off (toggle adds/removes the line).
      side.append(el("div", "b-section", "Standard fields (synced) — click to add/remove"));
      var stdWrap = el("div", "b-pal-group");
      (Core.FRONTMATTER_FIELDS || []).forEach(function (f) {
        var key = keyOf(f.text); var on = !!present[key];
        var chip = el("button", "b-chip" + (on ? " b-on" : ""), f.label);
        chip.title = (on ? "Remove " : "Add ") + key;
        chip.addEventListener("click", function () {
          var d = ""; try { d = Ed.getDoc(view) || ""; } catch (e) {}
          applyFm(on ? Core.removeFrontmatterField(d, key) : Core.addFrontmatterField(d, f.text));
        });
        stdWrap.append(chip);
      });
      side.append(stdWrap);

      // Add a custom field (your own key + a value source).
      side.append(el("div", "b-section", "Add a custom field"));
      var keyIn = el("input", "b-name"); keyIn.type = "text"; keyIn.placeholder = "field name (e.g. Topics)"; keyIn.style.width = "100%";
      side.append(keyIn);
      var valBox = el("div");
      var valSel = selectInto(valBox, "Value", (Core.FRONTMATTER_VALUES || []).map(function (v) { return [v.id, v.label]; }), "title", function () { syncCustom(); });
      side.append(valBox);
      var customIn = el("input", "b-name"); customIn.type = "text"; customIn.placeholder = 'e.g. "{{itemType}}"'; customIn.style.width = "100%"; customIn.style.display = "none"; customIn.style.marginTop = "4px";
      side.append(customIn);
      function syncCustom() { customIn.style.display = valSel.value === "custom" ? "" : "none"; }
      syncCustom();
      var addBtn = el("button", "b-btn b-gen", "Add custom field");
      addBtn.addEventListener("click", function () {
        var d = ""; try { d = Ed.getDoc(view) || ""; } catch (e) {}
        var v = (Core.FRONTMATTER_VALUES || []).filter(function (x) { return x.id === valSel.value; })[0];
        applyFm(Core.addFrontmatterField(d, Core.frontmatterFieldText(keyIn.value, v, customIn.value)));
      });
      side.append(addBtn);

      // Everything currently in the frontmatter (remove any of it).
      var keys = Core.frontmatterFieldKeys(cur);
      if (keys.length) {
        side.append(el("div", "b-section", "Fields in this note (✕ to remove)"));
        var list = el("div", "b-pal-group");
        keys.forEach(function (k) {
          var chip = el("button", "b-chip");
          chip.append(el("span", "b-chip-l", k), el("span", "b-rm", " ✕"));
          chip.title = "Remove " + k;
          chip.addEventListener("click", function () {
            var d = ""; try { d = Ed.getDoc(view) || ""; } catch (e) {}
            applyFm(Core.removeFrontmatterField(d, k));
          });
          list.append(chip);
        });
        side.append(list);
      }
    }

    function selectRow(label, pairs, value, onSet) { var box = el("div"); side.append(box); return selectInto(box, label, pairs, value, onSet); }
    function selectInto(box, label, pairs, value, onSet) {
      box.append(el("div", "b-pal-head", label));
      var sel = el("select", "b-select"); sel.style.width = "100%";
      pairs.forEach(function (p) { var o = el("option"); o.value = p[0]; o.textContent = p[1]; if (p[0] === value) o.selected = true; sel.append(o); });
      sel.addEventListener("change", function () { onSet(sel.value); });
      box.append(sel); return sel;
    }

    var lastCtxKey = null;
    function renderPalette(force) {
      var cur = ""; try { cur = Ed.getDoc(view) || ""; } catch (e) {}
      var pos = 0; try { pos = Ed.getCursor(view); } catch (e) {}
      var c = Core.paletteContextAt(cur, pos);
      var inAnnBlock = c.context === "block" && c.blockKind === "annotations";
      var b = inAnnBlock ? Core.blockConfigAt(cur, pos) : null;
      // The whole template can BE a per-annotation format body (no frontmatter, no
      // block) — then the body is about one highlight, so offer highlight variables.
      var isFormatDoc = c.context === "body" && Core.templateKind && Core.templateKind(cur) === "format";
      // include block identity + format-ness so the panel rebuilds when they change
      var key = c.context + "/" + (c.blockKind || "") + "/" + (b ? b.openStart : "") + "/" + (isFormatDoc ? "fmt" : "");
      if (!force && key === lastCtxKey) return;
      lastCtxKey = key;
      side.textContent = "";
      side.append(el("div", "b-ctx", c.context === "frontmatter" ? "Cursor in frontmatter"
        : inAnnBlock ? "Editing the annotation block at your cursor"
        : c.context === "block" ? "Editing the field block at your cursor"
        : isFormatDoc ? "Editing a per-highlight format"
        : "Cursor in the note body"));
      if (c.context === "frontmatter") {
        buildFrontmatterPanel();
      } else if (inAnnBlock) {
        cfgState = configToState(b.config); // reflect the block under the cursor
        buildConfigurator("edit");
      } else if (c.context === "block") {
        buildFieldConfigurator(b || Core.blockConfigAt(cur, pos));
      } else if (isFormatDoc) {
        varGroup("Highlight variables", Core.BLOCK_VARIABLES || []);
      } else {
        side.append(el("div", "b-section", "Updatable annotation block"));
        buildConfigurator("add");
        buildUpdatableFieldBlock();
        varGroup("Fixed field value", Core.ITEM_VARIABLES || [], itemValue);
      }
    }

    // ---- start-from ---------------------------------------------------------
    startSel.addEventListener("change", function () {
      var v = startSel.value;
      var text = v === "__blank" ? ""
        : v === "__format" ? Core.STARTER_FORMAT
        : v.indexOf("t:") === 0 ? (templates[v.slice(2)] || "")
        : Core.STARTER_NOTE;
      try { Ed.setDoc(view, text); } catch (e) {}
      renderPreview(); renderPalette(true);
      try { view.focus(); } catch (e) {}
    });

    // ---- actions ------------------------------------------------------------
    function flash(msg, isErr) { status.textContent = msg; status.className = "b-status" + (isErr ? " b-err" : ""); }
    function doClose() { try { Ed.destroy && Ed.destroy(view); } catch (e) {} if (bridge.close) bridge.close(); }
    if (insertBtn) insertBtn.addEventListener("click", function () {
      var text = ""; try { text = Ed.getDoc(view) || ""; } catch (e) {}
      var r = Core.previewTemplate(text, ctx);
      if (r.error) { flash("Fix the template error first", true); return; }
      if (!bridge.insert) return;
      Promise.resolve(bridge.insert(r.raw)).then(function () { flash("Inserted into the note"); }, function (e) { flash("Insert failed: " + e, true); });
    });
    if (createBtn) createBtn.addEventListener("click", function () {
      var text = ""; try { text = Ed.getDoc(view) || ""; } catch (e) {}
      var r = Core.previewTemplate(text, ctx);
      if (r.error) { flash("Fix the template error first", true); return; }
      if (!bridge.createNote) return;
      flash("Creating note…");
      // Pass the TEMPLATE SOURCE — the plugin renders it into the new note file.
      Promise.resolve(bridge.createNote(text)).then(
        function () { flash("Note created ✓"); setTimeout(doClose, 700); },
        function (e) { flash("Create failed: " + e, true); }
      );
    });
    saveBtn.addEventListener("click", function () {
      var name = (nameInput.value || "").trim().replace(/\.md$/i, "");
      if (!name) { flash("Enter a template name", true); nameInput.focus(); return; }
      var text = ""; try { text = Ed.getDoc(view) || ""; } catch (e) {}
      if (!bridge.save) return;
      Promise.resolve(bridge.save(name, text, defaultChk.checked)).then(function (res) { flash(res || "Saved"); }, function (e) { flash("Save failed: " + e, true); });
    });
    closeBtn.addEventListener("click", doClose);
    closeX.addEventListener("click", doClose);
    doc.addEventListener("keydown", function (e) { if (e.key === "Escape") doClose(); });

    renderPalette(true);
    renderPreview();
    try { view.focus(); } catch (e) {}
    return true;
  };
})();
