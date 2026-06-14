// Zotero's fixed annotation palette (hex -> friendly name) so blocks can filter
// by "colour=yellow" etc. Unknown hexes pass through as the lowercased hex.
const MAP = {
  "#ffd400": "yellow",
  "#ff6666": "red",
  "#5fb236": "green",
  "#2ea8e5": "blue",
  "#a28ae5": "purple",
  "#e56eee": "magenta",
  "#f19837": "orange",
  "#aaaaaa": "grey",
  "#000000": "black",
};

export const COLOR_NAMES = Object.values(MAP);

export function hexToColorName(hex) {
  if (!hex) return "";
  const h = String(hex).toLowerCase();
  return MAP[h] || h;
}
