import { readFileSync } from "node:fs";
import path from "node:path";

import { PHI_FIRST_PARTY_RUNTIME_MODULE_CATALOG } from "../plugins/runtime-modules/catalog";
import { repositoryRoot } from "./lib/repo-root.mjs";

/*
 * A TODOS.md entry that asks for a Widget or a Form field type is gone stale the moment one by that key
 * exists. The next reader takes the entry for the state of the code and asks for it again, or builds
 * around a gap that is closed (AGENTS.md, "Before you call something missing").
 *
 * Free prose cannot be held to the catalog: an entry that names `media-asset` may ask for a new field or
 * for a change to the one that is there. So an entry that asks for a new one says so on a line of its
 * own, in the form TODOS.md's head describes:
 *
 *     Wants: Widget `image-compare`, form field `colour-range`
 *
 * Each key named there must be one the first-party catalog does not have yet: no Widget of any Module
 * with that typeKey, no Form field type with that key (its leaf, `media-asset`, or the whole namespaced
 * key). A `Wants:` line naming nothing in that form is refused too, so the marker cannot drift into prose.
 *
 * `--file <path>` checks another copy of the file.
 */

const fileIndex = process.argv.indexOf("--file");
const file = fileIndex >= 0 ? path.resolve(process.argv[fileIndex + 1]!) : path.join(repositoryRoot, "TODOS.md");
const lines = readFileSync(file, "utf8").split("\n");

const widgets = new Map<string, string>();
const fieldTypes = new Map<string, string>();
for (const entry of PHI_FIRST_PARTY_RUNTIME_MODULE_CATALOG.values()) {
  for (const widget of entry.widgets) widgets.set(widget.definition.typeKey, entry.definition.moduleId);
  for (const provider of entry.definition.formProviders?.fieldTypes ?? []) {
    fieldTypes.set(provider.key, entry.definition.moduleId);
    fieldTypes.set(provider.key.split("/").pop()!, entry.definition.moduleId);
  }
}

const problems: string[] = [];
let entryTitle = "";
lines.forEach((line, index) => {
  const title = /^- \*\*(.+?)\*\*/u.exec(line);
  if (title) entryTitle = title[1]!;
  if (/^#/u.test(line)) entryTitle = "";
  const wants = /^\s*Wants:\s*(.*)$/u.exec(line);
  if (!wants) return;
  const where = `${path.relative(repositoryRoot, file)}:${index + 1}`;
  const items = [...wants[1]!.matchAll(/\b(Widget|form field)\s+`([^`]+)`/gu)];
  if (items.length === 0) {
    problems.push(
      `${where}: a "Wants:" line names nothing in the form ` +
        "Widget `<typeKey>` or form field `<key>`. Write the keys the entry asks for that way, or drop the marker.",
    );
    return;
  }
  for (const [, kind, key] of items) {
    const owner = (kind === "Widget" ? widgets : fieldTypes).get(key!);
    if (owner) {
      problems.push(
        `${where}: "${entryTitle || "(no entry)"}" wants ${kind} \`${key}\`, which ${owner} already has. ` +
          `Remove the entry, or rewrite it as the change the existing ${kind} needs and drop the "Wants:" line.`,
      );
    }
  }
});

if (problems.length > 0) {
  console.error("TODOS.md asks for what the catalog already has:");
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}

console.log("TODOS.md wants validated.");
