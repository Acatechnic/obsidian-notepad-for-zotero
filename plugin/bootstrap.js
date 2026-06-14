"use strict";

// Zotero Obsidian Notes – open each item's vault markdown note in the item pane.
//
// Pane lifecycle/registration patterns are lifted from the citation-links
// plugin (FTL insert-per-window, registerSection, the "find the CONNECTED
// collapsible-section body" trick — the body handed to onRender is often
// detached). The editor itself is CodeMirror 6, bundled into
// content/editor.bundle.js and injected into the main window, exposing a global
// ZOSEditorLib { create, getDoc, setDoc, destroy }.
//
// Item -> note resolution: notes carry `ZoteroLink: zotero://.../items/<KEY>`
// in their frontmatter, so we index the notes folder by that top-level item key
// (provider-independent — no Better BibTeX dependency).

var ZON = {
  pluginID: "obsidian-notepad-for-zotero@local",
  rootURI: null,
  index: null,       // Map<itemKey, filePath>
  indexing: null,    // in-flight index promise
  _registeredPaneID: null,
  _notifierID: null,        // Zotero.Notifier observer handle
  _autoSyncTimer: null,     // debounce timer for annotation-driven auto-sync
  _autoSyncItems: null,     // Set<regular-item id> pending auto-sync
  _autoSyncAll: false,      // true when a delete left us unable to resolve the parent

  PREF_VAULT: "extensions.zotero-obsidian-notes.vaultPath",
  PREF_NOTES: "extensions.zotero-obsidian-notes.notesDir",
  PREF_TEMPLATE: "extensions.zotero-obsidian-notes.templatePath",
  PREF_FILENAME: "extensions.zotero-obsidian-notes.filenamePattern",
  PREF_FORMATS_DIR: "extensions.zotero-obsidian-notes.formatsDir",
  PREF_TEMPLATES_DIR: "extensions.zotero-obsidian-notes.templatesDir",
  PREF_DEFAULT_NOTE: "extensions.zotero-obsidian-notes.defaultNoteTemplate",
  PREF_AUTOSYNC: "extensions.zotero-obsidian-notes.autoSync",
  // Defaults are intentionally empty — the vault and folders are user-specific and
  // are set on first run (Phase 2 onboarding) / in preferences. Empty = "not
  // configured yet", handled by the pane's empty state rather than guessed.
  DEFAULT_VAULT: "",
  DEFAULT_NOTES: "",
  DEFAULT_TEMPLATE: "",
  DEFAULT_FILENAME: "@{{citekey}}.md",
  DEFAULT_FORMATS_DIR: "",
  // Unified Templates folder: holds note.md (whole-note scaffold) + one file per
  // insertable block template. Supersedes the separate templatePath/formatsDir,
  // which still work as fallbacks.
  DEFAULT_TEMPLATES_DIR: "",
  NOTE_SCAFFOLD_NAME: "note", // <templatesDir>/note.md = the default whole-note scaffold
  DEFAULT_DEFAULT_NOTE: "note", // which note scaffold "Create note" uses by default
  DEFAULT_AUTOSYNC: false, // live auto-sync of annotation blocks while you annotate (off by default — opt-in)
  _templates: null,

  // ---------------------------------------------------------------- lifecycle

  async init(rootURI) {
    this.rootURI = rootURI;
    try { Zotero.ZON = this; } catch (e) {} // dev handle for console-driven testing
    this.seedDefaults();
    // A fresh init means any existing editor wraps belong to a previous (now
    // defunct) instance — e.g. a hot-reinstall whose shutdown didn't fully tear
    // down. Destroy them up front so we never end up with several CodeMirror
    // views live in the same document (which corrupts the caret while typing).
    try { for (let win of Zotero.getMainWindows()) this.removeWraps(win); } catch (e) {}
    this.loadTemplates().catch((e) => this.log("loadTemplates failed: " + e));
    for (let win of Zotero.getMainWindows()) this.addToWindow(win);
    try { this.registerSection(); } catch (e) { this.log("registerSection failed: " + e); }
    try {
      if (Zotero.PreferencePanes && Zotero.PreferencePanes.register) {
        Zotero.PreferencePanes.register({
          pluginID: this.pluginID,
          src: this.rootURI + "content/preferences.xhtml",
          label: "Obsidian Notes",
        });
      }
    } catch (e) { this.log("prefpane register failed: " + e); }
    this.buildIndex().catch((e) => this.log("index build failed: " + e));
    try { this.registerNotifier(); } catch (e) { this.log("registerNotifier failed: " + e); }
    this.log("initialized");
  },

  uninit() {
    try { if (this._registeredPaneID) Zotero.ItemPaneManager.unregisterSection(this._registeredPaneID); } catch (e) {}
    try { if (this._notifierID) Zotero.Notifier.unregisterObserver(this._notifierID); this._notifierID = null; } catch (e) {}
    try { if (this._autoSyncTimer) { clearTimeout(this._autoSyncTimer); this._autoSyncTimer = null; } } catch (e) {}
    // Tear down per-window state so a reinstall hot-reloads cleanly: destroy
    // editors, drop our content wraps (incl. shadow DOM), remove the injected
    // bundle <script>, and clear the global so startup re-injects the new one.
    for (let win of Zotero.getMainWindows()) {
      try {
        this.removeWraps(win);
        try { if (win._zonThemeMO) win._zonThemeMO.disconnect(); win._zonThemeMO = null; } catch (e) {}
        try { if (win._zonThemeMQ && win._zonThemeMQH) win._zonThemeMQ.removeEventListener("change", win._zonThemeMQH); } catch (e) {}
        for (let id of ["zon-editor-lib", "zon-core-lib", "zon-toolbar-css"]) {
          let s = win.document.getElementById(id);
          if (s) s.remove();
        }
        try { win.ZOSEditorLib = undefined; } catch (e) {}
        try { win.ZONCore = undefined; } catch (e) {}
      } catch (e) {}
    }
    try { Zotero.ZON = undefined; } catch (e) {}
  },

  // Destroy every editor and remove every `.zon-content` wrap in a window
  // (including ones nested in shadow roots). Used by uninit and by init (to
  // clear anything a previous instance left behind).
  removeWraps(win) {
    let walk = (root) => {
      if (!root || !root.querySelectorAll) return;
      let ws;
      try { ws = root.querySelectorAll(".zon-content"); } catch (e) { return; }
      for (let w of ws) {
        try { if (w._zon && w._zon._fitRO) w._zon._fitRO.disconnect(); } catch (e) {}
        try { if (w._zon && w._zon.lib && w._zon.view) w._zon.lib.destroy(w._zon.view); } catch (e) {}
        try { w._zon = null; } catch (e) {}
        try { w.remove(); } catch (e) {}
      }
      try { for (let el of root.querySelectorAll("*")) if (el.shadowRoot) walk(el.shadowRoot); } catch (e) {}
    };
    walk(win.document);
  },

  addToWindow(win) {
    try {
      let links = win.document.querySelectorAll(
        'link[rel="localization"][href="zotero-obsidian-notes.ftl"]');
      for (let l of links) l.remove();
      win.MozXULElement.insertFTLIfNeeded("zotero-obsidian-notes.ftl");
    } catch (e) { this.log("FTL insert failed: " + e); }
    // Inject the core bundle so window.ZONCore (nunjucks renderer + block engine)
    // is available for create-from-template / annotation sync. The EDITOR bundle
    // is NOT injected here — it loads inside each editor's <iframe> instead, so
    // CodeMirror runs in a real HTML document with a working DOM Selection (see
    // mountEditor).
    this.injectCore(win).catch((e) => this.log("core inject failed: " + e));
    this.watchTheme(win);
  },

  // Re-theme live editors when Zotero's light/dark scheme changes. Each editor is
  // in its own iframe and doesn't inherit Zotero's theme, and the colours are
  // chosen at mount; without this, toggling the theme leaves an open editor in the
  // old scheme (e.g. dark text on a now-dark background). We watch both the OS
  // media query (Automatic mode) and attribute changes on the chrome root (an
  // explicit Light/Dark choice in Zotero settings), then re-detect per editor.
  watchTheme(win) {
    let self = this;
    let refresh = function () {
      let walk = function (root) {
        if (!root || !root.querySelectorAll) return;
        let ws;
        try { ws = root.querySelectorAll(".zon-content"); } catch (e) { return; }
        for (let w of ws) {
          let rec = w._zon;
          if (rec && rec.lib && rec.lib.setDark && rec.view) {
            let dk = self.isDarkTheme(win, rec.host);
            if (dk !== rec._lastDark) { rec._lastDark = dk; try { rec.lib.setDark(rec.view, dk); } catch (e) {} }
          }
        }
        try { for (let el of root.querySelectorAll("*")) if (el.shadowRoot) walk(el.shadowRoot); } catch (e) {}
      };
      walk(win.document);
    };
    // Tear down any watcher from a previous (hot-reloaded) instance first.
    try { if (win._zonThemeMO) win._zonThemeMO.disconnect(); } catch (e) {}
    try { if (win._zonThemeMQ && win._zonThemeMQH) win._zonThemeMQ.removeEventListener("change", win._zonThemeMQH); } catch (e) {}
    try {
      let mq = win.matchMedia("(prefers-color-scheme: dark)");
      mq.addEventListener("change", refresh);
      win._zonThemeMQ = mq; win._zonThemeMQH = refresh;
    } catch (e) {}
    try {
      let mo = new win.MutationObserver(refresh);
      mo.observe(win.document.documentElement, { attributes: true });
      win._zonThemeMO = mo;
    } catch (e) {}
  },

  log(msg) { try { Zotero.debug("ZON: " + msg); } catch (e) {} },

  // ---------------------------------------------------------------- prefs

  vaultPath() { return Zotero.Prefs.get(this.PREF_VAULT, true) || this.DEFAULT_VAULT; },
  notesDir() { return Zotero.Prefs.get(this.PREF_NOTES, true) || this.DEFAULT_NOTES; },
  templatePath() { return Zotero.Prefs.get(this.PREF_TEMPLATE, true) || this.DEFAULT_TEMPLATE; },
  filenamePattern() { return Zotero.Prefs.get(this.PREF_FILENAME, true) || this.DEFAULT_FILENAME; },
  formatsDir() { return Zotero.Prefs.get(this.PREF_FORMATS_DIR, true) || this.DEFAULT_FORMATS_DIR; },
  templatesDir() { return Zotero.Prefs.get(this.PREF_TEMPLATES_DIR, true) || this.DEFAULT_TEMPLATES_DIR; },
  defaultNoteTemplate() { return Zotero.Prefs.get(this.PREF_DEFAULT_NOTE, true) || this.DEFAULT_DEFAULT_NOTE; },

  // Whole-note scaffolds available in the Templates folder: every file named
  // `note` or `note-*` (so you can keep several, e.g. note-book / note-article).
  // Returns [{ name, path }], note-scaffold names without the extension.
  async noteTemplates() {
    let out = [];
    let dir = this.templatesDir();
    if (dir) {
      let children;
      try { children = await IOUtils.getChildren(dir); } catch (e) { children = []; }
      for (let p of children) {
        if (!/\.(njk|md|txt)$/i.test(p)) continue;
        let name = PathUtils.filename(p).replace(/\.(njk|md|txt)$/i, "");
        if (/^note(-.*)?$/i.test(name)) out.push({ name, path: p });
      }
    }
    out.sort((a, b) => a.name.localeCompare(b.name));
    return out;
  },

  // Resolve the path of a note scaffold to use. `name` (without extension) picks
  // a specific scaffold; omitted → the default set in preferences. Falls back to
  // the legacy single template file (PREF_TEMPLATE) if the folder has none.
  async noteTemplatePath(name) {
    let dir = this.templatesDir();
    name = name || this.defaultNoteTemplate() || this.NOTE_SCAFFOLD_NAME;
    if (dir) {
      let p = PathUtils.join(dir, name + ".md");
      try { if (await IOUtils.exists(p)) return p; } catch (e) {}
    }
    return this.templatePath();
  },

  // Parse a template file into { item, sep, defaults }. Mirrors
  // src/templates.js parseTemplateFile (kept here because loading runs in the
  // privileged scope before the core bundle is guaranteed present). An optional
  // first line `%%! colour=.. sync=.. sep=blank|newline %%` pins this template's
  // defaults; the rest is the per-annotation Nunjucks body.
  parseTemplateText(text) {
    let raw = String(text).replace(/\s+$/, "");
    let lines = raw.split("\n");
    let defaults = {}, sepMode = null;
    let m = lines.length ? lines[0].match(/^\s*%%!\s*([^%]*?)\s*%%\s*$/) : null;
    if (m) {
      for (let tok of m[1].trim().split(/\s+/)) {
        if (!tok) continue;
        let i = tok.indexOf("=");
        if (i > 0) defaults[tok.slice(0, i)] = tok.slice(i + 1);
        else defaults[tok] = true;
      }
      if (defaults.sep) { sepMode = defaults.sep; delete defaults.sep; }
      if (defaults.color && !defaults.colour) defaults.colour = defaults.color;
      delete defaults.color;
      lines.shift();
    }
    let body = lines.join("\n").replace(/^\n+/, "").replace(/\s+$/, "");
    let sep = sepMode === "blank" ? "\n\n"
      : sepMode === "newline" ? "\n"
      : (body.includes("\n") ? "\n\n" : "\n");
    return { item: body, sep, defaults };
  },

  // Classify a template (mirrors src/templates.js templateKind): a "document" has
  // YAML frontmatter and/or a `%% zon %%` block (rendered whole, once, with the
  // item's data); a "format" is a per-annotation body (rendered once per highlight,
  // wrapped in a zon block on insert).
  templateKindOf(text) {
    let t = String(text || "");
    if (/^---\r?\n[\s\S]*?\r?\n---/.test(t)) return "document";
    if (/%%\s*zon\b/.test(t)) return "document";
    return "format";
  },

  // Frontmatter fields the user owns (mirrors src/templates.js): a field with a
  // `{{ }}` / `{% %}` expression auto-updates from Zotero on Refresh; a plain field
  // (e.g. `KeyIdea:`) is preserved.
  templateUserOwnedKeys(text) {
    let m = String(text || "").match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!m) return [];
    let lines = m[1].split("\n"), keys = [], cur = null, hasExpr = false;
    let isExpr = (s) => /\{\{|\{%/.test(s);
    let flush = () => { if (cur && !hasExpr) keys.push(cur); };
    for (let line of lines) {
      let km = line.match(/^([A-Za-z0-9_-]+):/);
      if (km && !/^\s/.test(line)) { flush(); cur = km[1]; hasExpr = isExpr(line); }
      else if (cur && isExpr(line)) hasExpr = true;
    }
    flush();
    return keys;
  },

  // Load EVERY template from the unified Templates folder (+ legacy formats folder)
  // into one map keyed by filename. Each entry is classified:
  //   document → { kind:'document', text }            (whole-note template)
  //   format   → { kind:'format', item, sep, defaults } (per-annotation body)
  // This is the single source for both the Insert dropdown and the Create picker —
  // any template can be inserted at the cursor OR used to create a whole note.
  async loadTemplates() {
    let out = {};
    let load = async (dir) => {
      if (!dir) return;
      let children;
      try { children = await IOUtils.getChildren(dir); }
      catch (e) { return; } // missing folder is fine — built-ins still apply
      for (let p of children) {
        if (!/\.(njk|md|txt)$/i.test(p)) continue;
        let name = PathUtils.filename(p).replace(/\.(njk|md|txt)$/i, "");
        if (/^(templates|readme)$/i.test(name)) continue; // docs files, not templates
        try {
          let text = await IOUtils.readUTF8(p);
          if (this.templateKindOf(text) === "document") out[name] = { kind: "document", text };
          else out[name] = Object.assign({ kind: "format" }, this.parseTemplateText(text));
        } catch (e) {}
      }
    };
    await load(this.formatsDir());     // legacy formats (lower priority)
    await load(this.templatesDir());   // unified folder (wins)
    this._templates = out;
    return out;
  },
  // Back-compat alias — some call sites still say loadCustomFormats.
  async loadCustomFormats() { return this.loadTemplates(); },

  // The full unified template list (shipped formats + the user's files), keyed by
  // name. Used to populate the Template dropdown / Create picker.
  allTemplates(win) {
    let defs = (win && win.ZONCore && win.ZONCore.DEFAULT_FORMATS) || {};
    let builtin = {};
    for (let k of Object.keys(defs)) builtin[k] = Object.assign({ kind: "format" }, defs[k]);
    return Object.assign({}, builtin, this._templates || {});
  },

  // Just the FORMAT-kind templates (built-ins + custom), as { name: {item, sep} } —
  // the per-annotation bodies that syncBlocks / makeBlock resolve format names against.
  formatMap(win) {
    let out = {};
    let all = this.allTemplates(win);
    for (let k of Object.keys(all)) if (all[k].kind === "format") out[k] = all[k];
    return out;
  },

  // Order the template names with the default note scaffold first, then the rest
  // alphabetically — so the Create picker / dropdown opens on the user's default.
  orderedTemplateNames(win) {
    let names = Object.keys(this.allTemplates(win));
    if (!names.length) names = ["list", "quote", "callout", "compact"];
    let def = this.defaultNoteTemplate();
    names.sort((a, b) => (a === def ? -1 : b === def ? 1 : a.localeCompare(b)));
    return names;
  },

  // Store defaults for any unset pref so the preferences pane shows real values
  // (its inputs bind to the stored pref, which is blank/"undefined" otherwise).
  seedDefaults() {
    let seed = (key, def) => {
      try { if (Zotero.Prefs.get(key, true) === undefined) Zotero.Prefs.set(key, def, true); } catch (e) {}
    };
    seed(this.PREF_VAULT, this.DEFAULT_VAULT);
    seed(this.PREF_NOTES, this.DEFAULT_NOTES);
    seed(this.PREF_TEMPLATE, this.DEFAULT_TEMPLATE);
    seed(this.PREF_FILENAME, this.DEFAULT_FILENAME);
    seed(this.PREF_FORMATS_DIR, this.DEFAULT_FORMATS_DIR);
    seed(this.PREF_TEMPLATES_DIR, this.DEFAULT_TEMPLATES_DIR);
    seed(this.PREF_DEFAULT_NOTE, this.DEFAULT_DEFAULT_NOTE);
    seed(this.PREF_AUTOSYNC, this.DEFAULT_AUTOSYNC);
  },

  autoSyncEnabled() {
    try { let v = Zotero.Prefs.get(this.PREF_AUTOSYNC, true); return v === undefined ? this.DEFAULT_AUTOSYNC : !!v; }
    catch (e) { return this.DEFAULT_AUTOSYNC; }
  },

  // ---------------------------------------------------------------- editor lib

  // Inject a bundle as a <script> into the main window; it runs in window scope
  // and defines window[globalName]. Resolves when loaded (or already present).
  injectScript(win, id, file, globalName) {
    return new Promise((resolve, reject) => {
      try {
        if (win[globalName]) { resolve(); return; }
        let doc = win.document;
        let existing = doc.getElementById(id);
        if (existing) { existing.addEventListener("load", () => resolve()); return; }
        let script = doc.createElementNS("http://www.w3.org/1999/xhtml", "script");
        script.id = id;
        script.setAttribute("type", "text/javascript");
        script.setAttribute("src", this.rootURI + "content/" + file);
        script.addEventListener("load", () => { this.log(id + " loaded"); resolve(); });
        script.addEventListener("error", (e) => reject(new Error("script error: " + e)));
        doc.documentElement.appendChild(script);
      } catch (e) { reject(e); }
    });
  },

  injectEditorLib(win) { return this.injectScript(win, "zon-editor-lib", "editor.bundle.js", "ZOSEditorLib"); },
  injectCore(win) { return this.injectScript(win, "zon-core-lib", "core.bundle.js", "ZONCore"); },

  // ---------------------------------------------------------------- note index

  async buildIndex() {
    if (this.indexing) return this.indexing;
    this.indexing = (async () => {
      let map = new Map();      // itemKey  -> path (from ZoteroLink)
      let ckMap = new Map();    // citekey  -> path (frontmatter or @<citekey>.md)
      let dir = this.notesDir();
      let children;
      try { children = await IOUtils.getChildren(dir); }
      catch (e) { this.log("cannot read notes dir " + dir + ": " + e); this.index = map; this.citekeyIndex = ckMap; return map; }
      let reLink = /ZoteroLink:[^\n]*items\/([A-Z0-9]+)/i;
      let reCite = /^citekey:\s*"?([^"\n]+?)"?\s*$/im;
      for (let p of children) {
        if (!p.endsWith(".md")) continue;
        try {
          let text = await IOUtils.readUTF8(p);
          let head = text.slice(0, 2000); // keys live in frontmatter
          let m = head.match(reLink);
          if (m) map.set(m[1], p);
          let cm = head.match(reCite);
          let ck = cm ? cm[1].trim() : null;
          if (!ck) {
            let fm = PathUtils.filename(p).match(/^@?(.+)\.md$/i); // @<citekey>.md
            if (fm) ck = fm[1];
          }
          if (ck) ckMap.set(ck, p);
        } catch (e) {}
      }
      this.index = map;
      this.citekeyIndex = ckMap;
      this.log("indexed " + map.size + " by item-key, " + ckMap.size + " by citekey, from " + dir);
      return map;
    })();
    let r = await this.indexing;
    this.indexing = null;
    return r;
  },

  async resolvePath(item) {
    if (!this.index) await this.buildIndex();
    if (!item) return null;
    // In a reader/context pane the rendered item can be the PDF attachment rather
    // than the top-level item the note is linked to — resolve via its parent.
    try {
      if (item.isAttachment && item.isAttachment()) {
        let parent = item.parentItem || (item.parentItemKey && Zotero.Items.getByLibraryAndKey(item.libraryID, item.parentItemKey));
        if (parent) item = parent;
      }
    } catch (e) {}
    let p = this.index.get(item.key);
    if (p) return p;
    // Fallback: match by Better BibTeX citekey (notes that lack a ZoteroLink).
    // Strict citekey only (no surname+year guess) to avoid false matches.
    try {
      let ck = this.getCitekey(item, false);
      if (ck && this.citekeyIndex) {
        let cp = this.citekeyIndex.get(ck);
        if (cp) return cp;
      }
    } catch (e) {}
    return null;
  },

  // ---------------------------------------------------------------- section

  registerSection() {
    if (!Zotero.ItemPaneManager || !Zotero.ItemPaneManager.registerSection) {
      this.log("ItemPaneManager.registerSection unavailable"); return;
    }
    try { Zotero.ItemPaneManager.unregisterSection("zotero-obsidian-notes-section"); } catch (e) {}
    let self = this;
    this._registeredPaneID = Zotero.ItemPaneManager.registerSection({
      paneID: "zotero-obsidian-notes-section",
      pluginID: this.pluginID,
      header: { l10nID: "zon-header", icon: this.icon },
      sidenav: { l10nID: "zon-sidenav", icon: this.icon },
      onRender: function (props) { self.paintSection(props); },
      onAsyncRender: function (props) { self.paintSection(props); },
      onItemChange: function (props) {
        try { props.setEnabled(!!props.item && props.item.isRegularItem()); } catch (e) {}
      },
    });
  },

  // Obsidian-crystal icon for the section header + right-hand sidenav column.
  // A packaged SVG (context-fill) renders/threads the theme colour more reliably
  // than a data: URI did.
  get icon() {
    return (this.rootURI || "") + "content/icon.svg";
  },

  // Find the LIVE <collapsible-section> element(s) for our pane. The `props.body`
  // the hook hands us is frequently DETACHED (isConnected=false) — painting into
  // it is invisible, and `body.closest("collapsible-section")` then finds nothing.
  // Zotero renders our section as a <collapsible-section data-pane="…notes-section">
  // whose visible body is a slot for its light-DOM children, so we scan every main
  // window (light DOM + shadow roots) for the CONNECTED section and slot our wrap
  // into it. (data-pane may hold the raw or pluginID-namespaced id → match by suffix.)
  connectedSections() {
    let out = [];
    let scan = function (root) {
      if (!root || !root.querySelectorAll) return;
      let secs;
      try { secs = root.querySelectorAll("collapsible-section"); } catch (e) { return; }
      for (let cs of secs) {
        let pane = cs.dataset ? cs.dataset.pane : (cs.getAttribute && cs.getAttribute("data-pane"));
        if (pane && /zotero-obsidian-notes-section$/.test(pane) && cs.isConnected) out.push(cs);
      }
      try { for (let el of root.querySelectorAll("*")) if (el.shadowRoot) scan(el.shadowRoot); } catch (e) {}
    };
    try { for (let win of Zotero.getMainWindows()) if (win && win.document) scan(win.document); } catch (e) {}
    return out;
  },

  // Is this section actually inside the window viewport? Zotero keeps a copy of
  // our section in EVERY open tab's item pane AND in the reader context panes —
  // and those off-screen / collapsed copies still report client rects, so
  // getClientRects().length can't tell them apart. A bounding rect that intersects
  // the viewport can: the off-screen context-pane copies sit at x >= innerWidth and
  // the collapsed ones have zero width. This is how we identify the one pane the
  // user is actually looking at (= the one Zotero just rendered into).
  inViewport(cs, win) {
    try {
      let r = cs.getBoundingClientRect();
      return r.width > 1 && r.height > 1
        && r.left < win.innerWidth && r.right > 0
        && r.top < win.innerHeight && r.bottom > 0;
    } catch (e) { return false; }
  },

  // Is Zotero in dark mode? The editor's iframe is a separate document that does
  // not inherit Zotero's theme, so we detect it and pass it to the editor. We
  // read the resolved background colour of our host (which uses Zotero's
  // --material-background var) and check its luminance; fall back to the OS
  // colour-scheme media query if the host bg is transparent/unavailable.
  isDarkTheme(win, host) {
    try {
      let bg = host ? win.getComputedStyle(host).backgroundColor : "";
      let m = bg && bg.match(/rgba?\(([^)]+)\)/);
      if (m) {
        let p = m[1].split(",").map(function (s) { return parseFloat(s); });
        let a = p.length > 3 ? p[3] : 1;
        if (a > 0.1) {
          let lum = (0.299 * p[0] + 0.587 * p[1] + 0.114 * p[2]) / 255;
          return lum < 0.5;
        }
      }
    } catch (e) {}
    try { return !!(win.matchMedia && win.matchMedia("(prefers-color-scheme: dark)").matches); } catch (e) {}
    return false;
  },

  // Find the section that belongs to the ACTIVE tab's pane. There's one copy of
  // our section per open tab (the library item pane + every reader tab's context
  // pane), and viewport geometry can't tell them apart — a background tab's pane
  // keeps non-zero, on-screen-looking geometry. But the active tab is identifiable
  // from the section's ancestor id: the library pane lives under #zotero-item-pane
  // / #zotero-item-details, and a reader tab's context pane under
  // #tab-<tabID>-context. Zotero_Tabs tells us which tab is selected.
  activeTabSection(sections, win) {
    let tabs = win && win.Zotero_Tabs;
    if (!tabs) return null;
    let selType = tabs.selectedType;            // "library" | "reader"
    let selID = tabs.selectedID;                // already "tab-XXXX" for a reader tab
    // The reader context pane's ancestor id is "<selID>-context" (selID already
    // carries the "tab-" prefix — don't add another).
    let wantCtx = selID ? (selID + "-context") : null;
    for (let cs of sections) {
      let n = cs;
      for (let i = 0; i < 14 && n; i++) {
        let id = n.id || "";
        if (selType === "library") {
          if (id === "zotero-item-pane" || id === "zotero-item-details") return cs;
        } else if (wantCtx && id === wantCtx) {
          return cs;
        }
        let p = n.parentNode;
        if (p && p.nodeType === 11) p = p.host; // cross shadow boundary
        n = p;
      }
    }
    return null;
  },

  // Paint into the pane of the ACTIVE tab — the library item pane, or the current
  // reader tab's context pane (the user takes notes while reading a PDF, so this
  // MUST work in reader tabs). We anchor our content wrap to the stable, connected
  // <collapsible-section> for that pane — NOT props.body, which in reader panes is
  // connected only momentarily before Zotero swaps it out — so the editor + cursor
  // survive the pane's churn. Each pane keeps its own editor (iframes isolate the
  // DOM selection, so multiple editors across tabs don't interfere).
  paintSection(props) {
    if (!props || !props.item) return;
    let item = props.item;
    let itemID = item.id;
    let self = this;
    this._lastPaintItemID = itemID;
    let attempt = 0;
    let go = function () {
      if (self._lastPaintItemID !== itemID) return; // user moved to another item while retrying
      let sections = self.connectedSections();
      let win = (sections[0] && sections[0].ownerDocument.defaultView) || Zotero.getMainWindows()[0];
      // Prefer the active tab's section; fall back to the viewport-visible one,
      // then (after waiting for layout) the first connected.
      let target = self.activeTabSection(sections, win);
      if (!target && win) {
        let visible = sections.filter(function (cs) { return self.inViewport(cs, win); });
        if (visible.length) {
          target = visible.reduce(function (a, b) {
            return b.getBoundingClientRect().width > a.getBoundingClientRect().width ? b : a;
          });
        } else if (attempt >= 40 && sections.length) {
          target = sections[0];
        }
      }
      if (target) {
        let doc = target.ownerDocument;
        let wrap = target.querySelector(":scope > .zon-content");
        if (!wrap) {
          wrap = doc.createElementNS("http://www.w3.org/1999/xhtml", "div");
          wrap.className = "zon-content";
          wrap.style.cssText = "box-sizing:border-box;overflow:hidden;";
          target.appendChild(wrap); // slotted into the collapsible body
        }
        self.renderInto(wrap, item).catch((e) => self.log("render failed: " + e));
        return;
      }
      // The live pane may attach / lay out a little after the hook fires — keep trying.
      if (attempt < 40) {
        attempt++;
        let w = (props.body && props.body.ownerDocument && props.body.ownerDocument.defaultView)
          || win || Zotero.getMainWindows()[0];
        if (w && w.setTimeout) w.setTimeout(go, 150);
      }
    };
    go();
  },

  // ---------------------------------------------------------------- rendering

  async renderInto(wrap, item) {
    let win = wrap.ownerDocument.defaultView;
    let rec = wrap._zon;
    if (!rec) {
      rec = this.buildEditorUI(wrap, win);
      wrap._zon = rec;
      // The Template dropdown is built synchronously from the formats known so
      // far; custom folder templates + ZONCore's built-ins may still be loading,
      // so repopulate it once they're ready (else it shows only the hard-coded
      // fallback list/quote/callout/compact).
      this.populateTemplatePicker(rec).catch((e) => this.log("template picker failed: " + e));
    }

    let path = await this.resolvePath(item);

    // Already showing this exact note in a live editor → do NOT remount.
    // mountEditor recreates CodeMirror with the cursor at position 0, so a
    // spurious onRender/onAsyncRender mid-typing (Zotero fires these on
    // incidental re-layouts, not just item switches) would otherwise yank the
    // caret to the top. Just re-fit the width in case the pane resized, and
    // leave the document and cursor untouched. External file changes go through
    // mountEditor directly (Sync/Insert/Migrate/Reload), so they still update.
    if (rec.view && path && rec.path === path && rec.item && item && rec.item.id === item.id) {
      rec.item = item;
      try { this.fitHost(rec); if (rec.lib) rec.lib.refresh(rec.view); } catch (e) {}
      return;
    }

    // Switching notes: flush any pending save for the note we're leaving.
    await this.flush(rec);
    rec.item = item;
    if (path) {
      let content = "";
      try { content = await IOUtils.readUTF8(path); } catch (e) { this.log("read failed: " + e); }
      rec.path = path;
      this.mountEditor(rec, win, content);
      rec.banner.style.display = "none";
      rec.toolbar.style.display = "";
      this.setStatus(rec, "Saved");
    } else {
      rec.path = null;
      this.mountEditor(rec, win, "");
      rec.toolbar.style.display = "none";
      rec.banner.style.display = "";
      rec.bannerText.textContent = "No linked note found for this item yet. "
        + "Create one in " + this.notesDir() + " from your template:";
      await this.populateNoteTemplatePicker(rec);
    }
  },

  // Fill the create-banner's picker from the SAME unified template list as the
  // toolbar (every template — note scaffolds + formats), default scaffold first.
  // You can create a note from any of them.
  async populateNoteTemplatePicker(rec) {
    if (!rec.noteTplSel) return;
    let sel = rec.noteTplSel;
    let win = rec.host.ownerDocument.defaultView;
    if (!this._templates) { try { await this.loadTemplates(); } catch (e) {} }
    if (!win.ZONCore) { try { await this.injectCore(win); } catch (e) {} }
    let names = this.orderedTemplateNames(win);
    sel.textContent = "";
    let doc = sel.ownerDocument;
    for (let name of names) {
      let o = doc.createElementNS("http://www.w3.org/1999/xhtml", "option");
      o.value = name; o.textContent = name;
      sel.appendChild(o);
    }
    sel.value = names[0];
  },

  // (Re)fill the toolbar Template dropdown from the unified template list (every
  // file + built-in formats), once loadTemplates + ZONCore are available. Default
  // note scaffold first. Preserves the current selection and re-applies defaults.
  async populateTemplatePicker(rec) {
    let sel = rec.templateSel;
    if (!sel) return;
    let win = rec.host.ownerDocument.defaultView;
    if (!this._templates) { try { await this.loadTemplates(); } catch (e) {} }
    if (!win.ZONCore) { try { await this.injectCore(win); } catch (e) {} }
    let names = this.orderedTemplateNames(win);
    let prev = sel.value;
    let doc = sel.ownerDocument;
    sel.textContent = "";
    for (let n of names) {
      let o = doc.createElementNS("http://www.w3.org/1999/xhtml", "option");
      o.value = n; o.textContent = n;
      sel.appendChild(o);
    }
    sel.value = names.includes(prev) ? prev : names[0];
    try { if (rec.applyTemplateDefaults) rec.applyTemplateDefaults(); } catch (e) {}
  },

  // Inject the toolbar/banner stylesheet into the chrome window once. Colours use
  // Zotero's own CSS variables so the controls match the item pane and follow the
  // light/dark theme automatically; fallbacks keep it sane if a var is missing.
  injectToolbarCSS(win) {
    try {
      let doc = win.document;
      if (doc.getElementById("zon-toolbar-css")) return;
      let style = doc.createElementNS("http://www.w3.org/1999/xhtml", "style");
      style.id = "zon-toolbar-css";
      style.textContent =
        ".zon-toolbar{display:flex;flex-direction:column;gap:6px;padding:6px 3px 9px;}"
        + ".zon-row{display:flex;flex-wrap:wrap;gap:5px;align-items:center;}"
        + ".zon-toolbar button,.zon-toolbar select,.zon-banner button,.zon-banner select{"
        + "font:inherit;font-size:11px;line-height:1.45;padding:3px 9px;min-height:23px;"
        + "border:1px solid var(--fill-quinary,rgba(0,0,0,.16));border-radius:5px;"
        + "background:var(--material-button,var(--color-background,transparent));"
        + "color:var(--fill-primary,var(--color-text,#1a1a1a));cursor:pointer;"
        + "appearance:none;-moz-appearance:none;box-sizing:border-box;}"
        + ".zon-toolbar select,.zon-banner select{padding:3px 18px 3px 8px;cursor:default;"
        + "background-image:linear-gradient(45deg,transparent 50%,currentColor 50%),linear-gradient(135deg,currentColor 50%,transparent 50%);"
        + "background-position:calc(100% - 11px) 9px,calc(100% - 7px) 9px;background-size:4px 4px,4px 4px;background-repeat:no-repeat;}"
        + ".zon-toolbar button:hover,.zon-banner button:hover{background:var(--fill-quinary,rgba(0,0,0,.08));}"
        + ".zon-toolbar button:active,.zon-banner button:active{background:var(--fill-quarternary,rgba(0,0,0,.14));}"
        + ".zon-toolbar .zon-primary,.zon-banner .zon-primary{border-color:transparent;font-weight:600;"
        + "background:var(--color-accent,#3367d6);color:#fff;}"
        + ".zon-toolbar .zon-primary:hover,.zon-banner .zon-primary:hover{background:var(--color-accent,#3367d6);filter:brightness(1.08);}"
        + ".zon-toolbar label{display:inline-flex;align-items:center;gap:4px;font-size:11px;cursor:pointer;"
        + "color:var(--fill-secondary,#6a6a6a);}"
        + ".zon-toolbar .zon-status{font-size:11px;min-height:13px;padding-left:2px;color:var(--fill-secondary,#888);}"
        + ".zon-banner{padding:14px 4px;font-size:13px;color:var(--fill-secondary,#6a6a6a);}"
        + ".zon-banner-text{margin-bottom:6px;line-height:1.45;}"
        + ".zon-banner button,.zon-banner select{font-size:12px;padding:4px 11px;min-height:26px;}";
      (doc.head || doc.documentElement).appendChild(style);
    } catch (e) {}
  },

  buildEditorUI(wrap, win) {
    let doc = wrap.document || win.document;
    let h = (tag, cls) => {
      let el = win.document.createElementNS("http://www.w3.org/1999/xhtml", tag);
      if (cls) el.className = cls;
      return el;
    };
    wrap.textContent = "";

    this.injectToolbarCSS(win);

    let toolbar = h("div", "zon-toolbar");

    // ONE unified Template dropdown: every template (your folder files + built-in
    // formats), default note scaffold first. Insert it at the cursor OR create a
    // whole note from it — same list either way.
    let templateSel = h("select"); templateSel.title = "Template — Insert it at the cursor, or use it to create a note";
    this.orderedTemplateNames(win).forEach((f) => { let o = h("option"); o.value = f; o.textContent = f; templateSel.appendChild(o); });

    // Colour filter (orthogonal): which highlight colours to pull. "(auto)" = the
    // template's own setting, else all.
    let colourSel = h("select"); colourSel.title = "Only pull highlights of this colour";
    [["", "(auto)"], ["all", "all"], ["yellow", "yellow"], ["red", "red"], ["green", "green"],
     ["blue", "blue"], ["purple", "purple"], ["magenta", "magenta"], ["orange", "orange"], ["grey", "grey"]]
      .forEach(([v, t]) => { let o = h("option"); o.value = v; o.textContent = t; colourSel.appendChild(o); });

    let autoLabel = h("label");
    autoLabel.title = "Keep inserted annotations in sync with Zotero (regenerate on Refresh). Uncheck to freeze them.";
    let autoChk = h("input"); autoChk.type = "checkbox"; autoChk.checked = true;
    let autoSpan = h("span"); autoSpan.textContent = "auto-update";
    autoLabel.append(autoChk, autoSpan);

    let insertBtn = h("button", "zon-primary"); insertBtn.textContent = "Insert";
    insertBtn.title = "Insert the selected template at the cursor";
    let refreshBtn = h("button"); refreshBtn.textContent = "Refresh";
    refreshBtn.title = "Pull updated metadata + annotations from Zotero — keeps your own fields, prose and edits";
    let migrateBtn = h("button"); migrateBtn.textContent = "Migrate"; migrateBtn.title = "Convert a legacy annotation dump into a live block";
    let openBtn = h("button"); openBtn.textContent = "Open in Obsidian";
    let reloadBtn = h("button"); reloadBtn.textContent = "Reload"; reloadBtn.title = "Re-read this note from disk";
    let status = h("span", "zon-status");

    // Live auto-sync toggle (GLOBAL pref) — distinct from the per-block
    // "auto-update" above: this one runs Refresh's annotation pass automatically
    // whenever you highlight in the PDF, so the open note keeps up as you read.
    let syncLabel = h("label");
    syncLabel.title = "Automatically pull new highlights into this note as you annotate the PDF (applies to all notes).";
    let syncChk = h("input"); syncChk.type = "checkbox"; syncChk.checked = this.autoSyncEnabled();
    let syncSpan = h("span"); syncSpan.textContent = "Auto-sync";
    syncLabel.append(syncChk, syncSpan);
    syncChk.addEventListener("change", () => {
      try { Zotero.Prefs.set(this.PREF_AUTOSYNC, syncChk.checked, true); } catch (e) {}
      this.syncAllAutoToggles(syncChk.checked); // keep every open pane's toggle in step
    });

    // Tidy rows that wrap independently: primary action, insert options, then the
    // note-level actions.
    let row1 = h("div", "zon-row"); row1.append(templateSel, insertBtn);
    let row2 = h("div", "zon-row"); row2.append(colourSel, autoLabel);
    let row3 = h("div", "zon-row"); row3.append(refreshBtn, syncLabel, migrateBtn, openBtn, reloadBtn);
    toolbar.append(row1, row2, row3, status);

    // When the template changes, reflect its pinned defaults (colour/sync).
    let applyTemplateDefaults = () => {
      let t = this.allTemplates(win)[templateSel.value] || {};
      let d = t.defaults || {};
      colourSel.value = "";
      autoChk.checked = d.sync !== "off";
    };
    templateSel.addEventListener("change", applyTemplateDefaults);
    applyTemplateDefaults();

    let host = h("div", "zon-editor-host");
    // No CSS width: the Zotero item-details pane is laid out wider (~980px) than
    // its visible deck (~417px) and clips the overflow, so any %/-moz-available
    // width resolves to the inflated value and CodeMirror wraps off-screen.
    // fitHost() pins an explicit pixel width to the narrowest ancestor (the
    // visible container) instead, and a ResizeObserver keeps it in sync.
    // Definite height (not just max-height): CodeMirror's height:100% needs a
    // resolved parent height, else the editor grows to the full note and the
    // wheel scrolls the outer item pane instead of the note. With a definite
    // height the inner .cm-scroller (overflow:auto) scrolls internally.
    host.style.cssText = "height:60vh;min-height:320px;box-sizing:border-box;"
      + "border:1px solid var(--fill-quinary,#ddd);border-radius:5px;overflow:hidden;"
      + "background:var(--material-background,#fff);";

    let banner = h("div", "zon-banner");
    let bannerText = h("div", "zon-banner-text");
    let createRow = h("div", "zon-row");
    // Create picker = the SAME unified template list, default scaffold first.
    let noteTplSel = h("select"); noteTplSel.title = "Template to build this note from";
    let createBtn = h("button", "zon-primary"); createBtn.textContent = "Create note";
    createRow.append(noteTplSel, createBtn);
    banner.append(bannerText, createRow);

    wrap.append(toolbar, host, banner);

    let rec = { view: null, lib: null, iframe: null, frameWin: null, host, toolbar, banner, bannerText, noteTplSel, templateSel, colourSel, autoChk, autoSyncChk: syncChk, applyTemplateDefaults, statusEl: status, wrap, path: null, item: null, loading: false, timer: null };

    openBtn.addEventListener("click", () => this.openInObsidian(rec));
    insertBtn.addEventListener("click", () =>
      this.insertTemplate(rec, { name: templateSel.value, colour: colourSel.value, sync: autoChk.checked ? "on" : "off" })
        .catch((e) => this.log("insert failed: " + e)));
    refreshBtn.addEventListener("click", () => this.refreshNote(rec).catch((e) => this.log("refresh failed: " + e)));
    migrateBtn.addEventListener("click", () => this.migrateNote(rec).catch((e) => this.log("migrate failed: " + e)));
    reloadBtn.addEventListener("click", () => this.reload(rec, win));
    createBtn.addEventListener("click", () =>
      this.createNote(rec, rec.noteTplSel && rec.noteTplSel.value)
        .catch((e) => this.log("create failed: " + e)));
    return rec;
  },

  // Destroy any existing editor and mount a fresh one holding `content`.
  //
  // CodeMirror is hosted inside an <iframe> (editor-frame.html, which loads the
  // editor bundle in its own realm), NOT directly in the host div. Zotero's item
  // pane is a XUL *chrome* document whose window.getSelection() can't see the
  // caret inside a slotted contentEditable, so CM mapped every keystroke to
  // position 0 (text appeared reversed at the top of the note). A real HTML
  // document inside an iframe has a working DOM Selection, which fixes typing.
  // The view is created in the iframe's realm via that frame's ZOSEditorLib, so
  // there are no cross-realm DOM issues.
  mountEditor(rec, win, content) {
    try { if (rec.lib && rec.view) rec.lib.destroy(rec.view); } catch (e) {}
    rec.view = null; rec.lib = null;
    // Stash the desired content on the rec so a still-loading frame builds with
    // the LATEST note if the user switches items before the bundle is ready.
    rec._pendingContent = content || "";
    let self = this;

    let build = function (frameWin) {
      let lib = frameWin && frameWin.ZOSEditorLib;
      if (!lib) return;
      // Reuse: clear any prior CM DOM left in the frame body.
      try { let b = frameWin.document.body; if (b) b.textContent = ""; } catch (e) {}
      rec.frameWin = frameWin;
      rec.lib = lib;
      rec.loading = true;
      rec._lastDark = self.isDarkTheme(win, rec.host);
      rec.view = lib.create({
        parent: frameWin.document.body,
        doc: rec._pendingContent || "",
        onChange: function (text) { self.onEdit(rec, text); },
        dark: rec._lastDark,
      });
      rec.loading = false;
      // Pin the host to the visible container width, then re-measure across a few
      // frames as the item pane finishes laying out.
      let measure = function () { try { self.fitHost(rec); if (rec.lib && rec.view) rec.lib.refresh(rec.view); } catch (e) {} };
      measure();
      try { win.requestAnimationFrame(measure); } catch (e) {}
      try { win.setTimeout(measure, 60); } catch (e) {}
      try { win.setTimeout(measure, 300); } catch (e) {}
    };

    // Frame already loaded → rebuild the view in it now (item switch).
    if (rec.iframe && rec.iframe.contentWindow && rec.iframe.contentWindow.ZOSEditorLib) {
      build(rec.iframe.contentWindow);
      return;
    }
    // A frame is already mounting → its poll below will build with _pendingContent.
    if (rec.iframe) return;

    let iframe = win.document.createElementNS("http://www.w3.org/1999/xhtml", "iframe");
    iframe.className = "zon-editor-frame";
    iframe.setAttribute("style", "width:100%;height:100%;border:0;display:block;background:transparent;");
    // Use srcdoc, NOT src: when the plugin runs un-unpacked the rootURI is a
    // `jar:file://…xpi!/…` URL, and Gecko won't navigate an iframe to a jar:
    // *document* (readyState stays "uninitialized"), even though a <script src>
    // pointing at a jar: resource loads fine. So we inline the page via srcdoc
    // (it inherits our principal) and pull the editor bundle in with an ABSOLUTE
    // jar: script URL — the same URL the main window loads successfully.
    let bundleURL = this.rootURI + "content/editor.bundle.js";
    iframe.srcdoc = '<!DOCTYPE html><html><head><meta charset="utf-8">'
      + '<style>html,body{margin:0;padding:0;height:100%;background:transparent;}'
      + 'body{overflow:hidden;}.cm-editor{height:100%;}</style></head><body>'
      + '<script src="' + bundleURL + '"></scr' + 'ipt></body></html>';
    rec.iframe = iframe;
    rec.host.appendChild(iframe);
    // Poll for the bundle, RE-READING contentWindow each tick: a srcdoc load
    // swaps in a fresh content window, so a reference captured at the `load` event
    // goes stale and never sees ZOSEditorLib. Polling the live contentWindow is
    // robust to that and to the external <script> still parsing after load.
    let tries = 0;
    let waitForLib = function () {
      let fw = iframe.contentWindow;
      if (fw && fw.ZOSEditorLib) { build(fw); return; }
      if (tries++ < 250) { try { win.setTimeout(waitForLib, 20); } catch (e) {} }
      else self.log("editor frame: ZOSEditorLib never appeared");
    };
    waitForLib();
  },

  // Pin the editor host to the narrowest ancestor's width (the visible deck),
  // because intermediate Zotero panes are laid out wider than they display.
  // Observes that ancestor so the width tracks pane-splitter / window resizes.
  fitHost(rec) {
    let host = rec.host;
    if (!host || !host.isConnected) return;
    let win = host.ownerDocument.defaultView;
    // Start the search ABOVE our own elements (host + .zon-content). Including
    // the host let a transient/previously-pinned small width feed back on
    // itself and latch the editor to a few pixels wide.
    let n = host.parentNode;
    if (n && n.classList && n.classList.contains("zon-content")) n = n.parentNode;
    let min = Infinity, minEl = null;
    for (let i = 0; i < 12 && n; i++) {
      let cw = n.clientWidth || 0;
      if (cw > 100 && cw < min) { min = cw; minEl = n; }
      let p = n.parentNode;
      if (p && p.nodeType === 11) p = p.host; // cross shadow boundary
      n = p;
    }
    if (min !== Infinity) {
      host.style.width = min + "px";
      host.style.maxWidth = min + "px";
      // Pin the whole content wrap too, so the toolbar rows wrap at the visible
      // pane width instead of the inflated layout width (which left buttons in one
      // clipped row).
      try { if (rec.wrap) { rec.wrap.style.width = min + "px"; rec.wrap.style.maxWidth = min + "px"; } } catch (e) {}
    }
    if (minEl && win.ResizeObserver && rec._fitObservedEl !== minEl) {
      try { if (rec._fitRO) rec._fitRO.disconnect(); } catch (e) {}
      rec._fitRO = new win.ResizeObserver(() => {
        try { this.fitHost(rec); if (rec.lib && rec.view) rec.lib.refresh(rec.view); } catch (e) {}
      });
      try { rec._fitRO.observe(minEl); rec._fitObservedEl = minEl; } catch (e) {}
    }
  },

  onEdit(rec, text) {
    if (rec.loading || !rec.path) return;
    let win = rec.host.ownerDocument.defaultView;
    this.setStatus(rec, "Editing…");
    if (rec.timer) win.clearTimeout(rec.timer);
    rec.timer = win.setTimeout(() => { this.save(rec); }, 700);
  },

  async save(rec) {
    if (!rec.path || !rec.lib || !rec.view) return;
    let text = rec.lib.getDoc(rec.view);
    try {
      await IOUtils.writeUTF8(rec.path, text);
      this.setStatus(rec, "Saved");
      // Selectively refresh index in case this was a new/renamed link (cheap).
    } catch (e) { this.setStatus(rec, "Save failed"); this.log("save failed: " + e); }
  },

  async flush(rec) {
    if (rec && rec.timer) {
      let win = rec.host.ownerDocument.defaultView;
      win.clearTimeout(rec.timer); rec.timer = null;
      await this.save(rec);
    }
  },

  async reload(rec, win) {
    if (!rec.path) return;
    try {
      let content = await IOUtils.readUTF8(rec.path);
      this.mountEditor(rec, win, content);
      this.setStatus(rec, "Saved");
    } catch (e) { this.log("reload failed: " + e); }
  },

  openInObsidian(rec) {
    if (!rec.path) return;
    let vault = this.vaultPath();
    let vaultName = vault.split("/").filter(Boolean).pop();
    let rel = rec.path.startsWith(vault) ? rec.path.slice(vault.length).replace(/^\//, "") : rec.path;
    rel = rel.replace(/\.md$/, "");
    let url = "obsidian://open?vault=" + encodeURIComponent(vaultName)
      + "&file=" + encodeURIComponent(rel);
    try { Zotero.launchURL(url); } catch (e) { this.log("launch failed: " + e); }
  },

  setStatus(rec, text) { try { rec.statusEl.textContent = text; } catch (e) {} },

  // ---------------------------------------------------------------- create note

  // Resolve the citekey used for the filename (@<citekey>.md). Prefers Better
  // BibTeX, then a "Citation Key:" line in Extra, then firstAuthor+year.
  getCitekey(item, allowFallback = true) {
    try {
      let bbt = Zotero.BetterBibTeX;
      if (bbt && bbt.KeyManager && bbt.KeyManager.get) {
        let k = bbt.KeyManager.get(item.id);
        let ck = k && (k.citationKey || k.citekey);
        if (ck) return ck;
      }
    } catch (e) {}
    try {
      let m = (item.getField("extra") || "").match(/^\s*Citation Key\s*:\s*(\S+)/im);
      if (m) return m[1];
    } catch (e) {}
    if (!allowFallback) return null;
    try {
      let cs = item.getCreators ? item.getCreators() : [];
      let surname = (cs[0] && (cs[0].lastName || cs[0].name)) || "ref";
      let year = ((item.getField("date") || "").match(/\d{4}/) || [""])[0];
      return (surname + year).replace(/[^A-Za-z0-9]/g, "") || ("ref" + item.id);
    } catch (e) { return "ref" + item.id; }
  },

  // Render a DOCUMENT template (whole-note) for this item: fill the item-level
  // Nunjucks vars, then fill any `%% zon %%` annotation blocks with the item's
  // highlights. Returns the finished markdown.
  async renderDocument(win, item, templateText) {
    let citekey = this.getCitekey(item);
    let data = win.ZONCore.buildItemData(item, { citekey, importDate: new Date().toISOString() });
    let md = win.ZONCore.render(templateText, data);
    let anns = this.gatherAnnotations(item, win);
    try { md = win.ZONCore.syncBlocks(md, anns, { citekey, formats: this.formatMap(win) }); } catch (e) {}
    return md;
  },

  // Render template `name` as a whole note. A document template is rendered in
  // full; a per-annotation format becomes a note that's just a filled annotations
  // block (so you really can "start a note that's just a list of annotations").
  async renderTemplateAsNote(win, item, name) {
    let t = this.allTemplates(win)[name];
    if (!t) {
      let text = await IOUtils.readUTF8(await this.noteTemplatePath()).catch(() => "");
      return this.renderDocument(win, item, text);
    }
    if (t.kind === "document") return this.renderDocument(win, item, t.text);
    let citekey = this.getCitekey(item);
    let anns = this.gatherAnnotations(item, win);
    let cfg = { kind: "annotations", colour: (t.defaults && t.defaults.colour) || "all",
      sync: (t.defaults && t.defaults.sync === "off") ? "off" : "on", format: name };
    return win.ZONCore.makeBlock(cfg, anns, { citekey, formats: this.formatMap(win) }) + "\n";
  },

  // Create @<citekey>.md from the chosen template (any template — a whole-note
  // scaffold or just an annotations block), link it to this item, and open it.
  async createNote(rec, templateName) {
    let item = rec.item;
    if (!item) return;
    let win = rec.host.ownerDocument.defaultView;
    let setMsg = (m) => { try { rec.bannerText.textContent = m; } catch (e) {} };
    try {
      if (!win.ZONCore) await this.injectCore(win);
      await this.loadTemplates();
      let citekey = this.getCitekey(item);
      if (!citekey) { setMsg("Couldn't determine a citekey for this item."); return; }

      let filename = this.filenamePattern().replace(/\{\{\s*citekey\s*\}\}/g, citekey);
      if (!/\.md$/i.test(filename)) filename += ".md";
      let path = PathUtils.join(this.notesDir(), filename);
      if (!(await IOUtils.exists(path))) {
        let md = await this.renderTemplateAsNote(win, item, templateName);
        await IOUtils.makeDirectory(PathUtils.parent(path), { createAncestors: true });
        await IOUtils.writeUTF8(path, md);
        this.log("created note " + path);
      } else {
        this.log("note already exists, linking: " + path);
      }
      if (this.index) this.index.set(item.key, path);
      await this.renderInto(rec.wrap, item);
    } catch (e) {
      this.log("createNote failed: " + e);
      setMsg("Create failed: " + e);
    }
  },

  // ---------------------------------------------------------------- annotations

  // Read all annotations from the item's PDF attachments, mapped to our shape.
  gatherAnnotations(item, win) {
    let out = [];
    try {
      let ids = item.getAttachments ? item.getAttachments() : [];
      for (let id of ids) {
        let att = Zotero.Items.get(id);
        if (!att) continue;
        let isPDF = att.isPDFAttachment ? att.isPDFAttachment()
          : (att.attachmentContentType === "application/pdf");
        if (!isPDF) continue;
        let anns = att.getAnnotations ? att.getAnnotations() : [];
        for (let a of anns) out.push(win.ZONCore.mapZoteroAnnotation(a, att.key));
      }
    } catch (e) { this.log("gatherAnnotations failed: " + e); }
    return out;
  },

  // ------------------------------------------------------------ auto-sync
  // When enabled (PREF_AUTOSYNC), regenerate a note's live annotation blocks
  // automatically as you highlight in the PDF reader — no Refresh click. We
  // watch the Notifier for annotation item events, resolve the affected regular
  // item(s), debounce a burst into one pass, and re-sync only OPEN editors whose
  // item was touched (safe: only files you have open, idempotent, prose-preserving).

  registerNotifier() {
    if (!Zotero.Notifier || !Zotero.Notifier.registerObserver) {
      this.log("Notifier unavailable — auto-sync disabled"); return;
    }
    let self = this;
    let observer = {
      notify: function (event, type, ids, extraData) {
        try { self.onNotify(event, type, ids, extraData); } catch (e) { self.log("onNotify failed: " + e); }
      },
    };
    // Only annotation events matter; Zotero models annotations as `item`s.
    this._notifierID = Zotero.Notifier.registerObserver(observer, ["item"], "zotero-obsidian-notes");
  },

  onNotify(event, type, ids, extraData) {
    if (type !== "item") return;
    if (!this.autoSyncEnabled()) return;
    if (event !== "add" && event !== "modify" && event !== "delete") return;
    if (!this._autoSyncItems) this._autoSyncItems = new Set();

    if (event === "delete") {
      // The annotation is already gone, so we can't resolve its parent — fall
      // back to re-syncing every open note (idempotent; cheap, few are open).
      this._autoSyncAll = true;
    } else {
      for (let id of ids) {
        let regID = this.regularItemIdForAnnotation(id);
        if (regID != null) this._autoSyncItems.add(regID);
      }
      if (!this._autoSyncItems.size) return; // none were annotations
    }

    if (this._autoSyncTimer) { try { clearTimeout(this._autoSyncTimer); } catch (e) {} }
    let self = this;
    this._autoSyncTimer = setTimeout(function () {
      self._autoSyncTimer = null;
      self.runAutoSync().catch((e) => self.log("auto-sync failed: " + e));
    }, 700);
  },

  // Resolve an annotation item id → its top-level regular item id (or null if the
  // id isn't an annotation / has no resolvable parent chain).
  regularItemIdForAnnotation(id) {
    try {
      let it = Zotero.Items.get(id);
      if (!it || !it.isAnnotation || !it.isAnnotation()) return null;
      let att = it.parentItem; // the PDF attachment
      if (!att) return null;
      let reg = att.parentItem || att;
      return reg ? reg.id : null;
    } catch (e) { return null; }
  },

  async runAutoSync() {
    let items = this._autoSyncItems || new Set();
    let all = this._autoSyncAll;
    this._autoSyncItems = new Set();
    this._autoSyncAll = false;
    if (!this.autoSyncEnabled()) return;

    let recs = this.openRecs().filter((rec) => {
      if (!rec.item || !rec.path) return false;
      return all || items.has(rec.item.id);
    });
    for (let rec of recs) {
      try { await this.autoSyncRec(rec); } catch (e) { this.log("autoSyncRec failed: " + e); }
    }
  },

  // Like syncAnnotations but non-disruptive: persists pending edits, regenerates
  // the live blocks, and only writes + updates the open editor IN PLACE (setDoc,
  // no full remount) when the content actually changed. Skips silently otherwise.
  async autoSyncRec(rec) {
    let item = rec.item;
    if (!item || !rec.path) return;
    let win = rec.host.ownerDocument.defaultView;
    if (!win.ZONCore) await this.injectCore(win);
    await this.flush(rec);
    await this.loadTemplates();
    let existing = "";
    try { existing = await IOUtils.readUTF8(rec.path); } catch (e) { return; }
    let anns = this.gatherAnnotations(item, win);
    let updated;
    try { updated = win.ZONCore.syncBlocks(existing, anns, { citekey: this.getCitekey(item), formats: this.formatMap(win) }); }
    catch (e) { this.log("auto-sync syncBlocks failed: " + e); return; }
    if (updated === existing) return; // nothing to do — no write, no caret disruption
    try { await IOUtils.writeUTF8(rec.path, updated); } catch (e) { this.log("auto-sync write failed: " + e); return; }
    // Push the new content into the open editor. Guard with rec.loading so the
    // programmatic setDoc's onChange doesn't schedule a redundant save (which
    // would also overwrite the status below with "Saved").
    try {
      if (rec.lib && rec.view) {
        rec.loading = true;
        try { rec.lib.setDoc(rec.view, updated); } finally { rec.loading = false; }
      }
    } catch (e) {}
    this.setStatus(rec, "Auto-synced (" + anns.length + " annotation(s))");
  },

  // Reflect the global auto-sync pref onto every open pane's toggle checkbox so
  // they don't drift when you flip it in one pane (or in the preferences).
  syncAllAutoToggles(on) {
    for (let rec of this.openRecs()) {
      try { if (rec.autoSyncChk && rec.autoSyncChk.checked !== on) rec.autoSyncChk.checked = on; } catch (e) {}
    }
  },

  // Every currently-open editor rec across all main windows (light + shadow DOM).
  openRecs() {
    let out = [];
    let walk = (root) => {
      if (!root || !root.querySelectorAll) return;
      let ws;
      try { ws = root.querySelectorAll(".zon-content"); } catch (e) { return; }
      for (let w of ws) if (w._zon) out.push(w._zon);
      try { for (let el of root.querySelectorAll("*")) if (el.shadowRoot) walk(el.shadowRoot); } catch (e) {}
    };
    try { for (let win of Zotero.getMainWindows()) walk(win.document); } catch (e) {}
    return out;
  },

  // Sync: regenerate every live `%% zon … sync=on … %%` block from the item's
  // current annotations, leaving prose and frozen blocks untouched. Idempotent.
  async syncAnnotations(rec) {
    let item = rec.item;
    if (!item || !rec.path) return;
    let win = rec.host.ownerDocument.defaultView;
    if (!win.ZONCore) await this.injectCore(win);
    await this.flush(rec); // persist any pending edit before rewriting the file
    await this.loadTemplates();
    let anns = this.gatherAnnotations(item, win);
    let existing = "";
    try { existing = await IOUtils.readUTF8(rec.path); } catch (e) { return; }
    let updated = win.ZONCore.syncBlocks(existing, anns, { citekey: this.getCitekey(item), formats: this.formatMap(win) });
    if (updated !== existing) {
      try { await IOUtils.writeUTF8(rec.path, updated); } catch (e) { this.log("sync write failed: " + e); return; }
    }
    this.mountEditor(rec, win, updated);
    this.setStatus(rec, "Synced (" + anns.length + " annotation(s))");
  },

  // Refresh: pull updated Zotero info into this note WITHOUT clobbering the user's
  // work. (1) Re-render the note scaffold and merge the frontmatter — fields the
  // template fills with `{{…}}` (Title/Author/Topics…) refresh from Zotero, while
  // plain fields (KeyIdea), prose, and user-added keys/sections are preserved.
  // (2) Regenerate the live annotation blocks. Idempotent; clean YAML for Bases.
  async refreshNote(rec) {
    let item = rec.item;
    if (!item || !rec.path) return;
    let win = rec.host.ownerDocument.defaultView;
    if (!win.ZONCore) await this.injectCore(win);
    await this.flush(rec);
    await this.loadTemplates();
    let existing = "";
    try { existing = await IOUtils.readUTF8(rec.path); } catch (e) { return; }
    let merged = existing;

    let scaffold = await IOUtils.readUTF8(await this.noteTemplatePath()).catch(() => null);
    if (scaffold) {
      try {
        let citekey = this.getCitekey(item);
        let data = win.ZONCore.buildItemData(item, { citekey, importDate: new Date().toISOString() });
        let fresh = win.ZONCore.render(scaffold, data);
        merged = win.ZONCore.mergeNote(existing, fresh, {
          userOwnedKeys: this.templateUserOwnedKeys(scaffold),
          proseSections: ["notes", "annotations"], // the zon engine owns annotations
          annotationSections: [],
        });
      } catch (e) { this.log("metadata refresh failed: " + e); merged = existing; }
    }

    let anns = this.gatherAnnotations(item, win);
    try { merged = win.ZONCore.syncBlocks(merged, anns, { citekey: this.getCitekey(item), formats: this.formatMap(win) }); }
    catch (e) { this.log("annotation refresh failed: " + e); }

    if (merged !== existing) {
      try { await IOUtils.writeUTF8(rec.path, merged); } catch (e) { this.log("refresh write failed: " + e); return; }
    }
    this.mountEditor(rec, win, merged);
    this.setStatus(rec, "Refreshed metadata + " + anns.length + " annotation(s)");
  },

  // Insert template `name` at the cursor. A document template is rendered whole;
  // a per-annotation format is wrapped in a live annotations block (filtered by
  // the chosen colour). opts: { name, colour, sync }.
  async insertTemplate(rec, opts = {}) {
    let item = rec.item;
    if (!rec.view || !rec.lib) return;
    let win = rec.host.ownerDocument.defaultView;
    if (!win.ZONCore) await this.injectCore(win);
    await this.loadTemplates();
    let name = opts.name;
    let t = this.allTemplates(win)[name] || {};
    let text;
    if (t.kind === "document") {
      text = item ? await this.renderDocument(win, item, t.text) : (t.text || "");
    } else {
      let d = t.defaults || {};
      let colour = opts.colour || d.colour || "all";
      let anns = item ? this.gatherAnnotations(item, win) : [];
      let cfg = { kind: "annotations", colour, sync: opts.sync === "off" ? "off" : "on", format: name };
      text = win.ZONCore.makeBlock(cfg, anns, { citekey: item ? this.getCitekey(item) : "", formats: this.formatMap(win) });
    }
    rec.lib.insertAtCursor(rec.view, "\n" + String(text).trim() + "\n");
    // The edit fires the debounced save automatically (onEdit).
  },

  // Convert a legacy annotation dump in the current note into a live block,
  // then sync it from Zotero.
  async migrateNote(rec) {
    let item = rec.item;
    if (!item || !rec.path) return;
    let win = rec.host.ownerDocument.defaultView;
    if (!win.ZONCore) await this.injectCore(win);
    await this.flush(rec);
    let existing = "";
    try { existing = await IOUtils.readUTF8(rec.path); } catch (e) { return; }
    let res = win.ZONCore.migrateLegacyAnnotations(existing, {});
    if (!res.changed) { this.setStatus(rec, "No legacy annotations found"); return; }
    try { await IOUtils.writeUTF8(rec.path, res.markdown); } catch (e) { this.log("migrate write failed: " + e); return; }
    this.setStatus(rec, "Migrated — syncing…");
    await this.syncAnnotations(rec); // fill the new live block from Zotero
  },
};

// ---------------------------------------------------------------- bootstrap

function install() {}
function uninstall() {}

function startup({ rootURI }) {
  try {
    Zotero.initializationPromise.then(function () {
      ZON.init(rootURI).catch(function (e) { try { Zotero.debug("ZON init failed: " + e); } catch (e2) {} });
    });
  } catch (e) {}
}

function shutdown() { try { ZON.uninit(); } catch (e) {} }
function onMainWindowLoad({ window }) { ZON.addToWindow(window); }
function onMainWindowUnload() {}
