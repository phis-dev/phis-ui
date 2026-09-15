import { readdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Every Widget a Module runs must also be a Widget it can be authored with.
 *
 * The two catalogs are written separately -- `widgets.ts` for what renders on a page, and
 * `authoring-widgets.ts` for what the Builder can draw -- and a Widget missing from the second one
 * fails nowhere until somebody opens the page that places it, and then only as a diagnostic in the
 * Builder saying it is "not registered in its owner module's authoring catalog". That is a long way
 * from the edit that caused it.
 *
 * The check reads the definition names each file names, because that is the pair a person keeps in
 * step by hand: adding a Widget means adding the same `PHI_..._DEFINITION` to both.
 */

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const modulesDir = resolve(root, "plugins/runtime-modules");

function readDefinitionNames(source, pattern) {
  return new Set([...source.matchAll(pattern)].map((match) => match[1]));
}

const failures = [];
const checked = [];

for (const moduleName of (await readdir(modulesDir, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort()) {
  const runtimePath = resolve(modulesDir, moduleName, "widgets.ts");
  const authoringPath = resolve(modulesDir, moduleName, "authoring-widgets.ts");
  if (!existsSync(runtimePath) || !existsSync(authoringPath)) {
    continue;
  }

  const runtime = readDefinitionNames(
    await readFile(runtimePath, "utf8"),
    /definition:\s*(PHI_[A-Z0-9_]*_DEFINITION)/gu,
  );
  const authoring = readDefinitionNames(
    await readFile(authoringPath, "utf8"),
    /definePhiAuthoringWidgetModuleLoader\(\s*(PHI_[A-Z0-9_]*_DEFINITION)/gu,
  );

  for (const definition of runtime) {
    if (!authoring.has(definition)) {
      failures.push(
        `${moduleName}: ${definition} runs but cannot be authored -- add it to ` +
        `plugins/runtime-modules/${moduleName}/authoring-widgets.ts.`,
      );
    }
  }
  for (const definition of authoring) {
    if (!runtime.has(definition)) {
      failures.push(
        `${moduleName}: ${definition} can be authored but never runs -- add it to ` +
        `plugins/runtime-modules/${moduleName}/widgets.ts.`,
      );
    }
  }

  checked.push(`${moduleName} (${runtime.size})`);
}

if (failures.length > 0) {
  for (const failure of failures) {
    console.error(failure);
  }
  process.exitCode = 1;
} else {
  console.log(`Authoring catalogs match their runtime catalogs: ${checked.join(", ")}.`);
}
