// Bundled into plugin/content/core.bundle.js (IIFE, global ZONCore) and loaded
// into the Zotero window like the editor bundle. Gives the plugin the pure
// template/merge logic (which depends on nunjucks + dayjs) without those living
// in the bootstrap.
export { render } from "../src/render.js";
export { buildItemData, filenameFields, zoteroSelectURI, ensureZoteroLink } from "../src/item-data.js";
export { resolveNoteFilename } from "../src/filename.js";
export { mergeNote, updateNoteAnnotations, refreshFrontmatter } from "../src/merge.js";
export { renderAnnotationsSection, mapZoteroAnnotation } from "../src/annotations.js";
export { syncBlocks, makeBlock, parseBlocks, migrateLegacyAnnotations } from "../src/blocks.js";
export { DEFAULT_FORMATS, FIELD_FORMATS } from "../src/formats.js";
export { parseTemplateFile, templateKind, templateUserOwnedKeys } from "../src/templates.js";
export { previewTemplate, cleanPreview, paletteContextAt, BLOCK_VARIABLES, ITEM_VARIABLES, FRONTMATTER_FIELDS, FIELD_BLOCKS, ANNOTATION_BLOCKS, STARTER_NOTE, STARTER_FORMAT, SAMPLE_ITEM, SAMPLE_ANNOTATIONS, blockConfigAt, annotationMarkerOpen, annotationBlockText, BLOCK_COLOURS, BLOCK_TYPES, BLOCK_STYLES, BLOCK_PARTS, NAMED_FORMATS, FRONTMATTER_VALUES, frontmatterFieldText, frontmatterFieldKeys, addFrontmatterField, removeFrontmatterField } from "../src/builder.js";
export { parseManifest, hasManifest, applyManifest, setManifestEntry, removeManifestEntry, buildManifestFromScaffold, writeManifest, MANIFEST_KEY, getTagField, setTagField, getAttachmentFolder, setAttachmentFolder } from "../src/manifest.js";
export { frontmatterList, cleanTag, tagSyncPlan } from "../src/tagsync.js";
export { findMarkerRanges, rangeRevealed } from "../src/markers.js";
export { findFrontmatterRange, findHeadingRanges, findLinkRanges, findEmphasisRanges, findImageEmbedRanges } from "../src/preview.js";
export { COLOR_NAMES } from "../src/colors.js";
export { buildCrossrefURL, pickBestMatch, normalizeTitle, titleSimilarity, normalizeDOI, crossrefYear, extractYear } from "../src/crossref.js";
export { splitPath, vaultName, vaultRelative, buildObsidianUri, obsidianConfigPath, parseObsidianVaults, sanitizeFilename, isUnder } from "../src/paths.js";
