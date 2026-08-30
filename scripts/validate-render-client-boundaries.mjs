import { readdir, readFile } from "node:fs/promises";
import { existsSync, statSync } from "node:fs";
import path from "node:path";
import process from "node:process";

// A client implementation that a server module imports as a value becomes a client reference of
// every route whose server graph reaches it -- the RSC manifest names it, and the browser loads its
// chunks on first load of that route. Tree shaking never applies to client references.
//
// Two shapes of that mistake shipped undetected: phi-grid-layout.tsx imported its client as a value
// and rendered it directly, and phi-collapsible-layout.tsx wrote `import { type X } from "./client"`
// which "verbatimModuleSyntax": true keeps alive as a side-effect import. Both put their layout
// client into the Public first load, where no Public preset ever renders a Grid or a Collapsible.
//
// The way in is PhiRuntimeModuleRenderClientHost: the wrapper imports the client as a type only,
// and the Area's Render-Client manifest loads the implementation through a dynamic import. The
// Area that never renders the type never loads the chunk.
//
// Scope: the entries below are this package's Next surface. Repository-root barrels (widgets.ts,
// media.ts, navigation.ts) re-export client components as the package's public API and are not part
// of any route's server graph; they are deliberately not treated as entries here.

const repositoryRoot = process.cwd();
const sourceExtensions = [".ts", ".tsx"];
const layoutClientDirectory = path.join(repositoryRoot, "components/layouts/clients");
const renderClientManifestDirectory = path.join(
  repositoryRoot,
  "plugins/runtime-modules/client-manifests",
);
const nextEntryDirectory = path.join(repositoryRoot, "next");
const scannedRoots = ["components", "gateway", "helpers", "net", "next", "plugins", "server-helpers", "theme"];

