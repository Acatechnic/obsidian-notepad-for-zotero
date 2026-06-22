// CodeMirror 6 markdown editor, bundled (esbuild, IIFE, globalName ZOSEditorLib)
// into plugin/content/editor.bundle.js and loaded into the Zotero window by
// bootstrap.js. We don't write an editor — we wrap CM6, the same engine Obsidian
// uses — and expose a tiny imperative API the plugin drives.

import { EditorState, Compartment, StateField, StateEffect } from "@codemirror/state";
import {
  EditorView,
  keymap,
  drawSelection,
  highlightActiveLine,
  Decoration,
  WidgetType,
} from "@codemirror/view";
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from "@codemirror/commands";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { yamlFrontmatter } from "@codemirror/lang-yaml";
import { findMarkerRanges, rangeRevealed } from "../src/markers.js";
import { findFrontmatterRange, findHeadingRanges, findLinkRanges, findEmphasisRanges, findImageEmbedRanges } from "../src/preview.js";
import {
  syntaxHighlighting,
  defaultHighlightStyle,
  HighlightStyle,
  indentOnInput,
  bracketMatching,
} from "@codemirror/language";
import { tags as t } from "@lezer/highlight";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import { closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete";

// Editor chrome. No line-number gutter — this is a prose note editor, not code,
// so the gutter was just clutter. Colours follow Zotero's light/dark theme: the
// editor lives in its own iframe document, which does NOT inherit Zotero's text
// colour, so without this the text stayed black on a dark background. bootstrap
// detects the theme and passes `dark`.
function makeTheme(dark) {
  const fg = dark ? "#dcdcdc" : "#1a1a1a";
  const sel = dark ? "rgba(120,160,255,0.30)" : "rgba(120,160,255,0.25)";
  const active = dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)";
  return EditorView.theme(
    {
      // width:100% + a bounded parent is what makes lineWrapping actually wrap;
      // without a definite width the scroller grows to the longest line.
      "&": { fontSize: "14px", height: "100%", width: "100%", maxWidth: "100%", color: fg },
      ".cm-content": {
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
        lineHeight: "1.55",
        padding: "10px 12px 40px 12px",
        caretColor: fg,
      },
      ".cm-cursor, .cm-dropCursor": { borderLeftColor: fg },
      ".cm-scroller": { overflow: "auto", maxWidth: "100%" },
      ".cm-line": { overflowWrap: "anywhere" },
      "&.cm-focused": { outline: "none" },
      ".cm-activeLine": { backgroundColor: active },
      "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection": {
        backgroundColor: sel,
      },
      // Reading view (Phase E): rendered inline links and ATX headings. The
      // markdown syntax is hidden by replace decorations; these style what's left.
      ".cm-zon-link": {
        color: dark ? "#6cb6ff" : "#0b6bcb",
        textDecoration: "underline",
        cursor: "pointer",
      },
      ".cm-zon-h": { fontWeight: "700", color: dark ? "#6cb6ff" : "#1a4f8a" },
      ".cm-zon-h1": { fontSize: "1.6em" },
      ".cm-zon-h2": { fontSize: "1.4em" },
      ".cm-zon-h3": { fontSize: "1.2em" },
      ".cm-zon-h4": { fontSize: "1.1em" },
      ".cm-zon-h5": { fontSize: "1.0em" },
      ".cm-zon-h6": { fontSize: "0.92em", opacity: "0.85" },
      ".cm-zon-strong": { fontWeight: "700" },
      ".cm-zon-em": { fontStyle: "italic" },
      // Reading view: rendered image embeds. Constrained so a big page-region
      // snapshot doesn't dominate the pane; click opens it full-size.
      ".cm-zon-img": { display: "block", margin: "4px 0" },
      ".cm-zon-img img": {
        maxWidth: "100%", maxHeight: "360px", height: "auto",
        borderRadius: "4px", cursor: "zoom-in",
        border: dark ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(0,0,0,0.12)",
      },
    },
    { dark }
  );
}

