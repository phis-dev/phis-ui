import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import process from "node:process";

import { PHI_CMS_AREA_KEYS, type PhiCmsAreaKey } from "../constants/cms-areas";
import { PHI_FIRST_PARTY_RUNTIME_MODULE_CATALOG } from "../plugins/runtime-modules/catalog";

/*
 * A preset may only name a Data Provider its Area can load.
 *
 * `validate-area-client-reach.mjs` walks the other direction: it catches Client code reaching an Area
 * that does not carry its Module. This catches the opposite, which nothing did -- a provider an Area
 * needs and has not registered. That failure is invisible until somebody opens the page, and then it is
 * total: `PhiRuntimeModuleDataProviderClientHost` throws, and the Widget, the page and everything under
 * it go with it.
 *
 * It was written after the generic Area Dashboard started drawing the card Collection. The Dashboard's
 * fan-in provider had been registered in `admin.tsx` alone, because Admin was the only Area that drew
 * it; four Areas gained the Widget and none of them could load what it asked for.
 *
 * Which Areas a preset renders in comes from the catalog -- route, Area shell and Area overlay
 * descriptors each carry an `area` and a `loadTree` -- and which providers an Area registers comes from
 * its Client manifest.
 *
 * Keys are compared as values, not as the expressions that name them. Comparing the text was the first
 * attempt and it was wrong here: a Module cites its own keys through an alias of its own
 * (`PHI_THREADS_RUNTIME_DATA_PROVIDER_KEYS.inbox`) while a preset cites the Foundation name for the
 * same string (`PHI_THREAD_LIBRARY_DATA_PROVIDER_KEYS.table`), which is the point of the Foundation
 * names. So each side's constant is imported and read. Anything that cannot be resolved is reported
 * rather than passed over -- a check that silently skips what it cannot read is worse than none.
 */

const repositoryRoot = process.cwd();
const presetDirectory = path.join(repositoryRoot, "components/regions/presets");
const manifestDirectory = path.join(repositoryRoot, "plugins/runtime-modules/client-manifests");
const runtimeModulesDirectory = path.join(repositoryRoot, "plugins/runtime-modules");

/** `providerKey: X`, where X is a constant expression or a string literal, as written. */
const PROVIDER_KEY_PATTERN = /providerKey:\s*("[^"]*"|'[^']*'|[A-Za-z0-9_$.]+)/g;

function read(file: string) {
  return readFileSync(file, "utf8");
}

function collect(source: string, pattern: RegExp) {
  const found = new Set<string>();
  for (const match of source.matchAll(pattern)) {
    if (match[1]) {
      found.add(match[1]);
    }
  }
  return found;
}

/** A module specifier as `import()` names it, reduced to the basename a preset file is found by. */
function readLoadedPresetName(loadTree: unknown) {
  if (typeof loadTree !== "function") {
    return null;
  }
  const match = /import\(\s*["']([^"']+)["']\s*\)/.exec(loadTree.toString());
  return match?.[1] ? path.basename(match[1]) : null;
}

/*
 * Every preset file, by the name an `import()` reaches it under.
 *
 * The extension is dropped because a specifier carries none, which leaves `.server` on the files that
 * have it -- as their specifiers do too. Two presets sharing a name would make the pairing ambiguous
 * and silently mis-attribute an Area, so it is refused rather than resolved.
 */
const presetFilesByName = new Map<string, string>();
for (const entry of readdirSync(presetDirectory)) {
  if (!entry.endsWith(".ts") && !entry.endsWith(".tsx")) {
    continue;
  }
  const name = entry.replace(/\.(ts|tsx)$/, "");
  assert.equal(
    presetFilesByName.has(name),
    false,
    `Two preset files are named "${name}"; an import() could not be attributed to one of them.`,
  );
  presetFilesByName.set(name, path.join(presetDirectory, entry));
}

/** Which Areas each preset file is drawn in, from the descriptors that load it. */
const areasByPresetName = new Map<string, Set<PhiCmsAreaKey>>();
const unreadableLoaders: string[] = [];
for (const [moduleId, entry] of PHI_FIRST_PARTY_RUNTIME_MODULE_CATALOG) {
  const descriptors = [
    ...(entry.routes ?? []),
    ...(entry.areaShells ?? []),
    ...(entry.areaOverlays ?? []),
  ];
  for (const descriptor of descriptors) {
    const name = readLoadedPresetName(descriptor.loadTree);
    if (!name) {
      unreadableLoaders.push(`${moduleId} / ${descriptor.presetKey}`);
      continue;
    }
    const areas = areasByPresetName.get(name) ?? new Set<PhiCmsAreaKey>();
    areas.add(descriptor.area);
    areasByPresetName.set(name, areas);
  }
}

