import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import process from "node:process";

// Which Client code a route ships is decided by its server graph, not by what it renders.
//
// Every "use client" file a server module reaches becomes a client reference of each route whose
// server graph contains that module, and the browser loads it -- with everything it imports
// statically -- on that route's first load. A dynamic import on the server side does not hold it
// back: the server cannot defer a reference the browser has to be able to resolve, so the manifest
// names it regardless. Only a dynamic import inside Client code moves a module into a lazy chunk.
//
// The root layout is under every route of every Area. On 2026-09-10 it started composing the Theme
// blocks from the Builder's runtime catalog; the catalog carries every Area's Widget plugins, and
// their server-side `import()` of the Client halves put the Structure Region, the Inspector, the
// Page and Shell workspaces and the Theme brand controls into the first load of the Public landing
// page. Nothing noticed for a week, because the checks that existed each named one earlier leak.
//
// This check does not name leaks. It walks the graphs and holds them to what may be there:
//   1. the root layout reaches exactly the client references listed below -- a new one is a
//      decision somebody has to make here, whatever it is and wherever it came from;
//   2. a live Area host reaches no Client file of a Module that Area does not carry, and no
//      Authoring implementation.
// The Builder is exempt; it carries every Area's Modules on purpose.

const repositoryRoot = process.cwd();
const runtimeModulesDirectory = path.join(repositoryRoot, "plugins/runtime-modules");
const sourceExtensions = [".ts", ".tsx"];

/**
 * The Client references the document shell is allowed to put on every route.
 *
 * Each one is paid for by every page of every Area, the Public landing first among them. Adding an
 * entry is a bundle decision, not a formality: measure the first load of the Public landing before
 * and after.
 */
const ROOT_CLIENT_REFERENCES = [
  "components/root/phi-dayjs-locale.tsx",
  "components/root/phi-root-live-theme-provider.tsx",
  "components/root/phi-root-rem-provider.tsx",
  "components/runtime/core-runtime-application-adapter.tsx",
  "components/runtime/runtime-signal-partition.tsx",
];

const LIVE_AREAS = ["public", "app", "admin", "editor", "accounting"];

/** Modules every Area carries (area-contributions/common.ts). */
const COMMON_AREA_CONTRIBUTIONS = "plugins/runtime-modules/area-contributions/common.ts";

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

