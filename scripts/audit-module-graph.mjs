import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import ts from "typescript";

import { repositoryRoot } from "./lib/repo-root.mjs";
import { listSourceFiles } from "./lib/source-files.mjs";

const packageManifest = JSON.parse(
  await readFile(path.join(repositoryRoot, "package.json"), "utf8"),
);
const sourceFiles = await listSourceFiles(repositoryRoot, {
  extensions: [".ts", ".tsx", ".mjs"],
  skipDirectories: ["node_modules", "dist", "scripts"],
  skipDotEntries: true,
  regularFilesOnly: true,
  // Plain JavaScript a package entry points at, such as the cache handler Next loads by path.
  rootFiles: ["index.js"],
  relativeTo: repositoryRoot,
  sort: true,
});
const sourceFileSet = new Set(sourceFiles);
const moduleInfo = new Map();

for (const relativePath of sourceFiles) {
  const absolutePath = path.join(repositoryRoot, relativePath);
  const source = await readFile(absolutePath, "utf8");
  const sourceFile = ts.createSourceFile(
    relativePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    relativePath.endsWith(".tsx")
      ? ts.ScriptKind.TSX
      : /\.m?js$/u.test(relativePath)
        ? ts.ScriptKind.JS
        : ts.ScriptKind.TS,
  );
  const allDependencies = new Set();
  const runtimeDependencies = new Set();
  const runtimeImports = [];
  let importsServerOnly = false;

  for (const statement of sourceFile.statements) {
    if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier)) {
      const specifier = statement.moduleSpecifier.text;
      importsServerOnly ||= specifier === "server-only";
      addResolvedDependency(allDependencies, relativePath, specifier);
      if (!isTypeOnlyImport(statement)) {
        addResolvedRuntimeDependency(runtimeDependencies, runtimeImports, relativePath, specifier);
      }
      continue;
    }

    if (ts.isExportDeclaration(statement) && statement.moduleSpecifier && ts.isStringLiteral(statement.moduleSpecifier)) {
      const specifier = statement.moduleSpecifier.text;
      addResolvedDependency(allDependencies, relativePath, specifier);
      if (!statement.isTypeOnly) {
        addResolvedRuntimeDependency(runtimeDependencies, runtimeImports, relativePath, specifier);
      }
    }
  }

  visitDynamicImports(sourceFile, (specifier) => {
    addResolvedDependency(allDependencies, relativePath, specifier);
    addResolvedRuntimeDependency(runtimeDependencies, runtimeImports, relativePath, specifier);
  });

  moduleInfo.set(relativePath, {
    bytes: Buffer.byteLength(source),
    source,
    allDependencies,
    runtimeDependencies,
    runtimeImports,
    isClient: hasDirective(sourceFile, "use client"),
    importsServerOnly,
  });
}

const entryPoints = resolvePackageEntryPoints();
const allReachable = traverse(entryPoints.map((entry) => entry.file), "allDependencies");
const deadFiles = sourceFiles.filter((file) => !allReachable.has(file));
const publicEntryReports = entryPoints.map((entry) => buildEntryReport(entry));
const invalidClientServerEdges = findInvalidClientServerEdges();
const clientBarrelImports = findClientBarrelImports();
const duplicateFiles = findExactDuplicateFiles();

const summary = {
  entryCount: entryPoints.length,
  sourceFileCount: sourceFiles.length,
  sourceBytes: sumBytes(sourceFiles),
  reachableFileCount: allReachable.size,
  reachableBytes: sumBytes(allReachable),
  deadFileCount: deadFiles.length,
  deadBytes: sumBytes(deadFiles),
  clientFileCount: sourceFiles.filter((file) => moduleInfo.get(file).isClient).length,
  serverOnlyFileCount: sourceFiles.filter((file) => moduleInfo.get(file).importsServerOnly).length,
  invalidClientServerEdgeCount: invalidClientServerEdges.length,
  clientBarrelImportCount: clientBarrelImports.length,
  exactDuplicateGroupCount: duplicateFiles.length,
};

// Growth a package entry's graph may take without a budget update; see `checkBudget`.
const BYTE_HEADROOM_RATIO = 0.005;
const BYTE_HEADROOM_MINIMUM = 8 * 1024;
const budgetPath = path.join(repositoryRoot, "scripts/audit-module-graph.budget.json");

