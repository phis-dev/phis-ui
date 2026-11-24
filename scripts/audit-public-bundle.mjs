import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { repositoryRoot } from "./lib/repo-root.mjs";

/*
 * The Public browser bundle held to a size budget, beside the module graph budget.
 *
 * `audit:graph` measures source bytes and refuses what joins a graph; it says nothing about what a Public
 * visitor is served, and that only ever went one way unremarked: +5,320 raw and +1,457 gzip bytes between
 * 2026-09-21 and 09-24, the same 25 scripts (TODOS.md, "The Public bundle drifts upward"). The served bundle
 * is measured by the Skeleton against a production build (`pnpm bundle:check:public` in
 * phis-site-skeleton: the scripts and preloads a Public response names, raw and gzip), and its summary
 * line is what this reads, from a file or from stdin:
 *
 *   sudo -u phis pnpm -s bundle:check:public | node ../phis-ui/scripts/audit-public-bundle.mjs
 *
 * The budget (`scripts/audit-public-bundle.budget.json`) is the last recorded measurement plus a headroom of
 * that drift -- three days of it went unnoticed, so more than that fails. `--update-budget` records the
 * measurement read as the new baseline; say why in the commit, as for the graph budget.
 */

const budgetPath = path.join(repositoryRoot, "scripts/audit-public-bundle.budget.json");
const SUMMARY = /Public production browser bundle: (\d+) scripts.*?, ([\d,]+) raw bytes, ([\d,]+) gzip bytes/u;

function readNumber(text) {
  return Number(text.replaceAll(",", ""));
}

async function readInput() {
  const file = process.argv.slice(2).find((argument) => !argument.startsWith("--"));
  if (file) return readFile(file, "utf8");
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

const input = await readInput();
const match = SUMMARY.exec(input);
if (!match) {
  console.error("No 'Public production browser bundle' summary line in the input (phis-site-skeleton `pnpm bundle:check:public`).");
  process.exit(2);
}
const measured = { scripts: Number(match[1]), rawBytes: readNumber(match[2]), gzipBytes: readNumber(match[3]) };
const budget = JSON.parse(await readFile(budgetPath, "utf8"));

if (process.argv.includes("--update-budget")) {
  budget.baseline = { ...measured, measuredOn: new Date().toISOString().slice(0, 10) };
  await writeFile(budgetPath, `${JSON.stringify(budget, null, 2)}\n`);
  console.log(`Public bundle budget recorded: ${measured.scripts} scripts, ${measured.rawBytes} raw, ${measured.gzipBytes} gzip bytes.`);
  process.exit(0);
}

const failures = [];
for (const key of ["scripts", "rawBytes", "gzipBytes"]) {
  const limit = budget.baseline[key] + budget.headroom[key];
  if (measured[key] > limit) {
    failures.push(`${key} ${measured[key]} > budget ${limit} (baseline ${budget.baseline[key]} of ${budget.baseline.measuredOn}, headroom ${budget.headroom[key]})`);
  }
}
if (failures.length > 0) {
  console.error(`Public bundle budget exceeded (scripts/audit-public-bundle.budget.json):\n- ${failures.join("\n- ")}`);
  process.exit(1);
}
console.log(`Public bundle within budget: ${measured.scripts} scripts, ${measured.rawBytes} raw, ${measured.gzipBytes} gzip bytes.`);
