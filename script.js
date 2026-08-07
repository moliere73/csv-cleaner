const fileInput = document.getElementById("fileInput");
const browseButton = document.getElementById("browseButton");
const replaceButton = document.getElementById("replaceButton");
const dropZone = document.getElementById("dropZone");
const fileSummary = document.getElementById("fileSummary");
const controlsCard = document.getElementById("controlsCard");
const qualityCard = document.getElementById("qualityCard");
const resultsCard = document.getElementById("resultsCard");
const errorMessage = document.getElementById("errorMessage");
const cleanButton = document.getElementById("cleanButton");
const downloadButton = document.getElementById("downloadButton");
const exportReportButton = document.getElementById("exportReportButton");
const selectAllButton = document.getElementById("selectAllButton");
const resetColumnsButton = document.getElementById("resetColumnsButton");
const restoreDefaultsButton = document.getElementById("restoreDefaultsButton");

const optionIds = [
  "trimWhitespace",
  "removeDuplicates",
  "standardizeHeaders",
  "removeEmptyColumns",
  "removeEmptyRows",
  "normalizeLineBreaks",
];

const presetButtons = [
  ...document.querySelectorAll(".preset-button"),
];

const cleanupPresets = {
  safe: {
    trimWhitespace: true,
    removeDuplicates: false,
    standardizeHeaders: true,
    removeEmptyColumns: false,
    removeEmptyRows: true,
    normalizeLineBreaks: true,
  },
  formatting: {
    trimWhitespace: true,
    removeDuplicates: false,
    standardizeHeaders: true,
    removeEmptyColumns: false,
    removeEmptyRows: false,
    normalizeLineBreaks: true,
  },
  aggressive: {
    trimWhitespace: true,
    removeDuplicates: true,
    standardizeHeaders: true,
    removeEmptyColumns: true,
    removeEmptyRows: true,
    normalizeLineBreaks: true,
  },
};

const CLEANUP_PREFERENCES_KEY = "clearcsv-cleanup-preferences";

let sourceFile = null;
let originalRows = [];
let cleanedRows = [];
let cleanedCsv = "";
let qualityReport = null;
let detectedDelimiter = ",";

browseButton.addEventListener("click", () => fileInput.click());
replaceButton.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", () => {
  if (fileInput.files[0]) loadFile(fileInput.files[0]);
});

["dragenter", "dragover"].forEach((eventName) => {
  dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropZone.classList.add("dragging");
  });
});

["dragleave", "drop"].forEach((eventName) => {
  dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropZone.classList.remove("dragging");
  });
});

dropZone.addEventListener("drop", (event) => {
  const file = event.dataTransfer.files[0];
  if (file) loadFile(file);
});

presetButtons.forEach((button) => {
  button.addEventListener("click", () => {
    applyCleanupPreset(button.dataset.preset);
    saveCleanupPreferences(button.dataset.preset);
  });
});

optionIds.forEach((id) => {
  document.getElementById(id).addEventListener("change", () => {
    clearActivePreset();
    saveCleanupPreferences(null);
    updateSelectAllLabel();
  });
});

selectAllButton.addEventListener("click", () => {
  const checkboxes = optionIds.map((id) => document.getElementById(id));
  const allSelected = checkboxes.every((checkbox) => checkbox.checked);

  checkboxes.forEach((checkbox) => {
    checkbox.checked = !allSelected;
  });

  clearActivePreset();
  saveCleanupPreferences(null);
  updateSelectAllLabel();
});

cleanButton.addEventListener("click", cleanCsv);
downloadButton.addEventListener("click", downloadCsv);
exportReportButton.addEventListener("click", downloadQualityReport);
resetColumnsButton.addEventListener("click", resetColumnControls);
restoreDefaultsButton.addEventListener("click", restoreDefaultCleanupPreferences);

function restoreDefaultCleanupPreferences() {
  localStorage.removeItem(CLEANUP_PREFERENCES_KEY);

  const defaultRules = {
    trimWhitespace: true,
    removeDuplicates: true,
    standardizeHeaders: true,
    removeEmptyColumns: true,
    removeEmptyRows: true,
    normalizeLineBreaks: true,
  };

  Object.entries(defaultRules).forEach(([id, checked]) => {
    document.getElementById(id).checked = checked;
  });

  clearActivePreset();
  updateSelectAllLabel();
}

