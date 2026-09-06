export function resolvePhiMotionDurationMs(value: string | number) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? Math.max(0, value) : 0;
  }

  const duration = Number.parseFloat(value);
  if (!Number.isFinite(duration)) return 0;
  return value.trim().endsWith("ms") ? duration : duration * 1000;
}

/**
 * The curves a Site may pick from.
 *
 * One list, because it existed three times: as a union in `renderable-block`, as a literal array in
 * the Builder's effects form, and as a hand-written chain of comparisons in the serializer. Three
 * copies of five words stay equal only as long as nobody adds a sixth.
 *
 * They are CSS keywords on purpose. The Web Animations API takes the same strings, so a curve chosen
 * for a block effect and a curve chosen for a Carousel mean the same thing without translation.
 */
export const PHI_MOTION_EASINGS = ["linear", "ease", "ease-in", "ease-out", "ease-in-out"] as const;
export type PhiMotionEasing = (typeof PHI_MOTION_EASINGS)[number];

export function isPhiMotionEasing(value: unknown): value is PhiMotionEasing {
  return typeof value === "string" && (PHI_MOTION_EASINGS as readonly string[]).includes(value);
}

/**
 * A stored curve, or nothing where none was stored.
 *
 * A present value that is not one of the five throws rather than quietly becoming the theme's. An
 * animation that ignores what somebody wrote is harder to notice than one that refuses to start.
 */
export function readPhiMotionEasing<TWhenAbsent extends PhiMotionEasing | undefined>(
  value: unknown,
  whenAbsent: TWhenAbsent,
): PhiMotionEasing | TWhenAbsent {
  if (value === undefined || value === null) return whenAbsent;
  if (!isPhiMotionEasing(value)) {
    throw new Error(
      `Invalid Phi motion easing ${JSON.stringify(value)}. ` +
      `Expected one of ${PHI_MOTION_EASINGS.join(", ")}.`,
    );
  }
  return value;
}

/** The vocabulary as a picker offers it. The labels are the keywords: they are what a designer says. */
export const PHI_MOTION_EASING_FIELD_OPTIONS = PHI_MOTION_EASINGS.map(
  (value) => ({ value, label: value }),
) satisfies readonly { value: PhiMotionEasing; label: string }[];

/**
 * How long a sequence may take to move from one slot to the next.
 *
 * The floor is where a transition stops being one: below it the eye reads a jump, and the animation
 * only costs a frame nobody sees. The ceiling is high on purpose -- ten minutes is a display board
 * dissolving between two pictures, which is a real thing to build and not a typo.
 *
 * This is not the range block effects use. An element appearing on a page and a picture wall turning
 * over are different acts, and `renderable-block` keeps its own tighter bound.
 */
export const PHI_SEQUENCE_TRANSITION_MIN_MS = 100;
export const PHI_SEQUENCE_TRANSITION_MAX_MS = 600_000;

/**
 * A stored length brought into range.
 *
 * Clamping is the stated rule and not a rescue: the bounds are what the setting means. Anything that
 * is not a number throws instead, because a duration of "fast" is a mistake in the document rather
 * than a value to interpret -- and a caller with no value at all does not call this, it uses its own
 * default, so there is no second argument here to hide an absent one behind.
 */
export function clampPhiSequenceTransitionMs(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(
      `Invalid Phi sequence transition duration ${JSON.stringify(value)}. ` +
      "Expected a number of milliseconds.",
    );
  }
  return Math.min(
    PHI_SEQUENCE_TRANSITION_MAX_MS,
    Math.max(PHI_SEQUENCE_TRANSITION_MIN_MS, Math.round(value)),
  );
}
