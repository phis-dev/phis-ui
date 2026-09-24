import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  PHI_CONTAINER_BREAKPOINTS,
  PHI_CONTAINER_BREAKPOINT_COL2,
  PHI_CONTAINER_BREAKPOINT_COL3,
  PHI_CONTAINER_BREAKPOINT_CONTENT,
  PHI_CONTAINER_BREAKPOINT_REGION,
} from "../theme/phi-container-breakpoints";
import { PHI_FORM_RESPONSIVE_MIN_WIDTH } from "../components/forms/form-descriptor-contract";

/**
 * Every named threshold is a member of the scale.
 *
 * The type already says so, which is most of the point -- this is the case the type cannot make, that
 * the scale itself is the house sequence rather than whatever somebody added to it.
 */
assert.deepEqual(
  [...PHI_CONTAINER_BREAKPOINTS],
  [144, 233, 377, 610, 987],
  "The container-breakpoint scale is the house sequence.",
);
for (const [name, value] of [
  ["COL2", PHI_CONTAINER_BREAKPOINT_COL2],
  ["COL3", PHI_CONTAINER_BREAKPOINT_COL3],
  ["CONTENT", PHI_CONTAINER_BREAKPOINT_CONTENT],
  ["REGION", PHI_CONTAINER_BREAKPOINT_REGION],
] as const) {
  assert.ok(
    (PHI_CONTAINER_BREAKPOINTS as readonly number[]).includes(value),
    `PHI_CONTAINER_BREAKPOINT_${name} is ${value}, which is not on the scale.`,
  );
}

/**
 * The Form states its thresholds twice, and nothing but this holds the two together.
 *
 * A container query cannot read a custom property for its threshold, so the number that TypeScript
 * declares has to stand again as a literal in the stylesheet. Two comments used to be the whole of the
 * agreement; a divergence rendered a form at the wrong width and reported nothing.
 */
const layoutStylesheet = await readFile(new URL("../styles/layout.css", import.meta.url), "utf8");
const formThresholds = [...layoutStylesheet.matchAll(/@container phi-form \(min-width: (\d+)px\)/gu)]
  .map((match) => Number(match[1]));
assert.deepEqual(
  formThresholds,
  [PHI_FORM_RESPONSIVE_MIN_WIDTH.medium, PHI_FORM_RESPONSIVE_MIN_WIDTH.wide],
  "styles/layout.css must compare against the same numbers PHI_FORM_RESPONSIVE_MIN_WIDTH declares, in that order.",
);
for (const threshold of Object.values(PHI_FORM_RESPONSIVE_MIN_WIDTH)) {
  assert.ok(
    (PHI_CONTAINER_BREAKPOINTS as readonly number[]).includes(threshold),
    `The Form switches at ${threshold}, which is not on the container-breakpoint scale.`,
  );
}

/**
 * And the Shell's thresholds are deliberately NOT on it.
 *
 * They are written as container queries because the Shell measures the render viewport, but what they
 * mean is the device, and they carry `viewportFlags` -- so they decide whether a block exists on the
 * page rather than how it is drawn. A Phi number has to fall where content stops fitting, and 377 sits
 * between a 375px phone and a 390px one. Asserted from the other side so that moving them onto the
 * scale fails here rather than silently changing which blocks a phone gets.
 */
const shellStylesheet = await readFile(new URL("../styles/shell.css", import.meta.url), "utf8");
const shellThresholds = [...shellStylesheet.matchAll(/@container phi-render-viewport \([^)]*?(\d+)px[^)]*\)/gu)]
  .map((match) => Number(match[1]));
assert.ok(shellThresholds.length > 0, "The Shell's viewport bands must be readable from styles/shell.css.");
for (const threshold of shellThresholds) {
  assert.ok(
    !(PHI_CONTAINER_BREAKPOINTS as readonly number[]).includes(threshold),
    `The Shell band ${threshold} is on the container-breakpoint scale. It is a device band, not a content threshold.`,
  );
}

console.log(
  `Container breakpoint contracts valid: scale of ${PHI_CONTAINER_BREAKPOINTS.length}, `
  + `Form at ${formThresholds.join(" and ")}, Shell bands off the scale.`,
);
