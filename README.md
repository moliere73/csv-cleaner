# ClearCSV

A lightweight browser-based CSV cleaning utility.

## Features

- Drag-and-drop CSV upload
- Trim whitespace
- Remove duplicate rows
- Standardize headers to snake_case
- Remove fully empty columns
- Remove empty rows
- Preview cleaned data
- Download the cleaned CSV
- No backend and no uploads: all processing happens locally in the browser

## Run locally

Open `index.html` in your browser.

For a local server:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

## Deploy with GitHub Pages

1. Create a new GitHub repository.
2. Add these files to the repository root.
3. Push to the `main` branch.
4. In **Settings → Pages**, deploy from the `main` branch and root folder.

## Project structure

```text
csv-cleaner/
├── index.html
├── styles.css
├── script.js
└── README.md
```
