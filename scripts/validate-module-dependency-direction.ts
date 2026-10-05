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
 * The module system is two things, and the Foundation may use only one of them. Its catalogs and
 * manifests gather the Modules; its contracts, compiler and Area definitions are infrastructure the
 * Foundation builds on. Which is which is not listed but measured: a module-system file is a catalog
 * when it leads to a Module, and the Foundation may not import one.
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

const importsByFile = new Map<string, string[]>();
for (const file of sourceFiles) {
  const targets: string[] = [];
  for (const match of stripComments(readFileSync(file, "utf8")).matchAll(importPattern)) {
    const target = resolveImport(file, match[2] ?? match[4] ?? match[6]!);
    if (target !== null) targets.push(path.relative(packageRoot, target));
  }
  importsByFile.set(path.relative(packageRoot, file), targets);
}

/*
 * The contract layer does not compile the UI.
 *
 * `types/` and `constants/` are what `@phis/ui/types` and `@phis/ui/constants` ship, and a Module reads
 * them without wanting a Component or a gateway. A type-only import is erased when the file is compiled
 * and binds nothing. A value import compiles its target, and everything that target compiles, into every
 * consumer of the contract: `types/cms-config.ts` once pulled a Layout module in for a list of grid
 * column counts, and a type in `types/form-descriptor.ts` named a `server-only` gateway. What is
 * refused is therefore not the import but what it reaches: a value import from `components/` or
 * `gateway/` whose runtime graph holds React, Ant Design, `server-only` or a gateway module. A pure parser
 * under `components/widgets/config/` passes, because compiling it costs the contract nothing it does not
 * already carry; where such a module belongs is a separate question (helpers/, by the look of it).
 */
const contractLayerPattern = /^(types|constants)\//u;
const uiLayerPattern = /^(components|gateway)\//u;
const valueImportPattern = new RegExp(
  [
    String.raw`\b(import|export)\s+(type\s+)?(\*(?:\s+as\s+[\w$]+)?|\{[^}]*\}|[\w$]+(?:\s*,\s*\{[^}]*\})?)\s*from\s*(['"])([^'"]+)\4`,
    String.raw`\bimport\s*(['"])([^'"]+)\6`,
  ].join("|"),
  "g",
);
const uiRuntimeSpecifierPattern = /^(react|react-dom|server-only|antd|antd\/|@ant-design\/)/u;

/** The value edges of one file: what it compiles, as local files and as bare specifiers. */
function readValueImports(file: string) {
  const locals: string[] = [];
  const externals: string[] = [];
  for (const match of stripComments(readFileSync(file, "utf8")).matchAll(valueImportPattern)) {
    const sideEffectSpecifier = match[7];
    if (sideEffectSpecifier !== undefined) {
      const target = resolveImport(file, sideEffectSpecifier);
      if (target === null) externals.push(sideEffectSpecifier);
      else locals.push(target);
      continue;
    }
    const [, , typeKeyword, clause, , specifier] = match;
    const typeOnly = typeKeyword !== undefined ||
      (clause!.startsWith("{") && clause!.slice(1, -1).split(",").every((entry) =>
        entry.trim() === "" || entry.trim().startsWith("type ")));
    if (typeOnly) continue;
    const target = resolveImport(file, specifier!);
    if (target === null) externals.push(specifier!);
    else locals.push(target);
  }
  return { locals, externals };
}

const valueImportsByFile = new Map<string, ReturnType<typeof readValueImports>>();
function valueImportsOf(file: string) {
  let edges = valueImportsByFile.get(file);
  if (!edges) {
    edges = readValueImports(file);
    valueImportsByFile.set(file, edges);
  }
  return edges;
}

/** What a value import of `start` compiles that a contract must not: the first offender, or null. */
function findUiRuntimeReach(start: string): string | null {
  const seen = new Set<string>();
  const queue = [start];
  while (queue.length > 0) {
    const file = queue.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);
    const relativePath = path.relative(packageRoot, file);
    if (relativePath.startsWith("gateway/")) return relativePath;
    const edges = valueImportsOf(file);
    const offender = edges.externals.find((specifier) => uiRuntimeSpecifierPattern.test(specifier));
    if (offender) return `${relativePath} -> ${offender}`;
    queue.push(...edges.locals);
  }
  return null;
}

