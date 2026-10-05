import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

import { repositoryRoot } from "./lib/repo-root.mjs";

/**
 * The doors a Module's Server half reads export no Client implementation as a value.
 *
 * A Server file that imports a door makes every value that door re-exports from a `"use client"` module
 * a client reference of each route reaching that file -- and a Module's Server door is reached by every
 * route of the Site, because the generated Server projection is imported by every Area and the root. The
 * Support Module read Form helpers from `@phis/ui/forms`, which also exported the Form Control, the
 * provider registry and the Form Controller client; the Form stack shipped on the Public landing, an
 * Area the Module does not serve. Client implementations belong in doors of their own
 * (`@phis/ui/forms/client`).
 */
const manifest = JSON.parse(readFileSync(path.join(repositoryRoot, "package.json"), "utf8"));

const SERVER_CONTRACT_DOORS = [
  "./constants",
  "./forms",
  "./helpers",
  "./module",
  "./module/labels",
  "./references",
  "./types",
  "./widget-config",
];

function resolveFile(base) {
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, path.join(base, "index.ts")]) {
    if (existsSync(candidate) && !candidate.endsWith(path.sep)) {
      try {
        readFileSync(candidate);
        return candidate;
      } catch {
        // a directory
      }
    }
  }
  return null;
}

const isClient = (file) => /^\s*["']use client["']/u.test(readFileSync(file, "utf8"));
const failures = [];
let checked = 0;

for (const door of SERVER_CONTRACT_DOORS) {
  const entry = manifest.exports?.[door];
  const target = typeof entry === "string" ? entry : entry?.import;
  if (!target) {
    failures.push(`${door} is listed here but not exported by package.json.`);
    continue;
  }
  const doorFile = path.join(repositoryRoot, target);
  const source = readFileSync(doorFile, "utf8");
  for (const match of source.matchAll(/export\s+(type\s+)?(\{[^}]*\}|\*)\s+from\s+"([^"]+)"/gu)) {
    if (match[1]) continue;
    const names = match[2] === "*" ? ["*"] : match[2].replace(/[{}]/gu, "").split(",")
      .map((name) => name.trim()).filter((name) => name && !name.startsWith("type "));
    if (names.length === 0) continue;
    const file = resolveFile(path.resolve(path.dirname(doorFile), match[3]));
    if (!file) continue;
    checked += 1;
    if (isClient(file)) {
      failures.push(
        `${door} re-exports ${names.join(", ")} from the Client module ` +
        `${path.relative(repositoryRoot, file)}. A Module's Server half reads this door; move the ` +
        "Client implementation into a door of its own.",
      );
    }
  }
}

if (failures.length > 0) {
  console.error("Server contract door violations:");
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}
console.log(
  `Server contract doors validated: ${SERVER_CONTRACT_DOORS.length} doors, ` +
  `${checked} value re-exports, none from a Client module.`,
);
