import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { repositoryRoot } from "./lib/repo-root.mjs";
import { listSourceFiles } from "./lib/source-files.mjs";
import { lineOf } from "./lib/text.mjs";

/**
 * Every Builder store has one file that writes it.
 *
 * The tool state and the Region drafts are written in `developer-workspace-store.ts`, the workspace
 * catalog in `workspace-catalog-actions.ts`, each by a named action. Before, three hooks and some thirty
 * free functions in nine files patched the same two stores with whatever fields they held, and a
 * selection wrote an Area and a Page into the store whose merged view always took both from the other
 * one. Reading stays open to everybody; a write anywhere else fails the build. Tests set up state as
 * they need, so they are not held to it.
 */
const owners = {
  builderWorkspaceStore: "plugins/runtime-modules/builder/developer-workspace-store.ts",
  builderRegionDraftStore: "plugins/runtime-modules/builder/developer-workspace-store.ts",
  phiWorkspaceCatalogStore: "plugins/runtime-modules/builder/workspace-catalog-actions.ts",
};
const writePattern = new RegExp(`\\b(${Object.keys(owners).join("|")})\\s*\\.\\s*(patch|replace|set|reset)\\s*\\(`, "gu");
const sourceDirectories = ["components", "gateway", "helpers", "next", "plugins", "server-helpers"];
const sourceFileOptions = {
  extensions: [".ts", ".tsx", ".mjs"],
  skipDirectories: ["node_modules", "dist", ".next", ".git"],
  includeTests: false,
  includeDeclarations: false,
};

// Comments blanked rather than removed, so a line number still points at the line in the file.
function blankComments(raw) {
  return raw
    .replace(/\/\*[\s\S]*?\*\//gu, (comment) => comment.replace(/[^\n]/gu, " "))
    .replace(/(^|[^:"'`])\/\/.*$/gmu, (line, lead) => lead + " ".repeat(line.length - lead.length));
}

const failures = [];
let writes = 0;
for (const directory of sourceDirectories) {
  for (const file of await listSourceFiles(path.join(repositoryRoot, directory), sourceFileOptions)) {
    const relative = path.relative(repositoryRoot, file).split(path.sep).join("/");
    const source = blankComments(await readFile(file, "utf8"));
    for (const match of source.matchAll(writePattern)) {
      writes += 1;
      const [, store, method] = match;
      if (owners[store] !== relative) {
        failures.push(
          `${relative}:${lineOf(source, match.index)} writes ${store}.${method}; only ${owners[store]} writes it. ` +
            "Call one of its actions, or add the action there.",
        );
      }
    }
  }
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log(`Builder store ownership valid: ${writes} writes, all in their owner files.`);
