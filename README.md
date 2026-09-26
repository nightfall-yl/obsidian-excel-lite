# Excel Lite

A lightweight, fully-featured spreadsheet plugin for Obsidian, powered by [Univer](https://github.com/dream-num/univer).

[![Version](https://img.shields.io/badge/version-26.1.3-blue)](https://github.com/nightfall-yl/obsidian-excel-lite) | [![Obsidian](https://img.shields.io/badge/Obsidian-1.11.0%2B-purple)](https://obsidian.md) | [![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

English | [简体中文](README_zh-CN.md)

## ✨ Features

### Core

- **Full spreadsheet editor** — Create and edit multi-sheet workbooks with a familiar Excel-like interface
- **Formula engine** — SUM, AVERAGE, IF, VLOOKUP and hundreds more — works with references across sheets
- **Cell formatting** — Number formats, fonts, colors, borders, alignment, merge cells, freeze panes
- **Sorting & filtering** — Flexible row/column sorting and data filter dropdowns
- **Hyperlinks & notes** — Clickable links, cell comments and collaborative thread comments

### Import / Export

- **Import** `.xlsx` / `.xls` (Excel 97-2003) / `.csv` files directly into Obsidian
- **Export** your workbook back to `.xlsx`, `.xls` or `.csv`
- **Dropdown selector** — One Import button and one Export button, pick a format from the menu
- **Embed links** — Reference Obsidian notes as embedded content inside cells

### Mobile

- **Preview mode** (default) — Read-only view, no keyboard popup, optimized scrolling
- **Edit mode** — Full editing with toolbar, sheet tabs and cell input
- **One-tap toggle** — Switch via the book/pencil icon in the top-right corner
- **Sheet position memory** — Active sheet is preserved when switching modes

### Integration

- **`.sheet.md` files** — Workbooks are stored as plain Markdown files with structured JSON data blocks
- **Frontmatter auto-detection** — Any Markdown file with `obsidian-excel: parsed` frontmatter opens in Sheet View
- **Ribbon & commands** — Create new sheets from the ribbon icon, command palette or file context menu
- **Dark mode** — Automatically follows Obsidian's theme setting
- **Auto-save** — Changes persist automatically after 5 seconds of inactivity

## 🚀 Installation

1. Download the latest release from [Releases](../../releases)
2. Extract to your vault's `.obsidian/plugins/obsidian-excel-lite/` folder
3. Reload Obsidian (or enable the plugin in **Settings → Community plugins**)

Or build from source:

```bash
cd your-vault/.obsidian/plugins/
git clone https://github.com/nightfall-yl/obsidian-excel-lite.git
cd obsidian-excel-lite
npm install
npm run build
```

## 📖 Usage

### Create a new sheet

- Click the **spreadsheet** icon in the left ribbon
- Use command palette (`Ctrl/Cmd + P`) → "Create new spreadsheet"
- Right-click any folder → "Create new spreadsheet"

### Import / Export

Open a sheet, then use the two dropdown buttons in the toolbar:

| Button | Formats |
|--------|---------|
| **Import** | `.xlsx` · `.xls` · `.csv` |
| **Export** | `.xlsx` · `.xls` · `.csv` |

### Mobile mode

Use the **book / pencil icon** in the top-right corner to switch between **preview** (read-only) and **edit** (full-featured) modes.

## 🗂 File Format

Sheets are plain-text Markdown files — friendly to Git and grep:

```markdown
---
obsidian-excel: parsed
---

```sheet
{ ... Univer workbook JSON ... }
```
```

## 🔧 Tech Stack

| Component | Technology |
|-----------|-----------|
| Spreadsheet engine | [Univer](https://univer.ai) 0.25.x |
| XLS/XLSX/CSV I/O | [SheetJS (`@stackline/xlsx`)](https://sheetjs.com) |
| Build | Vite |
| Language | TypeScript |

## 🧪 Development

```bash
npm install        # install dependencies
npm run build      # production build
npm run dev        # watch mode (for development)
npm test           # run unit tests
```

Build output: `main.js`, `manifest.json`, `styles.css` (copied to project root).

## 🙏 Credits

- [Univer](https://github.com/dream-num/univer) — the underlying spreadsheet engine
- [SheetJS](https://sheetjs.com) — XLSX/XLS/CSV import/export
- [Obsidian](https://obsidian.md) — the note-taking app that makes this possible

## 📄 License

[MIT](LICENSE)
