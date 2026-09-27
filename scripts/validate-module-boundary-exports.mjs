import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

// Which of this package's doors a Module package may open from a file the browser reaches.
//
// A Module outside `@phis/ui` reaches this package only through `package.json#exports`, and several of
// those doors are barrels: `./forms` carries `gateway/form-submit`, `./server-helpers` carries
// `server-helpers/runtime`, and both bring `server-only` with them. A first-party Module never meets
// this, because it imports `../../gateway/label-set` -- one file. The package outside has to take the
// barrel, and then the barrel decides what its graph contains.
//
// That matters because a Module definition is read on both sides of the seam: the generated Client
// projection imports `phiModuleDefinitions` from the package root, so whatever the definition's import
// chain touches ends up in the browser graph. Nothing fails to compile. What happens instead is that
// every page of the Site answers 500, with an import trace that names the barrel rather than the file
// that reached for it. On 2026-09-27 that cost three rounds on one Module: `createPhiFormId` in a file
// the definition imported, and `definePhiRuntimeModuleLabelSet` taken from the server barrel because
// THIRD_PARTY_MODULES.md said to.
//
// So the answer is written down here rather than discovered there. Every export subpath is walked, and
// the ones whose value-import graph reaches `server-only` or `next/headers` are recorded in
// `package.json#phis.serverOnlyExports`. `phis module check` reads that list out of the installed
// package and refuses a Module whose Client-reachable files import one of them -- at install, with the
// file that did it named.
//
// Static edges only. A `dynamic(() => import(...))` inside Client code is a separate chunk and a
// separate question; what makes a barrel dangerous is that it is pulled in eagerly.

const repositoryRoot = process.cwd();
const write = process.argv.includes("--write");
const sourceExtensions = [".ts", ".tsx"];

function resolveModuleFile(base) {
  for (const candidate of [base, ...sourceExtensions.map((extension) => `${base}${extension}`),
    ...sourceExtensions.map((extension) => path.join(base, `index${extension}`))]) {
    if (existsSync(candidate) && !candidate.endsWith(path.sep)) {
      try {
        if (readFileSync(candidate) != null) {
          return candidate;
        }
      } catch {
        // A directory read throws; that is a miss and not a fault.
      }
    }
  }
  return null;
}

function resolveSpecifier(specifier, importingFile) {
  if (specifier.startsWith(".")) {
    return resolveModuleFile(path.resolve(path.dirname(importingFile), specifier));
  }
  if (specifier === "@phis/ui") {
    return resolveModuleFile(path.join(repositoryRoot, "index"));
  }
  if (specifier.startsWith("@phis/ui/")) {
    return resolveModuleFile(path.join(repositoryRoot, specifier.slice("@phis/ui/".length)));
  }
  return null;
}

const sourceCache = new Map();
function readSource(file) {
  if (!sourceCache.has(file)) {
    const raw = readFileSync(file, "utf8");
    // Comments quote imports as often as code makes them; neither kind may count as an edge.
    const code = raw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
    sourceCache.set(file, { raw, code });
  }
  return sourceCache.get(file);
}

const staticStatementPattern =
  /(?:^|\n)\s*((?:import|export)\b[^;'"]*?\bfrom\s*(['"])([^'"]+)\2|import\s*(['"])([^'"]+)\4)/g;

function readStaticImports(file) {
  const imports = [];
  for (const match of readSource(file).code.matchAll(staticStatementPattern)) {
    // "import type" is erased; "import { type X }" is not, under verbatimModuleSyntax.
    if (/^(?:import|export)\s+type\b/.test(match[1].trim())) {
      continue;
    }
    const target = resolveSpecifier(match[3] ?? match[5], file);
    if (target) {
      imports.push(target);
    }
  }
  return imports;
}

/** Why a file may not be reached from the browser, or null. Named, because the message says which. */
function readServerMark(file) {
  const { raw, code } = readSource(file);
  if (/(^|\n)\s*import\s*(['"])server-only\2\s*;?/.test(raw)) {
    return "server-only";
  }
  return /\bfrom\s*["']next\/headers["']/.test(code) ? "next/headers" : null;
}

/** The first file in the graph that cannot be in the browser, with the way it was reached. */
function findServerReach(entry) {
  const seen = new Set();
  const queue = [[entry, [entry]]];
  while (queue.length > 0) {
    const [file, trail] = queue.shift();
    if (seen.has(file)) {
      continue;
    }
    seen.add(file);
    const mark = readServerMark(file);
    if (mark) {
      return { mark, trail };
    }
    for (const next of readStaticImports(file)) {
      queue.push([next, [...trail, next]]);
    }
  }
  return null;
}

function resolveExportTarget(entry) {
  if (typeof entry === "string") {
    return entry;
  }
  if (entry && typeof entry === "object") {
    for (const condition of ["import", "default"]) {
      if (typeof entry[condition] === "string") {
        return entry[condition];
      }
    }
  }
  return null;
}

const manifestFile = path.join(repositoryRoot, "package.json");
const manifest = JSON.parse(readFileSync(manifestFile, "utf8"));
const serverOnly = [];
let walked = 0;

for (const [subpath, entry] of Object.entries(manifest.exports ?? {})) {
  const target = resolveExportTarget(entry);
  if (!target || !target.endsWith(".ts") && !target.endsWith(".tsx")) {
    continue;
  }
  const file = path.join(repositoryRoot, target);
  if (!existsSync(file)) {
    continue;
  }
  walked += 1;
  const reach = findServerReach(file);
  if (reach) {
    serverOnly.push(subpath);
  }
}

serverOnly.sort();
const recorded = manifest.phis?.serverOnlyExports ?? null;

if (write) {
  manifest.phis = { ...(manifest.phis ?? {}), serverOnlyExports: serverOnly };
  writeFileSync(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Recorded ${serverOnly.length} server-only export subpaths of ${walked} walked.`);
  process.exit(0);
}

if (recorded == null) {
  console.error(
    'package.json states no "phis".serverOnlyExports. Run ' +
      "`node scripts/validate-module-boundary-exports.mjs --write`.",
  );
  process.exit(1);
}

const missing = serverOnly.filter((subpath) => !recorded.includes(subpath));
const stale = recorded.filter((subpath) => !serverOnly.includes(subpath));
if (missing.length > 0 || stale.length > 0) {
  console.error("Module boundary export violations:");
  for (const subpath of missing) {
    const target = resolveExportTarget(manifest.exports[subpath]);
    const reach = findServerReach(path.join(repositoryRoot, target));
    const via = reach.trail.slice(1, 3).map((file) => path.relative(repositoryRoot, file)).join(" -> ");
    console.error(
      `  "${subpath}" reaches ${reach.mark}${via ? ` via ${via}` : ""} and is not recorded. A Module ` +
        "package importing it from a Client-reachable file breaks the Site at render.",
    );
  }
  for (const subpath of stale) {
    console.error(`  "${subpath}" is recorded and no longer reaches server-only code.`);
  }
  console.error("  Run `node scripts/validate-module-boundary-exports.mjs --write` once the change is intended.");
  process.exit(1);
}

console.log(
  `Module boundary exports validated: ${walked} export subpaths walked, ${serverOnly.length} are ` +
    "server-only and recorded for `phis module check`.",
);
