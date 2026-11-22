// Runs lib/report.mjs on a report with hostile dependency names and messages and checks what it wrote.
// Parses $GITHUB_OUTPUT the way the runner does: `key=value` lines and
// `key<<DELIMITER` ... `DELIMITER` blocks.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const dir = mkdtempSync(join(tmpdir(), "catalog-doctor-report-"));
const out = join(dir, "output");
const summary = join(dir, "summary");
writeFileSync(out, "");
writeFileSync(summary, "");
execFileSync("node", ["lib/report.mjs", "test/hostile-report.json"], {
  env: { ...process.env, GITHUB_OUTPUT: out, GITHUB_STEP_SUMMARY: summary },
  stdio: "inherit",
});

const outputs = {};
const lines = readFileSync(out, "utf8").split("\n");
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (!line) continue;
  const heredoc = line.match(/^([^=<]+)<<(.+)$/);
  if (heredoc) {
    const value = [];
    for (i++; lines[i] !== heredoc[2]; i++) {
      if (i >= lines.length) throw new Error(`unterminated output ${heredoc[1]}`);
      value.push(lines[i]);
    }
    outputs[heredoc[1]] = value.join("\n");
  } else {
    const eq = line.indexOf("=");
    outputs[line.slice(0, eq)] = line.slice(eq + 1);
  }
}

const failures = [];
const expect = (ok, what) => ok || failures.push(what);
expect(outputs.total === "3", `total is ${JSON.stringify(outputs.total)}, expected "3"`);
expect(outputs.errors === "2", `errors is ${JSON.stringify(outputs.errors)}, expected "2"`);
expect(outputs.fixable === "0", `fixable is ${JSON.stringify(outputs.fixable)}, expected "0" (not a number in the report)`);
expect(Object.keys(outputs).sort().join() === "errors,fixable,report,total,warnings", `unexpected outputs: ${Object.keys(outputs)}`);

const md = readFileSync(summary, "utf8");
for (const raw of ["<img", "<script", "## forged", "[link](", "**bold**"]) {
  expect(!md.includes(raw), `the summary contains raw ${JSON.stringify(raw)}`);
}
const rows = md.split("\n").filter((l) => l.startsWith("| 🔴") || l.startsWith("| 🟡"));
expect(rows.length === 3, `expected 3 table rows, got ${rows.length}`);
for (const row of rows) {
  const cells = row.replace(/\\\|/g, "").split("|").length - 2;
  expect(cells === 4, `a row has ${cells} cells: ${row}`);
}

if (failures.length) {
  console.log(md);
  for (const f of failures) console.log(`::error::${f}`);
  process.exit(1);
}
console.log("outputs and summary are safe");
