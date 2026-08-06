const assert = require("node:assert/strict");
const {
  parseCsv,
  makeUniqueHeaders,
  escapeCsvCell,
  detectLikelyType,
} = require("../csv-utils");

function test(name, callback) {
  try {
    callback();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    throw error;
  }
}

test("parses ordinary CSV rows", () => {
  assert.deepEqual(parseCsv("name,age\nMeredith,22"), [
    ["name", "age"],
    ["Meredith", "22"],
  ]);
});

test("parses commas inside quoted values", () => {
  assert.deepEqual(parseCsv('name,notes\nMeredith,"Python, JavaScript"'), [
    ["name", "notes"],
    ["Meredith", "Python, JavaScript"],
  ]);
});

test("parses escaped quotation marks", () => {
  assert.deepEqual(parseCsv('name,quote\nMeredith,"She said ""hello"""'), [
    ["name", "quote"],
    ["Meredith", 'She said "hello"'],
  ]);
});

test("preserves empty cells", () => {
  assert.deepEqual(parseCsv("name,email,team\nMeredith,,AI"), [
    ["name", "email", "team"],
    ["Meredith", "", "AI"],
  ]);
});

test("supports Windows line endings", () => {
  assert.deepEqual(parseCsv("name,age\r\nMeredith,22\r\nAlex,24"), [
    ["name", "age"],
    ["Meredith", "22"],
    ["Alex", "24"],
  ]);
});

test("throws for an unclosed quoted value", () => {
  assert.throws(
    () => parseCsv('name,notes\nMeredith,"unfinished'),
    /unclosed quoted value/
  );
});

test("standardizes headers and makes duplicates unique", () => {
  assert.deepEqual(
    makeUniqueHeaders([
      "Full Name",
      "Email Address",
      "Email Address",
      "",
      "createdAt",
    ]),
    [
      "full_name",
      "email_address",
      "email_address_2",
      "column_4",
      "created_at",
    ]
  );
});

test("escapes commas, quotes, and line breaks", () => {
  assert.equal(escapeCsvCell("plain"), "plain");
  assert.equal(escapeCsvCell("hello, world"), '"hello, world"');
  assert.equal(escapeCsvCell('She said "hello"'), '"She said ""hello"""');
  assert.equal(escapeCsvCell("line one\nline two"), '"line one\nline two"');
});

test("detects likely column types", () => {
  assert.equal(detectLikelyType([]), "empty");
  assert.equal(detectLikelyType(["true", "false", "yes"]), "boolean");
  assert.equal(detectLikelyType(["10", "25.5", "$30"]), "number");
  assert.equal(
    detectLikelyType(["meredith@example.com", "alex@example.com"]),
    "email"
  );
  assert.equal(detectLikelyType(["2026-08-01", "2026-08-06"]), "date");
  assert.equal(detectLikelyType(["Design", "Engineering"]), "text");
});

console.log("\nAll CSV utility tests passed.");
