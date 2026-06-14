// Bundled into plugin/content/core.bundle.js (IIFE, global ZONCore) and loaded
// into the Zotero window like the editor bundle. Gives the plugin the pure
// template/merge logic (which depends on nunjucks + dayjs) without those living
// in the bootstrap.
export { render } from "../src/render.js";
export { buildItemData } from "../src/item-data.js";
export { mergeNote, updateNoteAnnotations } from "../src/merge.js";
export { renderAnnotationsSection, mapZoteroAnnotation } from "../src/annotations.js";
export { syncBlocks, makeBlock, parseBlocks, migrateLegacyAnnotations } from "../src/blocks.js";
export { DEFAULT_FORMATS } from "../src/formats.js";
export { parseTemplateFile, templateKind, templateUserOwnedKeys } from "../src/templates.js";
export { COLOR_NAMES } from "../src/colors.js";
