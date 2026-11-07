import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { repositoryRoot } from "./lib/repo-root.mjs";
import { listSourceFiles, repositoryRelativeListing } from "./lib/source-files.mjs";
import { lineOf } from "./lib/text.mjs";

/**
 * A preset names the Theme's values by their Phi name, never by the adapter's.
 *
 * Every distance, colour role and corner a preset states is a reference the Theme resolves: `PHI_SPACE.md`,
 * `PHI_COLOR.bgContainer`, `PHI_RADIUS.base` (`theme/antd-css-var-contract.ts`, exported from
 * `@phis/ui/theme`). What they resolve to today is an Ant Design custom property, and that is the adapter's
 * business: written out by hand in a preset, `var(--ant-padding-lg)` reads like a number somebody chose,
 * hides which step of the scale it is, and is the one spelling that breaks the day the adapter changes
 * (THEME.md, "Phi scale"; THIRD_PARTY_MODULES.md, "Distances, colours and corners come from the Theme").
 *
 * Only preset sources are read -- the same files the icon vocabulary reads -- and only the custom property
 * spelled out in them. What a preset composes from the constants (`${PHI_SPACE.md}`) never contains the
 * literal, so it passes; Widget and Layout code that resolves the Theme is out of reach by where it lives.
 */

const presetDirectories = ["components/regions/presets"];
const presetFilePattern =
  /(^|\/)definition\.tsx?$|(^|\/)presets\.tsx?$|(^|\/)presets\/|(^|\/)trees\/|^\/[a-z-]+-preset(-tree)?\.tsx?$|(^|\/)cards\.tsx?$|(^|\/)cards\//u;
const moduleRoot = "plugins/runtime-modules";

const presetFiles = [
  ...(await Promise.all(presetDirectories.map((directory) => listSourceFiles(directory, repositoryRelativeListing)))).flat(),
  ...(await listSourceFiles(moduleRoot, repositoryRelativeListing)).filter((file) =>
    presetFilePattern.test(file.slice(moduleRoot.length))),
];

const failures = [];
for (const file of presetFiles) {
  const source = await readFile(path.join(repositoryRoot, file), "utf8");
  const pattern = /var\(--ant-[a-z0-9-]+\)/gu;
  let match = pattern.exec(source);
  while (match) {
    failures.push(
      `${file}:${lineOf(source, match.index)} spells out \`${match[0]}\`. A preset names the Theme's values `
        + "by their Phi name: PHI_SPACE for a padding or a gap, PHI_COLOR for a colour role, PHI_RADIUS for a "
        + "corner (all from @phis/ui/theme).",
    );
    match = pattern.exec(source);
  }
}

if (failures.length > 0) {
  console.error(`Preset theme vocabulary validation failed:\n- ${failures.join("\n- ")}`);
  process.exit(1);
}

console.log(`Preset theme vocabulary valid (${presetFiles.length} preset sources name the Theme's values by their Phi name).`);
