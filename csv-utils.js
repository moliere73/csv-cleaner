function detectDelimiter(text) {
  const candidates = [",", ";", "\t", "|"];
  const sampleLines = text
    .split(/\r?\n/)
    .filter((line) => line.trim() !== "")
    .slice(0, 10);

  if (!sampleLines.length) return ",";

  let bestDelimiter = ",";
  let bestScore = -1;

  candidates.forEach((delimiter) => {
    const counts = sampleLines.map((line) =>
      countDelimiterOutsideQuotes(line, delimiter)
    );

    const nonZeroCounts = counts.filter((count) => count > 0);

    if (!nonZeroCounts.length) return;

    const firstCount = nonZeroCounts[0];
    const consistentCount = nonZeroCounts.filter(
      (count) => count === firstCount
    ).length;

    const score = consistentCount * firstCount;

    if (score > bestScore) {
      bestScore = score;
      bestDelimiter = delimiter;
    }
  });

  return bestDelimiter;
}

function countDelimiterOutsideQuotes(line, delimiter) {
  let count = 0;
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (!inQuotes && char === delimiter) {
      count += 1;
    }
  }

  return count;
}

function parseCsv(text, delimiter = detectDelimiter(text)) {
  const rows = [];
  let row = [];
  let value = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        value += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        value += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === delimiter) {
      row.push(value);
      value = "";
    } else if (char === "\n") {
      row.push(value.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      value = "";
    } else {
      value += char;
    }
  }

  if (inQuotes) {
    throw new Error("The CSV contains an unclosed quoted value.");
  }

  if (value.length > 0 || row.length > 0) {
    row.push(value.replace(/\r$/, ""));
    rows.push(row);
  }

  return rows;
}

function makeUniqueHeaders(headers) {
  const counts = new Map();

  return headers.map((header, index) => {
    let normalized = header
      .trim()
      .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
      .replace(/[^a-zA-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .toLowerCase();

    if (!normalized) normalized = `column_${index + 1}`;

    const count = counts.get(normalized) || 0;
    counts.set(normalized, count + 1);

    return count === 0 ? normalized : `${normalized}_${count + 1}`;
  });
}

function escapeCsvCell(value) {
  const stringValue = String(value ?? "");

  if (/[",\n\r]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

function detectLikelyType(values) {
  if (!values.length) return "empty";

  const normalized = values.map((value) => value.toLowerCase());

  if (
    normalized.every((value) =>
      ["true", "false", "yes", "no"].includes(value)
    )
  ) {
    return "boolean";
  }

  if (
    values.every((value) => {
      const cleaned = value.replace(/[$,%\s]/g, "");
      return cleaned !== "" && !Number.isNaN(Number(cleaned));
    })
  ) {
    return "number";
  }

  if (
    values.every((value) => {
      const timestamp = Date.parse(value);
      return !Number.isNaN(timestamp);
    })
  ) {
    return "date";
  }

  if (
    values.every((value) =>
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
    )
  ) {
    return "email";
  }

  return "text";
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    detectDelimiter,
    parseCsv,
    makeUniqueHeaders,
    escapeCsvCell,
    detectLikelyType,
  };
}
