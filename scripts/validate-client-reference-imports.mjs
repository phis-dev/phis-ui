import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

// A server component that imports from a client barrel pins the barrel's whole module
// evaluation through the generated client reference: the browser then loads every module the
// barrel re-exports, eagerly, on every page — tree shaking never applies to client references.
// Importing `App` from "antd" inside the root layout put the entire antd component set
// (~1.5 MB uncompressed) into the first load of every Area route. Files without a
// "use client" directive must therefore import these packages through deep paths
// (e.g. "antd/es/app"); type-only imports are erased at compile time and stay allowed.
const restrictedBarrels = new Set(["antd", "@ant-design/icons"]);

const scannedRoots = [
  "components",
  "constants",
  "gateway",
  "helpers",
  "net",
  "plugins",
  "server-helpers",
  "theme",
  "types",
];

const repositoryRoot = process.cwd();

async function collectSourceFiles(root) {
  const entries = await readdir(root, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const entryPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectSourceFiles(entryPath)));
    } else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith(".d.ts")) {
      files.push(entryPath);
    }
  }
  return files;
}

function hasUseClientDirective(source) {
  // The directive must appear in the file prologue, before the first import.
  const prologue = source.slice(0, source.search(/\bimport\b/) >= 0 ? source.search(/\bimport\b/) : 512);
  return /(^|\n)\s*(['"])use client\2\s*;?/.test(prologue);
}

function findRestrictedBarrelImports(source) {
  const violations = [];
  const statementPattern = /(?:^|\n)\s*((?:import|export)\b[\s\S]*?from\s*(['"])([^'"]+)\2|import\s*(['"])([^'"]+)\4)\s*;?/g;
  for (const match of source.matchAll(statementPattern)) {
    const statement = match[1];
    const specifier = match[3] ?? match[5];
    if (!restrictedBarrels.has(specifier)) {
      continue;
    }
    if (/^(?:import|export)\s+type\b/.test(statement)) {
      continue;
    }
    violations.push(statement.replace(/\s+/g, " ").trim());
  }
  return violations;
}

const failures = [];

for (const root of scannedRoots) {
  const absoluteRoot = path.join(repositoryRoot, root);
  let files;
  try {
    files = await collectSourceFiles(absoluteRoot);
  } catch {
    continue;
  }
  for (const file of files) {
    const source = await readFile(file, "utf8");
    if (hasUseClientDirective(source)) {
      continue;
    }
    for (const statement of findRestrictedBarrelImports(source)) {
      failures.push(`${path.relative(repositoryRoot, file)}: ${statement}`);
    }
  }
}

if (failures.length > 0) {
  console.error(
    "Client barrel imports from server modules pin the whole barrel into every first load.",
  );
  console.error(
    'Use a deep import (e.g. "antd/es/app") or move the import behind a "use client" boundary:',
  );
  for (const failure of failures) {
    console.error(`  ${failure}`);
  }
  process.exit(1);
}
