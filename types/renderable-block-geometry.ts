import type {
  PhiRenderableBlockResponsiveSize,
  PhiRenderableBlockSize,
  PhiRenderableBlockVisibility,
  PhiResponsiveLength,
} from "./renderable-block";
import { readPhiCssLengthPart, type PhiCssLengthPart } from "./length";

/**
 * A block's geometry, read once.
 *
 * `size`, `minSize` and `maxSize` used to be read wherever a box was drawn, and each reader interpreted
 * them for itself: one appended `px`, one passed the value through and let React append it, one took
 * `typeof value === "number"` for a type when it is a unit, and on an absent width there were as many
 * answers as readers. A Layout in a slot drew its geometry twice, on two nested boxes, by two of those
 * rules -- and they disagreed on the maximum.
 *
 * This is the one reader. It hands back CSS lengths decoded by unit, and it answers the question that
 * `size` asks in the same breath as the measurement: an axis that states a size is an axis the block
 * decides for itself, which is what flips a slot policy from `fill` to `fixed`. What a reader does with
 * an absent value stays the reader's own fallback, stated at the call site rather than decided here a
 * second time; what a reader never does again is look at the three fields.
 *
 * A collapsed block measures by its `collapsedSizeHint` where it has one, and that substitution lives
 * here too, for the same reason: it was copied into six files, and a copy is a rule that has to be
 * remembered.
 */
export type PhiResolvedBlockLength = {
  /** What a stylesheet receives: `240px`, `50%`, or a keyword or expression passed through as written. */
  css: string;
  /**
   * The length decoded by unit, or null for a keyword (`auto`, `fit-content`) or an expression (`calc()`)
   * the vocabulary does not decode. A reader that has to know whether a maximum is absolute asks this,
   * never `typeof`.
   */
  part: PhiCssLengthPart | null;
};

export type PhiResolvedBlockAxisGeometry = {
  size: PhiResolvedBlockLength | null;
  min: PhiResolvedBlockLength | null;
  max: PhiResolvedBlockLength | null;
};

export type PhiResolvedBlockAxes = {
  inline: PhiResolvedBlockAxisGeometry;
  block: PhiResolvedBlockAxisGeometry;
};

export type PhiResolvedBlockGeometry = {
  inline: PhiResolvedBlockAxisGeometry;
  block: PhiResolvedBlockAxisGeometry;
  /**
   * The block decides its own inline axis: a width is stated, so the slot policy on that axis is
   * `fixed`. Stated at *any* profile counts, because a slot policy and the data attribute that carries
   * it are resolved once on the server and CSS can vary a width but not an attribute. "Explicit" is a
   * property of the block as a whole; the profiles vary the value, not the policy.
   */
  explicitInline: boolean;
  /** The block decides its own block axis. */
  explicitBlock: boolean;
  /**
   * The other two answers, and only where a field names more than one.
   *
   * `inline` and `block` above are the base -- `compact`, what stands without a container query -- so
   * every reader that existed before profiles keeps reading exactly what it read. The one emitter that
   * writes the custom properties reads this.
   */
  profiles: { medium: PhiResolvedBlockAxes; wide: PhiResolvedBlockAxes } | null;
};

export type PhiRenderableBlockGeometryInput = {
  visibility?: PhiRenderableBlockVisibility | null;
  size?: PhiRenderableBlockResponsiveSize | null;
  minSize?: PhiRenderableBlockResponsiveSize | null;
  maxSize?: PhiRenderableBlockResponsiveSize | null;
  collapsedSizeHint?: PhiRenderableBlockSize | null;
};

/** The three rooms a block may answer differently, smaller to larger. */
export const PHI_BLOCK_PROFILES = ["compact", "medium", "wide"] as const;

export type PhiBlockProfile = (typeof PHI_BLOCK_PROFILES)[number];

const EMPTY_AXIS: PhiResolvedBlockAxisGeometry = { size: null, min: null, max: null };

export const PHI_EMPTY_BLOCK_GEOMETRY: PhiResolvedBlockGeometry = {
  inline: EMPTY_AXIS,
  block: EMPTY_AXIS,
  explicitInline: false,
  explicitBlock: false,
  profiles: null,
};

