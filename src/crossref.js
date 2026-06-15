// Crossref DOI lookup — PURE helpers (URL building + match selection + DOI/title
// normalisation). The actual HTTP request lives in the bootstrap (Zotero.HTTP);
// this module is dependency-free so it unit-tests headlessly.
//
// Safety stance: a wrong DOI is worse than no DOI. pickBestMatch only returns a
// candidate whose normalised title closely matches the query title (and, when
// both years are known, whose year is within tolerance). Everything below the
// similarity threshold is discarded — so an item with a typo'd / generic title
// gets left untouched rather than mis-stamped.

const CROSSREF_API = "https://api.crossref.org/works";

// Lowercase, strip HTML/entities Crossref sometimes embeds in titles, collapse
// every run of non-alphanumerics to a single space. The canonical form both
// sides are compared in.
export function normalizeTitle(s) {
  return String(s == null ? "" : s)
    .toLowerCase()
    .replace(/<\/?[^>]+>/g, " ") // <i>…</i>, <sub>…</sub>, etc.
    .replace(/&[a-z]+;/gi, " ") // &amp; &nbsp; …
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

// Classic iterative Levenshtein (two-row). Operates on already-normalised input.
function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = new Array(b.length + 1);
  let cur = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    cur[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      cur[j] = Math.min(cur[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    const tmp = prev; prev = cur; cur = tmp;
  }
  return prev[b.length];
}

// 1.0 = identical (after normalisation), 0.0 = nothing in common. A normalised
// edit-distance ratio, robust to casing/punctuation/markup differences.
export function titleSimilarity(a, b) {
  const x = normalizeTitle(a);
  const y = normalizeTitle(b);
  if (!x || !y) return 0;
  if (x === y) return 1;
  const m = Math.max(x.length, y.length);
  return m ? 1 - levenshtein(x, y) / m : 0;
}

// Strip a DOI down to the bare "10.xxxx/…" form Zotero stores in its DOI field.
export function normalizeDOI(doi) {
  return String(doi == null ? "" : doi)
    .trim()
    .replace(/^https?:\/\/(dx\.)?doi\.org\//i, "")
    .replace(/^doi:\s*/i, "")
    .trim();
}

// First 4-digit run in a Zotero date string ("2019-01-02", "March 2019", "2019").
export function extractYear(dateStr) {
  const m = String(dateStr == null ? "" : dateStr).match(/\d{4}/);
  return m ? Number(m[0]) : null;
}

// Publication year from a Crossref work (issued → published-print → -online).
export function crossrefYear(work) {
  const pick = (o) => {
    try {
      const dp = o && o["date-parts"];
      if (dp && dp[0] && dp[0][0]) return Number(dp[0][0]);
    } catch (e) {}
    return null;
  };
  if (!work) return null;
  return pick(work.issued) || pick(work["published-print"]) || pick(work["published-online"]) || null;
}

// Build the Crossref query URL. We bias the bibliographic query with the title
// (+ first author if given) and ask for a small, trimmed response.
export function buildCrossrefURL(query, opts = {}) {
  const q = query || {};
  const params = new URLSearchParams();
  const bib = [q.title, q.author].filter(Boolean).join(" ").trim();
  if (bib) params.set("query.bibliographic", bib);
  params.set("rows", String(opts.rows || 5));
  params.set("select", "DOI,title,author,issued,published-print,published-online,score");
  return CROSSREF_API + "?" + params.toString();
}

// Choose the best Crossref candidate for `query` ({title, author, year}), or null.
// A candidate must clear `minSimilarity` (default 0.9) on title; when both years
// are known it must be within `yearTolerance` (default 1). Among survivors the
// highest title similarity wins (Crossref's own relevance score breaks ties).
export function pickBestMatch(json, query, opts = {}) {
  const minSim = opts.minSimilarity != null ? opts.minSimilarity : 0.9;
  const yearTol = opts.yearTolerance != null ? opts.yearTolerance : 1;
  const q = query || {};
  const items = (json && json.message && json.message.items) || [];
  let best = null;
  for (const it of items) {
    const doi = it && it.DOI;
    const candTitle = Array.isArray(it && it.title) ? it.title[0] : (it && it.title);
    if (!doi || !candTitle) continue;
    const sim = titleSimilarity(q.title, candTitle);
    if (sim < minSim) continue;
    const candYear = crossrefYear(it);
    if (q.year && candYear && Math.abs(Number(q.year) - candYear) > yearTol) continue;
    const cand = {
      doi: normalizeDOI(doi),
      title: candTitle,
      similarity: sim,
      year: candYear,
      score: typeof it.score === "number" ? it.score : null,
    };
    if (!best || cand.similarity > best.similarity ||
        (cand.similarity === best.similarity && (cand.score || 0) > (best.score || 0))) {
      best = cand;
    }
  }
  return best;
}