function saveCleanupPreferences(activePreset) {
  const rules = Object.fromEntries(
    optionIds.map((id) => [
      id,
      document.getElementById(id).checked,
    ])
  );

  localStorage.setItem(
    CLEANUP_PREFERENCES_KEY,
    JSON.stringify({
      activePreset,
      rules,
    })
  );
}

function loadCleanupPreferences() {
  try {
    const saved = localStorage.getItem(CLEANUP_PREFERENCES_KEY);

    if (!saved) {
      updateSelectAllLabel();
      return;
    }

    const preferences = JSON.parse(saved);

    optionIds.forEach((id) => {
      if (typeof preferences.rules?.[id] === "boolean") {
        document.getElementById(id).checked =
          preferences.rules[id];
      }
    });

    presetButtons.forEach((button) => {
      button.classList.toggle(
        "active",
        button.dataset.preset === preferences.activePreset
      );
    });

    updateSelectAllLabel();
  } catch {
    localStorage.removeItem(CLEANUP_PREFERENCES_KEY);
    updateSelectAllLabel();
  }
}

function clearActivePreset() {
  presetButtons.forEach((button) => {
    button.classList.remove("active");
  });
}

function updateSelectAllLabel() {
  const allSelected = optionIds.every(
    (id) => document.getElementById(id).checked
  );

  selectAllButton.textContent = allSelected
    ? "Clear all"
    : "Select all";
}

function applyCleanupPreset(presetName) {
  const preset = cleanupPresets[presetName];

  if (!preset) return;

  Object.entries(preset).forEach(([optionId, checked]) => {
    document.getElementById(optionId).checked = checked;
  });

  presetButtons.forEach((button) => {
    button.classList.toggle(
      "active",
      button.dataset.preset === presetName
    );
  });

  selectAllButton.textContent = optionIds.every(
    (id) => document.getElementById(id).checked
  )
    ? "Clear all"
    : "Select all";
}

loadCleanupPreferences();

function showProcessing(title, message) {
  processingTitle.textContent = title;
  processingMessage.textContent = message;
  processingCard.classList.remove("hidden");
}

function hideProcessing() {
  processingCard.classList.add("hidden");
}

function setBusy(isBusy) {
  browseButton.disabled = isBusy;
  cleanButton.disabled = isBusy;
  downloadButton.disabled = isBusy;
  exportReportButton.disabled = isBusy;
}

function resetApp() {
  sourceFile = null;
  originalRows = [];
  cleanedRows = [];
  cleanedCsv = "";
  qualityReport = null;

  fileInput.value = "";
  fileSummary.classList.add("hidden");
  qualityCard.classList.add("hidden");
  controlsCard.classList.add("hidden");
  resultsCard.classList.add("hidden");
  hideProcessing();
  clearError();
  dropZone.classList.remove("hidden");
  setBusy(false);
}

async function loadFile(file) {
  clearError();
  setBusy(true);

  showProcessing(
    "Reading file",
    "Loading the CSV from your device."
  );

  await new Promise((resolve) => setTimeout(resolve, 0));

  if (!file.name.toLowerCase().endsWith(".csv")) {
    showError("Please choose a .csv file.");
    return;
  }

  if (file.size > 10 * 1024 * 1024) {
    showError("This file is larger than 10 MB. Try a smaller CSV for the best browser performance.");
    return;
  }

  try {
    const text = await file.text();

    showProcessing(
      "Analyzing structure",
      "Detecting the delimiter and parsing rows."
    );

    await new Promise((resolve) => setTimeout(resolve, 0));

    const delimiter = detectDelimiter(text);
    detectedDelimiter = delimiter;
    const rows = parseCsv(text, delimiter);

    if (!rows.length || !rows.some((row) => row.some((cell) => cell.trim() !== ""))) {
      throw new Error("The file appears to be empty.");
    }

    sourceFile = file;
    originalRows = rows;
    cleanedRows = [];
    cleanedCsv = "";

    const columns = Math.max(...rows.map((row) => row.length));
    document.getElementById("fileName").textContent = file.name;
    document.getElementById("fileMeta").textContent =
      `${Math.max(rows.length - 1, 0).toLocaleString()} rows · ${columns.toLocaleString()} columns`;

    const delimiterNames = {
      ",": "comma",
      ";": "semicolon",
      "\t": "tab",
      "|": "pipe",
    };

    document.getElementById("delimiterMeta").textContent =
      `Delimiter: ${delimiterNames[delimiter] || delimiter}`;

    showProcessing(
      "Analyzing data quality",
      `Reviewing ${Math.max(rows.length - 1, 0).toLocaleString()} rows.`
    );

    await new Promise((resolve) => setTimeout(resolve, 0));

    updateQualityReport(rows);
    renderColumnControls(rows[0]);

    dropZone.classList.add("hidden");
    fileSummary.classList.remove("hidden");
    qualityCard.classList.remove("hidden");
    controlsCard.classList.remove("hidden");
    resultsCard.classList.add("hidden");

    hideProcessing();
    setBusy(false);
  } catch (error) {
    hideProcessing();
    setBusy(false);
    showError(error.message || "We could not read this CSV file.");
  }
}

