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
  pluginID: "__addonID__", // replaced at build time by scaffold (config.addonID)
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
  PREF_SHOWMARKERS: "extensions.zotero-obsidian-notes.showMarkers",
  PREF_READMODE: "extensions.zotero-obsidian-notes.readMode",
  PREF_SHOWFRONTMATTER: "extensions.zotero-obsidian-notes.showFrontmatter",
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
  DEFAULT_SHOWMARKERS: false, // editor presentation: hide %% zon/ann %% markers + zon: block by default (Obsidian-like)
  DEFAULT_READMODE: true, // reading view: render links/headings inline by default (toggle off for raw source)
  DEFAULT_SHOWFRONTMATTER: true, // show the YAML frontmatter by default (toggle off to hide it)
  _templates: null,

  // Starter templates that ship WITH the plugin. They serve two purposes:
  //  1. onboarding (and the Settings button) writes any that are missing into the
  //     user's chosen Templates folder, so they own + edit them in Obsidian;
  //  2. they're a zero-config fallback — even with no Templates folder set, "Create
  //     note" and the Insert dropdown work out of the box (see loadTemplates /
  //     resolveNoteScaffoldText). Keyed by filename stem; written as `<stem>.md`.
  // Kinds are auto-detected (templateKindOf): `note*` = whole-note scaffolds,
  // `abstract` = a field block, the rest = per-annotation block formats.
  BUILTIN_TEMPLATES: {
    "note": `---
citekey: "{{citekey}}"
Title: "{{title}}"
Year: "{{date | format("YYYY")}}"
Author:
{% for c in creators %} - "[[{{c.firstName}} {{c.lastName}}]]"
{% endfor %}
Journal: "[[J. {{publicationTitle}} ]]"
Tags:
  - Reference
  - {{itemType}}
Topics:
{% if allTags %}
{% for tag in allTags.split(", ") %}
- "[[{{tag}}]]"
{% endfor %}
{% endif %}
ZoteroLink: "{{desktopURI}}"
KeyIdea:
---

**Citation:** {{bibliography}}

**Abstract:** {%- if abstractNote %} {{abstractNote}} {% endif %}

## Notes


## Annotations
%% zon kind=annotations colour=all sync=on format=list %%
%% /zon %%
`,
    "note-minimal": `---
citekey: "{{citekey}}"
Title: "{{title}}"
Year: "{{date | format("YYYY")}}"
Author:
{% for c in creators %} - "[[{{c.firstName}} {{c.lastName}}]]"
{% endfor %}
ZoteroLink: "{{desktopURI}}"
KeyIdea:
---

## Notes


## Annotations
%% zon kind=annotations colour=all sync=on format=list %%
%% /zon %%
`,
    "abstract": `%%! kind=field sync=on %%
> [!abstract] Abstract
> {{abstractNote}}
`,
    "critique": `%%! colour=red sync=on sep=blank %%
> [!warning] p.{{page}}
> {{text}}{% if comment %}
>
> {{comment}}{% endif %}
`,
    "key-quote": `%%! colour=yellow sync=on sep=blank %%
> {{text}}
> — [p.{{page}}]({{link}})
{% if comment %}>
> {{comment}}{% endif %}
`,
    "highlight": `- [p.{{page}}]({{link}}) "{{text}}"{% if comment %} — *{{comment}}*{% endif %}
`,
    "snapshot": `%%! sync=off %%
- [p.{{page}}]({{link}}) "{{text}}"{% if comment %} — *{{comment}}*{% endif %}
`,
  },

  // A short guide written alongside the starter templates (named TEMPLATES.md so
  // loadTemplates skips it — see the readme/templates filter). Helps users who
  // browse the folder in Obsidian.
  BUILTIN_TEMPLATES_DOC: `# Zotero → Obsidian note templates

These files are used by the **Obsidian Notepad for Zotero** plugin. They were
copied here by the plugin so you can customise them — edit any file in Obsidian
and the change applies on the next *Create note* / *Insert* / *Refresh*.

Two kinds of file, distinguished only by name:

- **\`note.md\`** and any **\`note-*.md\`** — *whole-note scaffolds*, used by
  **Create note** when an item has no note yet. The default is set in
  *Settings → Obsidian Notes → Default note template* (it can be any template).
- **Every other file** (\`highlight.md\`, \`key-quote.md\`, \`abstract.md\`, …) —
  an *insertable block template*; it appears in the **Template** dropdown in the
  item pane and renders the item's annotations (or a field) into a live block.

Templates are written in **Nunjucks**. Add a file → it shows up in the dropdown;
delete one → it disappears (the plugin's built-in copy still works as a fallback).
Full reference: https://github.com/Acatechnic/obsidian-notepad-for-zotero/blob/main/docs/TEMPLATES.md
`,

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
          scripts: [this.rootURI + "content/preferences.js"],
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
        try { this.removeItemMenu(win); } catch (e) {}
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
    try { this.addItemMenu(win); } catch (e) { this.log("addItemMenu failed: " + e); }
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

  // ---------------------------------------------------------------- strings
  // All user-facing text in one place (English). Translation-ready: a future
  // locale can supply a translated map or wire t() to Fluent. (The item-pane
  // section header/sidenav must use Zotero's l10nID mechanism — see the .ftl.)
  STRINGS: {
    "btn.insert": "Insert",
    "btn.refresh": "Refresh",
    "btn.migrate": "Migrate",
    "btn.manageFields": "Manage fields",
    "btn.openObsidian": "Open in Obsidian",
    "btn.reload": "Reload",
    "btn.createNote": "Create note",
    "btn.setup": "Set up…",
    "btn.openSettings": "Open Settings",
    "btn.reloadDisk": "Reload from disk",
    "btn.overwrite": "Overwrite with mine",
    "label.autoUpdate": "auto-update",
    "label.autoSync": "Auto-sync",
    "label.showMarkers": "Show markers",
    "label.readMode": "Reading view",
    "label.frontmatter": "Frontmatter",
    "tip.template": "Template — Insert it at the cursor, or use it to create a note",
    "tip.colour": "Only pull highlights of this colour",
    "tip.autoUpdate": "Keep inserted annotations in sync with Zotero (regenerate on Refresh). Uncheck to freeze them.",
    "tip.insert": "Insert the selected template at the cursor",
    "tip.refresh": "Pull updated metadata + annotations from Zotero — keeps your own fields, prose and edits",
    "tip.migrate": "Convert a legacy annotation dump into a live block",
    "tip.manageFields": "Give this note a self-contained zon: manifest so every field your template fills (Title, Author, Topics…) keeps syncing from Zotero — independent of later template edits. Static fields stay yours.",
    "tip.reload": "Re-read this note from disk",
    "tip.autoSync": "Automatically pull new highlights into this note as you annotate the PDF (applies to all notes).",
    "tip.showMarkers": "Show the raw %% zon %% / %% ann %% provenance markers and the zon: block. Off = hidden (like Obsidian reading mode); the file always keeps them.",
    "tip.readMode": "Reading view: render links and headings inline. Off = raw markdown source. Presentational only — the file is unchanged.",
    "tip.frontmatter": "Show the YAML frontmatter block at the top of the note. Off = hide it (still saved to the file).",
    "tip.noteTpl": "Template to build this note from",
    "tip.setup": "Detect your Obsidian vaults (or choose a folder), then pick your notes folder",
    "tip.openSettings": "Configure paths manually in the Obsidian Notepad preferences",
    "banner.noNote": "No linked note found for this item yet. Create one in {dir} from your template:",
    "banner.setup": "Obsidian Notepad isn't set up yet. Point it at your Obsidian vault and the folder where your literature notes live.",
    "banner.conflict": "This note changed outside Zotero (e.g. in Obsidian). Reload to load the on-disk version, or overwrite it with what's shown here.",
    "status.saved": "Saved",
    "status.editing": "Editing…",
    "status.conflict": "Changed outside Zotero — reload or overwrite",
    "status.synced": "Synced ({count} annotation(s))",
    "status.autoSynced": "Auto-synced ({count} annotation(s))",
    "status.refreshed": "Refreshed metadata + {count} annotation(s)",
    "status.migrating": "Migrated — syncing…",
    "status.fieldsManaged": "Managing {count} field(s) — synced",
    "status.noScaffold": "No note template found — set a Templates folder in Settings",
    "status.noLegacy": "No legacy annotations found",
    "status.noPdf": "This item has no PDF attachment to read annotations from",
    "status.vaultUnset": "Set your Obsidian vault in Settings first",
    "status.notInVault": "This note isn't inside your Obsidian vault — can't open it in Obsidian",
    "err.save": "Save failed — ",
    "err.reload": "Reload failed — ",
    "err.autoSyncWrite": "Auto-sync write failed — ",
    "err.syncRead": "Sync read failed — ",
    "err.syncWrite": "Sync write failed — ",
    "err.refreshRead": "Refresh read failed — ",
    "err.refreshWrite": "Refresh write failed — ",
    "err.migrateRead": "Migrate read failed — ",
    "err.migrateWrite": "Migrate write failed — ",
    "msg.noCitekey": "Couldn't determine a citekey for this item — set one in Better BibTeX or the Extra field.",
    "msg.outsideNotes": "Refusing to create a note outside your notes folder.",
    "msg.createFailed": "Create failed: ",
    "menu.title": "Obsidian Notepad",
    "menu.createNote": "Create Obsidian note",
    "menu.createNotesN": "Create {count} Obsidian notes",
    "menu.creatingTitle": "Creating Obsidian notes…",
    "menu.createdSummary": "Notes — created {created}, already existed {existed}, skipped {skipped}, failed {failed}.",
    "menu.findDOI": "Find DOI (Crossref)",
    "menu.findDOIN": "Find DOIs for {count} items (Crossref)",
    "doi.searching": "Searching Crossref for DOIs…",
    "doi.noneMissing": "All selected items already have a DOI.",
    "doi.summary": "DOIs — found {found}, no confident match {none}, failed {failed}.",
  },

  // Look up a string by key, interpolating {name} placeholders from `args`.
  t(key, args) {
    let s = this.STRINGS[key];
    if (s == null) return key;
    if (args) for (let k in args) s = s.split("{" + k + "}").join(String(args[k]));
    return s;
  },

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

  // Resolve the TEXT of a note scaffold by name, in priority order:
  //   user Templates folder file → shipped BUILTIN_TEMPLATES → legacy templatePath.
  // Guarantees "Create note" / "Manage fields" have a real scaffold even when no
  // Templates folder is configured (fresh install). Returns "" only if nothing
  // resolves (and the named template isn't a built-in).
  async resolveNoteScaffoldText(name) {
    name = name || this.defaultNoteTemplate() || this.NOTE_SCAFFOLD_NAME;
    let dir = this.templatesDir();
    if (dir) {
      let p = PathUtils.join(dir, name + ".md");
      try { if (await IOUtils.exists(p)) return await IOUtils.readUTF8(p); } catch (e) {}
    }
    if (this.BUILTIN_TEMPLATES[name] != null) return this.BUILTIN_TEMPLATES[name];
    let legacy = this.templatePath();
    if (legacy) { try { return await IOUtils.readUTF8(legacy); } catch (e) {} }
    return "";
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
    this.addBuiltins(out);             // shipped starters (lowest priority)
    await load(this.formatsDir());     // legacy formats
    await load(this.templatesDir());   // unified folder (wins — user files override)
    this._templates = out;
    return out;
  },

  // Seed `out` with the plugin's BUILTIN_TEMPLATES, classified exactly like a
  // loaded file. User-folder files of the same name override these afterwards.
  addBuiltins(out) {
    for (let name of Object.keys(this.BUILTIN_TEMPLATES)) {
      let text = this.BUILTIN_TEMPLATES[name];
      if (this.templateKindOf(text) === "document") out[name] = { kind: "document", text };
      else out[name] = Object.assign({ kind: "format" }, this.parseTemplateText(text));
    }
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
    seed(this.PREF_SHOWMARKERS, this.DEFAULT_SHOWMARKERS);
    seed(this.PREF_READMODE, this.DEFAULT_READMODE);
    seed(this.PREF_SHOWFRONTMATTER, this.DEFAULT_SHOWFRONTMATTER);
  },

  autoSyncEnabled() {
    try { let v = Zotero.Prefs.get(this.PREF_AUTOSYNC, true); return v === undefined ? this.DEFAULT_AUTOSYNC : !!v; }
    catch (e) { return this.DEFAULT_AUTOSYNC; }
  },

  showMarkersEnabled() {
    try { let v = Zotero.Prefs.get(this.PREF_SHOWMARKERS, true); return v === undefined ? this.DEFAULT_SHOWMARKERS : !!v; }
    catch (e) { return this.DEFAULT_SHOWMARKERS; }
  },
  readModeEnabled() {
    try { let v = Zotero.Prefs.get(this.PREF_READMODE, true); return v === undefined ? this.DEFAULT_READMODE : !!v; }
    catch (e) { return this.DEFAULT_READMODE; }
  },
  showFrontmatterEnabled() {
    try { let v = Zotero.Prefs.get(this.PREF_SHOWFRONTMATTER, true); return v === undefined ? this.DEFAULT_SHOWFRONTMATTER : !!v; }
    catch (e) { return this.DEFAULT_SHOWFRONTMATTER; }
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
      // Zotero's <collapsible-section> shows its `label` ATTRIBUTE as the head
      // title. Fluent won't apply our zon-header `.label` to a plugin section
      // (the attribute isn't whitelisted), so the header was blank — set it
      // ourselves on every connected copy (idempotent). (bug 5)
      for (let cs of sections) {
        try { if (cs.getAttribute("label") !== "Obsidian Note") cs.setAttribute("label", "Obsidian Note"); } catch (e) {}
      }
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

    // Not configured yet → show the onboarding empty state instead of operating
    // against an unset notes folder. (vaultPath is only needed for "Open in
    // Obsidian"; notesDir is what every read/write/create needs.)
    if (!this.notesDir()) {
      await this.flush(rec);
      rec.item = item;
      rec.path = null;
      rec.toolbar.style.display = "none";
      rec.banner.style.display = "none";
      rec.host.style.display = "none";
      rec.setup.style.display = "";
      return;
    }
    rec.host.style.display = "";
    rec.setup.style.display = "none";

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
      // This fires on pane re-focus too, so it doubles as our external-change
      // check: if Obsidian changed the file, reload it (when we have no unsaved
      // edits) or surface the conflict bar (when we do) — never silently stale.
      if (await this.externallyChanged(rec)) {
        if (rec.timer) this.showConflict(rec); else await this.reload(rec, win);
      }
      return;
    }

    // Switching notes: flush any pending save for the note we're leaving.
    await this.flush(rec);
    rec.item = item;
    if (path) {
      let content = "";
      try { content = await IOUtils.readUTF8(path); } catch (e) { this.log("read failed: " + e); }
      rec.path = path;
      rec.diskMtime = await this.noteMtime(path); // baseline for conflict detection
      this.hideConflict(rec);
      this.mountEditor(rec, win, content);
      rec.banner.style.display = "none";
      rec.toolbar.style.display = "";
      this.setStatus(rec, this.t("status.saved"));
    } else {
      rec.path = null;
      this.hideConflict(rec);
      this.mountEditor(rec, win, "");
      rec.toolbar.style.display = "none";
      rec.banner.style.display = "";
      rec.bannerText.textContent = this.t("banner.noNote", { dir: this.notesDir() });
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
    let templateSel = h("select"); templateSel.title = this.t("tip.template");
    this.orderedTemplateNames(win).forEach((f) => { let o = h("option"); o.value = f; o.textContent = f; templateSel.appendChild(o); });

    // Colour filter (orthogonal): which highlight colours to pull. "(auto)" = the
    // template's own setting, else all.
    let colourSel = h("select"); colourSel.title = this.t("tip.colour");
    [["", "(auto)"], ["all", "all"], ["yellow", "yellow"], ["red", "red"], ["green", "green"],
     ["blue", "blue"], ["purple", "purple"], ["magenta", "magenta"], ["orange", "orange"], ["grey", "grey"]]
      .forEach(([v, t]) => { let o = h("option"); o.value = v; o.textContent = t; colourSel.appendChild(o); });

    let autoLabel = h("label");
    autoLabel.title = this.t("tip.autoUpdate");
    let autoChk = h("input"); autoChk.type = "checkbox"; autoChk.checked = true;
    let autoSpan = h("span"); autoSpan.textContent = this.t("label.autoUpdate");
    autoLabel.append(autoChk, autoSpan);

    let insertBtn = h("button", "zon-primary"); insertBtn.textContent = this.t("btn.insert");
    insertBtn.title = this.t("tip.insert");
    let refreshBtn = h("button"); refreshBtn.textContent = this.t("btn.refresh");
    refreshBtn.title = this.t("tip.refresh");
    let migrateBtn = h("button"); migrateBtn.textContent = this.t("btn.migrate"); migrateBtn.title = this.t("tip.migrate");
    let manageBtn = h("button"); manageBtn.textContent = this.t("btn.manageFields"); manageBtn.title = this.t("tip.manageFields");
    let openBtn = h("button"); openBtn.textContent = this.t("btn.openObsidian");
    let reloadBtn = h("button"); reloadBtn.textContent = this.t("btn.reload"); reloadBtn.title = this.t("tip.reload");
    let status = h("span", "zon-status");

    // Live auto-sync toggle (GLOBAL pref) — distinct from the per-block
    // "auto-update" above: this one runs Refresh's annotation pass automatically
    // whenever you highlight in the PDF, so the open note keeps up as you read.
    let syncLabel = h("label");
    syncLabel.title = this.t("tip.autoSync");
    let syncChk = h("input"); syncChk.type = "checkbox"; syncChk.checked = this.autoSyncEnabled();
    let syncSpan = h("span"); syncSpan.textContent = this.t("label.autoSync");
    syncLabel.append(syncChk, syncSpan);
    syncChk.addEventListener("change", () => {
      try { Zotero.Prefs.set(this.PREF_AUTOSYNC, syncChk.checked, true); } catch (e) {}
      this.syncAllAutoToggles(syncChk.checked); // keep every open pane's toggle in step
    });

    // "Show markers" toggle (GLOBAL pref) — reveals the raw %% zon %% / %% ann %%
    // markers + the zon: block in the editor. Off (default) hides them like
    // Obsidian reading mode. Presentational only — the file always keeps them.
    let markersLabel = h("label");
    markersLabel.title = this.t("tip.showMarkers");
    let markersChk = h("input"); markersChk.type = "checkbox"; markersChk.checked = this.showMarkersEnabled();
    let markersSpan = h("span"); markersSpan.textContent = this.t("label.showMarkers");
    markersLabel.append(markersChk, markersSpan);
    markersChk.addEventListener("change", () => {
      try { Zotero.Prefs.set(this.PREF_SHOWMARKERS, markersChk.checked, true); } catch (e) {}
      this.applyShowMarkersAll(markersChk.checked); // apply live + keep every open pane in step
    });

    // "Reading view" toggle (GLOBAL pref) — renders links/headings inline in the
    // editor (hides the markdown syntax). Off = raw source. Presentational only.
    let readLabel = h("label");
    readLabel.title = this.t("tip.readMode");
    let readChk = h("input"); readChk.type = "checkbox"; readChk.checked = this.readModeEnabled();
    let readSpan = h("span"); readSpan.textContent = this.t("label.readMode");
    readLabel.append(readChk, readSpan);
    readChk.addEventListener("change", () => {
      try { Zotero.Prefs.set(this.PREF_READMODE, readChk.checked, true); } catch (e) {}
      this.applyReadModeAll(readChk.checked);
    });

    // "Frontmatter" toggle (GLOBAL pref) — show/hide the YAML frontmatter block.
    let frontLabel = h("label");
    frontLabel.title = this.t("tip.frontmatter");
    let frontChk = h("input"); frontChk.type = "checkbox"; frontChk.checked = this.showFrontmatterEnabled();
    let frontSpan = h("span"); frontSpan.textContent = this.t("label.frontmatter");
    frontLabel.append(frontChk, frontSpan);
    frontChk.addEventListener("change", () => {
      try { Zotero.Prefs.set(this.PREF_SHOWFRONTMATTER, frontChk.checked, true); } catch (e) {}
      this.applyShowFrontmatterAll(frontChk.checked);
    });

    // Tidy rows that wrap independently: primary action, insert options, then the
    // note-level actions.
    let row1 = h("div", "zon-row"); row1.append(templateSel, insertBtn);
    let row2 = h("div", "zon-row"); row2.append(colourSel, autoLabel, markersLabel, readLabel, frontLabel);
    let row3 = h("div", "zon-row"); row3.append(refreshBtn, syncLabel, migrateBtn, manageBtn, openBtn, reloadBtn);
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
    let noteTplSel = h("select"); noteTplSel.title = this.t("tip.noteTpl");
    let createBtn = h("button", "zon-primary"); createBtn.textContent = this.t("btn.createNote");
    createRow.append(noteTplSel, createBtn);
    banner.append(bannerText, createRow);

    // First-run / not-configured empty state. Shown (instead of the editor +
    // create banner) until a notes folder is set, so the plugin guides setup
    // rather than silently failing against an unset path.
    let setup = h("div", "zon-banner");
    let setupText = h("div", "zon-banner-text");
    setupText.textContent = this.t("banner.setup");
    let setupRow = h("div", "zon-row");
    let setupBtn = h("button", "zon-primary"); setupBtn.textContent = this.t("btn.setup");
    setupBtn.title = this.t("tip.setup");
    let settingsBtn = h("button"); settingsBtn.textContent = this.t("btn.openSettings");
    settingsBtn.title = this.t("tip.openSettings");
    setupRow.append(setupBtn, settingsBtn);
    setup.append(setupText, setupRow);
    setup.style.display = "none";

    // Conflict bar: shown when the note changed on disk (e.g. edited in Obsidian)
    // since we loaded it, so we never silently clobber the user's other edits.
    let conflict = h("div", "zon-banner");
    conflict.style.cssText = "border:1px solid var(--accent-red,#c0392b);border-radius:5px;padding:8px;margin-top:6px;";
    let conflictText = h("div", "zon-banner-text");
    conflictText.textContent = this.t("banner.conflict");
    let conflictRow = h("div", "zon-row");
    let reloadDiskBtn = h("button", "zon-primary"); reloadDiskBtn.textContent = this.t("btn.reloadDisk");
    let overwriteBtn = h("button"); overwriteBtn.textContent = this.t("btn.overwrite");
    conflictRow.append(reloadDiskBtn, overwriteBtn);
    conflict.append(conflictText, conflictRow);
    conflict.style.display = "none";

    // Conflict bar goes ABOVE the editor so its Reload/Overwrite buttons are
    // always visible (the editor host is tall — 60vh — and would push them
    // off-screen if the bar were below it).
    wrap.append(toolbar, conflict, host, banner, setup);

    let rec = { view: null, lib: null, iframe: null, frameWin: null, host, toolbar, banner, bannerText, setup, conflict, noteTplSel, templateSel, colourSel, autoChk, autoSyncChk: syncChk, markersChk, readChk, frontChk, applyTemplateDefaults, statusEl: status, wrap, path: null, item: null, loading: false, timer: null, diskMtime: null };

    setupBtn.addEventListener("click", () => this.runOnboarding(rec, win).catch((e) => this.log("onboarding failed: " + e)));
    settingsBtn.addEventListener("click", () => this.openSettings(win));
    reloadDiskBtn.addEventListener("click", () => this.reload(rec, win));
    overwriteBtn.addEventListener("click", () => this.save(rec, { force: true }).catch((e) => this.log("overwrite failed: " + e)));
    openBtn.addEventListener("click", () => this.openInObsidian(rec).catch((e) => this.log("open failed: " + e)));
    insertBtn.addEventListener("click", () =>
      this.insertTemplate(rec, { name: templateSel.value, colour: colourSel.value, sync: autoChk.checked ? "on" : "off" })
        .catch((e) => this.log("insert failed: " + e)));
    refreshBtn.addEventListener("click", () => this.refreshNote(rec).catch((e) => this.log("refresh failed: " + e)));
    migrateBtn.addEventListener("click", () => this.migrateNote(rec).catch((e) => this.log("migrate failed: " + e)));
    manageBtn.addEventListener("click", () => this.manageFields(rec).catch((e) => this.log("manage-fields failed: " + e)));
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
        showMarkers: self.showMarkersEnabled(),
        readMode: self.readModeEnabled(),
        showFrontmatter: self.showFrontmatterEnabled(),
        onOpenLink: function (href) { self.openLink(win, href); },
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

  // Pin the editor host to the width Zotero gives item-pane sections (so CodeMirror
  // wraps to the visible width, not the inflated layout width), and observe a
  // pane-driven ancestor so the width tracks pane-splitter / window resizes.
  fitHost(rec) {
    let host = rec.host;
    if (!host || !host.isConnected) return;
    let win = host.ownerDocument.defaultView;
    // WIDTH = OUR OWN section's content width. Release our pins first so the section
    // un-stretches to its natural (Zotero-given) width, then read it. Two reasons
    // this beats every earlier attempt:
    //  (a) It's the SECTION width, not the pane content DECK — the deck is ~16px
    //      wider (section margin). Sections sit in a flex column that stretches every
    //      section to the widest child, so pinning to the deck made OUR section the
    //      widest and shoved ALL sections' +/collapse controls under the sidenav.
    //  (b) Our own section is laid out the instant our editor paints, so there's NO
    //      race — reading a SIBLING section instead left us pinned to the wider deck
    //      on first paint (before siblings existed) and it never corrected. Reading
    //      forces a synchronous reflow, so only the final re-pinned state paints.
    host.style.width = ""; host.style.maxWidth = "";
    try { if (rec.wrap) { rec.wrap.style.width = ""; rec.wrap.style.maxWidth = ""; } } catch (e) {}
    let ownSection = host.closest ? host.closest("collapsible-section") : null;
    let min = (ownSection && ownSection.clientWidth > 100)
      ? ownSection.clientWidth
      : Math.round(host.getBoundingClientRect().width);
    // OBSERVE TARGET = a pane-driven ancestor (the item-pane content deck): skip our
    // own wrappers (their width is driven by our host), then take the narrowest
    // remaining ancestor. It tracks the pane on resize, and our pin (= the narrower
    // section width) never exceeds it, so it can't be stretched/frozen by us.
    let isOurs = (el) => {
      if (!el) return false;
      if (el === host) return true;
      let tag = (el.nodeName || "").toLowerCase();
      if (tag === "collapsible-section" || tag === "item-pane-custom-section") return true;
      return !!(el.classList && el.classList.contains("zon-content"));
    };
    let n = host.parentNode;
    while (n && isOurs(n)) {
      let p = n.parentNode;
      if (p && p.nodeType === 11) p = p.host; // cross shadow boundary
      n = p;
    }
    // Collect EVERY pane-level ancestor up to (and including) <item-pane> as resize
    // observe targets. When the sidebar is dragged NARROWER, the INNER panes
    // (zotero-view-item, the deck) get held open by our pinned-wide content, so they
    // don't shrink and a ResizeObserver on them never fires — that was the bug
    // (expanding re-wrapped, narrowing didn't, content spilled behind the sidenav).
    // <item-pane> is bounded by the splitter and the sidenav, so it shrinks on
    // narrow regardless of our content; observing the whole chain makes the re-fit
    // fire BOTH ways.
    let observeEls = [];
    for (let i = 0; i < 12 && n; i++) {
      if ((n.clientWidth || 0) > 100) observeEls.push(n);
      let stop = (n.nodeName || "").toLowerCase() === "item-pane";
      let p = n.parentNode;
      if (p && p.nodeType === 11) p = p.host; // cross shadow boundary
      n = p;
      if (stop) break;
    }
    // Safety net: never pin wider than the room from the host's left edge to the
    // window's right edge — a hard guard against any residual inflated ancestor.
    try {
      let vis = Math.floor(win.innerWidth - host.getBoundingClientRect().left - 4);
      if (vis > 100 && vis < min) min = vis;
    } catch (e) {}
    if (min > 100) {
      host.style.width = min + "px";
      host.style.maxWidth = min + "px";
      // Pin the whole content wrap too, so the toolbar rows wrap at the visible
      // pane width instead of the inflated layout width (which left buttons in one
      // clipped row).
      try { if (rec.wrap) { rec.wrap.style.width = min + "px"; rec.wrap.style.maxWidth = min + "px"; } } catch (e) {}
    }
    // (Re)attach the observer only when the chain's anchor changes (different item /
    // re-render), NOT every fit — re-observing each fit would re-fire the observer's
    // initial callback and loop. Same anchor → keep the existing observer.
    if (win.ResizeObserver && observeEls.length && rec._fitObservedEl !== observeEls[0]) {
      try { if (rec._fitRO) rec._fitRO.disconnect(); } catch (e) {}
      rec._fitRO = new win.ResizeObserver(() => {
        try { this.fitHost(rec); if (rec.lib && rec.view) rec.lib.refresh(rec.view); } catch (e) {}
      });
      for (let el of observeEls) { try { rec._fitRO.observe(el); } catch (e) {} }
      rec._fitObservedEl = observeEls[0];
    }
  },

  onEdit(rec, text) {
    if (rec.loading || !rec.path) return;
    let win = rec.host.ownerDocument.defaultView;
    this.setStatus(rec, this.t("status.editing"));
    if (rec.timer) win.clearTimeout(rec.timer);
    rec.timer = win.setTimeout(() => { this.save(rec); }, 700);
  },

  // --- data safety: atomic writes + external-change (conflict) detection -----
  // The note file is also editable in Obsidian, so we (a) write atomically — to a
  // sibling temp file, then rename over the target — so a crash can't truncate
  // it, and (b) track its on-disk mtime so we never blindly overwrite a change
  // made outside Zotero; the user reconciles via the conflict bar instead.

  async safeWrite(path, text) {
    await IOUtils.writeUTF8(path, text, { tmpPath: path + ".zon.tmp" });
  },

  async noteMtime(path) {
    try { let s = await IOUtils.stat(path); return s.lastModified; } catch (e) { return null; }
  },

  // True if the note changed on disk since we last read/wrote it. Conservative:
  // false when we have no baseline (rec.diskMtime unset).
  async externallyChanged(rec) {
    if (!rec || !rec.path || rec.diskMtime == null) return false;
    let m = await this.noteMtime(rec.path);
    return m != null && m !== rec.diskMtime;
  },

  showConflict(rec) {
    try { if (rec.conflict) rec.conflict.style.display = ""; } catch (e) {}
    this.setStatus(rec, this.t("status.conflict"));
  },
  hideConflict(rec) { try { if (rec.conflict) rec.conflict.style.display = "none"; } catch (e) {} },

  // Editor autosave. Refuses to overwrite a note that changed on disk since we
  // last saw it (unless forced from the conflict bar's "Overwrite mine").
  async save(rec, opts = {}) {
    if (!rec.path || !rec.lib || !rec.view) return false;
    if (!opts.force && await this.externallyChanged(rec)) { this.showConflict(rec); return false; }
    let text = rec.lib.getDoc(rec.view);
    try {
      await this.safeWrite(rec.path, text);
      rec.diskMtime = await this.noteMtime(rec.path);
      this.hideConflict(rec);
      this.setStatus(rec, this.t("status.saved"));
      return true;
    } catch (e) { this.setStatus(rec, this.t("err.save") + e); this.log("save failed: " + e); return false; }
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
    if (rec.timer) { try { win.clearTimeout(rec.timer); } catch (e) {} rec.timer = null; }
    try {
      let content = await IOUtils.readUTF8(rec.path);
      this.mountEditor(rec, win, content);
      rec.diskMtime = await this.noteMtime(rec.path);
      this.hideConflict(rec);
      this.setStatus(rec, this.t("status.saved"));
    } catch (e) { this.setStatus(rec, this.t("err.reload") + e); this.log("reload failed: " + e); }
  },

  // Open the current note in Obsidian. Cross-platform: path math is done with the
  // separator-agnostic helpers in ZONCore (src/paths.js), and the obsidian:// file
  // arg is always forward-slash. Requires the note to live inside the vault.
  async openInObsidian(rec) {
    if (!rec.path) return;
    let vault = this.vaultPath();
    if (!vault) { this.setStatus(rec, this.t("status.vaultUnset")); return; }
    let win = rec.host.ownerDocument.defaultView;
    if (!win.ZONCore) { try { await this.injectCore(win); } catch (e) {} }
    let C = win.ZONCore;
    let rel = C && C.vaultRelative ? C.vaultRelative(rec.path, vault) : null;
    if (!rel) {
      this.setStatus(rec, this.t("status.notInVault"));
      return;
    }
    let url = C.buildObsidianUri(C.vaultName(vault), rel);
    try { Zotero.launchURL(url); } catch (e) { this.log("launch failed: " + e); }
  },

  setStatus(rec, text) { try { rec.statusEl.textContent = text; } catch (e) {} },

  // ---------------------------------------------------------------- onboarding

  osKey() { return Zotero.isMac ? "mac" : (Zotero.isWin ? "win" : "linux"); },

  // Environment strings used to locate per-OS config dirs. Defensive about which
  // env API exists (Services.env is Gecko 110+, else the XPCOM service).
  osEnv() {
    let env;
    try { env = Services.env; } catch (e) {}
    if (!env) {
      try {
        env = Components.classes["@mozilla.org/process/environment;1"]
          .getService(Components.interfaces.nsIEnvironment);
      } catch (e) {}
    }
    let get = (k) => { try { return env && env.exists(k) ? env.get(k) : ""; } catch (e) { return ""; } };
    return {
      home: get("HOME") || get("USERPROFILE"),
      appData: get("APPDATA"),
      xdgConfigHome: get("XDG_CONFIG_HOME"),
    };
  },

  // Read Obsidian's obsidian.json → its known vaults [{path, name, open}].
  async detectObsidianVaults(win) {
    win = win || Zotero.getMainWindows()[0];
    if (win && !win.ZONCore) { try { await this.injectCore(win); } catch (e) {} }
    let C = win && win.ZONCore;
    if (!C || !C.obsidianConfigPath) return [];
    let cfg = C.obsidianConfigPath(this.osKey(), this.osEnv());
    let text = "";
    try { text = await IOUtils.readUTF8(cfg); } catch (e) { return []; }
    try { return C.parseObsidianVaults(text); } catch (e) { return []; }
  },

  // Native folder picker → absolute path, or null if cancelled/unavailable.
  async pickFolder(win, title, defaultPath) {
    try {
      let fp = Components.classes["@mozilla.org/filepicker;1"]
        .createInstance(Components.interfaces.nsIFilePicker);
      fp.init(win.browsingContext || win, title || "Choose a folder", fp.modeGetFolder);
      if (defaultPath) {
        try {
          let dir = Components.classes["@mozilla.org/file/local;1"]
            .createInstance(Components.interfaces.nsIFile);
          dir.initWithPath(defaultPath);
          if (dir.exists()) fp.displayDirectory = dir;
        } catch (e) {}
      }
      return await new Promise((resolve) => {
        fp.open((rv) => {
          try {
            if (rv === Components.interfaces.nsIFilePicker.returnOK && fp.file) resolve(fp.file.path);
            else resolve(null);
          } catch (e) { resolve(null); }
        });
      });
    } catch (e) { this.log("pickFolder failed: " + e); return null; }
  },

  // Present detected vaults; returns a path, "" to browse instead, or null to cancel.
  chooseVault(win, vaults) {
    try {
      let items = vaults.map((v) => v.name + "  —  " + v.path);
      items.push("Choose another folder…");
      let sel = { value: 0 };
      let ok = Services.prompt.select(win, "Obsidian vaults",
        "Which Obsidian vault holds your notes?", items, sel);
      if (!ok) return null;
      return sel.value >= vaults.length ? "" : vaults[sel.value].path;
    } catch (e) { this.log("chooseVault failed: " + e); return ""; }
  },

  // First-run flow: pick vault (detected or browsed) → pick notes folder →
  // set up note templates → persist → reindex → re-render the pane.
  async runOnboarding(rec, win) {
    win = win || rec.host.ownerDocument.defaultView;
    let vault = "";
    let vaults = await this.detectObsidianVaults(win);
    if (vaults.length) {
      let chosen = this.chooseVault(win, vaults);
      if (chosen === null) return; // cancelled
      vault = chosen;
    }
    if (!vault) {
      vault = await this.pickFolder(win, "Choose your Obsidian vault folder");
      if (!vault) return;
    }
    let notes = await this.pickFolder(win, "Choose the folder for your literature notes", vault);
    if (!notes) notes = vault;
    Zotero.Prefs.set(this.PREF_VAULT, vault, true);
    Zotero.Prefs.set(this.PREF_NOTES, notes, true);
    await this.setupTemplatesFolder(win, notes || vault);
    await this.buildIndex();
    if (rec.item) await this.renderInto(rec.wrap, rec.item);
  },

  // Onboarding template step: offer to copy the shipped starter templates into a
  // folder the user owns (and customises in Obsidian), then point the plugin at
  // it. Skipping is safe — the built-ins still work as a fallback. Idempotent.
  async setupTemplatesFolder(win, defaultPath) {
    try {
      let P = Services.prompt;
      let flags = P.BUTTON_TITLE_IS_STRING * P.BUTTON_POS_0
                + P.BUTTON_TITLE_IS_STRING * P.BUTTON_POS_1;
      // confirmEx returns the index of the pressed button (0 = Choose, 1 = Skip).
      let btn = P.confirmEx(win, "Note templates",
        "Set up note templates?\n\n"
        + "The plugin can copy starter templates — a default note layout plus "
        + "highlight / quote / abstract blocks — into a folder in your vault, so "
        + "you can edit them in Obsidian.\n\n"
        + "You can skip this and set it up later in Settings → Obsidian Notes.",
        flags, "Choose folder…", "Skip", null, null, {});
      if (btn !== 0) return;
      let tdir = await this.pickFolder(win, "Choose or create a folder for your note templates", defaultPath);
      if (!tdir) return;
      let n = await this.installBuiltinTemplates(tdir);
      Zotero.Prefs.set(this.PREF_TEMPLATES_DIR, tdir, true);
      await this.loadTemplates();
      try {
        P.alert(win, "Note templates", n > 0
          ? ("Added " + n + " template file(s) to:\n" + tdir)
          : ("Templates folder set to:\n" + tdir + "\n(existing files kept)"));
      } catch (e) {}
    } catch (e) { this.log("setupTemplatesFolder failed: " + e); }
  },

  // Write any missing starter templates (+ a short TEMPLATES.md guide) into `dir`.
  // NEVER overwrites an existing file — idempotent, and preserves user edits on
  // re-run. Returns the count of files actually written.
  async installBuiltinTemplates(dir) {
    if (!dir) return 0;
    let written = 0;
    try { await IOUtils.makeDirectory(dir, { createAncestors: true }); } catch (e) {}
    let writeIfAbsent = async (filename, text) => {
      let p = PathUtils.join(dir, filename);
      try { if (await IOUtils.exists(p)) return; } catch (e) {}
      try { await this.safeWrite(p, text); written++; }
      catch (e) { this.log("install template failed (" + filename + "): " + e); }
    };
    for (let name of Object.keys(this.BUILTIN_TEMPLATES)) {
      await writeIfAbsent(name + ".md", this.BUILTIN_TEMPLATES[name]);
    }
    await writeIfAbsent("TEMPLATES.md", this.BUILTIN_TEMPLATES_DOC);
    return written;
  },

  // Open the plugin's preferences pane (best effort across Zotero builds).
  openSettings(win) {
    try {
      let I = Zotero.Utilities && Zotero.Utilities.Internal;
      if (I && I.openPreferences) { I.openPreferences(this.pluginID); return; }
    } catch (e) {}
    this.log("openPreferences unavailable — use Zotero Settings → Obsidian Notepad");
  },

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
  // A formatted reference for the note's {{bibliography}}. Uses the user's
  // QuickCopy citation style if it's set to a bibliography; otherwise falls back
  // to APA. Returns "" (not an error) if Zotero can't produce one.
  async getBibliography(item) {
    try {
      let setting = Zotero.Prefs.get("export.quickCopy.setting");
      let format = setting ? Zotero.QuickCopy.unserializeSetting(setting) : null;
      if (!format || format.mode !== "bibliography") {
        format = { mode: "bibliography", contentType: "text", id: "http://www.zotero.org/styles/apa" };
      }
      let res = await Zotero.QuickCopy.getContentFromItems([item], format);
      return ((res && res.text) || "").trim();
    } catch (e) { this.log("bibliography failed: " + e); return ""; }
  },

  // The opts every syncBlocks / makeBlock call needs: the citekey, the format map,
  // AND the item's data context — so kind=field/section/custom blocks render and
  // refresh from Zotero just like annotation blocks do. `bibliography` is optional:
  // pass it where it has already been computed; the realtime auto-sync path omits
  // it (QuickCopy is comparatively costly and field elements rarely use it).
  syncOpts(win, item, extra = {}) {
    let citekey = item ? this.getCitekey(item) : "";
    let itemData = {};
    if (item && win.ZONCore) {
      try {
        itemData = win.ZONCore.buildItemData(item, {
          citekey,
          bibliography: extra.bibliography || "",
          importDate: new Date().toISOString(),
        });
      } catch (e) { this.log("buildItemData failed: " + e); }
    }
    return { citekey, formats: this.formatMap(win), itemData };
  },

  async renderDocument(win, item, templateText) {
    let citekey = this.getCitekey(item);
    let bibliography = await this.getBibliography(item);
    let data = win.ZONCore.buildItemData(item, { citekey, bibliography, importDate: new Date().toISOString() });
    let md = win.ZONCore.render(templateText, data);
    let anns = this.gatherAnnotations(item, win);
    try { md = win.ZONCore.syncBlocks(md, anns, { citekey, formats: this.formatMap(win), itemData: data }); } catch (e) {}
    return md;
  },

  // Render template `name` as a whole note. A document template is rendered in
  // full; a per-annotation format becomes a note that's just a filled annotations
  // block (so you really can "start a note that's just a list of annotations").
  async renderTemplateAsNote(win, item, name) {
    let t = this.allTemplates(win)[name];
    if (!t) {
      let text = await this.resolveNoteScaffoldText(name);
      return this.renderDocument(win, item, text);
    }
    if (t.kind === "document") return this.renderDocument(win, item, t.text);
    let anns = this.gatherAnnotations(item, win);
    let bibliography = await this.getBibliography(item);
    let blockOpts = this.syncOpts(win, item, { bibliography });
    let cfg = this.blockConfigFor(t, name, {});
    return win.ZONCore.makeBlock(cfg, anns, blockOpts) + "\n";
  },

  // Build a `%% zon %%` block config for inserting/creating from template `t`
  // (named `name`). A template declares its element kind via its `%%! kind=… %%`
  // directive (defaults.kind): "field"/"section"/"custom" render the named body
  // once over the item's data; anything else (incl. the default) is an annotations
  // block filtered by colour. `over` may override colour/sync at insert time.
  blockConfigFor(t, name, over = {}) {
    let d = (t && t.defaults) || {};
    let kind = d.kind && d.kind !== "annotations" ? d.kind : "annotations";
    let sync = over.sync != null
      ? (over.sync === "off" ? "off" : "on")
      : (d.sync === "off" ? "off" : "on");
    if (kind !== "annotations") return { kind, sync, format: name };
    let colour = over.colour || d.colour || "all";
    return { kind: "annotations", colour, sync, format: name };
  },

  // Write @<citekey>.md for `item` from `templateName` (or the default note
  // scaffold), inject a durable ZoteroLink, and index it — IF it doesn't already
  // exist. Free of any item-pane `rec`, so the single-item button (createNote) and
  // the bulk context-menu (bulkCreateNotes) share exactly one creation path.
  // Returns { status, path?, error? } where status is one of:
  //   "created" | "exists" | "no-citekey" | "outside" | "no-item" | "error".
  async writeNoteForItem(win, item, templateName) {
    if (!item) return { status: "no-item" };
    try {
      if (!win.ZONCore) await this.injectCore(win);
      await this.loadTemplates();
      let citekey = this.getCitekey(item);
      if (!citekey) return { status: "no-citekey" };
      // Sanitise the citekey (it can come from Better BibTeX / the Extra field)
      // before it becomes a filename — strip separators / illegal chars.
      citekey = win.ZONCore.sanitizeFilename(citekey);

      let filename = this.filenamePattern().replace(/\{\{\s*citekey\s*\}\}/g, citekey);
      if (!/\.md$/i.test(filename)) filename += ".md";
      filename = win.ZONCore.sanitizeFilename(filename); // the pattern itself may add junk
      let dir = this.notesDir();
      let path = PathUtils.join(dir, filename);
      // Defence-in-depth: never write outside the configured notes folder.
      if (!win.ZONCore.isUnder(path, dir)) return { status: "outside", path };
      if (!(await IOUtils.exists(path))) {
        let md = await this.renderTemplateAsNote(win, item, templateName);
        // Guarantee a durable item-key link so the note resolves even if the
        // citekey/filename later changes (no-op if the template already has one).
        try { md = win.ZONCore.ensureZoteroLink(md, win.ZONCore.zoteroSelectURI(item)); } catch (e) {}
        await IOUtils.makeDirectory(PathUtils.parent(path), { createAncestors: true });
        await this.safeWrite(path, md);
        this.log("created note " + path);
        if (this.index) this.index.set(item.key, path);
        return { status: "created", path };
      }
      this.log("note already exists, linking: " + path);
      if (this.index) this.index.set(item.key, path);
      return { status: "exists", path };
    } catch (e) {
      this.log("writeNoteForItem failed: " + e);
      return { status: "error", error: String(e) };
    }
  },

  // Create @<citekey>.md from the chosen template (any template — a whole-note
  // scaffold or just an annotations block), link it to this item, and open it.
  async createNote(rec, templateName) {
    let item = rec.item;
    if (!item) return;
    let win = rec.host.ownerDocument.defaultView;
    let setMsg = (m) => { try { rec.bannerText.textContent = m; } catch (e) {} };
    let r = await this.writeNoteForItem(win, item, templateName);
    if (r.status === "no-citekey") { setMsg(this.t("msg.noCitekey")); return; }
    if (r.status === "outside") { setMsg(this.t("msg.outsideNotes")); return; }
    if (r.status === "error") { setMsg(this.t("msg.createFailed") + r.error); return; }
    try { await this.renderInto(rec.wrap, item); } catch (e) {}
  },

  // ---------------------------------------------------------- item context menu

  // Zotero's center-pane item-list context menu. The id has shifted across
  // versions, so try the known ones and use whichever the window actually has.
  ITEM_MENU_IDS: ["zotero-itemmenu", "zotero-items-tree-context-menu"],

  itemMenuPopup(win) {
    for (let id of this.ITEM_MENU_IDS) {
      let el = win.document.getElementById(id);
      if (el) return el;
    }
    return null;
  },

  // The regular (non-attachment, non-note) items currently selected in the list.
  selectedRegularItems(win) {
    try {
      let zp = win.ZoteroPane;
      let items = (zp && zp.getSelectedItems && zp.getSelectedItems()) || [];
      return items.filter((it) => it && it.isRegularItem && it.isRegularItem());
    } catch (e) { return []; }
  },

  // "has" = already carries a DOI (field or an Extra "DOI:" line); "unsupported" =
  // the item type has no DOI field; otherwise "missing" (a candidate for lookup).
  itemDoiState(item) {
    try {
      if ((item.getField("DOI") || "").trim()) return "has";
      if (/^\s*DOI\s*:/im.test(item.getField("extra") || "")) return "has";
      let ok = false;
      try { ok = Zotero.ItemFields.isValidForType(Zotero.ItemFields.getID("DOI"), item.itemTypeID); } catch (e) {}
      return ok ? "missing" : "unsupported";
    } catch (e) { return "unsupported"; }
  },

  // Add our two actions to the item-list context menu (idempotent per window).
  addItemMenu(win) {
    try {
      let popup = this.itemMenuPopup(win);
      if (!popup || win._zonItemMenu) return;
      let doc = win.document;
      let mk = (id, handler) => {
        let mi = doc.createXULElement("menuitem");
        mi.id = id;
        mi.classList.add("zon-itemmenu");
        mi.addEventListener("command", handler);
        return mi;
      };
      let sep = doc.createXULElement("menuseparator");
      sep.id = "zon-itemmenu-sep";
      sep.classList.add("zon-itemmenu");
      let miNote = mk("zon-itemmenu-create", () => this.bulkCreateNotes(win));
      let miDOI = mk("zon-itemmenu-doi", () => this.findDOIsForItems(win));
      popup.appendChild(sep);
      popup.appendChild(miNote);
      popup.appendChild(miDOI);
      let onShow = () => this.updateItemMenu(win, { sep, miNote, miDOI });
      popup.addEventListener("popupshowing", onShow);
      win._zonItemMenu = { popup, items: [sep, miNote, miDOI], onShow };
    } catch (e) { this.log("addItemMenu failed: " + e); }
  },

  // Show/label our menu items based on the live selection (runs on popupshowing).
  updateItemMenu(win, els) {
    try {
      let items = this.selectedRegularItems(win);
      let n = items.length;
      let show = n > 0;
      els.sep.hidden = !show;
      els.miNote.hidden = !show;
      els.miDOI.hidden = !show;
      if (!show) return;
      els.miNote.setAttribute("label",
        n === 1 ? this.t("menu.createNote") : this.t("menu.createNotesN", { count: n }));
      let missing = items.filter((it) => this.itemDoiState(it) === "missing").length;
      els.miDOI.hidden = missing === 0;
      els.miDOI.setAttribute("label",
        missing === 1 ? this.t("menu.findDOI") : this.t("menu.findDOIN", { count: missing }));
    } catch (e) {}
  },

  removeItemMenu(win) {
    try {
      let m = win._zonItemMenu;
      if (!m) return;
      try { m.popup.removeEventListener("popupshowing", m.onShow); } catch (e) {}
      for (let el of m.items) { try { el.remove(); } catch (e) {} }
      win._zonItemMenu = null;
    } catch (e) {}
  },

  // -------------------------------------------------------- bulk note creation

  async bulkCreateNotes(win) {
    let items = this.selectedRegularItems(win);
    if (!items.length) return;
    if (!this.notesDir()) { this.popup(win, this.t("menu.title"), this.t("status.vaultUnset")); return; }
    let pw = this.progress(win, this.t("menu.creatingTitle"));
    let created = 0, existed = 0, skipped = 0, failed = 0;
    for (let item of items) {
      let r = await this.writeNoteForItem(win, item, null);
      if (r.status === "created") created++;
      else if (r.status === "exists") existed++;
      else if (r.status === "no-citekey") skipped++;
      else failed++;
    }
    // The open item-pane editor (if it's showing one of these items) still shows
    // the "no note yet" banner — re-render any live editors so it picks up the file.
    try { for (let w of Zotero.getMainWindows()) this.rerenderOpenEditors(w); } catch (e) {}
    this.finishProgress(pw, this.t("menu.createdSummary", { created, existed, skipped, failed }));
  },

  // Re-render every live editor wrap in a window against its current item, so a
  // just-created note replaces the empty-state banner without a reselection.
  rerenderOpenEditors(win) {
    let walk = (root) => {
      if (!root || !root.querySelectorAll) return;
      let ws;
      try { ws = root.querySelectorAll(".zon-content"); } catch (e) { return; }
      for (let w of ws) {
        let rec = w._zon;
        if (rec && rec.item) { try { this.renderInto(w, rec.item); } catch (e) {} }
      }
      try { for (let el of root.querySelectorAll("*")) if (el.shadowRoot) walk(el.shadowRoot); } catch (e) {}
    };
    walk(win.document);
  },

  // ----------------------------------------------------------- Crossref DOI lookup

  async findDOIsForItems(win) {
    let items = this.selectedRegularItems(win).filter((it) => this.itemDoiState(it) === "missing");
    if (!items.length) { this.popup(win, this.t("menu.title"), this.t("doi.noneMissing")); return; }
    let pw = this.progress(win, this.t("doi.searching"));
    let found = 0, none = 0, failed = 0;
    for (let item of items) {
      try {
        let r = await this.findDOIForItem(win, item);
        if (r === "found") found++; else none++;
      } catch (e) { this.log("findDOIForItem failed: " + e); failed++; }
      // Be polite to the public Crossref pool between requests.
      try { await new Promise((res) => win.setTimeout(res, 200)); } catch (e) {}
    }
    this.finishProgress(pw, this.t("doi.summary", { found, none, failed }));
  },

  // Look up ONE item's DOI on Crossref and write it back if a confident match is
  // found. Returns "found" | "none". Never overwrites an existing DOI (the caller
  // pre-filters to itemDoiState === "missing"); a weak title match writes nothing.
  async findDOIForItem(win, item) {
    if (!win.ZONCore) await this.injectCore(win);
    let title = (item.getField("title") || "").trim();
    if (!title) return "none";
    let creators = item.getCreators ? item.getCreators() : [];
    let author = (creators[0] && (creators[0].lastName || creators[0].name)) || "";
    let year = win.ZONCore.extractYear(item.getField("date") || "");
    let url = win.ZONCore.buildCrossrefURL({ title, author, year });
    let resp = await Zotero.HTTP.request("GET", url, {
      responseType: "text",
      timeout: 15000,
      headers: { "Accept": "application/json" },
    });
    let json;
    try { json = JSON.parse(resp.responseText || resp.response || "{}"); } catch (e) { return "none"; }
    let match = win.ZONCore.pickBestMatch(json, { title, author, year });
    if (!match || !match.doi) return "none";
    item.setField("DOI", match.doi);
    await item.saveTx();
    this.log("DOI set on " + item.key + ": " + match.doi);
    return "found";
  },

  // ------------------------------------------------------------ progress popups

  progress(win, headline) {
    try {
      let pw = new Zotero.ProgressWindow({ window: win });
      pw.changeHeadline(headline);
      pw.show();
      return pw;
    } catch (e) { this.log("progress window failed: " + e); return null; }
  },
  finishProgress(pw, text) {
    try {
      if (!pw) return;
      pw.addDescription(text);
      pw.startCloseTimer(7000);
    } catch (e) {}
  },
  popup(win, headline, text) { this.finishProgress(this.progress(win, headline), text); },

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

  // Does the item have a PDF attachment at all? Lets us tell "no annotations yet"
  // apart from "nothing to read annotations from".
  hasPdfAttachment(item) {
    try {
      for (let id of (item.getAttachments ? item.getAttachments() : [])) {
        let att = Zotero.Items.get(id);
        if (att && (att.isPDFAttachment ? att.isPDFAttachment() : att.attachmentContentType === "application/pdf")) return true;
      }
    } catch (e) {}
    return false;
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
    // Genuine conflict only — unsaved editor edits AND an external change. The
    // sync itself reads fresh from disk and merges, so an external edit with no
    // pending editor edit is preserved automatically (no need to block).
    if (rec.timer && await this.externallyChanged(rec)) { this.showConflict(rec); return; }
    await this.flush(rec);
    await this.loadTemplates();
    let existing = "";
    try { existing = await IOUtils.readUTF8(rec.path); } catch (e) { return; }
    let anns = this.gatherAnnotations(item, win);
    let updated;
    try { updated = win.ZONCore.syncBlocks(existing, anns, this.syncOpts(win, item)); }
    catch (e) { this.log("auto-sync syncBlocks failed: " + e); return; }
    if (updated === existing) return; // nothing to do — no write, no caret disruption
    try { await this.safeWrite(rec.path, updated); rec.diskMtime = await this.noteMtime(rec.path); }
    catch (e) { this.setStatus(rec, this.t("err.autoSyncWrite") + e); this.log("auto-sync write failed: " + e); return; }
    // Push the new content into the open editor. Guard with rec.loading so the
    // programmatic setDoc's onChange doesn't schedule a redundant save (which
    // would also overwrite the status below with "Saved").
    try {
      if (rec.lib && rec.view) {
        rec.loading = true;
        try { rec.lib.setDoc(rec.view, updated); } finally { rec.loading = false; }
      }
    } catch (e) {}
    this.setStatus(rec, this.t("status.autoSynced", { count: anns.length }));
  },

  // Reflect the global auto-sync pref onto every open pane's toggle checkbox so
  // they don't drift when you flip it in one pane (or in the preferences).
  syncAllAutoToggles(on) {
    for (let rec of this.openRecs()) {
      try { if (rec.autoSyncChk && rec.autoSyncChk.checked !== on) rec.autoSyncChk.checked = on; } catch (e) {}
    }
  },

  // Apply the "Show markers" state to every open editor (reveal/hide live) and
  // keep each pane's checkbox in step.
  applyShowMarkersAll(show) {
    for (let rec of this.openRecs()) {
      try { if (rec.markersChk && rec.markersChk.checked !== show) rec.markersChk.checked = show; } catch (e) {}
      try { if (rec.lib && rec.view && rec.lib.setShowMarkers) rec.lib.setShowMarkers(rec.view, show); } catch (e) {}
    }
  },

  // Apply the "Reading view" state to every open editor + keep checkboxes in step.
  applyReadModeAll(on) {
    for (let rec of this.openRecs()) {
      try { if (rec.readChk && rec.readChk.checked !== on) rec.readChk.checked = on; } catch (e) {}
      try { if (rec.lib && rec.view && rec.lib.setReadMode) rec.lib.setReadMode(rec.view, on); } catch (e) {}
    }
  },

  // Apply the "Frontmatter" (show/hide) state to every open editor + checkboxes.
  applyShowFrontmatterAll(show) {
    for (let rec of this.openRecs()) {
      try { if (rec.frontChk && rec.frontChk.checked !== show) rec.frontChk.checked = show; } catch (e) {}
      try { if (rec.lib && rec.view && rec.lib.setShowFrontmatter) rec.lib.setShowFrontmatter(rec.view, show); } catch (e) {}
    }
  },

  // Open a link clicked in the editor's reading view. zotero:// links navigate
  // inside Zotero (select an item / open a PDF at an annotation); everything else
  // (https, doi, obsidian) goes to the OS default handler.
  openLink(win, url) {
    try {
      if (/^zotero:/i.test(url)) {
        let zp = (Zotero.getActiveZoteroPane && Zotero.getActiveZoteroPane())
          || (win && win.ZoteroPane) || null;
        if (zp && zp.loadURI) { zp.loadURI(url); return; }
      }
      Zotero.launchURL(url);
    } catch (e) { this.log("openLink failed: " + e); }
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
    if (rec.timer && await this.externallyChanged(rec)) { this.showConflict(rec); return; }
    await this.flush(rec); // persist any pending edit before rewriting the file
    await this.loadTemplates();
    let anns = this.gatherAnnotations(item, win);
    if (!anns.length && !this.hasPdfAttachment(item)) { this.setStatus(rec, this.t("status.noPdf")); return; }
    let existing = "";
    try { existing = await IOUtils.readUTF8(rec.path); } catch (e) { this.setStatus(rec, this.t("err.syncRead") + e); return; }
    let updated = win.ZONCore.syncBlocks(existing, anns, this.syncOpts(win, item));
    if (updated !== existing) {
      try { await this.safeWrite(rec.path, updated); } catch (e) { this.setStatus(rec, this.t("err.syncWrite") + e); this.log("sync write failed: " + e); return; }
    }
    rec.diskMtime = await this.noteMtime(rec.path);
    this.hideConflict(rec);
    this.mountEditor(rec, win, updated);
    this.setStatus(rec, this.t("status.synced", { count: anns.length }));
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
    if (rec.timer && await this.externallyChanged(rec)) { this.showConflict(rec); return; }
    await this.flush(rec);
    await this.loadTemplates();
    let existing = "";
    try { existing = await IOUtils.readUTF8(rec.path); } catch (e) { this.setStatus(rec, this.t("err.refreshRead") + e); return; }
    let merged = existing;

    // Build the item's data context ONCE (with bibliography) — reused by the
    // frontmatter refresh below AND the live block sync, so kind=field/section
    // blocks refresh from the same data and we only call QuickCopy once.
    let citekey = this.getCitekey(item);
    let bibliography = await this.getBibliography(item);
    let data = {};
    try { data = win.ZONCore.buildItemData(item, { citekey, bibliography, importDate: new Date().toISOString() }); }
    catch (e) { this.log("buildItemData failed: " + e); }

    if (win.ZONCore.hasManifest(existing)) {
      // Self-contained path: this note carries its own `zon:` manifest, so refresh
      // its managed frontmatter fields from the expressions stored IN the note —
      // editing the scaffold later never retroactively changes it. Unmanaged keys,
      // prose, and the body are untouched.
      try {
        merged = win.ZONCore.applyManifest(existing, data);
      } catch (e) { this.log("manifest refresh failed: " + e); merged = existing; }
    } else {
      let scaffold = await this.resolveNoteScaffoldText();
      if (scaffold) {
        try {
          let fresh = win.ZONCore.render(scaffold, data);
          merged = win.ZONCore.mergeNote(existing, fresh, {
            userOwnedKeys: this.templateUserOwnedKeys(scaffold),
            proseSections: ["notes", "annotations"], // the zon engine owns annotations
            annotationSections: [],
          });
        } catch (e) { this.log("metadata refresh failed: " + e); merged = existing; }
      }
    }

    let anns = this.gatherAnnotations(item, win);
    try { merged = win.ZONCore.syncBlocks(merged, anns, { citekey, formats: this.formatMap(win), itemData: data }); }
    catch (e) { this.log("annotation refresh failed: " + e); }

    if (merged !== existing) {
      try { await this.safeWrite(rec.path, merged); } catch (e) { this.setStatus(rec, this.t("err.refreshWrite") + e); this.log("refresh write failed: " + e); return; }
    }
    rec.diskMtime = await this.noteMtime(rec.path);
    this.hideConflict(rec);
    this.mountEditor(rec, win, merged);
    this.setStatus(rec, this.t("status.refreshed", { count: anns.length }));
  },

  // Manage fields (opt-in): give this note a self-contained `zon:` frontmatter
  // manifest built from the active note scaffold, so every field the scaffold
  // templates (Title/Author/Topics/… — whatever YOU named and formatted) syncs
  // from Zotero from now on, independent of any later scaffold edits. Then refresh
  // those fields once. Static/empty fields stay user-owned. Idempotent to re-run.
  async manageFields(rec) {
    let item = rec.item;
    if (!item || !rec.path) return;
    let win = rec.host.ownerDocument.defaultView;
    if (!win.ZONCore) await this.injectCore(win);
    if (rec.timer && await this.externallyChanged(rec)) { this.showConflict(rec); return; }
    await this.flush(rec);
    await this.loadTemplates();
    let scaffold = await this.resolveNoteScaffoldText();
    if (!scaffold) { this.setStatus(rec, this.t("status.noScaffold")); return; }
    let existing = "";
    try { existing = await IOUtils.readUTF8(rec.path); } catch (e) { this.setStatus(rec, this.t("err.refreshRead") + e); return; }
    let map = win.ZONCore.buildManifestFromScaffold(scaffold);
    let withManifest = win.ZONCore.writeManifest(existing, map);
    let updated = withManifest;
    try {
      let citekey = this.getCitekey(item);
      let bibliography = await this.getBibliography(item);
      let data = win.ZONCore.buildItemData(item, { citekey, bibliography, importDate: new Date().toISOString() });
      updated = win.ZONCore.applyManifest(withManifest, data);
    } catch (e) { this.log("manage-fields apply failed: " + e); }
    if (updated !== existing) {
      try { await this.safeWrite(rec.path, updated); } catch (e) { this.setStatus(rec, this.t("err.refreshWrite") + e); return; }
    }
    rec.diskMtime = await this.noteMtime(rec.path);
    this.hideConflict(rec);
    this.mountEditor(rec, win, updated);
    this.setStatus(rec, this.t("status.fieldsManaged", { count: Object.keys(map).length }));
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
      let anns = item ? this.gatherAnnotations(item, win) : [];
      let cfg = this.blockConfigFor(t, name, { colour: opts.colour, sync: opts.sync });
      // Compute bibliography for the first render of a field/section element; an
      // annotations block doesn't need it (skip the QuickCopy cost).
      let bibliography = (item && cfg.kind !== "annotations") ? await this.getBibliography(item) : "";
      text = win.ZONCore.makeBlock(cfg, anns, this.syncOpts(win, item, { bibliography }));
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
    if (rec.timer && await this.externallyChanged(rec)) { this.showConflict(rec); return; }
    await this.flush(rec);
    let existing = "";
    try { existing = await IOUtils.readUTF8(rec.path); } catch (e) { this.setStatus(rec, this.t("err.migrateRead") + e); return; }
    let res = win.ZONCore.migrateLegacyAnnotations(existing, {});
    if (!res.changed) { this.setStatus(rec, this.t("status.noLegacy")); return; }
    try { await this.safeWrite(rec.path, res.markdown); rec.diskMtime = await this.noteMtime(rec.path); } catch (e) { this.setStatus(rec, this.t("err.migrateWrite") + e); this.log("migrate write failed: " + e); return; }
    this.setStatus(rec, this.t("status.migrating"));
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