function resolveModuleFile(candidate) {
  if (existsSync(candidate) && statSync(candidate).isFile() && /\.tsx?$/.test(candidate)) {
    return candidate;
  }
  for (const extension of sourceExtensions) {
    if (existsSync(candidate + extension)) {
      return candidate + extension;
    }
  }
  for (const extension of sourceExtensions) {
    const indexPath = path.join(candidate, `index${extension}`);
    if (existsSync(indexPath)) {
      return indexPath;
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

async function collectSourceFiles(root) {
  const files = [];
  let entries;
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch {
    return files;
  }
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

const sourceCache = new Map();
async function readSource(file) {
  if (!sourceCache.has(file)) {
    sourceCache.set(file, await readFile(file, "utf8").catch(() => ""));
  }
  return sourceCache.get(file);
}

function hasUseClientDirective(source) {
  // The directive must appear in the file prologue, before the first import.
  const firstImport = source.search(/\bimport\b/);
  return /(^|\n)\s*(['"])use client\2\s*;?/.test(source.slice(0, firstImport >= 0 ? firstImport : 512));
}

// Every static import or re-export, with the statement text so a violation can quote it.
const statementPattern =
  /(?:^|\n)\s*((?:import|export)\b[^;'"]*?\bfrom\s*(['"])([^'"]+)\2|import\s*(['"])([^'"]+)\4)\s*;?/g;

function readStaticImports(source, importingFile) {
  const imports = [];
  for (const match of source.matchAll(statementPattern)) {
    const statement = match[1].replace(/\s+/g, " ").trim();
    const specifier = match[3] ?? match[5];
    const target = resolveSpecifier(specifier, importingFile);
    if (!target) {
      continue;
    }
    // "import type" is erased; "import { type X }" is not, under verbatimModuleSyntax.
    const typeOnly = /^(?:import|export)\s+type\b/.test(statement);
    imports.push({ target, statement, typeOnly });
  }
  return imports;
}

// A dynamic import inside a server module still registers a client reference for the route -- it
// only moves the chunk, not the manifest entry. The server graph therefore has to follow both.
function readDynamicImports(source, importingFile) {
  const imports = [];
  for (const match of source.matchAll(/\bimport\(\s*["']([^"']+)["']\s*\)/g)) {
    const target = resolveSpecifier(match[1], importingFile);
    if (target) {
      imports.push({ target, statement: `import("${match[1]}")`, typeOnly: false });
    }
  }
  return imports;
}

const failures = [];
const allSourceFiles = (
  await Promise.all(scannedRoots.map((root) => collectSourceFiles(path.join(repositoryRoot, root))))
).flat();

// The clients an Area loads through PhiRuntimeModuleRenderClientHost, read off the manifests.
const registeredClients = new Map();
for (const manifestFile of await collectSourceFiles(renderClientManifestDirectory)) {
  const source = await readSource(manifestFile);
  for (const match of source.matchAll(/\bimport\(\s*["']([^"']+)["']\s*\)/g)) {
    const target = resolveSpecifier(match[1], manifestFile);
    if (target) {
      registeredClients.set(target, path.relative(repositoryRoot, manifestFile));
    }
  }
}

// Rule 1: a layout client behind a "use client" directive is reached from outside its own
// directory by type only, and the implementation is registered for the Host to load.
const layoutClients = new Set();
for (const file of await collectSourceFiles(layoutClientDirectory)) {
  if (hasUseClientDirective(await readSource(file))) {
    layoutClients.add(file);
  }
}

const layoutClientReferencedFrom = new Map();
for (const file of allSourceFiles) {
  if (file.startsWith(`${layoutClientDirectory}${path.sep}`)) {
    continue;
  }
  const source = await readSource(file);
  for (const { target, statement, typeOnly } of readStaticImports(source, file)) {
    if (!layoutClients.has(target)) {
      continue;
    }
    if (!layoutClientReferencedFrom.has(target)) {
      layoutClientReferencedFrom.set(target, []);
    }
    layoutClientReferencedFrom.get(target).push(file);
    if (typeOnly || hasUseClientDirective(source)) {
      continue;
    }
    failures.push(
      [
        `${path.relative(repositoryRoot, file)} imports a Layout client as a value:`,
        `    ${statement}`,
        `    -> ${path.relative(repositoryRoot, target)}`,
        '    Import the client as "import type" and render it through PhiRuntimeModuleRenderClientHost.',
        '    Note: "import { type X } from" still emits the import under verbatimModuleSyntax.',
      ].join("\n"),
    );
  }
}

for (const [client, referencedFrom] of layoutClientReferencedFrom) {
  if (registeredClients.has(client) || referencedFrom.length === 0) {
    continue;
  }
  failures.push(
    [
      `${path.relative(repositoryRoot, client)} is used outside components/layouts/clients/ but has no`,
      "    Render-Client loader; PhiRuntimeModuleRenderClientHost would throw for its layout type.",
      `    Referenced from: ${referencedFrom.map((f) => path.relative(repositoryRoot, f)).join(", ")}`,
      `    Register it in ${path.relative(repositoryRoot, renderClientManifestDirectory)}/common.ts.`,
    ].join("\n"),
  );
}

// Rule 2: a registered client stays behind its manifest loader. The manifests themselves live in
// the client graph, reached only from client modules; if any server module reachable from the Next
// entries imports such a client -- statically or dynamically -- the indirection is undone.
const nextEntries = [];
for (const file of await collectSourceFiles(nextEntryDirectory)) {
  if (!hasUseClientDirective(await readSource(file))) {
    nextEntries.push(file);
  }
}

const visitedServerModules = new Set(nextEntries);
const importedBy = new Map();
const queue = [...nextEntries];
while (queue.length > 0) {
  const current = queue.shift();
  const source = await readSource(current);
  const edges = [...readStaticImports(source, current), ...readDynamicImports(source, current)];
  for (const { target, statement, typeOnly } of edges) {
    if (typeOnly) {
      continue;
    }
    const targetSource = await readSource(target);
    if (hasUseClientDirective(targetSource)) {
      // A client reference of whatever route reaches `current`.
      if (registeredClients.has(target)) {
        failures.push(
          [
            `${path.relative(repositoryRoot, target)} is registered as a Render Client in`,
            `    ${registeredClients.get(target)}, but a server module reaches it statically:`,
            `    ${path.relative(repositoryRoot, current)}`,
            `    ${statement}`,
            "    That makes it a client reference of every route reaching this module -- a dynamic import",
            "    moves the chunk but keeps the manifest entry -- so the loader no longer holds it back",
            "    from Areas that never render it.",
          ].join("\n"),
        );
      }
      continue;
    }
    if (!visitedServerModules.has(target)) {
      visitedServerModules.add(target);
      importedBy.set(target, current);
      queue.push(target);
    }
  }
}

if (failures.length > 0) {
  console.error("Render-Client boundary violations:");
  for (const failure of failures) {
    console.error(`  ${failure}`);
  }
  process.exit(1);
}

console.log(
  `Render-Client boundaries validated: ${layoutClients.size} Layout clients behind "use client", ` +
    `${registeredClients.size} registered Render Clients, ` +
    `${visitedServerModules.size} server modules reachable from ${nextEntries.length} Next entries.`,
);