function updateQualityReport(rows) {
  const maxColumns = Math.max(...rows.map((row) => row.length));
  const normalizedRows = rows.map((row) => [
    ...row,
    ...Array(Math.max(0, maxColumns - row.length)).fill(""),
  ]);

  const dataRows = normalizedRows.slice(1);

  const missingCells = dataRows.reduce(
    (total, row) =>
      total + row.filter((cell) => cell.trim() === "").length,
    0
  );

  const emptyRows = dataRows.filter((row) =>
    row.every((cell) => cell.trim() === "")
  ).length;

  const emptyColumns = normalizedRows[0].filter((_, columnIndex) =>
    dataRows.every((row) => (row[columnIndex] || "").trim() === "")
  ).length;

  const seen = new Set();
  let duplicateRows = 0;

  dataRows.forEach((row) => {
    const key = JSON.stringify(row.map((cell) => cell.trim()));
    if (seen.has(key)) {
      duplicateRows += 1;
    } else {
      seen.add(key);
    }
  });

  document.getElementById("missingCells").textContent =
    missingCells.toLocaleString();
  document.getElementById("duplicateRowsFound").textContent =
    duplicateRows.toLocaleString();
  document.getElementById("emptyRowsFound").textContent =
    emptyRows.toLocaleString();
  document.getElementById("emptyColumnsFound").textContent =
    emptyColumns.toLocaleString();

  const columns = buildColumnDiagnostics(normalizedRows);

  qualityReport = {
    fileName: sourceFile ? sourceFile.name : null,
    analyzedAt: new Date().toISOString(),
    summary: {
      dataRows: dataRows.length,
      columns: maxColumns,
      missingCells,
      duplicateRows,
      emptyRows,
      emptyColumns,
    },
    columns,
  };

  renderColumnDiagnostics(columns);
}

function buildColumnDiagnostics(rows) {
  if (!rows.length) return [];

  const headers = rows[0];
  const dataRows = rows.slice(1);

  return headers.map((header, columnIndex) => {
    const values = dataRows.map((row) => (row[columnIndex] || "").trim());
    const nonEmptyValues = values.filter((value) => value !== "");
    const missingCount = values.length - nonEmptyValues.length;
    const uniqueCount = new Set(nonEmptyValues).size;
    const completion =
      values.length === 0
        ? 100
        : Math.round((nonEmptyValues.length / values.length) * 100);

    return {
      column: header || `Column ${columnIndex + 1}`,
      missing: missingCount,
      unique: uniqueCount,
      completionPercent: completion,
      likelyType: detectLikelyType(nonEmptyValues),
    };
  });
}