if (process.argv.includes("--update-budget")) {
  await writeFile(budgetPath, `${JSON.stringify(measureBudget(), null, 2)}\n`);
  console.log(`Module graph budget written to ${path.relative(repositoryRoot, budgetPath)}.`);
} else if (process.argv.includes("--check")) {
  const failures = checkBudget(JSON.parse(await readFile(budgetPath, "utf8")));
  if (failures.length > 0) {
    console.error([
      "Module graph budget exceeded (scripts/audit-module-graph.budget.json):",
      ...failures.map((failure) => `- ${failure}`),
      "",
      "Take the regression out, or -- when the growth is intended -- say why in TODOS.md or the commit and",
      "record it with `pnpm audit:graph --update-budget`, so the budget moves in the diff and not by itself.",
    ].join("\n"));
    process.exit(1);
  }
} else if (process.argv.includes("--json")) {
  console.log(JSON.stringify({
    summary,
    entries: publicEntryReports,
    deadFiles,
    invalidClientServerEdges,
    clientBarrelImports,
    duplicateFiles,
  }, null, 2));
} else {
  printReport();
}

/*
 * The budget the audit holds the package to (`--check`, a step of `pnpm verify`).
 *
 * Lists are exact: an unreachable source, a broad barrel in a Client graph, or a duplicated file that is
 * not listed fails, and so does a listed one that is gone -- the list only ever shrinks by somebody
 * taking the entry out. A Client may never reach a `server-only` file at all. Graph sizes per package
 * entry may grow by the headroom below, which absorbs ordinary edits to files already in a graph; more
 * than that means something joined the graph, and that is argued for rather than noticed later.
 */
function measureBudget() {
  return {
    unreachableSources: deadFiles.filter(isAuditedSource),
    clientBarrelImports,
    exactDuplicateGroups: duplicateFiles.map((group) => group.join(" = ")),
    entries: Object.fromEntries(publicEntryReports
      .map((entry) => [entry.exportKey, { runtimeBytes: entry.runtimeBytes, clientBytes: entry.clientBytes }])
      .sort(([left], [right]) => left.localeCompare(right))),
  };
}

function checkBudget(budget) {
  const current = measureBudget();
  const failures = [];
  for (const edge of invalidClientServerEdges) {
    failures.push(`Client reaches a server-only file: ${edge.clientFile} -> ${edge.serverOnlyFile}`);
  }
  const compareList = (label, actual, recorded) => {
    const recordedSet = new Set(recorded);
    const actualSet = new Set(actual);
    for (const value of actual) {
      if (!recordedSet.has(value)) failures.push(`new ${label}: ${value}`);
    }
    for (const value of recorded) {
      if (!actualSet.has(value)) failures.push(`${label} gone, take it out of the budget: ${value}`);
    }
  };
  compareList("unreachable package source", current.unreachableSources, budget.unreachableSources);
  compareList("broad barrel in a Client graph", current.clientBarrelImports, budget.clientBarrelImports);
  compareList("exact duplicate group", current.exactDuplicateGroups, budget.exactDuplicateGroups);
  for (const [exportKey, actual] of Object.entries(current.entries)) {
    const recorded = budget.entries[exportKey];
    if (!recorded) {
      failures.push(`package entry ${exportKey} has no budget yet`);
      continue;
    }
    for (const measure of ["runtimeBytes", "clientBytes"]) {
      const limit = recorded[measure] + Math.max(recorded[measure] * BYTE_HEADROOM_RATIO, BYTE_HEADROOM_MINIMUM);
      if (actual[measure] > limit) {
        failures.push(
          `${exportKey} ${measure} ${formatBytes(actual[measure])} > budget ${formatBytes(recorded[measure])} ` +
          `(+${formatBytes(actual[measure] - recorded[measure])}, headroom ${formatBytes(limit - recorded[measure])})`,
        );
      }
    }
  }
  for (const exportKey of Object.keys(budget.entries)) {
    if (!current.entries[exportKey]) failures.push(`package entry ${exportKey} is gone, take it out of the budget`);
  }
  return failures;
}

