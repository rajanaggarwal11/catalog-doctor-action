// Turns catalog-doctor's JSON report into step outputs and a job summary.
//
// Dependency names and finding messages come from the workspace's manifests, which a pull
// request can change. So:
//   - outputs use the heredoc form with a random delimiter, counts must be whole numbers,
//     and every value is one line;
//   - the summary escapes HTML and Markdown in every name and message.
import { randomBytes } from "node:crypto";
import { appendFileSync, readFileSync } from "node:fs";

const file = process.argv[2];
const r = JSON.parse(readFileSync(file, "utf8"));
const s = r.summary ?? {};
const findings = Array.isArray(r.findings) ? r.findings : [];

const count = (v) => (Number.isSafeInteger(Number(v)) && Number(v) >= 0 ? Number(v) : 0);
const oneLine = (v) => String(v ?? "").replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029]+/g, " ").trim();
const md = (v) =>
  oneLine(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/[\\`*_{}[\]()#+\-.!|~:@]/g, "\\$&");
const code = (v) => `<code>${md(v)}</code>`;

const total = count(s.total);
const errors = count(s.errors);
const warnings = count(s.warnings);
const fixable = count(s.fixable);

if (process.env.GITHUB_OUTPUT) {
  const delimiter = `ghadelimiter_${randomBytes(16).toString("hex")}`;
  const outputs = { total, errors, warnings, fixable, report: oneLine(file) };
  appendFileSync(
    process.env.GITHUB_OUTPUT,
    Object.entries(outputs)
      .map(([k, v]) => `${k}<<${delimiter}\n${v}\n${delimiter}\n`)
      .join(""),
  );
}

const lines = ["## catalog-doctor", ""];
if (total === 0) {
  lines.push(`No problems found across ${count(r.packages)} package(s).`);
} else {
  lines.push(`**${total} finding(s)** — ${errors} error(s), ${warnings} warning(s), ${fixable} fixable.`, "");
  lines.push("| | Rule | Dependency | Problem |", "| --- | --- | --- | --- |");
  for (const f of findings.slice(0, 30)) {
    const icon = f.severity === "error" ? "🔴" : "🟡";
    lines.push(`| ${icon} | ${code(f.rule)} | ${f.dep ? code(f.dep) : "—"} | ${md(f.message)} |`);
  }
  if (findings.length > 30) lines.push(`| | | | …and ${findings.length - 30} more |`);
}
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join("\n") + "\n");