function renderColumnDiagnostics(columns) {
  const tableBody = document.querySelector("#diagnosticsTable tbody");
  tableBody.innerHTML = "";

  columns.forEach((column) => {
    const row = document.createElement("tr");

    const columnCell = document.createElement("td");
    columnCell.textContent = column.column;

    const missingCell = document.createElement("td");
    missingCell.textContent = column.missing.toLocaleString();

    const uniqueCell = document.createElement("td");
    uniqueCell.textContent = column.unique.toLocaleString();

    const completionCell = document.createElement("td");
    completionCell.textContent = `${column.completionPercent}%`;

    const typeCell = document.createElement("td");
    const typePill = document.createElement("span");
    typePill.className = "type-pill";
    typePill.textContent = column.likelyType;
    typeCell.appendChild(typePill);

    row.append(
      columnCell,
      missingCell,
      uniqueCell,
      completionCell,
      typeCell
    );

    tableBody.appendChild(row);
  });
}

function renderColumnControls(headers) {
  const list = document.getElementById("columnControlsList");
  const error = document.getElementById("columnControlsError");

  list.innerHTML = "";
  error.textContent = "";
  error.classList.add("hidden");

  headers.forEach((header, index) => {
    const row = document.createElement("div");
    row.className = "column-control-row";
    row.dataset.columnIndex = index;

    const toggleLabel = document.createElement("label");
    toggleLabel.className = "column-toggle";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "column-include";
    checkbox.checked = true;

    const toggleText = document.createElement("span");
    toggleText.textContent = "Include";

    toggleLabel.append(checkbox, toggleText);

    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.className = "column-name-input";
    nameInput.value = header || `Column ${index + 1}`;
    nameInput.setAttribute(
      "aria-label",
      `Rename column ${index + 1}`
    );

    checkbox.addEventListener("change", () => {
      nameInput.disabled = !checkbox.checked;
      row.classList.toggle("excluded", !checkbox.checked);
    });

    row.append(toggleLabel, nameInput);
    list.appendChild(row);
  });
}

function resetColumnControls() {
  if (!originalRows.length) return;

  renderColumnControls(originalRows[0]);

  const error = document.getElementById("columnControlsError");
  error.textContent = "";
  error.classList.add("hidden");
}

function getColumnControls() {
  const rows = [
    ...document.querySelectorAll(".column-control-row"),
  ];

  const controls = rows.map((row) => ({
    index: Number(row.dataset.columnIndex),
    include: row.querySelector(".column-include").checked,
    name: row.querySelector(".column-name-input").value.trim(),
  }));

  const included = controls.filter((control) => control.include);
  const error = document.getElementById("columnControlsError");

  if (!included.length) {
    error.textContent = "Include at least one column.";
    error.classList.remove("hidden");
    return null;
  }

  if (included.some((control) => control.name === "")) {
    error.textContent = "Included columns must have a name.";
    error.classList.remove("hidden");
    return null;
  }

  const normalizedNames = included.map((control) =>
    control.name.toLowerCase()
  );

  if (new Set(normalizedNames).size !== normalizedNames.length) {
    error.textContent = "Column names must be unique.";
    error.classList.remove("hidden");
    return null;
  }

  error.textContent = "";
  error.classList.add("hidden");

  return controls;
}

