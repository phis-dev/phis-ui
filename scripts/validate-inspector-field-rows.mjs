import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { repositoryRoot } from "./lib/repo-root.mjs";
import { listSourceFiles } from "./lib/source-files.mjs";

// The Builder Inspector draws every field as a row of two columns: the words on the left, the control
// in the control column (BUILDER.md "11. Inspector contract"). The row is `PhiInspectorFieldRow`, reached
// through `renderPhiInspectorConfigField` or `renderPhiInspectorSettingsRow`. A field control handed a
// `label` of its own draws the words above itself instead, and the field stands out of line with every
// row around it -- the Region Visibility section was built that way once.
const scannedRoot = "plugins/runtime-modules/builder/clients";
const fieldControls = [
  "PhiSelectControl",
  "PhiMultiSelectControl",
  "PhiCascaderControl",
  "PhiTreeCascaderControl",
  "PhiTreeSelectControl",
  "PhiTextControl",
  "PhiNumberControl",
  "PhiSegmentedControl",
  "PhiRadioGroupControl",
  "PhiSwitchControl",
  "PhiCheckboxControl",
  "PhiColorFieldControl",
  "PhiLengthControl",
];
const openingTag = new RegExp(`<(${fieldControls.join("|")})\\b((?:[^<>]|=>|<[^>]*>)*?)\\/?>`, "gs");

const failures = [];
for (const file of await listSourceFiles(path.join(repositoryRoot, scannedRoot))) {
  const relative = path.relative(repositoryRoot, file);
  const source = await readFile(file, "utf8");
  for (const match of source.matchAll(openingTag)) {
    if (/(?:^|\s)label=/.test(match[2])) {
      const line = source.slice(0, match.index).split("\n").length;
      failures.push(`${relative}:${line} <${match[1]} label=…>`);
    }
  }
}

if (failures.length > 0) {
  console.error("Inspector fields are rows of two columns: give the words to the row (renderPhiInspectorConfigField,");
  console.error("renderPhiInspectorSettingsRow, PhiInspectorFieldRow), never a `label` to the control:");
  for (const failure of failures) {
    console.error(`  ${failure}`);
  }
  process.exit(1);
}
