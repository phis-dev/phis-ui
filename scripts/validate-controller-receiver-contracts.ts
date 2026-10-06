import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import { repositoryRoot } from "./lib/repo-root.mjs";

/*
 * A Controller learns whom it answers into from the tree that holds the receivers.
 *
 * The class this guards is the "button address": a Controller that sends to a Widget, an Overlay or a
 * Form by an id it carries itself -- a preset id map imported from beside the tree, or a `cms:` address
 * built in its own file. It works on exactly the one Page whose ids it was written against and on no
 * copy of it, and it keeps sending to that Page's ids wherever else it runs: the Asset Controller ran in
 * every Area and addressed the Media Page's inspector from all of them; the Auth Controller opened the
 * Area's sign-in Overlay by the preset map whether or not that Overlay was the one on the page.
 *
 * The receivers are the tree's to name. A Page or an Area writes them into the Controller's setting,
 * `controllerSettings` with `config.signalRoutes`, and the Controller sends a declared capability down
 * every route written for it (`dispatchPhiSignalCapability`) -- the same contract on a Page and on an
 * Area (types/cms.ts, `PhiCmsTreeControllerSettings`; SIGNALS.md, "Addresses").
 *
 * Read here: every file of a Module's Controller -- its `controller/` directory and the
 * `controller-plugin.tsx` beside it. Its own address and the runtime Controllers it talks to (`controller:`
 * addresses) are not receivers a tree places, so they are not counted.
 */

/** Whom a Controller names by id instead of by route: a preset id map, or a `cms:` address of its own. */
const RECEIVER_ID_PATTERNS = [
  /\b[A-Z0-9_]+_(?:WIDGET|OVERLAY|LAYOUT)_IDS\b/gu,
  /\bcreatePhiSignal(?:Subcontrol)?Address\(\s*"cms"/gu,
  // A preset id built in place: the Theme Controller reached the Theme Page's toolbar this way.
  /\bcreatePhiCommandToolbar(?:Control)?(?:Address|Id)\(/gu,
];

/**
 * Controllers that still name their receivers, each with why it has not moved yet. An entry whose file
 * names none any more fails, so the list cannot outlive what it excuses.
 */
const OPEN_RECEIVER_ID_EXCEPTIONS = new Map<string, string>([]);

const moduleRoot = path.join(repositoryRoot, "plugins/runtime-modules");

function listControllerFiles() {
  const files: string[] = [];
  for (const moduleDirectory of readdirSync(moduleRoot)) {
    const directory = path.join(moduleRoot, moduleDirectory);
    if (!statSync(directory).isDirectory()) continue;
    const plugin = path.join(directory, "controller-plugin.tsx");
    try {
      if (statSync(plugin).isFile()) files.push(plugin);
    } catch {
      // No Controller plugin beside the Module: nothing to read.
    }
    const controllerDirectory = path.join(directory, "controller");
    let entries: string[];
    try {
      entries = readdirSync(controllerDirectory);
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!/\.tsx?$/u.test(entry) || entry.includes(".test.")) continue;
      files.push(path.join(controllerDirectory, entry));
    }
  }
  return files;
}

const files = listControllerFiles();
assert.ok(files.length > 0, "No Module Controller files found; this validator reads nothing and is stale.");

const failures: string[] = [];
const excused = new Set<string>();
for (const file of files) {
  const relative = path.relative(repositoryRoot, file);
  const source = readFileSync(file, "utf8");
  const hits = RECEIVER_ID_PATTERNS.flatMap((pattern) => [...source.matchAll(pattern)].map((match) => match[0]));
  if (hits.length === 0) continue;
  if (OPEN_RECEIVER_ID_EXCEPTIONS.has(relative)) {
    excused.add(relative);
    continue;
  }
  failures.push([
    `${relative} names its receivers by id (${[...new Set(hits)].join(", ")}).`,
    "Declare an emit capability, send it with `dispatchPhiSignalCapability` through `config.signalRoutes`,",
    "and let the tree that holds the receivers write the routes into its `controllerSettings`.",
  ].join(" "));
}
for (const relative of OPEN_RECEIVER_ID_EXCEPTIONS.keys()) {
  if (!excused.has(relative)) {
    failures.push(`${relative} no longer names receivers by id; remove it from OPEN_RECEIVER_ID_EXCEPTIONS.`);
  }
}

assert.deepEqual(failures, [], `\n${failures.join("\n")}\n`);

console.log(
  `validate-controller-receiver-contracts: ${files.length} Controller files, ${OPEN_RECEIVER_ID_EXCEPTIONS.size} open exceptions, every other one routes its receivers.`,
);
