// Resolve primary-PDF full text for LLM context, and render it into a structured
// markdown block. Pure logic — no DOM, no Zotero globals. Zotero access is
// injected via the `zoteroAdapter` parameter.

export function renderFulltextContext(itemData) {
  const ft = itemData?.fulltext;
  if (!ft || ft.ok === false) return "";
  const text = String(ft.text ?? "").trim();
  if (text === "") return "";
  const title = String(itemData?.title ?? "").trim();
  const citekey = String(itemData?.citekey ?? "").trim();
  const attachmentTitle = String(ft.attachmentTitle ?? "").trim();
  const header = [
    `Title: ${title}`,
    citekey ? `Citekey: ${citekey}` : null,
    `Attachment: ${attachmentTitle}`,
  ].filter(Boolean).join("\n");
  return `${header}\n\n${text}`;
}

// Async resolver: walk the decision tree against a Zotero item through the
// injected adapter, returning {ok:true, attachmentTitle, text} on success or
// {ok:false, reason} on any failure.
export async function resolvePrimaryPDFFulltext(item, zoteroAdapter) {
  const att = await zoteroAdapter.getBestAttachment(item);
  if (!att) return { ok: false, reason: "noPrimaryPDF" };
  if (!zoteroAdapter.isPDFAttachment(att)) return { ok: false, reason: "noPrimaryPDF" };
  if (!(await zoteroAdapter.fileExists(att))) return { ok: false, reason: "primaryPdfMissing" };
  const path = zoteroAdapter.getCacheFile(att);
  if (!path) return { ok: false, reason: "noExtractedText" };
  if (!(await zoteroAdapter.exists(path))) return { ok: false, reason: "noExtractedText" };
  let text;
  try {
    text = await zoteroAdapter.readUTF8(path);
  } catch (e) {
    return { ok: false, reason: "readFailed" };
  }
  text = String(text ?? "").trim();
  if (!text) return { ok: false, reason: "noExtractedText" };
  return { ok: true, attachmentTitle: zoteroAdapter.getAttachmentTitle(att), text };
}
