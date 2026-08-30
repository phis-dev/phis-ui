import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const packageManifest = JSON.parse(
  await readFile(path.join(repositoryRoot, "package.json"), "utf8"),
);
const sourceFiles = await collectSourceFiles(repositoryRoot);
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
      : relativePath.endsWith(".js")
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

if (process.argv.includes("--json")) {
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

async function collectSourceFiles(directory, prefix = "") {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (
      entry.name === "node_modules" ||
      entry.name === "dist" ||
      entry.name === "scripts" ||
      entry.name.startsWith(".")
    ) {
      continue;
    }
    const relativePath = path.posix.join(prefix, entry.name);
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectSourceFiles(absolutePath, relativePath));
    } else if (
      entry.isFile() &&
      (
        /\.(?:ts|tsx)$/u.test(entry.name) ||
        (prefix === "" && entry.name === "index.js")
      ) &&
      !entry.name.endsWith(".d.ts")
    ) {
      files.push(relativePath);
    }
  }

  return files.sort();
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