// Tests are reached by the test runner, not by a package entry; every other unreachable file counts.
function isAuditedSource(file) {
  return !/\.test\.[cm]?[jt]sx?$/u.test(file);
}

function addResolvedDependency(target, importer, specifier) {
  const resolved = resolveRelativeSource(importer, specifier);
  if (resolved) {
    target.add(resolved);
  }
}

function addResolvedRuntimeDependency(target, imports, importer, specifier) {
  const resolved = resolveRelativeSource(importer, specifier);
  if (resolved) {
    target.add(resolved);
    imports.push({ specifier, resolved });
  }
}

function buildEntryReport(entry) {
  const runtimeReachable = traverse([entry.file], "runtimeDependencies");
  const clientBoundaries = [...runtimeReachable].filter((file) => moduleInfo.get(file).isClient);
  const clientReachable = traverse(clientBoundaries, "runtimeDependencies");
  return {
    exportKey: entry.exportKey,
    file: entry.file,
    runtimeFileCount: runtimeReachable.size,
    runtimeBytes: sumBytes(runtimeReachable),
    clientBoundaryCount: clientBoundaries.length,
    clientFileCount: clientReachable.size,
    clientBytes: sumBytes(clientReachable),
  };
}

function findExactDuplicateFiles() {
  const hashGroups = new Map();
  for (const file of sourceFiles) {
    const info = moduleInfo.get(file);
    if (info.source.trim().length < 80) {
      continue;
    }
    const hash = createHash("sha256").update(info.source).digest("hex");
    const group = hashGroups.get(hash) ?? [];
    group.push(file);
    hashGroups.set(hash, group);
  }
  return [...hashGroups.values()]
    .filter((group) => group.length > 1)
    .sort((left, right) => right.length - left.length || left[0].localeCompare(right[0]));
}

function findInvalidClientServerEdges() {
  const invalid = [];
  for (const clientFile of sourceFiles.filter((file) => moduleInfo.get(file).isClient)) {
    const clientGraph = traverse([clientFile], "runtimeDependencies");
    for (const dependency of clientGraph) {
      if (moduleInfo.get(dependency).importsServerOnly) {
        invalid.push({ clientFile, serverOnlyFile: dependency });
      }
    }
  }
  return invalid.sort((left, right) =>
    left.clientFile.localeCompare(right.clientFile) ||
    left.serverOnlyFile.localeCompare(right.serverOnlyFile));
}

function findClientBarrelImports() {
  const clientGraph = traverse(
    sourceFiles.filter((file) => moduleInfo.get(file).isClient),
    "runtimeDependencies",
  );
  const broadBarrels = new Set([
    "builder.ts",
    "cms.ts",
    "forms.ts",
    "helpers.ts",
    "layouts.ts",
    "media.ts",
    "navigation.ts",
    "root.ts",
    "runtime.ts",
    "shells.ts",
    "state.ts",
    "theme.ts",
    "types.ts",
    "widgets.ts",
  ]);
  const imports = [];
  for (const file of clientGraph) {
    for (const entry of moduleInfo.get(file).runtimeImports) {
      if (broadBarrels.has(entry.resolved)) {
        imports.push(`${file} -> ${entry.resolved}`);
      }
    }
  }
  return [...new Set(imports)].sort();
}

function hasDirective(sourceFile, directive) {
  return sourceFile.statements.some((statement) =>
    ts.isExpressionStatement(statement) &&
    ts.isStringLiteral(statement.expression) &&
    statement.expression.text === directive);
}

function isTypeOnlyImport(statement) {
  const importClause = statement.importClause;
  if (!importClause) {
    return false;
  }
  if (importClause.isTypeOnly) {
    return true;
  }
  if (importClause.name) {
    return false;
  }
  const bindings = importClause.namedBindings;
  return Boolean(
    bindings &&
    ts.isNamedImports(bindings) &&
    bindings.elements.length > 0 &&
    bindings.elements.every((element) => element.isTypeOnly),
  );
}

