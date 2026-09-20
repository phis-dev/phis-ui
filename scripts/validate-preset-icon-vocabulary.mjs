import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

/**
 * A preset names bundled icons only.
 *
 * `PhiIcon` resolves three kinds of icon string, and all three stay available to a Builder choosing an
 * icon for their own Widget. A preset is not a choice: it ships with its Module to every Site that
 * activates it, and nobody along the way agreed to what it names. An `iconify:` icon is fetched from
 * Iconify's API by the visitor's browser, which turns a default into a third-party request on someone
 * else's page; an `asset:` icon names a file a fresh Site does not have. `antd:` is bundled, so it
 * resolves offline and on the first paint (MODULES.md, "Presets, paths, and navigation").
 *
 * Where the bundled set lacks a mark a preset needs, it gains one in `components/shell/phi-icon.tsx` --
 * once, in the open, rather than per preset.
 *
 * Only preset sources are read, and only string literals in them. A Widget Client that has to recognise
 * the other prefixes writes them too, and it is out of reach here by where it lives rather than by a
 * list somebody has to keep.
 */
const repositoryRoot = process.cwd();

const presetDirectories = ["components/regions/presets"];
const presetFilePattern = /(^|\/)presets\.tsx?$|(^|\/)presets\//u;
const moduleRoot = "plugins/runtime-modules";

/** The prefixes a preset may not name, and why each one is not a default anybody agreed to. */
const forbiddenIconPrefixes = new Map([
  ["iconify:", "fetched from Iconify's API by the visitor's browser"],
  ["asset:", "a file a freshly activated Site does not have"],
]);

async function listSourceFiles(directory) {
  const absolute = path.join(repositoryRoot, directory);
  const entries = await readdir(absolute, { withFileTypes: true, recursive: true });
  return entries
    .filter((entry) => entry.isFile() && /\.tsx?$/u.test(entry.name))
    .map((entry) => path.relative(repositoryRoot, path.join(entry.parentPath ?? entry.path, entry.name)));
}

function lineOf(source, index) {
  return source.slice(0, index).split("\n").length;
}

const failures = [];
const presetFiles = [
  ...(await Promise.all(presetDirectories.map(listSourceFiles))).flat(),
  ...(await listSourceFiles(moduleRoot)).filter((file) =>
    presetFilePattern.test(file.slice(moduleRoot.length))),
];

for (const file of presetFiles) {
  const source = await readFile(path.join(repositoryRoot, file), "utf8");
  for (const [prefix, reason] of forbiddenIconPrefixes) {
    // The prefix as the opening of a string literal, which is the only place it names an icon: an
    // `asset:` that is an object key or a URL scheme never follows a quote.
    const pattern = new RegExp(`["'\`]${prefix}`, "gu");
    let match = pattern.exec(source);
    while (match) {
      failures.push(
        `${file}:${lineOf(source, match.index)} names a \`${prefix}\` icon. A preset names \`antd:\` `
          + `icons only -- this one is ${reason}. Add the mark to components/shell/phi-icon.tsx instead.`,
      );
      match = pattern.exec(source);
    }
  }
}

if (failures.length > 0) {
  console.error(`Preset icon vocabulary validation failed:\n- ${failures.join("\n- ")}`);
  process.exit(1);
}

console.log(
  `Preset icon vocabulary valid (${presetFiles.length} preset sources name bundled icons only).`,
);
