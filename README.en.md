# One File Sheet

A self-saving spreadsheet that lives in a single HTML file.

[日本語](README.md) | English

![One File Sheet (Terminal theme)](screenshot.png)

**[▶ Open the demo in your browser](https://firemio.github.io/OneFileSheet/OneFileSheet.html)** — try editing, pasting and undo right away. Use "Export HTML" on the download button to save your edits as a file that contains both the app and your data.

**[⬇ Download (latest release)](https://github.com/firemio/OneFileSheet/releases/latest)** — grab the attached `OneFileSheet.html` and just open it in a browser.

## Why

When small tables live in xls files or Google Sheets, it is a hassle to let AI agents dig into them or to diff the edits.

One File Sheet packs a spreadsheet app and its data into one HTML file. Because the app and the data share a single file, AI agents can read and write it directly, and sharing means sending exactly one file.

## Features

- **Single file** — no server, no install, no `localStorage`. Data is JSON inside the HTML. The distributed file is self-extracting and about 24KB
- **Self-saving** — on Chrome / Edge it writes back into its own file (File System Access API). The first save just asks you to pick the file (starting from your last folder). You can also open a file by dropping it onto the page
- **Works on unsupported browsers too** — on mobile browsers, Firefox and Safari, "Save" automatically falls back to downloading the HTML
- **Multiple sheets** — switch by tabs; add, rename (double-click), reorder, delete
- **Spreadsheet-grade editing** — Enter / Tab / arrow-key navigation, range paste from Excel / Google Sheets (multiline cells supported), row/column insert & delete, Ctrl+Z / Ctrl+Y, Ctrl+S, Alt+Enter for in-cell line breaks
- **Quick stats** — hover the chart icons on the headers and at row ends for count / sum / average / max / min. Click to pin; pinned stats follow your edits live. Read-only — nothing is written to cells
- **Fast on large sheets** — virtualized rendering draws only the visible rows, so typing and resizing stay smooth with thousands of rows. Row and column headers stay pinned while scrolling
- **Export** — HTML (a replica of the app with all sheets) and CSV (UTF-8 with BOM, Excel-safe)
- **43 themes + auto** (including glowing Neon / Cyberpunk / Synthwave and eight vivid Pop colors) / **English & Japanese UI** (defaults to your browser language) — both saved inside the file, so it looks the same wherever you share it
- **AI-agent friendly** — data is pretty-printed JSON, an editing contract (AGENT NOTES) ships inside the file, and external edits are detected at save time

## Good fits

- **A worksheet for AI agents (the original purpose)** — hand it to an agent: "write your findings into this table", "work through the TODOs in this sheet". Being JSON, agents edit it directly and `git diff` shows exactly what changed
- **Tracking tables inside a repository** — API endpoint inventories, environment variable lists, test case tables, release checklists — version-controlled next to the code and reviewable in PRs
- **Distribute, fill in, collect** — send it by mail or chat; recipients open it in a browser, fill it in, and export it back. No Excel, no install
- **Offline or restricted environments** — works with nothing but a browser, travels on a USB stick
- **Household / expense books** — quick stats give you sums and averages at a glance; works well with one-file-per-month naming
- **Handing over data with its viewer** — unlike CSV there is no mojibake or column breakage, and the theme travels with the file

Not a good fit for: confidential data (stored as plain text), formula-driven calculation work (no formulas by design — use quick stats or an AI agent), or datasets with tens of thousands of rows.

## Usage

1. Download `OneFileSheet.html` from the [releases page](https://github.com/firemio/OneFileSheet/releases/latest) and open it in a browser.
2. Edit the table.
3. Press "Save" or Ctrl+S. On Chrome / Edge a file dialog appears only on the first save — pick `OneFileSheet.html` itself and it saves right away. After that it is one click.
4. On unsupported browsers, saving automatically downloads the HTML instead.

To edit another One File Sheet file, open that file itself in the browser, or drag & drop it onto an open page (the app ships inside every file).

The save target is remembered per file URL in the browser's IndexedDB and restored automatically. If the browser asks for permission again, just confirm it.

## Data format

The table data is stored as JSON in the following element, so an edited `OneFileSheet.html` is also the data file itself.

```html
<script id="sheet-data" type="application/json">
{
  "title": "OneFileSheet",
  "theme": "auto",
  "lang": "auto",
  "activeSheet": 0,
  "sheets": [
    { "name": "Sheet1", "data": [["Header1", "Header2"], ["value", "value"]] }
  ]
}
</script>
```

Each sheet's `data` is a 2D array of strings whose first row is the header row. Legacy files (a bare 2D array) migrate automatically on load. On save, `<` characters in cells are written as JSON unicode escapes, so HTML tags or `$` sequences typed into cells can never corrupt the file.

The editing contract for AI agents lives in the `AGENT NOTES` comment right above the sheet-data block inside the HTML.

### Prompt for AI agents (copy & paste)

The file ships with AGENT NOTES inside, so usually just handing it over is enough. If an agent gets confused by the file structure, or you want to set expectations before it reads the file, attach this instruction:

```text
This OneFileSheet.html is a self-contained single-file spreadsheet. It is about
24KB, but most of it is the compressed app runtime - ignore that part.
The actual data is ONLY the JSON inside the
<script id="sheet-data" type="application/json"> block.

Format: { "title", "theme", "lang", "activeSheet", "sheets": [ { "name", "data" } ] }
- Each sheet's data is a 2D array of strings; data[0] is the header row (all rows equal length)
- Edit only that JSON. Keep the opening tag unchanged and keep the
  JSON.stringify(doc, null, 2) formatting
- Write "<" in cell values as \u003c
```

## Notes

- In-place saving uses the File System Access API (Chrome / Edge). By browser design, you must pick the file and grant permission on the first save.
- Data is stored as plain text. Do not use it for passwords or other secrets.

## Development

The readable source lives at [src/OneFileSheet.html](src/OneFileSheet.html). Run `npm install` once (build-only devDependencies: terser / csso — the app itself keeps zero runtime dependencies), then `node build.js` produces the distributed `OneFileSheet.html`: a self-extracting file whose CSS and app JS are minified, deflate-compressed, embedded as base125 and unpacked at startup via the browser's built-in DecompressionStream. The sheet-data JSON and AGENT NOTES stay as plain text after packing, so AI agents can read and write the data in either file just the same.

## License

Open source under the MIT License — use, modify, redistribute and use commercially. See [LICENSE](LICENSE) for details.
