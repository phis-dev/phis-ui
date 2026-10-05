import { readdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { resolveSpecifier, readStaticImports as readStaticStatements } from "./lib/module-resolution.mjs";
import { repositoryRoot } from "./lib/repo-root.mjs";
import { listSourceFiles } from "./lib/source-files.mjs";
import { readSource } from "./lib/text.mjs";

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

const layoutClientDirectory = path.join(repositoryRoot, "components/layouts/clients");
const renderClientManifestDirectory = path.join(
  repositoryRoot,
  "plugins/runtime-modules/client-manifests",
);
const nextEntryDirectory = path.join(repositoryRoot, "next");
const scannedRoots = ["components", "gateway", "helpers", "net", "next", "plugins", "server-helpers", "theme"];

function hasUseClientDirective(source) {
  // The directive must appear in the file prologue, before the first import.
  const firstImport = source.search(/\bimport\b/);
  return /(^|\n)\s*(['"])use client\2\s*;?/.test(source.slice(0, firstImport >= 0 ? firstImport : 512));
}

// Every static import or re-export, with the statement text so a violation can quote it.
function readStaticImports(source, importingFile) {
  return readStaticStatements(source, importingFile, { consumeTrailingWhitespace: true });
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
  await Promise.all(scannedRoots.map((root) => listSourceFiles(path.join(repositoryRoot, root))))
).flat();

// The clients an Area loads through PhiRuntimeModuleRenderClientHost, read off the manifests.
const registeredClients = new Map();
for (const manifestFile of await listSourceFiles(renderClientManifestDirectory)) {
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
for (const file of await listSourceFiles(layoutClientDirectory)) {
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
for (const file of await listSourceFiles(nextEntryDirectory)) {
  if (!hasUseClientDirective(await readSource(file))) {
    nextEntries.push(file);
  }
}

/**
 * Server modules that still load Client code themselves, each with why it has not moved yet.
 *
 * A list of known debt, not of exceptions to the rule: each entry ships its client on every route that
 * reaches the module, and leaves this list when its loader moves into a Client manifest.
 */
const serverClientLoaderDebt = new Map([
  [
    "plugins/runtime-modules/builder/widgets/structure-region/plugin.tsx",
    "Builder-only; the Structure Region's editable scaffold (built-in.tsx) still loads from its Server " +
      "plugin and so ships on every Builder route. Moving it behind the Builder Render-Client manifest is open.",
  ],
]);

const visitedServerModules = new Set(nextEntries);
const importedBy = new Map();
const queue = [...nextEntries];
while (queue.length > 0) {
  const current = queue.shift();
  const source = await readSource(current);
  const dynamicEdges = new Set(readDynamicImports(source, current));
  const edges = [...readStaticImports(source, current), ...dynamicEdges];
  for (const edge of edges) {
    const { target, statement, typeOnly } = edge;
    if (typeOnly) {
      continue;
    }
    const targetSource = await readSource(target);
    if (
      hasUseClientDirective(targetSource) &&
      dynamicEdges.has(edge) &&
      !registeredClients.has(target) &&
      !serverClientLoaderDebt.has(path.relative(repositoryRoot, current))
    ) {
      /*
       * A loader on the Server for Client code. The bundler follows `import()` in the server graph like any
       * import, so the client becomes a reference of every route reaching this module and ships with it --
       * the Auth Module's Form UI provider, loaded this way from its catalog, put the Form stack on every
       * page. Client code a Server decides to mount belongs in an Area's Client manifest.
       */
      failures.push(
        [
          `${path.relative(repositoryRoot, current)} loads Client code from the Server:`,
          `    ${statement}`,
          `    -> ${path.relative(repositoryRoot, target)}`,
          "    A dynamic import in the server graph still makes it a client reference of every route that",
          "    reaches this module. Put the loader in an Area's Client manifest and mount it from there.",
        ].join("\n"),
      );
      continue;
    }
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

// Rule 3: a Module definition stays on the Server. It is a declaration about the whole Module --
// its Providers, its Forms, its Widgets -- and importing it as a value carries all of them into
// whatever bundle the importer belongs to. The conversations composer did it for one list of media
// kinds and pulled the Module's Forms into the browser with it; that only surfaced once a Form
// reached a Server-only label set, which means the import had been wrong for as long as it existed
// and nothing said so. Anything both halves of the seam read belongs in a module of its own.
const moduleDefinitions = new Set();
for (const file of allSourceFiles) {
  if (file.endsWith(".test.ts") || file.endsWith(".test.tsx")) {
    continue;
  }
  if (/\bsatisfies\s+PhiRuntimeModuleDefinition\b/.test(await readSource(file))) {
    moduleDefinitions.add(file);
  }
}

const clientRoots = [];
for (const file of allSourceFiles) {
  if (hasUseClientDirective(await readSource(file))) {
    clientRoots.push(file);
  }
}

// Which client module first reached each file, so a violation can print the way in rather than just
// the two ends of it.
const clientReachedFrom = new Map(clientRoots.map((file) => [file, null]));
const clientQueue = [...clientRoots];
while (clientQueue.length > 0) {
  const current = clientQueue.shift();
  const source = await readSource(current);
  for (const { target, statement, typeOnly } of [
    ...readStaticImports(source, current),
    ...readDynamicImports(source, current),
  ]) {
    if (typeOnly) {
      continue;
    }
    if (moduleDefinitions.has(target)) {
      const chain = [];
      for (let step = current; step != null; step = clientReachedFrom.get(step) ?? null) {
        chain.unshift(path.relative(repositoryRoot, step));
      }
      failures.push(
        [
          `${path.relative(repositoryRoot, current)} reaches a Module definition from the Client graph:`,
          `    ${statement}`,
          `    -> ${path.relative(repositoryRoot, target)}`,
          `    Reached through: ${chain.join(" -> ")}`,
          "    A definition declares the whole Module, so the import carries its Providers, Forms and",
          "    everything they import into the browser bundle. Put what both halves read in its own",
          "    module and have the definition read it too.",
        ].join("\n"),
      );
      continue;
    }
    if (!clientReachedFrom.has(target)) {
      clientReachedFrom.set(target, current);
      clientQueue.push(target);
    }
  }
}

/*
 * A live Widget client takes nothing but types from its own `config.ts`.
 *
 * The config module is the Widget's parser: it reads every field through `parser-primitives`, and
 * `readRenderableBlockConfig` there merges the block defaults with every normalizer behind it. A client
 * that took one small helper from it as a value -- whether a Simple Text has a mark, which mode a Brand
 * is in -- put the whole parser chain on every page that draws the Widget, the Landing among them. Such
 * a helper lives in a file of its own beside the config, which the config reads too.
 */
let liveClientsChecked = 0;
async function checkLiveClientConfigImports(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await checkLiveClientConfigImports(entryPath);
      continue;
    }
    if (entry.name !== "client.tsx" || !entryPath.includes(`${path.sep}widgets${path.sep}`)) {
      continue;
    }
    liveClientsChecked += 1;
    const source = await readSource(entryPath);
    for (const match of source.matchAll(/import\s+(type\s+)?\{([^}]*)\}\s+from\s+"\.\/config";/gu)) {
      if (match[1]) {
        continue;
      }
      const values = match[2].split(",").map((name) => name.trim())
        .filter((name) => name && !name.startsWith("type "));
      if (values.length > 0) {
        failures.push(
          `${path.relative(repositoryRoot, entryPath)} takes ${values.join(", ")} from ./config as a value. ` +
          "A live client imports only types from its config; move the helper into a file of its own.",
        );
      }
    }
  }
}
await checkLiveClientConfigImports(path.join(repositoryRoot, "plugins/runtime-modules"));

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
    `${visitedServerModules.size} server modules reachable from ${nextEntries.length} Next entries, ` +
    `${moduleDefinitions.size} Module definitions out of reach of ${clientRoots.length} Client roots, ` +
    `${liveClientsChecked} live Widget clients taking only types from their config.`,
);