// Dark-theme syntax colours. defaultHighlightStyle is tuned for light
// backgrounds (dark blues/greens/reds) and reads poorly on dark, so we ship a
// light variant of the markdown tokens for dark mode.
const darkHighlightStyle = HighlightStyle.define([
  { tag: t.heading, color: "#6cb6ff", fontWeight: "bold" },
  { tag: t.strong, fontWeight: "bold", color: "#eaeaea" },
  { tag: t.emphasis, fontStyle: "italic", color: "#eaeaea" },
  { tag: t.link, color: "#6cb6ff", textDecoration: "underline" },
  { tag: t.url, color: "#7fd28b" },
  { tag: t.monospace, color: "#e6a06c" },
  { tag: t.quote, color: "#b6b6b6" },
  { tag: t.list, color: "#cccccc" },
  { tag: t.contentSeparator, color: "#6cb6ff" },
  { tag: t.comment, color: "#8a8a8a", fontStyle: "italic" },
  { tag: t.strikethrough, textDecoration: "line-through" },
]);

// Theme + syntax colours live in a Compartment so they can be swapped on a LIVE
// editor when Zotero's light/dark theme changes (see setDark) without remounting.
const themeCompartment = new Compartment();
function themeExtensions(dark) {
  return [
    makeTheme(dark),
    syntaxHighlighting(dark ? darkHighlightStyle : defaultHighlightStyle, { fallback: true }),
  ];
}

// Swap the colour scheme on an existing view (Zotero theme toggled while open).
export function setDark(view, dark) {
  if (!view) return;
  try { view.dispatch({ effects: themeCompartment.reconfigure(themeExtensions(!!dark)) }); } catch (e) {}
}

// ── Image embeds (in-pane display) ───────────────────────────────────────────
//
// Reading view renders a vault-relative image embed (`![[…png]]` / `![](…png)`)
// as an inline <img>. We resolve the embed against the note's vault root and load
// it via a file:// URL (the editor iframe is privileged and loads local files).
// Restricted to paths that stay INSIDE the vault and end in an image extension —
// a note is plain text and could otherwise point the pane at an arbitrary file.

// Resolve a vault-RELATIVE embed path to an absolute path inside `vaultPath`, or
// null if it isn't safe/renderable (absolute, a URL, or escaping the vault).
function resolveVaultImagePath(vaultPath, p) {
  if (!vaultPath || !p) return null;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(p)) return null; // http(s)://, file://, etc.
  if (p[0] === "/" || /^[a-zA-Z]:[\\/]/.test(p)) return null; // absolute path
  const rel = p.replace(/^\.?[\\/]/, "");
  const segs = rel.split(/[\\/]/);
  if (segs.some((s) => s === ".." || s === "")) return null; // no escaping / empty
  return vaultPath.replace(/[\\/]+$/, "") + "/" + segs.join("/");
}

function fileURL(absPath) {
  // file:// + an absolute POSIX path (leading "/") yields the correct file:///… ;
  // encodeURI keeps spaces etc. valid. Backslashes (Windows) → forward slashes.
  return "file://" + encodeURI(absPath.replace(/\\/g, "/"));
}

class ImageEmbedWidget extends WidgetType {
  constructor(src, alt) { super(); this.src = src; this.alt = alt || ""; }
  eq(other) { return other.src === this.src && other.alt === this.alt; }
  toDOM(view) {
    const doc = (view && view.dom && view.dom.ownerDocument) || document;
    const wrap = doc.createElement("span");
    wrap.className = "cm-zon-img";
    const img = doc.createElement("img");
    img.src = this.src;
    img.alt = this.alt;
    img.title = this.alt;
    img.loading = "lazy";
    // A missing file would otherwise show a broken-image glyph; hide it so the
    // line just reads as (rendered-away) embed text rather than an error icon.
    img.addEventListener("error", () => { try { wrap.style.display = "none"; } catch (e) {} });
    wrap.appendChild(img);
    return wrap;
  }
  ignoreEvent() { return true; }
}