for (const file of sourceFiles) {
  const relativePath = path.relative(packageRoot, file);
  if (!contractLayerPattern.test(relativePath)) continue;
  for (const target of valueImportsOf(file).locals) {
    const targetPath = path.relative(packageRoot, target);
    if (!uiLayerPattern.test(targetPath)) continue;
    const reach = findUiRuntimeReach(target);
    if (reach !== null) {
      problems.push(
        `${relativePath} -> ${targetPath}: the contract layer may not compile the UI; this value import ` +
          `reaches ${reach}. Import the type, or move the value into constants/, types/ or helpers/.`,
      );
    }
  }
}

/*
 * The module system's files that reach a Module, through other module-system files or directly: the
 * catalogs and manifests. The rest of the module system -- contracts, the descriptor compiler, the
 * Area definitions -- is what the Foundation builds on, and it may only stay that while nothing in it
 * leads to a Module. A Foundation file importing a catalog reaches every Module in it, which is the
 * dependency the rule forbids, taken one step round.
 */
const reachingModules = new Set<string>();
for (let grew = true; grew;) {
  grew = false;
  for (const [file, targets] of importsByFile) {
    if (classify(file).kind !== "module-system" || reachingModules.has(file)) continue;
    if (targets.some((target) => classify(target).kind === "module" || reachingModules.has(target))) {
      reachingModules.add(file);
      grew = true;
    }
  }
}

