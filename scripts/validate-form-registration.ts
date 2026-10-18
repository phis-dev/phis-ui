import assert from "node:assert/strict";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";

import { PHI_FIRST_PARTY_RUNTIME_MODULE_CATALOG } from "../plugins/runtime-modules/catalog";
import { repositoryRoot } from "./lib/repo-root.mjs";

/*
 * Every Form id a Module names is a Form some Module registers.
 *
 * A Module's `*_FORM_IDS` is what its Pages place, and a Form widget asks the active Modules for the id
 * at render. One the catalog does not carry throws "not available from the active runtime modules" on
 * the Page -- the App's Groups page did, from 29.09. on: its Form stood in a list of its own that nothing
 * registered, and the cleanup of unreferenced exports removed list and Form while the id and the
 * placement stayed (2176a72e). Nothing failed before a Page was opened.
 */

const registered = new Set<string>();
for (const [, entry] of PHI_FIRST_PARTY_RUNTIME_MODULE_CATALOG) {
  for (const form of entry.forms ?? []) {
    registered.add(form.formId);
  }
}
assert.ok(registered.size > 0, "No Module registers a Form; this validator reads nothing and is stale.");

const modulesRoot = path.join(repositoryRoot, "plugins/runtime-modules");
const failures: string[] = [];
let named = 0;
for (const directory of readdirSync(modulesRoot)) {
  const file = path.join(modulesRoot, directory, "forms.ts");
  if (!existsSync(file)) continue;
  const exports = (await import(file)) as Record<string, unknown>;
  for (const [name, value] of Object.entries(exports)) {
    if (!/_FORM_IDS?$/u.test(name)) continue;
    const ids = typeof value === "string" ? [value] : Object.values(value ?? {});
    for (const id of ids) {
      if (typeof id !== "string") continue;
      named += 1;
      if (!registered.has(id)) {
        failures.push(`plugins/runtime-modules/${directory}/forms.ts: ${name} names "${id}", which no Module registers`);
      }
    }
  }
}
assert.ok(named > 0, "No Module names a Form id; this validator reads nothing and is stale.");

if (failures.length > 0) {
  console.error("A Form id a Module names has to be registered in a Module's `forms`:");
  for (const failure of failures) {
    console.error(`  ${failure}`);
  }
  process.exit(1);
}
