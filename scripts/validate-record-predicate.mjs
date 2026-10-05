import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

/**
 * "Is this a plain record" is answered once.
 *
 * `helpers/is-record.ts` holds the predicate, and its comment said the thirty private copies had been
 * folded into it -- while seventy new ones stood in the tree, spelled `typeof x === "object" &&
 * !Array.isArray(x)` and its negation, some with the null check and some without. Two spellings of one
 * question is how an array came to pass as a record in one reader and not the next. A file that asks the
 * question imports `isPhiRecord`; this fails the build for every spelling of its own.
 */
const repositoryRoot = process.cwd();
const predicateFile = "helpers/is-record.ts";
const sourceDirectories = ["components", "constants", "gateway", "helpers", "next", "plugins", "server-helpers", "theme", "types"];
const skippedDirectories = new Set(["node_modules", "dist", ".next", ".git"]);

const spellings = [
  /typeof\s+([\w.?]+)\s*===\s*"object"\s*&&\s*!Array\.isArray\(\1\)/u,
  /typeof\s+([\w.?]+)\s*!==\s*"object"\s*\|\|\s*Array\.isArray\(\1\)/u,
];

async function listSourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!skippedDirectories.has(entry.name)) {
        files.push(...(await listSourceFiles(path.join(directory, entry.name))));
      }
      continue;
    }
    if (/\.(ts|tsx|mjs)$/u.test(entry.name) && !/\.test\.tsx?$/u.test(entry.name)) {
      files.push(path.join(directory, entry.name));
    }
  }
  return files;
}

const failures = [];
for (const directory of sourceDirectories) {
  for (const file of await listSourceFiles(path.join(repositoryRoot, directory))) {
    const relative = path.relative(repositoryRoot, file).split(path.sep).join("/");
    if (relative === predicateFile) continue;
    const source = await readFile(file, "utf8");
    const lines = source.split("\n");
    lines.forEach((line, index) => {
      if (spellings.some((pattern) => pattern.test(line))) {
        failures.push(`${relative}:${index + 1} spells the record predicate itself; import isPhiRecord from ${predicateFile}.`);
      }
    });
  }
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("Record predicate is written once.");
