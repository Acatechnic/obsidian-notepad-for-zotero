# README media

These are embedded in the main `README.md`.

| File | What it shows |
| --- | --- |
| `00-demo.gif` | The reading-view toggle — the note rendering like Obsidian vs. raw markdown. |
| `01-editor-pane.png` | The Obsidian note rendered in the Zotero item pane (hero shot). |
| `02-annotation-sync.png` | PDF highlights synced into the note's Annotations block. |
| `03-setup.png` | Settings → Obsidian Notes (vault / notes / template paths redacted). |

## Refreshing them

- **Screenshots:** ⌘⇧4 then Space (window) or drag a region; crop to the item
  pane, and **keep the library list and your vault paths out** (the Settings shot
  has its paths redacted). Re-save over the same filenames.
- **GIF:** record a short clip (e.g. with [Kap](https://getkap.co)) and convert:
  `ffmpeg -i clip.mov -vf "fps=12,scale=560:-1:flags=lanczos,palettegen=stats_mode=diff" pal.png`
  then
  `ffmpeg -i clip.mov -i pal.png -lavfi "fps=12,scale=560:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer" -loop 0 00-demo.gif`
