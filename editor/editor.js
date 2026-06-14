// CodeMirror 6 markdown editor, bundled (esbuild, IIFE, globalName ZOSEditorLib)
// into plugin/content/editor.bundle.js and loaded into the Zotero window by
// bootstrap.js. We don't write an editor — we wrap CM6, the same engine Obsidian
// uses — and expose a tiny imperative API the plugin drives.

import { EditorState, Compartment } from "@codemirror/state";
import {
  EditorView,
  keymap,
  drawSelection,
  highlightActiveLine,
} from "@codemirror/view";
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from "@codemirror/commands";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
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

// `editable` controls whether the buffer can be typed into. `dark` selects the
// light/dark colour scheme (detected from Zotero's theme by bootstrap).
export function create({ parent, doc, onChange, editable = true, dark = false }) {
  const root = parent.getRootNode ? parent.getRootNode() : undefined;

  const updateListener = EditorView.updateListener.of((u) => {
    if (u.docChanged && onChange) onChange(u.state.doc.toString());
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
      markdown({ base: markdownLanguage }),
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