for (const [sourcePath, targets] of importsByFile) {
  const from = classify(sourcePath);
  if (from.kind === "module-system" || from.kind === "door") {
    continue;
  }
  for (const targetPath of targets) {
    const to = classify(targetPath);
    if (from.kind === "foundation" && to.kind === "module-system" && reachingModules.has(targetPath)) {
      problems.push(
        `${sourcePath} -> ${targetPath}: the Foundation may not import a module-system file that ` +
          "reaches a Module.",
      );
      continue;
    }
    if (to.kind !== "module") {
      continue;
    }
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

/*
 * What each of the package's doors makes a Module package compile.
 *
 * The doors point at sources, so whoever imports one compiles everything it reaches -- `import type`
 * included, which loads and checks the file as surely as a value import does. `@phis/ui/cms/plugins`
 * re-exported the first-party catalog beside its contract types, and so every Module that only wanted
 * `PhiRuntimeModule` compiled all of phis-ui's Modules, their React and five CSS Modules, and failed on
 * `*.module.css` it never wrote. Two rules hold the doors since:
 *
 * - A door reaches a Module or a catalog only if it exists to assemble them, and is named below.
 * - A door reaches a stylesheet only if a Next app is what opens it. Controls name their classes and
 *   `styles/` is loaded by the root layout, so nothing a Module imports carries a CSS import.
 * - A door reaches Node -- a `node:` import, or `process` a file does not declare itself -- only
 *   if it serves the server or the Next app. The data doors a Module builds on stay free of it: a
 *   type-only import of `PhiSiteTheme` from its gateway had put `node:fs` behind `@phis/ui/controls`.
 */
const PHI_ASSEMBLY_DOORS: Readonly<Record<string, string>> = {
  "./widgets": "the server Widgets Core ships, for a Site to render directly",
  "./media": "the image preview grid of the Core Collection View",
  "./builder-api-route": "the Builder's preview route",
  "./runtime/authoring-client": "the Core Table's static resource editor for authoring",
  "./runtime/data-provider-client": "the Core Card's Collection binding",
};
const PHI_ASSEMBLY_DOOR_PATTERNS = [
  /^\.\/next\//u, // the Next app's routes and Areas
  /^\.\/runtime\/client-manifests\//u, // an Area's Render Client manifest
  /^\.\/cms\/plugins\/[a-z]+$/u, // an Area's plugin catalog
];
const PHI_SITE_DOORS = new Set(["./shells", "./root", "./cms", "./cms/root-layout"]);
// Doors for server code and the Next app, which run on Node and may say so.
const PHI_SERVER_DOORS = new Set([
  "./shells",
  "./root",
  "./server-helpers",
  "./net",
  "./widgets",
  "./module/labels",
  "./helpers/site-runtime",
  "./cms",
  "./cms/request",
  "./cms/root-layout",
  "./cms/root-page",
  "./cms/root-slot-page",
  "./cms/error-page",
]);
const PHI_SERVER_DOOR_PATTERNS = [
  /^\.\/next\//u,
  /^\.\/runtime\/client-manifests\//u,
  /^\.\/cms\/plugins\/[a-z]+$/u,
];

const nodeUseByFile = new Map<string, boolean>();
/*
 * Whether a file needs Node types: a `node:` import, or `process` it does not declare itself. Reading
 * the build mode is fine where the file declares `process` as far as it reads it, as the signal bus
 * does; Next inlines the value, and no Node type is needed for it.
 */
function usesNode(relativePath: string) {
  let answer = nodeUseByFile.get(relativePath);
  if (answer === undefined) {
    const code = stripComments(readFileSync(path.join(packageRoot, relativePath), "utf8"));
    answer = /\bfrom\s*["']node:|\bimport\(\s*["']node:/u.test(code) ||
      (/\bprocess\./u.test(code) && !/\bdeclare const process\b/u.test(code));
    nodeUseByFile.set(relativePath, answer);
  }
  return answer;
}
const PHI_SITE_DOOR_PATTERN = /^\.\/next\//u;

function collectDoorEntries(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of ["types", "import", "default"]) {
      if (key in record) return collectDoorEntries(record[key]);
    }
    for (const entry of Object.values(record)) {
      const found = collectDoorEntries(entry);
      if (found) return found;
    }
  }
  return null;
}

for (const [door, value] of Object.entries(packageManifest.exports as Record<string, unknown>)) {
  const entry = collectDoorEntries(value);
  if (!entry || !/\.(ts|tsx)$/u.test(entry)) continue;
  const start = path.normalize(entry.replace(/^\.\//u, ""));
  const seen = new Set([start]);
  const queue = [start];
  let reachedModule: string | null = null;
  let reachedStylesheet: string | null = null;
  let reachedNode: string | null = null;
  while (queue.length > 0) {
    const file = queue.shift()!;
    if (!reachedNode && !file.endsWith(".css") && usesNode(file)) {
      reachedNode = file;
    }
    for (const target of importsByFile.get(file) ?? []) {
      if (target.endsWith(".css")) {
        reachedStylesheet ??= `${file} -> ${target}`;
        continue;
      }
      if (!reachedModule && (classify(target).kind === "module" || reachingModules.has(target))) {
        reachedModule = `${file} -> ${target}`;
      }
      if (!seen.has(target)) {
        seen.add(target);
        queue.push(target);
      }
    }
  }
  const assembles = door in PHI_ASSEMBLY_DOORS || PHI_ASSEMBLY_DOOR_PATTERNS.some((pattern) => pattern.test(door));
  if (reachedModule && !assembles) {
    problems.push(
      `${door} reaches a Module or a catalog (${reachedModule}); a Module importing it would compile ` +
        "them. Re-export from somewhere module-free, or name the door as one that assembles Modules.",
    );
  }
  const forServer = PHI_SERVER_DOORS.has(door) ||
    PHI_SERVER_DOOR_PATTERNS.some((pattern) => pattern.test(door));
  if (reachedNode && !forServer) {
    problems.push(
      `${door} reaches Node code (${reachedNode}); a Module importing it would need Node types. ` +
        "Move the shape it needs into types/, or name the door as one that serves the server.",
    );
  }
  const forSites = PHI_SITE_DOORS.has(door) || PHI_SITE_DOOR_PATTERN.test(door);
  if (reachedStylesheet && !forSites) {
    problems.push(
      `${door} reaches a stylesheet (${reachedStylesheet}); a Module importing it would need CSS ` +
        "declarations. Name classes and put the rules in styles/, loaded by the root layout.",
    );
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
  `Module dependency direction validated: ${moduleNames.size} Modules, ${sourceFiles.length} files, ` +
    `${reachingModules.size} module-system files that gather Modules.`,
);