/**
 * Every provider key a Module's Client definitions register, by the const the manifests spread.
 *
 * The module is imported rather than read, which is safe and exact: a definitions file holds keys and
 * two lazy loaders, so importing it pulls in the ids beside it and no Client component.
 */
const keysByDefinitionsIdentifier = new Map<string, Set<string>>();
for (const moduleDirectory of readdirSync(runtimeModulesDirectory)) {
  const file = path.join(runtimeModulesDirectory, moduleDirectory, "client-data-providers.ts");
  try {
    read(file);
  } catch {
    continue;
  }
  const loaded = await import(file) as Record<string, unknown>;
  for (const [name, value] of Object.entries(loaded)) {
    if (!Array.isArray(value)) {
      continue;
    }
    const keys = new Set<string>();
    for (const definition of value) {
      const key = (definition as { key?: unknown }).key;
      assert.equal(
        typeof key,
        "string",
        `${path.relative(repositoryRoot, file)} exports a definition in ${name} without a string key.`,
      );
      keys.add(key as string);
    }
    keysByDefinitionsIdentifier.set(name, keys);
  }
}

/**
 * The value behind `providerKey: X` in a preset, by importing whatever X was imported from.
 *
 * A preset itself cannot be imported here -- it reaches server-only code and building its tree wants a
 * request -- so the expression is resolved instead of evaluated: the root identifier is traced to its
 * import, that module is loaded, and the remaining member path is walked.
 */
async function resolveProviderKeyExpression(presetFile: string, expression: string) {
  if (/^["']/.test(expression)) {
    return expression.slice(1, -1);
  }
  const [root, ...members] = expression.split(".");
  if (!root) {
    return null;
  }
  const source = read(presetFile);
  const importMatch = new RegExp(
    `import\\s*(?:type\\s*)?\\{[^}]*\\b${root}\\b[^}]*\\}\\s*from\\s*["']([^"']+)["']`,
  ).exec(source);
  if (!importMatch?.[1]) {
    return null;
  }
  const specifier = importMatch[1];
  const resolved = specifier.startsWith(".")
    ? path.resolve(path.dirname(presetFile), specifier)
    : specifier;
  let loaded: Record<string, unknown>;
  try {
    loaded = await import(resolved) as Record<string, unknown>;
  } catch {
    return null;
  }
  let value: unknown = loaded[root];
  for (const member of members) {
    value = value == null ? undefined : (value as Record<string, unknown>)[member];
  }
  return typeof value === "string" ? value : null;
}

/*
 * What each Area can load.
 *
 * An identifier mentioned anywhere in an Area's manifest counts as registered. That is wider than
 * reading the spread itself, and safe in this package: an imported name that is never spread is an
 * unused binding, which lint refuses before this runs.
 */
const commonSource = read(path.join(manifestDirectory, "common-data-providers.ts"));
function readRegisteredKeys(area: PhiCmsAreaKey) {
  const source = `${commonSource}\n${read(path.join(manifestDirectory, `${area}.tsx`))}`;
  const keys = new Set<string>();
  for (const identifier of collect(source, /(PHI_[A-Z0-9_]*RUNTIME_DATA_PROVIDER_CLIENT_DEFINITIONS)/g)) {
    for (const key of keysByDefinitionsIdentifier.get(identifier) ?? []) {
      keys.add(key);
    }
  }
  return keys;
}
const registeredByArea = new Map<PhiCmsAreaKey, Set<string>>(
  PHI_CMS_AREA_KEYS.map((area) => [area, readRegisteredKeys(area)] as const),
);

const problems: string[] = [];
for (const [name, file] of presetFilesByName) {
  const expressions = collect(read(file), PROVIDER_KEY_PATTERN);
  if (expressions.size === 0) {
    continue;
  }
  const relative = path.relative(repositoryRoot, file);
  const areas = areasByPresetName.get(name);
  if (!areas || areas.size === 0) {
    problems.push(
      `${relative} names a Data Provider, but no catalog descriptor was seen to load it -- ` +
      `the Areas it is drawn in cannot be determined${
        unreadableLoaders.length > 0 ? `; unread loaders: ${unreadableLoaders.join(", ")}` : ""
      }.`,
    );
    continue;
  }
  for (const expression of expressions) {
    const key = await resolveProviderKeyExpression(file, expression);
    if (key === null) {
      problems.push(`${relative} names ${expression}, which could not be resolved to a provider key.`);
      continue;
    }
    for (const area of areas) {
      if (!registeredByArea.get(area)?.has(key)) {
        problems.push(
          `${relative} names "${key}" and is drawn in "${area}", ` +
          `but ${area}.tsx registers no Data Provider Client for it.`,
        );
      }
    }
  }
}

assert.deepEqual(problems, [], `\n${problems.join("\n")}\n`);

console.log(
  `Data Provider reach validated: ${presetFilesByName.size} presets against ${PHI_CMS_AREA_KEYS.length} Areas.`,
);
