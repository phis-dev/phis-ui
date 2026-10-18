import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { repositoryRoot } from "./lib/repo-root.mjs";
import { listSourceFiles } from "./lib/source-files.mjs";

// A static render reaches the Public tree through the proxy's rewrite, and `usePathname` answers the
// rewritten `/static-render/<marker>/<mode>/...` there while the browser answers the visitor's path. A
// Client component that decides by it draws one thing on the server and another in the browser, and the
// page fails to hydrate (React #418; AUDIT-2026-10-13 PM14). The path is read through `usePhiPathname`.
const scannedRoots = ["components", "helpers", "next", "plugins", "theme"];
const allowed = new Set(["components/runtime/use-phi-pathname.ts"]);

const failures = [];

for (const root of scannedRoots) {
  let files;
  try {
    files = await listSourceFiles(path.join(repositoryRoot, root));
  } catch {
    continue;
  }
  for (const file of files) {
    const relative = path.relative(repositoryRoot, file);
    if (allowed.has(relative)) {
      continue;
    }
    const source = await readFile(file, "utf8");
    for (const match of source.matchAll(/import\s*\{([^}]*)\}\s*from\s*["']next\/navigation["']/g)) {
      if (/\busePathname\b/.test(match[1])) {
        failures.push(relative);
      }
    }
  }
}

if (failures.length > 0) {
  console.error("Client code reads the path through usePhiPathname (components/runtime/use-phi-pathname.ts),");
  console.error("never usePathname, which answers the static tree's rewritten address during a static render:");
  for (const failure of failures) {
    console.error(`  ${failure}`);
  }
  process.exit(1);
}