async function cleanCsv() {
  clearError();
  const processingStartedAt = performance.now();

  if (!originalRows.length) {
    showError("Choose a CSV file first.");
    return;
  }

  setBusy(true);

  showProcessing(
    "Cleaning data",
    `Applying cleanup rules to ${Math.max(originalRows.length - 1, 0).toLocaleString()} rows.`
  );

  await new Promise((resolve) => setTimeout(resolve, 0));

  const columnControls = getColumnControls();

  if (!columnControls) {
    hideProcessing();
    setBusy(false);
    return;
  }

  const settings = Object.fromEntries(
    optionIds.map((id) => [id, document.getElementById(id).checked])
  );

  let rows = originalRows.map((row) => [...row]);
  const originalDataRowCount = Math.max(rows.length - 1, 0);
  let cellsTrimmed = 0;
  let duplicatesRemoved = 0;
  let emptyRowsRemoved = 0;
  let columnsRemoved = 0;

  const maxColumns = Math.max(...rows.map((row) => row.length));
  rows = rows.map((row) => [
    ...row,
    ...Array(Math.max(0, maxColumns - row.length)).fill(""),
  ]);

  if (settings.trimWhitespace) {
    rows = rows.map((row) =>
      row.map((cell) => {
        const trimmed = cell.trim();
        if (trimmed !== cell) cellsTrimmed += 1;
        return trimmed;
      })
    );
  }

  if (settings.removeEmptyRows) {
    const header = rows[0];
    const dataRows = rows.slice(1);
    const filtered = dataRows.filter((row) => row.some((cell) => cell !== ""));
    emptyRowsRemoved = dataRows.length - filtered.length;
    rows = [header, ...filtered];
  }

  if (settings.standardizeHeaders && rows.length) {
    rows[0] = makeUniqueHeaders(rows[0]);
  }

  const includedControls = columnControls.filter(
    (control) => control.include
  );

  rows = rows.map((row, rowIndex) =>
    includedControls.map((control) => {
      if (rowIndex === 0) {
        return control.name;
      }

      return row[control.index] ?? "";
    })
  );

  if (settings.removeEmptyColumns && rows.length) {
    const indexesToKeep = rows[0].map((_, columnIndex) => columnIndex).filter(
      (columnIndex) =>
        rows.some((row, rowIndex) => {
          if (rowIndex === 0) return false;
          return (row[columnIndex] || "").trim() !== "";
        })
    );

    if (!indexesToKeep.length) {
      indexesToKeep.push(...rows[0].map((_, index) => index));
    }

    columnsRemoved = rows[0].length - indexesToKeep.length;
    rows = rows.map((row) => indexesToKeep.map((index) => row[index] ?? ""));
  }

  if (settings.removeDuplicates && rows.length > 1) {
    const header = rows[0];
    const seen = new Set();
    const uniqueRows = [];

    rows.slice(1).forEach((row) => {
      const key = JSON.stringify(row);
      if (seen.has(key)) {
        duplicatesRemoved += 1;
      } else {
        seen.add(key);
        uniqueRows.push(row);
      }
    });

    rows = [header, ...uniqueRows];
  }

  cleanedRows = rows;
  const lineBreak = settings.normalizeLineBreaks ? "\n" : detectLineBreak();
  cleanedCsv = rows.map((row) => row.map(escapeCsvCell).join(",")).join(lineBreak);

  const cleanedDataRowCount = Math.max(rows.length - 1, 0);
  const cleanedColumnCount = rows.length ? rows[0].length : 0;
  const totalRowsRemoved = originalDataRowCount - cleanedDataRowCount;

  const cleanedDataRows = rows.slice(1);

  const cleanedMissingCells = cleanedDataRows.reduce(
    (total, row) =>
      total + row.filter((cell) => (cell || "").trim() === "").length,
    0
  );

  const cleanedEmptyRows = cleanedDataRows.filter((row) =>
    row.every((cell) => (cell || "").trim() === "")
  ).length;

  const cleanedEmptyColumns = rows.length
    ? rows[0].filter((_, columnIndex) =>
        cleanedDataRows.every(
          (row) => (row[columnIndex] || "").trim() === ""
        )
      ).length
    : 0;

  const cleanedSeen = new Set();
  let cleanedDuplicateRows = 0;

  cleanedDataRows.forEach((row) => {
    const key = JSON.stringify(row.map((cell) => (cell || "").trim()));

    if (cleanedSeen.has(key)) {
      cleanedDuplicateRows += 1;
    } else {
      cleanedSeen.add(key);
    }
  });

  const originalSummary = qualityReport?.summary || {
    dataRows: originalDataRowCount,
    columns: maxColumns,
    missingCells: 0,
    duplicateRows: 0,
    emptyRows: 0,
    emptyColumns: 0,
  };

  const originalIssueCount =
    originalSummary.missingCells +
    originalSummary.duplicateRows +
    originalSummary.emptyRows +
    originalSummary.emptyColumns;

  const cleanedIssueCount =
    cleanedMissingCells +
    cleanedDuplicateRows +
    cleanedEmptyRows +
    cleanedEmptyColumns;

  const issueReduction =
    originalIssueCount === 0
      ? 0
      : Math.max(
          0,
          Math.round(
            ((originalIssueCount - cleanedIssueCount) /
              originalIssueCount) *
              100
          )
        );

  document.getElementById("originalRowCount").textContent =
    originalSummary.dataRows.toLocaleString();
  document.getElementById("cleanedRowCount").textContent =
    cleanedDataRowCount.toLocaleString();
  document.getElementById("originalColumnCount").textContent =
    originalSummary.columns.toLocaleString();
  document.getElementById("cleanedColumnCount").textContent =
    cleanedColumnCount.toLocaleString();
  document.getElementById("originalMissingCount").textContent =
    originalSummary.missingCells.toLocaleString();
  document.getElementById("cleanedMissingCount").textContent =
    cleanedMissingCells.toLocaleString();
  document.getElementById("issueReduction").textContent =
    `${issueReduction}%`;

  const activePresetButton = presetButtons.find((button) =>
    button.classList.contains("active")
  );

  const presetLabels = {
    safe: "Safe cleanup",
    formatting: "Formatting only",
    aggressive: "Aggressive cleanup",
  };

  const delimiterLabels = {
    ",": "comma",
    ";": "semicolon",
    "\t": "tab",
    "|": "pipe",
  };

  const enabledRuleCount = optionIds.filter(
    (id) => document.getElementById(id).checked
  ).length;

  const presetLabel = activePresetButton
    ? presetLabels[activePresetButton.dataset.preset]
    : "Custom rules";

  const processingElapsedMs = Math.round(
    performance.now() - processingStartedAt
  );

  const processingSummaryText = document.getElementById(
    "processingSummaryText"
  );

  if (processingSummaryText) {
    processingSummaryText.textContent =
      `${delimiterLabels[detectedDelimiter] || detectedDelimiter} delimiter · ` +
      `${presetLabel} · ${enabledRuleCount} cleanup rules · ` +
      `${originalSummary.dataRows} × ${originalSummary.columns} to ` +
      `${cleanedDataRowCount} × ${cleanedColumnCount} · ` +
      `processed in ${processingElapsedMs} ms`;
  }

  document.getElementById("rowsRemoved").textContent = totalRowsRemoved.toLocaleString();
  document.getElementById("duplicatesRemoved").textContent = duplicatesRemoved.toLocaleString();
  document.getElementById("columnsRemoved").textContent = columnsRemoved.toLocaleString();
  document.getElementById("cellsTrimmed").textContent = cellsTrimmed.toLocaleString();
  document.getElementById("previewCaption").textContent =
    `Showing ${Math.min(cleanedDataRowCount, 10)} of ${cleanedDataRowCount.toLocaleString()} rows`;

  showProcessing(
    "Preparing results",
    "Building the preview and download files."
  );

  await new Promise((resolve) => setTimeout(resolve, 0));

  renderPreview(rows);

  hideProcessing();
  setBusy(false);

  resultsCard.classList.remove("hidden");
  resultsCard.scrollIntoView({ behavior: "smooth", block: "start" });
}