// ── Phase D + E: presentation layer ─────────────────────────────────────────
//
// The note's raw markdown source carries things that Obsidian renders or hides:
//   • provenance markers — `%% zon … %%`, `%% /zon %%`, `%% ann:KEY %%`, and the
//     reserved `zon:` frontmatter manifest (Phase D);
//   • the YAML frontmatter block (Phase E — show/hide toggle);
//   • inline links `[label](target)` and ATX headings `## …` (Phase E — reading
//     view renders these: hide the syntax, keep+style what's shown).
//
// All of this is ONE config-driven StateField so the hide (replace) decorations
// can never overlap across concerns — in particular the "hide whole frontmatter"
// range would otherwise collide with the "hide zon: manifest" range, and CM
// throws on overlapping replace decorations. Each hideable range is REVEALED
// (shown raw) when the cursor/selection touches it, so everything stays editable,
// and every hidden range is atomic for cursor motion / backspace. The file is
// never changed — purely presentational; Obsidian and the on-disk note are
// untouched. Range math is pure (src/markers.js, src/preview.js).
//
// It MUST be a StateField, not a ViewPlugin: hidden ranges (the multi-line zon:
// manifest, a hidden multi-line frontmatter) span line breaks, and a replace
// decoration that spans a line break may only be supplied via the state.

// Per-editor presentation config, updated live via setPresentation effects.
const setPresentation = StateEffect.define();
const presentationConfig = StateField.define({
  create: () => ({ showMarkers: false, readMode: true, showFrontmatter: true, vaultPath: "", imageEpoch: 0 }),
  update(val, tr) {
    let v = val;
    for (const e of tr.effects) if (e.is(setPresentation)) v = { ...v, ...e.value };
    return v;
  },
});

function buildPresentation(state) {
  const cfg = state.field(presentationConfig);
  const doc = state.doc;
  const text = doc.toString();
  const sel = state.selection.ranges;
  const touched = (from, to) => sel.some((s) => rangeRevealed({ from, to }, s.from, s.to));

  const hide = []; // {from,to} → replace (and atomic)
  const marks = []; // {from,to,deco} → mark decorations (styling only)
  const imgs = []; // {from,to,widget} → replace-with-<img> (and atomic)

  const fm = findFrontmatterRange(text);
  const hideFM = !cfg.showFrontmatter && !!fm;

  // 1. Frontmatter — hidden entirely when toggled off. (No reveal-on-cursor: the
  //    block starts at offset 0, which the default doc-start cursor always
  //    "touches", so it would never actually hide; toggle Frontmatter back on to
  //    edit it.)
  if (hideFM) hide.push({ from: fm.from, to: fm.to });

  // 2. Provenance markers — unless "Show markers", and skipping any inside a
  //    frontmatter we're already hiding whole (would overlap).
  if (!cfg.showMarkers) {
    for (const r of findMarkerRanges(text)) {
      if (r.from >= r.to) continue;
      if (hideFM && r.from >= fm.from && r.to <= fm.to) continue;
      if (!touched(r.from, r.to)) hide.push({ from: r.from, to: r.to });
    }
  }

  // 3. Reading view — render headings and inline links.
  if (cfg.readMode) {
    for (const h of findHeadingRanges(text)) {
      // Style the heading text big; hide the "## " prefix unless the line's touched.
      if (h.markTo < h.lineTo)
        marks.push({ from: h.markTo, to: h.lineTo, deco: Decoration.mark({ class: "cm-zon-h cm-zon-h" + h.level }) });
      if (!touched(h.lineFrom, h.lineTo) && h.markTo > h.markFrom) hide.push({ from: h.markFrom, to: h.markTo });
    }
    for (const l of findLinkRanges(text)) {
      if (touched(l.from, l.to)) continue; // editing this link → leave it raw
      hide.push({ from: l.openFrom, to: l.openTo }); // "["
      hide.push({ from: l.closeFrom, to: l.closeTo }); // "](target)"
      marks.push({
        from: l.labelFrom, to: l.labelTo,
        deco: Decoration.mark({ class: "cm-zon-link", attributes: { "data-zon-href": l.target } }),
      });
    }
    for (const em of findEmphasisRanges(text)) {
      if (touched(em.openFrom, em.closeTo)) continue; // editing this span → raw
      hide.push({ from: em.openFrom, to: em.openTo }); // ** / * / __ / _
      hide.push({ from: em.closeFrom, to: em.closeTo });
      marks.push({
        from: em.contentFrom, to: em.contentTo,
        deco: Decoration.mark({ class: em.kind === "strong" ? "cm-zon-strong" : "cm-zon-em" }),
      });
    }
    // Image embeds → inline <img>, but only those that resolve inside the vault.
    // Touching the embed reveals it raw so it stays editable/deletable.
    if (cfg.vaultPath) {
      // Cache-bust the file:// URL with the epoch so a re-exported PNG at the SAME
      // path (e.g. an image annotation resized → same key/filename) actually
      // reloads — both the widget eq() and the browser image cache key on the URL.
      const bust = cfg.imageEpoch ? "?e=" + cfg.imageEpoch : "";
      for (const im of findImageEmbedRanges(text)) {
        if (touched(im.from, im.to)) continue;
        const abs = resolveVaultImagePath(cfg.vaultPath, im.path);
        if (!abs) continue;
        imgs.push({ from: im.from, to: im.to, widget: new ImageEmbedWidget(fileURL(abs) + bust, im.alt) });
      }
    }
  }

  // All replace decorations (plain "hide" + image widgets) share one atomic layer
  // and must NOT overlap — CM throws on overlapping replaces. Merge them, sort,
  // and drop any range that starts before the previous one ended (defensive: they
  // shouldn't overlap, but a stray collision would crash CM rather than look wrong).
  const replaces = [];
  for (const r of hide) replaces.push({ from: r.from, to: r.to, deco: Decoration.replace({}) });
  for (const im of imgs) replaces.push({ from: im.from, to: im.to, deco: Decoration.replace({ widget: im.widget }) });
  replaces.sort((a, b) => a.from - b.from || b.to - a.to);
  const kept = [];
  let lastTo = -1;
  for (const r of replaces) {
    if (r.from < lastTo) continue;
    kept.push(r);
    lastTo = r.to;
  }

  const all = [];
  for (const r of kept) all.push(r.deco.range(r.from, r.to));
  for (const m of marks) all.push(m.deco.range(m.from, m.to));
  return {
    deco: Decoration.set(all, true),
    atomic: Decoration.set(kept.map((r) => Decoration.replace({}).range(r.from, r.to)), true),
  };
}

