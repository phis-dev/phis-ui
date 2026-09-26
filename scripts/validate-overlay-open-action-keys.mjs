import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

/**
 * An Overlay that opens on a Table's action says which action it is.
 *
 * A Table announces one thing -- a row action happened, and here is which one -- and every listener
 * decides for itself whether it was meant: a Record Widget by its `openActionKey`, an Overlay by the
 * same field on its own config. `matchesOpenAction` (components/overlays/phi-overlay-container-client.tsx)
 * enforces the deliberate half of that: an `open` route carrying the `tableAction` schema with no key
 * opens for nothing rather than for everything, because a dialog that comes up whenever a row is
 * deleted is the worse failure.
 *
 * This enforces the other half. The quiet one is a preset that wires every address, channel and schema
 * correctly and forgets the key: the modal then never comes up, throws nothing, logs nothing, and
 * answers every request with a clean 200. The Logs page carried that for as long as it existed.
 *
 * Both directions, the way the geometry readers are checked. A key on an Overlay that has no
 * Table-shaped `open` route is dead as well -- `matchesOpenAction` returns early for any other schema,
 * so the field is read by nobody and reads like a promise the Overlay does not keep.
 *
 * Only preset sources, and only by reading them: a preset tree is built by an async function that asks
 * the server for its labels, so there is nothing to import and inspect here. The Overlay objects are
 * found by brace balance rather than by pattern, because the routes that matter sit several objects
 * deep and a looser scan reads a neighbour's route as this Overlay's.
 */
const repositoryRoot = process.cwd();

const presetDirectories = ["components/regions/presets"];
const presetFilePattern = /(^|\/)presets\.tsx?$|(^|\/)presets\//u;
const moduleRoot = "plugins/runtime-modules";

/** What marks an object as an Overlay node, and what the two halves of the pairing look like in source. */
const overlayMarker = "overlayType:";
const openRoutePattern = /capabilityId:\s*"open"/u;
const tableActionSchema = "PHI_SIGNAL_VALUE_SCHEMAS.tableAction";
const openActionKeyPattern = /\bopenActionKey\s*:/u;
// Stated as nothing is stated as nothing: `parsePhiCmsOverlayConfig` reads a missing key and a `null`
// one into the same `null`, and `matchesOpenAction` refuses both.
const emptyOpenActionKeyPattern = /\bopenActionKey\s*:\s*(null|undefined)\b/u;

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

/**
 * The positions of every brace that is code, so a brace inside a string or a comment counts for nothing.
 *
 * Presets are full of both -- a label with a `{` in it, a paragraph of reasoning above every decision --
 * and one miscounted brace moves an Overlay's boundary into the next node's routes.
 */
function readBracePositions(source) {
  const braces = [];
  let index = 0;
  while (index < source.length) {
    const character = source[index];
    if (character === "\\") {
      index += 2;
      continue;
    }
    if (character === "/" && source[index + 1] === "/") {
      index = source.indexOf("\n", index);
      if (index < 0) break;
      continue;
    }
    if (character === "/" && source[index + 1] === "*") {
      const end = source.indexOf("*/", index + 2);
      index = end < 0 ? source.length : end + 2;
      continue;
    }
    if (character === '"' || character === "'" || character === "`") {
      index += 1;
      while (index < source.length && source[index] !== character) {
        index += source[index] === "\\" ? 2 : 1;
      }
      index += 1;
      continue;
    }
    if (character === "{" || character === "}") {
      braces.push({ index, character });
    }
    index += 1;
  }
  return braces;
}

/** The object literal containing `position`, from its opening brace to its closing one. */
function readEnclosingObject(source, braces, position) {
  let depth = 0;
  let openIndex = -1;
  for (let cursor = braces.length - 1; cursor >= 0; cursor -= 1) {
    const brace = braces[cursor];
    if (brace.index >= position) continue;
    if (brace.character === "}") {
      depth += 1;
      continue;
    }
    if (depth > 0) {
      depth -= 1;
      continue;
    }
    openIndex = brace.index;
    break;
  }
  if (openIndex < 0) {
    return null;
  }

  depth = 0;
  for (const brace of braces) {
    if (brace.index < openIndex) continue;
    depth += brace.character === "{" ? 1 : -1;
    if (depth === 0) {
      return { start: openIndex, end: brace.index + 1, text: source.slice(openIndex, brace.index + 1) };
    }
  }
  return null;
}

/** Every `open` route in an Overlay, and whether it carries the Table's schema. */
function readOpenRoutes(overlayText, braces, offset) {
  const routes = [];
  const pattern = /capabilityId:\s*"open"/gu;
  let match = pattern.exec(overlayText);
  while (match) {
    const route = readEnclosingObject(overlayText, braces
      .filter((brace) => brace.index >= offset && brace.index < offset + overlayText.length)
      .map((brace) => ({ ...brace, index: brace.index - offset })), match.index);
    routes.push({
      index: match.index,
      tableShaped: route ? route.text.includes(tableActionSchema) : false,
    });
    match = pattern.exec(overlayText);
  }
  return routes;
}

const failures = [];
const presetFiles = [
  ...(await Promise.all(presetDirectories.map(listSourceFiles))).flat(),
  ...(await listSourceFiles(moduleRoot)).filter((file) =>
    presetFilePattern.test(file.slice(moduleRoot.length))),
];

let overlaysChecked = 0;
let tableShapedOverlays = 0;

for (const file of presetFiles) {
  const source = await readFile(path.join(repositoryRoot, file), "utf8");
  if (!source.includes(overlayMarker)) {
    continue;
  }
  const braces = readBracePositions(source);
  const seen = new Set();

  let markerIndex = source.indexOf(overlayMarker);
  while (markerIndex >= 0) {
    const overlay = readEnclosingObject(source, braces, markerIndex);
    if (overlay && !seen.has(overlay.start)) {
      seen.add(overlay.start);
      overlaysChecked += 1;
      const statesKey = openActionKeyPattern.test(overlay.text)
        && !emptyOpenActionKeyPattern.test(overlay.text);
      const openRoutes = openRoutePattern.test(overlay.text)
        ? readOpenRoutes(overlay.text, braces, overlay.start)
        : [];
      const tableShaped = openRoutes.filter((route) => route.tableShaped);

      if (tableShaped.length > 0) {
        tableShapedOverlays += 1;
      }

      if (tableShaped.length > 0 && !statesKey) {
        failures.push(
          `${file}:${lineOf(source, overlay.start + tableShaped[0].index)} listens for an \`open\` carrying `
            + "the `tableAction` schema and states no `openActionKey`, so `matchesOpenAction` refuses every "
            + "one of them and the Overlay silently never comes up. Name the row action's `key` on the "
            + "Overlay's own config, the way the Record Widget beside it does.",
        );
      }
      if (tableShaped.length === 0 && statesKey) {
        failures.push(
          `${file}:${lineOf(source, overlay.start)} states an \`openActionKey\` and has no \`open\` route `
            + "carrying the `tableAction` schema, so nothing reads it -- `matchesOpenAction` returns early "
            + "for every other schema. Either open on the Table's action channel or drop the field.",
        );
      }
    }
    markerIndex = source.indexOf(overlayMarker, markerIndex + overlayMarker.length);
  }
}

if (failures.length > 0) {
  console.error(`Overlay open action key validation failed:\n- ${failures.join("\n- ")}`);
  process.exit(1);
}

console.log(
  `Overlay open action keys valid (${overlaysChecked} preset Overlays, ${tableShapedOverlays} opened by a Table action).`,
);
