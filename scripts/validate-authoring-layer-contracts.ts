import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { PHI_Z_INDEX } from "../theme/phi-tokens";

/**
 * Ant Design's default `zIndexPopupBase` is 1000 and it warns once a Tooltip resolves above
 * `zIndexPopupBase + 1100`. That ceiling is easy to miss because antd hands a popup's layer to its
 * TRIGGER as well, and adds 100 for every nested popup: a popover pinned at 7000 put its own trigger
 * Tooltip at 7100 and warned on every Rich Text Widget insert.
 */
const ANTD_Z_INDEX_POPUP_BASE = 1000;
const ANTD_NESTED_POPUP_HEADROOM = 1100;
const CEILING = ANTD_Z_INDEX_POPUP_BASE + ANTD_NESTED_POPUP_HEADROOM;

assert.ok(
  PHI_Z_INDEX.authoringPopup > ANTD_Z_INDEX_POPUP_BASE,
  "An Authoring popup has to clear the adapter's own popup base.",
);
assert.ok(
  PHI_Z_INDEX.authoringPopupNested === PHI_Z_INDEX.authoringPopup + 100,
  "A popup opened from inside an Authoring popup sits exactly one adapter step above it.",
);
assert.ok(
  PHI_Z_INDEX.authoringPopupNested + 100 <= CEILING,
  `A Tooltip nested one level deeper must stay under ${CEILING}.`,
);

/**
 * Every Authoring layer comes from the token. A raw literal is how 7000 got in: it looked like a local
 * decision, and nothing connected it to the ceiling it broke.
 */
async function* walk(directory: string): AsyncGenerator<string> {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "dist") continue;
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      yield* walk(entryPath);
    } else if (/\.tsx?$/u.test(entry.name)) {
      yield entryPath;
    }
  }
}

const componentsRoot = new URL("../components", import.meta.url).pathname;
const offenders: string[] = [];
for await (const file of walk(componentsRoot)) {
  const source = await readFile(file, "utf8");
  for (const match of source.matchAll(/(?:^|\s)(?:zIndex|popupZIndex)=\{(\d+)\}/gu)) {
    const value = Number.parseInt(match[1]!, 10);
    // Small numbers are page-level stacking inside a component, not a portalled popup layer.
    if (value >= 100) offenders.push(`${path.relative(componentsRoot, file)}: ${value}`);
  }
}
assert.deepEqual(
  offenders,
  [],
  `Portalled popup layers must come from PHI_Z_INDEX: ${offenders.join(", ")}`,
);

console.log("Authoring popup layer contracts validated.");
