import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

/**
 * A block states its geometry in one vocabulary.
 *
 * `size`, `minSize` and `maxSize` are what a preset writes; `width`, `maxWidth`, `height` and their
 * siblings are what a block becomes on its way to CSS. Both spellings used to reach a Layout config,
 * and the parser read the flat one as a fallback -- so a Module had two ways to say one thing and a
 * reader had two places to look. The flat one is gone (BUILDER.md, renderable block contract), and
 * this keeps it gone: nothing reads it any more, so a config written that way is silently ignored,
 * which is the kind of mistake that survives a long time.
 *
 * Only Layout nodes are examined, and only their own `config`. An Overlay's responsive `width`, a
 * modal's width, a table column and a toolbar field are different vocabularies belonging to different
 * things, and they are out of reach here by construction rather than by a list somebody has to keep.
 */
const repositoryRoot = process.cwd();

const scannedDirectories = [
  "components/regions/presets",
  "plugins/runtime-modules",
];

const flatGeometryKeys = [
  "width",
  "height",
  "minWidth",
  "maxWidth",
  "minHeight",
  "maxHeight",
];

/** Where a Layout node begins. Both spellings build one; neither may carry flat geometry. */
const layoutNodeMarkers = [
  /\bnodes\.layout\(\{/g,
  /\bcreationPreset:\s*\{\s*layoutKind:/g,
];

async function listSourceFiles(directory) {
  const absolute = path.join(repositoryRoot, directory);
  const entries = await readdir(absolute, { withFileTypes: true, recursive: true });
  return entries
    .filter((entry) => entry.isFile() && /\.tsx?$/u.test(entry.name))
    .map((entry) => path.relative(repositoryRoot, path.join(entry.parentPath ?? entry.path, entry.name)));
}

/**
 * The index just past the object literal opening at `openIndex`, or -1 where it never closes.
 *
 * Braces are counted with strings and comments skipped, because a `"}"` inside a label would
 * otherwise end the object early and the whole check would quietly examine the wrong text.
 */
function findObjectEnd(source, openIndex) {
  let depth = 0;
  for (let i = openIndex; i < source.length; i += 1) {
    const char = source[i];
    if (char === "/" && source[i + 1] === "/") {
      i = source.indexOf("\n", i);
      if (i === -1) return -1;
      continue;
    }
    if (char === "/" && source[i + 1] === "*") {
      i = source.indexOf("*/", i + 2);
      if (i === -1) return -1;
      i += 1;
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      const quote = char;
      i += 1;
      while (i < source.length && source[i] !== quote) {
        if (source[i] === "\\") i += 1;
        i += 1;
      }
      continue;
    }
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/** The `config: { … }` object of the node starting at `nodeStart`, or null where the node has none. */
function findNodeConfigRange(source, nodeStart) {
  const nodeEnd = findObjectEnd(source, source.indexOf("{", nodeStart));
  if (nodeEnd === -1) return null;
  const configMatch = /\bconfig:\s*\{/g;
  configMatch.lastIndex = nodeStart;
  const match = configMatch.exec(source);
  if (!match || match.index > nodeEnd) return null;
  const configStart = match.index + match[0].length - 1;
  const configEnd = findObjectEnd(source, configStart);
  return configEnd === -1 || configEnd > nodeEnd ? null : { start: configStart, end: configEnd };
}

/**
 * The keys written directly in this object literal, with the index each one starts at.
 *
 * Only the top level counts: `maxSize: { width: 610 }` states `maxSize`, and the `width` inside it is
 * part of how a size is written, not a second key on the config. Reading nested names as keys would
 * report the correct spelling as the mistake it replaces.
 */
function readTopLevelKeys(source, openIndex, closeIndex) {
  const keys = [];
  let depth = 0;
  for (let i = openIndex; i < closeIndex; i += 1) {
    const char = source[i];
    if (char === "/" && source[i + 1] === "/") {
      i = source.indexOf("\n", i);
      if (i === -1) break;
      continue;
    }
    if (char === "/" && source[i + 1] === "*") {
      i = source.indexOf("*/", i + 2) + 1;
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      const quote = char;
      i += 1;
      while (i < closeIndex && source[i] !== quote) {
        if (source[i] === "\\") i += 1;
        i += 1;
      }
      continue;
    }
    if (char === "{" || char === "[" || char === "(") {
      depth += 1;
      continue;
    }
    if (char === "}" || char === "]" || char === ")") {
      depth -= 1;
      continue;
    }
    if (depth !== 1) continue;
    const identifier = /^[A-Za-z_$][\w$]*/u.exec(source.slice(i, i + 64));
    if (!identifier) continue;
    const after = source.slice(i + identifier[0].length).match(/^\s*:/u);
    if (after) keys.push({ name: identifier[0], index: i });
    i += identifier[0].length - 1;
  }
  return keys;
}

function lineOf(source, index) {
  return source.slice(0, index).split("\n").length;
}

const failures = [];
let layoutNodesChecked = 0;

for (const directory of scannedDirectories) {
  for (const file of await listSourceFiles(directory)) {
    const source = await readFile(path.join(repositoryRoot, file), "utf8");
    const starts = new Set();
    for (const marker of layoutNodeMarkers) {
      marker.lastIndex = 0;
      let match = marker.exec(source);
      while (match) {
        starts.add(match.index);
        match = marker.exec(source);
      }
    }

    for (const start of starts) {
      const range = findNodeConfigRange(source, start);
      if (!range) continue;
      layoutNodesChecked += 1;
      for (const key of readTopLevelKeys(source, range.start, range.end)) {
        if (!flatGeometryKeys.includes(key.name)) continue;
        failures.push(
          `${file}:${lineOf(source, key.index)} states \`${key.name}\` on a Layout config. `
            + "Geometry is `size`, `minSize` or `maxSize`; nothing reads the flat spelling.",
        );
      }
    }
  }
}

if (failures.length > 0) {
  console.error(`Block geometry vocabulary validation failed:\n- ${failures.join("\n- ")}`);
  process.exit(1);
}

console.log(
  `Block geometry vocabulary valid (${layoutNodesChecked} Layout configs across `
    + `${scannedDirectories.length} trees state geometry as size/minSize/maxSize only).`,
);
