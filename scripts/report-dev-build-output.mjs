import { lstat, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { repositoryRoot } from "./lib/repo-root.mjs";

/*
 * What the Skeleton's development build writes, by kind, held to a budget.
 *
 * `next dev` with Turbopack keeps everything under `.next/dev`: its persistent cache, the server chunks the
 * dev server renders with, the browser chunks it serves and a source map beside almost every one of them.
 * Nobody looks at it until a disk is full -- 3.2 GB on 2026-11-24, two thirds of it cache -- and a change
 * that doubles the maps or the server graph shows up nowhere else. This reads the directory as it stands
 * (it builds nothing, so it may run beside the dev service) and reports four kinds apart:
 *
 *   cache          `cache/` (Turbopack's persistent cache)
 *   source maps    every `*.map` outside the cache
 *   server chunks  `server/` without its maps
 *   browser chunks `static/` without its maps
 *   other          manifests, traces, logs, types
 *
 *   node scripts/report-dev-build-output.mjs [<.next directory>] [--check] [--update-budget]
 *
 * The directory defaults to `../phis-site-skeleton/.next`. `--check` fails where a kind exceeds its budget
 * (`scripts/report-dev-build-output.budget.json`, the recorded bytes plus the headroom stated there);
 * `--update-budget` records what was measured. Run it as the user the dev service writes as (`phis`).
 */

const budgetPath = path.join(repositoryRoot, "scripts/report-dev-build-output.budget.json");
const argumentsGiven = process.argv.slice(2);
const directoryArgument = argumentsGiven.find((argument) => !argument.startsWith("--"));
const nextDirectory = path.resolve(directoryArgument ?? path.join(repositoryRoot, "../phis-site-skeleton/.next"));
const root = path.join(nextDirectory, "dev");
const KINDS = ["cache", "sourceMaps", "serverChunks", "browserChunks", "other"];

function kindOf(relativePath) {
  const [top] = relativePath.split(path.sep);
  if (top === "cache") return "cache";
  if (relativePath.endsWith(".map")) return "sourceMaps";
  if (top === "server") return "serverChunks";
  if (top === "static") return "browserChunks";
  return "other";
}

const totals = Object.fromEntries(KINDS.map((kind) => [kind, { bytes: 0, files: 0 }]));

async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await walk(absolute);
    } else if (entry.isFile()) {
      const kind = kindOf(path.relative(root, absolute));
      totals[kind].bytes += (await lstat(absolute)).size;
      totals[kind].files += 1;
    }
  }
}

try {
  await walk(root);
} catch (error) {
  console.error(`Cannot read ${root}: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(2);
}

const mib = (bytes) => `${(bytes / 1048576).toFixed(1)} MiB`;
const all = KINDS.reduce((sum, kind) => sum + totals[kind].bytes, 0);
console.log(`Development build output in ${root}: ${mib(all)}`);
for (const kind of KINDS) {
  console.log(`  ${kind.padEnd(14)} ${mib(totals[kind].bytes).padStart(12)}  ${String(totals[kind].files).padStart(7)} files`);
}

const budget = JSON.parse(await readFile(budgetPath, "utf8"));
if (argumentsGiven.includes("--update-budget")) {
  budget.recorded = {
    measuredOn: new Date().toISOString().slice(0, 10),
    ...Object.fromEntries(KINDS.map((kind) => [kind, totals[kind].bytes])),
  };
  await writeFile(budgetPath, `${JSON.stringify(budget, null, 2)}\n`);
  console.log("Budget recorded.");
} else if (argumentsGiven.includes("--check")) {
  const failures = KINDS.flatMap((kind) => {
    const limit = Math.round(budget.recorded[kind] * (1 + budget.headroomRatio));
    return totals[kind].bytes > limit
      ? [`${kind} ${mib(totals[kind].bytes)} > budget ${mib(limit)} (recorded ${mib(budget.recorded[kind])} on ${budget.recorded.measuredOn})`]
      : [];
  });
  if (failures.length > 0) {
    console.error(`Development build output over budget (scripts/report-dev-build-output.budget.json):\n- ${failures.join("\n- ")}`);
    process.exit(1);
  }
  console.log("Within budget.");
}