function isClientModule(file) {
  const { raw } = readSource(file);
  const firstImport = raw.search(/\bimport\b/);
  return /(^|\n)\s*(['"])use client\2\s*;?/.test(raw.slice(0, firstImport >= 0 ? firstImport : 512));
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

function readDynamicImports(file) {
  const imports = [];
  for (const match of readSource(file).code.matchAll(/\bimport\(\s*["']([^"']+)["']\s*\)/g)) {
    const target = resolveSpecifier(match[1], file);
    if (target) {
      imports.push(target);
    }
  }
  return imports;
}

/**
 * The Client files a set of entries puts on first load, each with the chain that brought it.
 *
 * Server modules are followed through static and dynamic imports; a "use client" file ends the server
 * walk and starts the Client one, which follows static imports only.
 */
function collectEagerClientFiles(entries) {
  const via = new Map();
  const clientReferences = new Set();
  const serverQueue = [];
  const clientQueue = [];

  for (const entry of entries) {
    via.set(entry, null);
    (isClientModule(entry) ? clientQueue : serverQueue).push(entry);
    if (isClientModule(entry)) {
      clientReferences.add(entry);
    }
  }

  while (serverQueue.length > 0) {
    const current = serverQueue.shift();
    for (const target of [...readStaticImports(current), ...readDynamicImports(current)]) {
      if (via.has(target)) {
        continue;
      }
      via.set(target, current);
      if (isClientModule(target)) {
        clientReferences.add(target);
        clientQueue.push(target);
      } else {
        serverQueue.push(target);
      }
    }
  }

  const eager = new Set(clientQueue);
  while (clientQueue.length > 0) {
    const current = clientQueue.shift();
    for (const target of readStaticImports(current)) {
      if (eager.has(target)) {
        continue;
      }
      eager.add(target);
      if (!via.has(target)) {
        via.set(target, current);
      }
      clientQueue.push(target);
    }
  }

  const chain = (file) => {
    const steps = [];
    for (let step = file; step; step = via.get(step)) {
      steps.push(relative(step));
    }
    return steps.reverse();
  };
  return { clientReferences, eager, chain };
}

function relative(file) {
  return path.relative(repositoryRoot, file);
}

function formatChain(steps) {
  return steps.map((step, index) => `${"  ".repeat(index + 2)}${step}`).join("\n");
}

/** Module directories, told apart from the shared infrastructure beside them by their server.ts. */
const moduleDirectories = new Set(
  readdirSync(runtimeModulesDirectory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .filter((entry) => existsSync(path.join(runtimeModulesDirectory, entry.name, "server.ts")))
    .map((entry) => entry.name),
);

/** The Module directories an Area's contribution list imports, read from the list itself. */
function readContributedModuleDirectories(contributionFile) {
  const directories = new Set();
  const { code } = readSource(path.join(repositoryRoot, contributionFile));
  for (const match of code.matchAll(/from\s*["']\.\.\/([a-z-]+)\/server["']/g)) {
    directories.add(match[1]);
  }
  return directories;
}

function readOwningModuleDirectory(file) {
  const inside = path.relative(runtimeModulesDirectory, file);
  if (inside.startsWith("..")) {
    return null;
  }
  const [directory] = inside.split(path.sep);
  return moduleDirectories.has(directory) ? directory : null;
}

/**
 * Authoring implementations live with the runtime Modules (`authoring.tsx`, `authoring-widgets.ts`,
 * `client-authoring-providers/`). The contexts that merely carry an Authoring manifest through the
 * boundary sit in components/runtime and hold no implementation, so they are not matched.
 */
function isAuthoringImplementation(file) {
  const inside = path.relative(runtimeModulesDirectory, file);
  return !inside.startsWith("..") && /authoring/i.test(inside);
}

/** Ids are constants every side may name; they carry no implementation. */
function isIdentifierFile(file) {
  return path.basename(file) === "ids.ts";
}

const failures = [];

// --- 1. the root layout ------------------------------------------------------------------------

const rootEntry = path.join(repositoryRoot, "next/root-route.tsx");
const root = collectEagerClientFiles([rootEntry]);
const allowedRootReferences = new Set(ROOT_CLIENT_REFERENCES);
for (const reference of [...root.clientReferences].sort()) {
  if (!allowedRootReferences.has(relative(reference))) {
    failures.push(
      [
        `the root layout reaches a Client reference it is not allowed to put on every route:`,
        `    ${relative(reference)}`,
        "    reached through:",
        formatChain(root.chain(reference)),
      ].join("\n"),
    );
  }
}
const reachedRootReferences = new Set([...root.clientReferences].map(relative));
for (const allowed of ROOT_CLIENT_REFERENCES) {
  if (!reachedRootReferences.has(allowed)) {
    failures.push(
      `ROOT_CLIENT_REFERENCES lists ${allowed}, which the root layout no longer reaches -- remove it.`,
    );
  }
}

// --- 2. the live Area hosts --------------------------------------------------------------------

const commonDirectories = readContributedModuleDirectories(COMMON_AREA_CONTRIBUTIONS);
let liveAreaEagerFiles = 0;
for (const area of LIVE_AREAS) {
  const carried = new Set([
    ...commonDirectories,
    ...readContributedModuleDirectories(`plugins/runtime-modules/area-contributions/${area}.ts`),
  ]);
  const entries = [`next/areas/${area}.ts`, `next/areas/${area}-client.tsx`, "next/area-route.tsx"]
    .map((entry) => path.join(repositoryRoot, entry));
  const { eager, chain } = collectEagerClientFiles(entries);
  liveAreaEagerFiles += eager.size;

  for (const file of [...eager].sort()) {
    const owner = readOwningModuleDirectory(file);
    const foreign = owner !== null && !carried.has(owner) && !isIdentifierFile(file);
    const authoring = isAuthoringImplementation(file);
    if (!foreign && !authoring) {
      continue;
    }
    failures.push(
      [
        foreign
          ? `the ${area} Area ships Client code of the "${owner}" Module, which it does not carry:`
          : `the ${area} Area ships Authoring Client code:`,
        `    ${relative(file)}`,
        "    reached through:",
        formatChain(chain(file)),
      ].join("\n"),
    );
  }
}

if (failures.length > 0) {
  console.error("Area Client reach violations:");
  for (const failure of failures) {
    console.error(`  ${failure}`);
  }
  process.exit(1);
}

console.log(
  `Area Client reach validated: the root layout reaches ${root.clientReferences.size} allowed Client ` +
    `references (${root.eager.size} files); ${LIVE_AREAS.length} live Areas ship ${liveAreaEagerFiles} ` +
    "Client files, none of a Module they do not carry.",
);