function detectLineBreak() {
  return navigator.platform.toLowerCase().includes("win") ? "\r\n" : "\n";
}

function renderPreview(rows) {
  const table = document.getElementById("previewTable");
  const thead = table.querySelector("thead");
  const tbody = table.querySelector("tbody");

  thead.innerHTML = "";
  tbody.innerHTML = "";

  if (!rows.length) return;

  const headerRow = document.createElement("tr");
  rows[0].forEach((header) => {
    const th = document.createElement("th");
    th.textContent = header;
    th.title = header;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);

  rows.slice(1, 11).forEach((row) => {
    const tr = document.createElement("tr");
    row.forEach((cell) => {
      const td = document.createElement("td");
      td.textContent = cell;
      td.title = cell;
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
}

function downloadQualityReport() {
  if (!qualityReport || !sourceFile) return;

  const reportJson = JSON.stringify(qualityReport, null, 2);
  const blob = new Blob([reportJson], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const originalName = sourceFile.name.replace(/\.csv$/i, "");

  link.href = url;
  link.download = `${originalName}-quality-report.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function downloadCsv() {
  if (!cleanedCsv || !sourceFile) return;

  const blob = new Blob([cleanedCsv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const originalName = sourceFile.name.replace(/\.csv$/i, "");

  link.href = url;
  link.download = `${originalName}-cleaned.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function showError(message) {
  errorMessage.textContent = message;
  errorMessage.classList.remove("hidden");
}

function clearError() {
  errorMessage.textContent = "";
  errorMessage.classList.add("hidden");
}
