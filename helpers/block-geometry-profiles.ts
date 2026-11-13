import type { CSSProperties } from "react";

import {
  PHI_CONTAINER_BREAKPOINT_COL3,
  PHI_CONTAINER_BREAKPOINT_CONTENT,
} from "../theme/phi-container-breakpoints";
import type {
  PhiResolvedBlockAxes,
  PhiResolvedBlockGeometry,
  PhiResolvedBlockLength,
} from "../types/renderable-block-geometry";

/**
 * Where a block's geometry switches profile: one pair for every block (design/RESPONSIVE_BLOCK_GEOMETRY.md).
 *
 * A container query cannot read a custom property in its condition, so the widths stand literally in
 * `styles/layout.css` and one rule serves every block -- the Grid's pair, so `compact | medium | wide`
 * means one thing across the tree. `validate-container-breakpoint-contracts.ts` holds the literals to
 * these numbers.
 */
export const PHI_BLOCK_GEOMETRY_RESPONSIVE_MIN_WIDTH = {
  medium: PHI_CONTAINER_BREAKPOINT_COL3,
  wide: PHI_CONTAINER_BREAKPOINT_CONTENT,
} as const;

/** The six declarations a block may hand to its container's queries, as CSS spells them. */
export type PhiBlockProfileDeclaration =
  | "width"
  | "height"
  | "min-width"
  | "min-height"
  | "max-width"
  | "max-height";

type PhiBlockProfileEntry = {
  declaration: PhiBlockProfileDeclaration;
  key: "width" | "height" | "minWidth" | "minHeight" | "maxWidth" | "maxHeight";
  axis: keyof PhiResolvedBlockAxes;
  part: "size" | "min" | "max";
};

const PHI_BLOCK_PROFILE_ENTRIES: readonly PhiBlockProfileEntry[] = [
  { declaration: "width", key: "width", axis: "inline", part: "size" },
  { declaration: "height", key: "height", axis: "block", part: "size" },
  { declaration: "min-width", key: "minWidth", axis: "inline", part: "min" },
  { declaration: "min-height", key: "minHeight", axis: "block", part: "min" },
  { declaration: "max-width", key: "maxWidth", axis: "inline", part: "max" },
  { declaration: "max-height", key: "maxHeight", axis: "block", part: "max" },
];

/** The attribute a box carries for the declarations it hands to CSS, space-separated. */
export const PHI_BLOCK_PROFILED_ATTRIBUTE = "data-phi-block-profiled";

/** The attribute a box that offers a profiled block its room carries; `styles/layout.css` makes it the `phi-slot` container. */
const PHI_SLOT_CONTAINER_ATTRIBUTE = "data-phi-slot-container";

/**
 * What the box a block is drawn on says where a profile says nothing, and how it writes a maximum.
 *
 * The frame and a Layout's own inner box answer silence differently -- the frame never grows past its
 * slot, the inner box states no maximum of its own -- so each passes its own answers, the ones it
 * writes inline for a block that names no profile.
 */
export type PhiBlockProfileBox = {
  unstated: Record<PhiBlockProfileDeclaration, string>;
  /** A stated inline maximum as the box writes it; the frame caps one at the slot. */
  inlineMaximum?: (maximum: PhiResolvedBlockLength) => string;
};

export type PhiBlockProfileStyle = {
  /** The declarations the box hands to the stylesheet; it writes none of them inline. */
  declarations: readonly PhiBlockProfileDeclaration[];
  attributes: { [PHI_BLOCK_PROFILED_ATTRIBUTE]?: string };
  /** `--phi-block-<declaration>`, `-medium` and `-wide`, all three for every declaration handed over. */
  properties: Record<string, string>;
};

const PHI_EMPTY_BLOCK_PROFILE_STYLE: PhiBlockProfileStyle = {
  declarations: [],
  attributes: {},
  properties: {},
};

/**
 * The profile answers as the stylesheet reads them (LAYOUTING.md, "Block geometry per profile").
 *
 * **An axis is written inline or in CSS, never both**: an inline style beats every `@container` rule.
 * So a declaration whose three answers differ is left out of the inline style and written as three
 * custom properties, and the rules in `styles/layout.css` choose by the room the block is offered. A
 * declaration that answers the same at every profile stays inline, and a block that names no profile
 * hands nothing over and pays nothing.
 *
 * All three properties are written for a declaration handed over, the silent ones with the box's own
 * answer: custom properties inherit, so a property left unwritten would read whatever an enclosing
 * block wrote for its own geometry.
 */
export function resolvePhiBlockProfileStyle(
  geometry: PhiResolvedBlockGeometry,
  box: PhiBlockProfileBox,
): PhiBlockProfileStyle {
  if (geometry.profiles == null) {
    return PHI_EMPTY_BLOCK_PROFILE_STYLE;
  }

  const answers: readonly PhiResolvedBlockAxes[] = [
    { inline: geometry.inline, block: geometry.block },
    geometry.profiles.medium,
    geometry.profiles.wide,
  ];
  const declarations: PhiBlockProfileDeclaration[] = [];
  const properties: Record<string, string> = {};

  for (const entry of PHI_BLOCK_PROFILE_ENTRIES) {
    const [compact, medium, wide] = answers.map((answer) => {
      const length = answer[entry.axis][entry.part];
      if (length == null) {
        return box.unstated[entry.declaration];
      }
      return entry.declaration === "max-width" && box.inlineMaximum ? box.inlineMaximum(length) : length.css;
    });

    if (compact === medium && medium === wide) {
      continue;
    }

    declarations.push(entry.declaration);
    properties[`--phi-block-${entry.declaration}`] = compact;
    properties[`--phi-block-${entry.declaration}-medium`] = medium;
    properties[`--phi-block-${entry.declaration}-wide`] = wide;
  }

  return declarations.length === 0
    ? PHI_EMPTY_BLOCK_PROFILE_STYLE
    : {
        declarations,
        attributes: { [PHI_BLOCK_PROFILED_ATTRIBUTE]: declarations.join(" ") },
        properties,
      };
}

/** The inline style without the declarations handed to the stylesheet. */
export function omitPhiBlockProfiledDeclarations(
  style: CSSProperties,
  declarations: readonly PhiBlockProfileDeclaration[],
): CSSProperties {
  if (declarations.length === 0) {
    return style;
  }

  const next: CSSProperties = { ...style };
  for (const entry of PHI_BLOCK_PROFILE_ENTRIES) {
    if (declarations.includes(entry.declaration)) {
      delete next[entry.key];
    }
  }
  return next;
}

/**
 * Whether a block asks the room it is offered a question, which is what makes that room a container.
 *
 * The box offering the room is a `phi-slot` size container only where the block standing in it names a
 * profile; containment is not free (design/RESPONSIVE_BLOCK_GEOMETRY.md, "What it costs elsewhere"),
 * and a page that names no profile stays byte for byte what it was.
 */
export function phiBlockGeometryQueriesRoom(geometry: PhiResolvedBlockGeometry) {
  return geometry.profiles != null;
}

/** The attribute that declares the `phi-slot` container, on the box that offers a profiled block its room. */
export function phiSlotContainerAttributes(queriesRoom: boolean) {
  return { [PHI_SLOT_CONTAINER_ATTRIBUTE]: queriesRoom ? "true" : undefined };
}
