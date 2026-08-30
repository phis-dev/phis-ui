import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

/**
 * The authoring markers must never be emitted unconditionally.
 *
 * `data-phi-layout-debug-layer`, `phi-layout-scaffold-slot` and `data-phi-layout-has-content` describe
 * the tree for the Builder's scaffold, and nothing else reads them -- no other stylesheet, no
 * JavaScript. Emitted unconditionally they rode along on every published page: bytes on each render,
 * and a description of the authoring model handed to people who cannot author.
 *
 * The signal that a render is an authoring one is deliberately derived rather than threaded -- a layout
 * already receives `editSlotAction`, `editSlotLabels` and `capabilities`, none of which a published page
 * passes. That makes it an implicit coupling, and an implicit coupling nothing checks is one that
 * quietly stops being true. This is the check.
 */

const LAYOUT_DIRS = ["components/layouts", "components/layouts/clients"];
const MARKERS = [
  { literal: '"phi-layout-scaffold-slot"', name: "the slot class" },
  { literal: 'data-phi-layout-debug-layer="layout"', name: "the layout band marker" },
  { literal: 'data-phi-layout-has-content="true"', name: "the slot content flag" },
  { literal: 'data-phi-layout-has-content="false"', name: "the slot content flag" },
];

async function readLayoutSources() {
  const sources: { file: string; text: string }[] = [];
  for (const dir of LAYOUT_DIRS) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith(".tsx")) continue;
      const file = path.join(dir, entry.name);
      sources.push({ file, text: await readFile(file, "utf8") });
    }
  }
  return sources;
}

/** Everything that can put a `data-phi-layout-*` attribute in the DOM. */
async function readWrittenAttributeSources() {
  const roots = ["components", "plugins"];
  const parts: string[] = [];
  const walk = async (dir: string) => {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.name.endsWith(".tsx") || entry.name.endsWith(".ts")) parts.push(await readFile(full, "utf8"));
    }
  };
  for (const root of roots) await walk(root);
  return parts.join("\n");
}

const sources = await readLayoutSources();
assert.ok(sources.length >= 10, "The layout directories should not have emptied out.");

for (const { file, text } of sources) {
  for (const marker of MARKERS) {
    assert.ok(
      !text.includes(marker.literal),
      `${file} writes ${marker.name} as a literal. It belongs behind \`isAuthoringRender\`, or every ` +
      `visitor of every published page carries it.`,
    );
  }
}

// A layout that reads the markers must also compute the signal they hang off.
for (const { file, text } of sources) {
  const emits = text.includes("phiLayoutSlotClassName(")
    || text.includes("phiLayoutDebugLayerMarker(")
    || text.includes("phiLayoutSlotContentMarker(");
  if (!emits) continue;
  assert.ok(
    text.includes("isPhiLayoutAuthoringRender("),
    `${file} emits an authoring marker without deriving \`isAuthoringRender\` from the authoring props.`,
  );
}

// The helper reads exactly the three props the Builder passes and a published page does not.
const helper = await readFile("helpers/layout-authoring-markers.ts", "utf8");
for (const prop of ["editSlotAction", "editSlotLabels", "capabilities"]) {
  assert.ok(helper.includes(prop), `The authoring signal must keep reading \`${prop}\`.`);
}

/*
 * Every `data-phi-layout-*` the authoring stylesheet selects on must be written by some layout.
 *
 * The guard on an explicit background named `...-surface-background` while every layout wrote
 * `...-layout-background`. A selector that matches nothing does not fail: a `:not()` around it is
 * simply always true, so the debug tint went over layouts that paint their own background -- exactly
 * what the guard existed to prevent. Nothing breaks, it just looks wrong, and no one is told.
 */
{
  const stylesheet = await readFile("styles/layout-authoring-scaffold.css", "utf8");
  const referenced = new Set(
    [...stylesheet.matchAll(/\[(data-phi-layout-[a-z0-9-]+)/gu)].map((match) => match[1]!),
  );
  assert.ok(referenced.size > 0, "The stylesheet should still select on layout attributes.");
  // Wider than the layouts: the Builder scaffold and the slot frame write layout attributes too.
  const written = await readWrittenAttributeSources();
  for (const attribute of referenced) {
    assert.ok(
      written.includes(attribute),
      `styles/layout-authoring-scaffold.css selects on "${attribute}", which no layout writes. ` +
      `A selector that matches nothing does not fail -- it silently means the opposite inside a :not().`,
    );
  }
}

// Nothing outside the authoring stylesheet may depend on the markers, or removing them breaks a page.
const styles = await readdir("styles");
for (const name of styles) {
  if (!name.endsWith(".css") || name === "layout-authoring-scaffold.css") continue;
  const text = await readFile(path.join("styles", name), "utf8");
  for (const token of ["phi-layout-scaffold-slot", "phi-layout-debug-layer", "phi-layout-has-content"]) {
    assert.ok(
      !text.includes(token),
      `styles/${name} reads "${token}", which now only exists while authoring.`,
    );
  }
}

// The check has to be able to fail, or it is decoration.
{
  const written = await readWrittenAttributeSources();
  assert.ok(
    !written.includes("data-phi-layout-has-explicit-surface-background"),
    "The misspelling this check exists for must stay gone.",
  );
  assert.ok(
    written.includes("data-phi-layout-has-explicit-layout-background"),
    "A layout must still state whether it paints its own background.",
  );
}

console.log("Authoring marker contracts validated.");