const presentationField = StateField.define({
  create: (state) => buildPresentation(state),
  update: (val, tr) =>
    tr.docChanged || tr.selection || tr.effects.some((e) => e.is(setPresentation))
      ? buildPresentation(tr.state)
      : val,
  provide: (f) => [
    EditorView.decorations.from(f, (v) => v.deco),
    EditorView.atomicRanges.from(f, (v) => v.atomic),
  ],
});

// Live toggles — each dispatches a config effect; the field recomputes.
export function setShowMarkers(view, show) {
  if (!view) return;
  try { view.dispatch({ effects: setPresentation.of({ showMarkers: !!show }) }); } catch (e) {}
}
export function setReadMode(view, on) {
  if (!view) return;
  try { view.dispatch({ effects: setPresentation.of({ readMode: !!on }) }); } catch (e) {}
}
export function setShowFrontmatter(view, show) {
  if (!view) return;
  try { view.dispatch({ effects: setPresentation.of({ showFrontmatter: !!show }) }); } catch (e) {}
}
// Bump the image cache-bust token on a LIVE view (used after an in-place auto-sync
// re-exports a changed PNG, so the rendered <img> reloads without a full remount).
export function setImageEpoch(view, epoch) {
  if (!view) return;
  try { view.dispatch({ effects: setPresentation.of({ imageEpoch: Number(epoch) || 0 }) }); } catch (e) {}
}