function printReport() {
  console.log([
    "Phi package module graph",
    `entries=${summary.entryCount}`,
    `sources=${summary.sourceFileCount} (${formatBytes(summary.sourceBytes)})`,
    `reachable=${summary.reachableFileCount} (${formatBytes(summary.reachableBytes)})`,
    `dead=${summary.deadFileCount} (${formatBytes(summary.deadBytes)})`,
    `client=${summary.clientFileCount}`,
    `server-only=${summary.serverOnlyFileCount}`,
    `invalid-client-server=${summary.invalidClientServerEdgeCount}`,
    `client-barrels=${summary.clientBarrelImportCount}`,
    `exact-duplicate-groups=${summary.exactDuplicateGroupCount}`,
  ].join(" | "));

  console.log("\nLargest public entry runtime graphs:");
  for (const entry of [...publicEntryReports]
    .sort((left, right) => right.clientBytes - left.clientBytes || right.runtimeBytes - left.runtimeBytes)
    .slice(0, 15)) {
    console.log(
      `${entry.exportKey.padEnd(42)} runtime=${String(entry.runtimeFileCount).padStart(4)} ` +
      `${formatBytes(entry.runtimeBytes).padStart(10)} client=${String(entry.clientFileCount).padStart(4)} ` +
      `${formatBytes(entry.clientBytes).padStart(10)} boundaries=${entry.clientBoundaryCount}`,
    );
  }

  printList("\nUnreachable package sources:", deadFiles, 80);
  printList(
    "\nInvalid Client to server-only reachability:",
    invalidClientServerEdges.map((edge) => `${edge.clientFile} -> ${edge.serverOnlyFile}`),
    80,
  );
  printList("\nBroad package barrels in Client reachability:", clientBarrelImports, 80);
  printList(
    "\nExact duplicate files:",
    duplicateFiles.map((group) => group.join(" = ")),
    80,
  );
}

function printList(label, values, limit) {
  console.log(label);
  if (values.length === 0) {
    console.log("(none)");
    return;
  }
  for (const value of values.slice(0, limit)) {
    console.log(value);
  }
  if (values.length > limit) {
    console.log(`... ${values.length - limit} more`);
  }
}

function resolvePackageEntryPoints() {
  return Object.entries(packageManifest.exports).map(([exportKey, conditions]) => {
    const target = conditions.import ?? conditions.default;
    const normalized = target.replace(/^\.\//u, "");
    const resolved = resolveSourceCandidate(normalized);
    if (!resolved) {
      throw new Error(`Cannot resolve package entry "${exportKey}" from "${target}".`);
    }
    return { exportKey, file: resolved };
  });
}

function resolveRelativeSource(importer, specifier) {
  if (!specifier.startsWith(".")) {
    return null;
  }
  const importerDirectory = path.posix.dirname(importer);
  return resolveSourceCandidate(path.posix.normalize(path.posix.join(importerDirectory, specifier)));
}

function resolveSourceCandidate(candidate) {
  const withoutRuntimeExtension = candidate.replace(/\.(?:js|jsx|mjs|cjs)$/u, "");
  const candidates = [
    candidate,
    `${withoutRuntimeExtension}.ts`,
    `${withoutRuntimeExtension}.tsx`,
    path.posix.join(withoutRuntimeExtension, "index.ts"),
    path.posix.join(withoutRuntimeExtension, "index.tsx"),
  ];
  return candidates.find((file) => sourceFileSet.has(file)) ?? null;
}

function sumBytes(files) {
  let total = 0;
  for (const file of files) {
    total += moduleInfo.get(file)?.bytes ?? 0;
  }
  return total;
}

function traverse(startFiles, dependencyKey) {
  const visited = new Set();
  const pending = [...startFiles];
  while (pending.length > 0) {
    const file = pending.pop();
    if (!file || visited.has(file)) {
      continue;
    }
    visited.add(file);
    for (const dependency of moduleInfo.get(file)?.[dependencyKey] ?? []) {
      pending.push(dependency);
    }
  }
  return visited;
}

function visitDynamicImports(node, onImport) {
  if (
    ts.isCallExpression(node) &&
    node.expression.kind === ts.SyntaxKind.ImportKeyword &&
    node.arguments.length === 1 &&
    ts.isStringLiteral(node.arguments[0])
  ) {
    onImport(node.arguments[0].text);
  }
  ts.forEachChild(node, (child) => visitDynamicImports(child, onImport));
}

function formatBytes(bytes) {
  return `${(bytes / 1024).toFixed(1)} KiB`;
}
