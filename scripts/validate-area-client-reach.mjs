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
//      Authoring implementation;
//   3. a Widget that only shows content loads no editing Control with its Client. The Markdown
//      Widget rendered its tables through the Table Control, and with it the editors for every
//      column kind and drag reordering -- seventeen chunks after hydration on the Public landing;
//   4. a Form loads only the field Controls nearly every form has; the rare and heavy kinds (slider,
//      cascader, date, compound Table and Tree) load where a field of that kind is rendered;
//   5. a Client manifest does not load a loader. `import()` of a Module's client.ts, which holds
//      nothing but `import()` itself, cost every Controller a nearly empty chunk and a second round
//      trip before the Controller's own chunk was even requested;
//   6. every registered Controller Client, and every Render Client in a manifest, is a literal
//      `dynamic(() => import(...))`. Only that shape enters the route's loadable manifest, and only
//      then does the server render preload the chunks instead of the browser asking for them once
//      hydration reaches the Controller or the Widget.
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

/**
 * Widgets that show content and take no input, by their Client file.
 *
 * Listed rather than recognised: nothing in a Widget's name says whether it edits. A Widget that starts
 * taking input leaves this list in the same change, and says why.
 */
const DISPLAY_WIDGET_CLIENTS = [
  "account",
  "area-menu",
  "brand",
  "breadcrumb",
  "card",
  "description",
  "footer",
  "gallery",
  "header-navigation",
  "icon",
  "image",
  "markdown",
  "markdown-toc",
  "page-title",
  "quick-links",
  "sidebar-navigation",
  "simple-text",
  "spacer",
].map((widget) => `plugins/runtime-modules/core/widgets/${widget}/client.tsx`);

/** Controls that exist to take input; a Widget that only shows content has no use for any of them. */
const EDITING_CONTROL_PATTERN =
  /^components\/controls\/phi-(?:table|tree|icon-picker|color|date-picker|cascader|form|multi-select|select|slider|number|text|switch|segmented|checkbox|checkbox-group|radio-group)-control\.tsx$/;

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

// --- 3. Widgets that only show content -------------------------------------------------------

for (const widgetClient of DISPLAY_WIDGET_CLIENTS) {
  const file = path.join(repositoryRoot, widgetClient);
  if (!existsSync(file)) {
    failures.push(`DISPLAY_WIDGET_CLIENTS lists ${widgetClient}, which does not exist -- remove it.`);
    continue;
  }
  const { eager, chain } = collectEagerClientFiles([file]);
  for (const reached of [...eager].sort()) {
    if (!EDITING_CONTROL_PATTERN.test(relative(reached))) {
      continue;
    }
    failures.push(
      [
        `${widgetClient} only shows content but loads an editing Control:`,
        `    ${relative(reached)}`,
        "    reached through:",
        formatChain(chain(reached)),
      ].join("\n"),
    );
  }
}

// --- 4. Forms ship the common field kinds only -------------------------------------------------

const FORM_CLIENT = "components/forms/form-descriptor-runtime-client.tsx";
const RARE_FIELD_CONTROL_PATTERN =
  /^components\/controls\/phi-(?:table|tree|cascader|slider|date-picker|color|icon-picker)-control\.tsx$/;
{
  const { eager, chain } = collectEagerClientFiles([path.join(repositoryRoot, FORM_CLIENT)]);
  for (const reached of [...eager].sort()) {
    if (!RARE_FIELD_CONTROL_PATTERN.test(relative(reached))) {
      continue;
    }
    failures.push(
      [
        `every Form loads ${relative(reached)}, a Control for a rare field kind:`,
        "    reached through:",
        formatChain(chain(reached)),
        "    Register the field kind through lazyPhiFormFieldControl in shared-form-provider-registry.tsx.",
      ].join("\n"),
    );
  }
}

// --- 5. manifests load implementations, not loaders --------------------------------------------

const manifestDirectories = ["client-area-contributions", "client-manifests"]
  .map((directory) => path.join(runtimeModulesDirectory, directory));
let manifestLoaders = 0;
for (const directory of manifestDirectories) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (!entry.isFile() || !/\.tsx?$/.test(entry.name)) {
      continue;
    }
    const manifest = path.join(directory, entry.name);
    for (const target of readDynamicImports(manifest)) {
      manifestLoaders += 1;
      const onlyDispatches = readStaticImports(target).length === 0 && readDynamicImports(target).length > 0;
      if (onlyDispatches) {
        failures.push(
          [
            `${relative(manifest)} loads a loader: ${relative(target)} holds nothing but import() itself.`,
            "    Import its loader statically and hand it over; the chunk and the round trip in between",
            "    carry no code.",
          ].join("\n"),
        );
      }
    }
  }
}

// --- 6. Controller Clients are next/dynamic ----------------------------------------------------

const controllerRegistrationFiles = [
  ...manifestDirectories.flatMap((directory) =>
    readdirSync(directory).filter((name) => /\.tsx?$/.test(name)).map((name) => path.join(directory, name))),
  ...[...moduleDirectories].map((directory) => path.join(runtimeModulesDirectory, directory, "client.ts"))
    .filter((file) => existsSync(file)),
];
const literalDynamic = (name) => new RegExp(`export const ${name} = dynamic\\(\\(\\) =>\\s*import\\(`);
let registeredControllers = 0;
for (const file of controllerRegistrationFiles) {
  const { code } = readSource(file);
  const names = [
    ...[...code.matchAll(/\bController:\s*(\w+)/g)].map((match) => match[1]),
    ...[...code.matchAll(/\[\s*PHI_\w+_RUNTIME_MODULE_ID,\s*(\w+),?\s*\]/g)].map((match) => match[1]),
  ].filter((name) => name !== "Controller");
  for (const name of names) {
    registeredControllers += 1;
    const importMatch = code.match(new RegExp(`import\\s*\\{[^}]*\\b${name}\\b[^}]*\\}\\s*from\\s*["']([^"']+)["']`));
    const definingFile = importMatch ? resolveSpecifier(importMatch[1], file) : file;
    if (definingFile && literalDynamic(name).test(readSource(definingFile).code)) {
      continue;
    }
    failures.push(
      [
        `${relative(file)} registers ${name}, which is not a literal next/dynamic Controller Client.`,
        `    Define it as \`export const ${name} = dynamic(() => import("...").then(...))\` so the server render`,
        "    preloads its chunks.",
      ].join("\n"),
    );
  }
}

let renderClients = 0;
for (const directory of manifestDirectories) {
  for (const name of readdirSync(directory).filter((entry) => /\.tsx?$/.test(entry))) {
    const file = path.join(directory, name);
    const { code } = readSource(file);
    const imports = [...code.matchAll(/\bimport\(/g)].length;
    const literal = [...code.matchAll(/\bdynamic\(\(\) =>\s*import\(/g)].length;
    renderClients += literal;
    if (imports !== literal) {
      failures.push(
        `${relative(file)} has ${imports - literal} import() outside a literal next/dynamic call; ` +
          "the server render cannot preload what it loads.",
      );
    }
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
    `Client files, none of a Module they do not carry; ${DISPLAY_WIDGET_CLIENTS.length} display Widgets ` +
    `load no editing Control; Forms ship the common field kinds only; ${manifestLoaders} manifest ` +
      `loaders load implementations; ${registeredControllers} Controller Clients and ${renderClients} manifest ` +
      "Clients are next/dynamic.",
);
