// Pure range-finders for the editor's live-preview layer (v2 Phase E).
//
// Like markers.js (Phase D), this computes WHERE things are as pure string work
// with no CodeMirror dependency, so it unit-tests in Node; editor/editor.js turns
// the ranges into Decorations (hide syntax / style label / reveal-on-cursor).
//
// Three finders:
//   findFrontmatterRange(text)  → {from,to} of the leading `--- … ---` block, or null
//   findHeadingRanges(text)     → ATX headings: hide the `#…# ` prefix, style the line
//   findLinkRanges(text)        → `[label](target)` inline links: hide the syntax,
//                                 keep+style the label, expose the target
//
// All offsets are character indices into `text`. Frontmatter (YAML) and fenced
// code blocks are skipped by the heading/link scanners — a `#` in YAML or a
// `[x](y)` inside ``` is left raw.

// The leading YAML frontmatter fence, INCLUSIVE of both `---` lines. Returns null
// when the note doesn't open with one. (Mirrors the fence the markers layer uses.)
export function findFrontmatterRange(text) {
  const s = String(text);
  const m = s.match(/^---\n[\s\S]*?\n---(?=\n|$)/);
  if (!m) return null;
  return { from: 0, to: m[0].length };
}

// Walk body lines (after any frontmatter), tracking ``` / ~~~ fenced code so we
// don't touch markup inside code. Calls cb(lineText, lineStartOffset) per
// non-fence, non-frontmatter line. Fence delimiter lines themselves are skipped.
function eachBodyLine(s, cb) {
  const fm = findFrontmatterRange(s);
  const bodyStart = fm ? fm.to : 0;
  let offset = 0;
  let inFence = false;
  let fenceTok = "";
  const lines = s.split("\n");
  for (const line of lines) {
    const lineStart = offset;
    offset += line.length + 1;
    if (lineStart < bodyStart) continue; // inside frontmatter
    const fenceM = line.match(/^\s*(`{3,}|~{3,})/);
    if (fenceM) {
      if (!inFence) { inFence = true; fenceTok = fenceM[1][0]; }
      else if (fenceM[1][0] === fenceTok) { inFence = false; fenceTok = ""; }
      continue; // never style a fence delimiter line
    }
    if (inFence) continue;
    cb(line, lineStart);
  }
}

const HEADING_RE = /^(#{1,6})([ \t]+)(\S.*)$/;

// ATX headings only (a `# ` … `###### ` prefix followed by text). Setext (===
// / --- underlines) are intentionally ignored — `---` is frontmatter/HR here.
export function findHeadingRanges(text) {
  const s = String(text);
  const out = [];
  eachBodyLine(s, (line, lineStart) => {
    const m = line.match(HEADING_RE);
    if (!m) return;
    const level = m[1].length;
    const markTo = lineStart + m[1].length + m[2].length; // after "###" + spaces
    out.push({
      level,
      lineFrom: lineStart,
      lineTo: lineStart + line.length,
      markFrom: lineStart,
      markTo,
    });
  });
  return out;
}

// Emphasis: `**strong**` / `__strong__` and `*em*` / `_em_`. Returns the delimiter
// ranges to hide and the inner content to style. Guards against the usual false
// positives: `__`/`_` only fire at word boundaries (so snake_case is untouched),
// `*`/`**` are kept distinct (the `**` of strong never reads as two `*` em), and
// the content must be non-blank. Nested cases (`**a *b* c**`) yield both spans.
const STAR2_RE = /\*\*(?=\S)(.+?)(?<=\S)\*\*/g;
const UND2_RE = /(?<![\w*])__(?=\S)(.+?)(?<=\S)__(?![\w*])/g;
const STAR1_RE = /(?<![\w*])\*(?!\*)(?=\S)(.+?)(?<=\S)\*(?![\w*])/g;
const UND1_RE = /(?<![\w_])_(?!_)(?=\S)(.+?)(?<=\S)_(?![\w_])/g;

export function findEmphasisRanges(text) {
  const out = [];
  eachBodyLine(String(text), (line, lineStart) => {
    const scan = (re, dl, kind) => {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(line))) {
        const openFrom = lineStart + m.index;
        const openTo = openFrom + dl;
        const contentFrom = openTo;
        const contentTo = contentFrom + m[1].length;
        out.push({ openFrom, openTo, contentFrom, contentTo, closeFrom: contentTo, closeTo: contentTo + dl, kind });
      }
    };
    scan(STAR2_RE, 2, "strong");
    scan(UND2_RE, 2, "strong");
    scan(STAR1_RE, 1, "em");
    scan(UND1_RE, 1, "em");
  });
  out.sort((a, b) => a.openFrom - b.openFrom || a.kind.localeCompare(b.kind));
  return out;
}

// `[label](target)` inline links. Images (`![alt](src)`) and empty-label links
// are left raw. Targets may not contain `)` or a newline — fine for the
// zotero://, https:// and doi links these notes use.
const LINK_RE = /(!?)\[([^\]\n]+)\]\(([^)\n]+)\)/g;

export function findLinkRanges(text) {
  const s = String(text);
  const out = [];
  eachBodyLine(s, (line, lineStart) => {
    LINK_RE.lastIndex = 0;
    let m;
    while ((m = LINK_RE.exec(line))) {
      if (m[1] === "!") continue; // image embed — leave raw
      const label = m[2];
      const target = m[3];
      const from = lineStart + m.index + m[1].length; // the "["
      const to = lineStart + m.index + m[0].length; // after the ")"
      const openFrom = from; // "["
      const openTo = openFrom + 1;
      const labelFrom = openTo;
      const labelTo = labelFrom + label.length;
      const closeFrom = labelTo; // the "](target)"
      const closeTo = to;
      out.push({ from, to, openFrom, openTo, labelFrom, labelTo, closeFrom, closeTo, label, target });
    }
  });
  return out;
}

// Image embeds to render in reading view: Obsidian wiki-embeds `![[path]]`
// (optionally `![[path|alias]]`) and markdown images `![alt](src)`. Only paths
// ending in a known image extension are returned; the `path` is captured verbatim
// and the caller resolves it against the vault and decides whether to render.
// Skips frontmatter + fenced code, like the other finders. `from`/`to` span the
// whole embed (so the editor can replace it with an <img> widget).
const IMG_EXT_RE = /\.(?:png|jpe?g|gif|webp|svg|bmp|avif)$/i;
const WIKI_EMBED_RE = /!\[\[([^\]\n|]+?)(?:\|[^\]\n]*)?\]\]/g;
const MD_IMAGE_RE = /!\[([^\]\n]*)\]\(([^)\n]+?)\)/g;

export function findImageEmbedRanges(text) {
  const out = [];
  eachBodyLine(String(text), (line, lineStart) => {
    let m;
    WIKI_EMBED_RE.lastIndex = 0;
    while ((m = WIKI_EMBED_RE.exec(line))) {
      const path = m[1].trim();
      if (!IMG_EXT_RE.test(path)) continue;
      out.push({ from: lineStart + m.index, to: lineStart + m.index + m[0].length, path, alt: path });
    }
    MD_IMAGE_RE.lastIndex = 0;
    while ((m = MD_IMAGE_RE.exec(line))) {
      const path = m[2].trim();
      if (!IMG_EXT_RE.test(path.replace(/[?#].*$/, ""))) continue; // tolerate ?query / #frag
      out.push({ from: lineStart + m.index, to: lineStart + m.index + m[0].length, path, alt: m[1] || path });
    }
  });
  out.sort((a, b) => a.from - b.from);
  return out;
}
