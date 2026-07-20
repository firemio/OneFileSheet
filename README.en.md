# One File Sheet

A self-saving spreadsheet that lives in a single HTML file.

[日本語](README.md) | English

![One File Sheet (Terminal theme)](screenshot.png)

**[▶ Open the demo in your browser](https://firemio.github.io/OneFileSheet/OneFileSheet.html)** — try editing, pasting and undo right away. Use "Export HTML" on the download button to save your edits as a file that contains both the app and your data.

## Why

When small tables live in xls files or Google Sheets, it is a hassle to let AI agents dig into them or to diff the edits.

One File Sheet packs a spreadsheet app and its data into one HTML file. Because the app and the data share a single file, AI agents can read and write it directly, and sharing means sending exactly one file.

## Features

- **Single file** — no server, no install, no `localStorage`. Data is JSON inside the HTML
- **Self-saving** — on Chrome / Edge it writes back into its own file (File System Access API). The first save just asks you to pick the file (starting from your last folder). You can also open a file by dropping it onto the page
- **Works on unsupported browsers too** — on mobile browsers, Firefox and Safari, "Save" automatically falls back to downloading the HTML
- **Multiple sheets** — switch by tabs; add, rename (double-click), reorder, delete
- **Spreadsheet-grade editing** — Enter / Tab / arrow-key navigation, range paste from Excel / Google Sheets (multiline cells supported), row/column insert & delete, Ctrl+Z / Ctrl+Y, Ctrl+S, Alt+Enter for in-cell line breaks
- **Quick stats** — hover the chart icons at both ends of every row and column for count / sum / average / max / min. Click to pin; pinned stats follow your edits live. Read-only — nothing is written to cells
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

1. Open `OneFileSheet.html` in a browser.
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

## Notes

- In-place saving uses the File System Access API (Chrome / Edge). By browser design, you must pick the file and grant permission on the first save.
- Data is stored as plain text. Do not use it for passwords or other secrets.

## License

Open source under the MIT License — use, modify, redistribute and use commercially. See [LICENSE](LICENSE) for details.