// `editable` controls whether the buffer can be typed into. `dark` selects the
// light/dark colour scheme (detected from Zotero's theme by bootstrap).
// Presentation flags: `showMarkers` reveals raw provenance markers (default off),
// `readMode` renders links/headings inline (default on), `showFrontmatter` keeps
// the YAML block visible (default on). `onOpenLink(href)` is called when a
// rendered inline link is clicked.
export function create({ parent, doc, onChange, editable = true, dark = false,
  showMarkers = false, readMode = true, showFrontmatter = true, vaultPath = "", imageEpoch = 0, onOpenLink } = {}) {
  const root = parent.getRootNode ? parent.getRootNode() : undefined;

  const updateListener = EditorView.updateListener.of((u) => {
    if (u.docChanged && onChange) onChange(u.state.doc.toString());
  });

  // Click a rendered link (its label carries data-zon-href) → open it, instead of
  // just placing the cursor. Walk up from the click target to find the marked span.
  const linkClicks = EditorView.domEventHandlers({
    mousedown(e, view) {
      if (!onOpenLink || e.button !== 0) return false;
      let el = e.target;
      while (el && el !== view.dom && !(el.getAttribute && el.getAttribute("data-zon-href"))) el = el.parentNode;
      const href = el && el.getAttribute && el.getAttribute("data-zon-href");
      if (!href) return false;
      e.preventDefault();
      try { onOpenLink(href); } catch (e2) {}
      return true;
    },
  });

  const state = EditorState.create({
    doc: doc || "",
    extensions: [
      history(),
      drawSelection(),
      indentOnInput(),
      bracketMatching(),
      closeBrackets(),
      highlightActiveLine(),
      highlightSelectionMatches(),
      EditorView.lineWrapping,
      // YAML frontmatter + markdown body. Parsing the leading `---  … ---` as
      // frontmatter (rather than letting the markdown parser see it) fixes the
      // long-standing in-editor bug where the closing `---` turned the line above
      // it (ZoteroLink / KeyIdea) into a setext heading and rendered it bold.
      yamlFrontmatter({ content: markdown({ base: markdownLanguage }) }),
      presentationConfig.init(() => ({ showMarkers, readMode, showFrontmatter, vaultPath, imageEpoch })),
      presentationField,
      linkClicks,
      keymap.of([
        ...closeBracketsKeymap,
        ...defaultKeymap,
        ...historyKeymap,
        ...searchKeymap,
        indentWithTab,
      ]),
      EditorView.editable.of(editable),
      EditorState.readOnly.of(!editable),
      updateListener,
      themeCompartment.of(themeExtensions(dark)),
    ],
  });

  const view = new EditorView({ state, parent, root });
  // Re-measure whenever the host changes size — pane-splitter drags, and (the
  // important one) the late initial layout of the item pane. CodeMirror's first
  // width measurement can land before the pane has its real width, which left
  // long lines intermittently unwrapped; the observer corrects it once sized.
  try {
    const w = parent.ownerDocument && parent.ownerDocument.defaultView;
    const RO = (w && w.ResizeObserver) || (typeof ResizeObserver !== "undefined" ? ResizeObserver : null);
    if (RO) {
      const ro = new RO(() => view.requestMeasure());
      ro.observe(parent);
      view.zonResizeObserver = ro;
    }
  } catch (e) {}
  return view;
}

export function getDoc(view) {
  return view.state.doc.toString();
}

// Insert text at the current cursor (replacing any selection), then place the
// cursor after it and focus. Used by the "insert block" commands.
export function insertAtCursor(view, text) {
  if (!view) return;
  const sel = view.state.selection.main;
  view.dispatch({
    changes: { from: sel.from, to: sel.to, insert: text },
    selection: { anchor: sel.from + (text ? text.length : 0) },
  });
  view.focus();
}

// Replace the whole buffer (used when switching to a different item's note).
// Preserves nothing — caller is responsible for having saved prior edits.
export function setDoc(view, text) {
  view.dispatch({
    changes: { from: 0, to: view.state.doc.length, insert: text || "" },
  });
}

// Force CodeMirror to recompute geometry (line-wrap width). Needed after the
// host changes size or visibility — otherwise a stale 0-width measurement made
// while hidden leaves long lines unwrapped.
export function refresh(view) {
  if (view) view.requestMeasure();
}

export function destroy(view) {
  if (!view) return;
  try { if (view.zonResizeObserver) view.zonResizeObserver.disconnect(); } catch (e) {}
  view.destroy();
}
