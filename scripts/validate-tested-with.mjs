import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

import { repositoryRoot } from "./lib/repo-root.mjs";

// The exact versions of the framework this package is built and tested with, as the Site needs them.
//
// `phis init` writes a Site's `package.json` with exact pins, and those pins used to be a list kept by
// hand in phis-server: on 2026-11-25 a clean install pinned `next` 16.4.2, which Next refuses to build
// (`SecurityFatalError`), and `@phis/ui` 0.4.0 -- months behind. Which `next`, `react` or `antd` a Site
// runs is this package's concern, not the Server's: it is what this package was compiled, linted and
// tested against. So the answer travels with the package, in `package.json#phis.testedWith`, and the
// Server reads it from the registry metadata of the `@phis/ui` it chooses (phis-server's
// src/lib/site-versions.mts).
//
// The names are the peer dependencies, which a Site must install itself, and the toolchain the Site's
// `typecheck` and `build` run with. The versions are never typed: `--write` reads them from what is
// installed in this package's node_modules, and without `--write` the script fails when the field says
// anything else -- `pnpm verify` runs it in every profile, and the distribution build ships the field and
// checks it again, so a release cannot carry a set it was not built with.
const SITE_TOOLCHAIN = ["typescript", "@types/node", "@types/react", "@types/react-dom"];

const write = process.argv.includes("--write");
const manifestFile = path.join(repositoryRoot, "package.json");
const manifest = JSON.parse(readFileSync(manifestFile, "utf8"));

const names = [...new Set([...Object.keys(manifest.peerDependencies ?? {}), ...SITE_TOOLCHAIN])].sort();

function readInstalledVersion(name) {
  const file = path.join(repositoryRoot, "node_modules", ...name.split("/"), "package.json");
  try {
    return JSON.parse(readFileSync(file, "utf8")).version;
  } catch {
    console.error(`${name} is not installed in ${path.join(repositoryRoot, "node_modules")}; phis.testedWith names it.`);
    process.exit(1);
  }
}

const installed = Object.fromEntries(names.map((name) => [name, readInstalledVersion(name)]));

if (write) {
  manifest.phis = { ...(manifest.phis ?? {}), testedWith: installed };
  writeFileSync(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Recorded ${names.length} tested versions in package.json#phis.testedWith.`);
  process.exit(0);
}

const recorded = manifest.phis?.testedWith ?? null;
if (JSON.stringify(recorded) !== JSON.stringify(installed)) {
  console.error("package.json#phis.testedWith does not state what is installed:");
  for (const name of new Set([...Object.keys(recorded ?? {}), ...names])) {
    const stated = recorded?.[name];
    const actual = installed[name];
    if (stated !== actual) {
      console.error(`  ${name}: states ${stated ?? "nothing"}, installed ${actual ?? "nothing (not a peer or toolchain package)"}`);
    }
  }
  console.error("Run `pnpm tested-with:write` once the installed versions are the ones this package is tested with.");
  process.exit(1);
}