/**
 * One stored length as a stylesheet receives it.
 *
 * A bare number is a pixel length, because that is how the vocabulary stores one (`serializePhiCssLength`);
 * a string on the vocabulary is decoded and written back in canonical form; any other string is a
 * keyword or an expression and goes through as written. A blank string states nothing, and neither does
 * a number that is not finite.
 */
export function readPhiRenderableBlockLength(
  value: number | string | null | undefined,
): PhiResolvedBlockLength | null {
  if (value == null) {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? { css: `${value}px`, part: { value, unit: "px" } } : null;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }

  const part = readPhiCssLengthPart(trimmed);
  return part ? { css: `${part.value}${part.unit}`, part } : { css: trimmed, part: null };
}

function resolveAxis(
  size: number | string | null | undefined,
  min: number | string | null | undefined,
  max: number | string | null | undefined,
): PhiResolvedBlockAxisGeometry {
  return {
    size: readPhiRenderableBlockLength(size),
    min: readPhiRenderableBlockLength(min),
    max: readPhiRenderableBlockLength(max),
  };
}

function isResponsiveLength(value: PhiResponsiveLength | undefined): value is Exclude<PhiResponsiveLength, number | string | null> {
  return typeof value === "object" && value !== null;
}

/**
 * One stored length at one profile, smaller to larger.
 *
 * A plain length is the same answer at all three. A profile value cascades upward: `compact` is the
 * base, `medium` falls back to it and `wide` to `medium` -- so a block that names only `wide` states
 * nothing below 610 and is `auto` there, which is why the Inspector asks narrow first.
 */
function readProfileLength(value: PhiResponsiveLength | undefined, profile: PhiBlockProfile) {
  if (!isResponsiveLength(value)) {
    return value;
  }

  return profile === "compact"
    ? value.compact
    : profile === "medium"
      ? value.medium ?? value.compact
      : value.wide ?? value.medium ?? value.compact;
}

function resolveAxesForProfile(
  size: PhiRenderableBlockResponsiveSize | null | undefined,
  min: PhiRenderableBlockResponsiveSize | null | undefined,
  max: PhiRenderableBlockResponsiveSize | null | undefined,
  profile: PhiBlockProfile,
): PhiResolvedBlockAxes {
  return {
    inline: resolveAxis(
      readProfileLength(size?.width, profile),
      readProfileLength(min?.width, profile),
      readProfileLength(max?.width, profile),
    ),
    block: resolveAxis(
      readProfileLength(size?.height, profile),
      readProfileLength(min?.height, profile),
      readProfileLength(max?.height, profile),
    ),
  };
}

/** Whether any of the six stored lengths names more than one profile. */
function statesProfiles(
  size: PhiRenderableBlockResponsiveSize | null | undefined,
  min: PhiRenderableBlockResponsiveSize | null | undefined,
  max: PhiRenderableBlockResponsiveSize | null | undefined,
) {
  return [size, min, max].some((pair) =>
    isResponsiveLength(pair?.width) || isResponsiveLength(pair?.height));
}

export function resolvePhiRenderableBlockGeometry(
  config: PhiRenderableBlockGeometryInput | null | undefined,
): PhiResolvedBlockGeometry {
  if (config == null) {
    return PHI_EMPTY_BLOCK_GEOMETRY;
  }

  const size =
    config.visibility === "collapsed"
      ? config.collapsedSizeHint ?? config.size
      : config.size;
  const base = resolveAxesForProfile(size, config.minSize, config.maxSize, "compact");
  const profiles = statesProfiles(size, config.minSize, config.maxSize)
    ? {
        medium: resolveAxesForProfile(size, config.minSize, config.maxSize, "medium"),
        wide: resolveAxesForProfile(size, config.minSize, config.maxSize, "wide"),
      }
    : null;

  return {
    inline: base.inline,
    block: base.block,
    explicitInline:
      base.inline.size != null
      || profiles?.medium.inline.size != null
      || profiles?.wide.inline.size != null,
    explicitBlock:
      base.block.size != null
      || profiles?.medium.block.size != null
      || profiles?.wide.block.size != null,
    profiles,
  };
}
