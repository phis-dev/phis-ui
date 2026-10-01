import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Dependencies run one way: Modules stand on the Foundation, and nothing stands on a Module (MODULES.md,
 * "The dependency rule").
 *
 *   Module      ->  Foundation        allowed
 *   Module      ->  other Module      forbidden
 *   Foundation  ->  Module            forbidden, for every kind of reference
 *   Builder     ->  other Module      only its `ids`
 *
 * Nothing else held the line, and it had been crossed in both directions without anyone noticing: Core
 * Widgets named the Builder's option Providers, Theme its Pages Provider, the Revisions Controller drew
 * its ids from the Builder's address file, News rendered through Core's Markdown Widget, and the
 * Foundation's page renderer drew the password change with Core's Form Widget. Each compiled, and each
 * bound two units that are meant to be loaded, left out and replaced independently.
 *
 * A Module is a folder under `plugins/runtime-modules/` with a `module.ts`. What stands beside them
 * there -- the contracts, the descriptor compiler, the Area catalogs and client manifests -- is the
 * module system that assembles them and may name every Module; so may the package's own doors in
 * `package.json#exports`, which put the package together. Everything else in the package is Foundation.
 *
 * Every reference counts, the type-only and the lazy ones included: `import type` binds the Foundation
 * to a Module's shape as surely as a value does, and `import()` is still an edge. Tests count too.
 * Naming a Module by its id as data -- a string -- is not a reference and stays allowed.
 */

const packageRoot = fileURLToPath(new URL("..", import.meta.url));
const runtimeModulesDir = "plugins/runtime-modules/";
const sourceExtensions = [".ts", ".tsx", ".mts"];
const skippedDirectories = new Set(["node_modules", ".git", ".next", "dist", "scripts"]);

const moduleNames = new Set(
  readdirSync(path.join(packageRoot, runtimeModulesDir)).filter((entry) => {
    const directory = path.join(packageRoot, runtimeModulesDir, entry);
    return statSync(directory).isDirectory() &&
      (existsSync(path.join(directory, "module.ts")) || existsSync(path.join(directory, "module.tsx")));
  }),
);

function collectExportTargets(value: unknown, into: Set<string>) {
  if (typeof value === "string") {
    into.add(path.normalize(value.replace(/^\.\//, "")));
  } else if (value && typeof value === "object") {
    for (const entry of Object.values(value)) collectExportTargets(entry, into);
  }
}
const packageDoors = new Set<string>();
const packageManifest = JSON.parse(readFileSync(path.join(packageRoot, "package.json"), "utf8"));
collectExportTargets(packageManifest.exports, packageDoors);

type PhiPackageLayer =
  | { kind: "module"; name: string }
  | { kind: "module-system" }
  | { kind: "door" }
  | { kind: "foundation" };

function classify(relativePath: string): PhiPackageLayer {
  if (relativePath.startsWith(runtimeModulesDir)) {
    const name = relativePath.slice(runtimeModulesDir.length).split("/")[0]!;
    return moduleNames.has(name) ? { kind: "module", name } : { kind: "module-system" };
  }
  if (relativePath.startsWith("plugins/")) {
    return { kind: "module-system" };
  }
  if (packageDoors.has(relativePath)) {
    return { kind: "door" };
  }
  return { kind: "foundation" };
}

function collectSourceFiles(directory: string, into: string[]) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!skippedDirectories.has(entry.name)) {
        collectSourceFiles(path.join(directory, entry.name), into);
      }
    } else if (sourceExtensions.some((extension) => entry.name.endsWith(extension)) &&
      !entry.name.endsWith(".d.ts")) {
      into.push(path.join(directory, entry.name));
    }
  }
}

function resolveImport(importingFile: string, specifier: string): string | null {
  if (!specifier.startsWith(".")) {
    return null;
  }
  const base = path.resolve(path.dirname(importingFile), specifier);
  for (const candidate of [
    base,
    ...sourceExtensions.map((extension) => `${base}${extension}`),
    ...sourceExtensions.map((extension) => path.join(base, `index${extension}`)),
  ]) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

// Comments quote imports as often as code makes them; neither kind may count as an edge.
function stripComments(source: string) {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1");
}

// `from "..."`, a bare side-effect `import "..."`, and `import("...")`, in that order of groups.
const importPattern = new RegExp(
  [
    String.raw`\b(?:import|export)\b[^'"\u0060;]*?\bfrom\s*(['"])([^'"]+)\1`,
    String.raw`\bimport\s*(['"])([^'"]+)\3`,
    String.raw`\bimport\(\s*(['"])([^'"]+)\5\s*\)`,
  ].join("|"),
  "g",
);

const sourceFiles: string[] = [];
collectSourceFiles(packageRoot, sourceFiles);
const problems: string[] = [];

for (const file of sourceFiles) {
  const from = classify(path.relative(packageRoot, file));
  if (from.kind === "module-system" || from.kind === "door") {
    continue;
  }
  for (const match of stripComments(readFileSync(file, "utf8")).matchAll(importPattern)) {
    const specifier = match[2] ?? match[4] ?? match[6]!;
    const target = resolveImport(file, specifier);
    if (target === null) {
      continue;
    }
    const targetPath = path.relative(packageRoot, target);
    const to = classify(targetPath);
    if (to.kind !== "module") {
      continue;
    }
    const sourcePath = path.relative(packageRoot, file);
    if (from.kind === "foundation") {
      problems.push(`${sourcePath} -> ${targetPath}: the Foundation may not reference a Module.`);
      continue;
    }
    if (from.name === to.name) {
      continue;
    }
    const builderReadsIds = from.name === "builder" &&
      targetPath === `${runtimeModulesDir}${to.name}/ids.ts`;
    if (!builderReadsIds) {
      problems.push(
        `${sourcePath} -> ${targetPath}: ` +
          `the ${from.name} Module may not reference the ${to.name} Module.`,
      );
    }
  }
}

if (problems.length > 0) {
  console.error("Dependencies run against the module rule (MODULES.md, \"The dependency rule\"):");
  for (const problem of problems) {
    console.error(`  - ${problem}`);
  }
  console.error(
    "Share through the Foundation instead: a contract or a key in constants/ or types/, a Control " +
    "or a shared body in components/. Name another Module by its id as data where it must be named.",
  );
  process.exit(1);
}

console.log(
  `Module dependency direction validated: ${moduleNames.size} Modules, ${sourceFiles.length} files.`,
);
