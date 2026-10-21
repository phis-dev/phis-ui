import {
  PHI_MOTION_EASING_FIELD_OPTIONS,
  PHI_SEQUENCE_DEFAULT_DURATION_MS,
  PHI_SEQUENCE_DEFAULT_EASING,
  PHI_SEQUENCE_TRANSITION_MAX_MS,
  PHI_SEQUENCE_TRANSITION_MIN_MS,
  PHI_SEQUENCE_TRANSITION_STEP_MS,
  PHI_SEQUENCE_TRANSITIONS,
  clampPhiSequenceTransitionMs,
  readPhiMotionEasing,
  type PhiMotionEasing,
  type PhiSequenceTransition,
} from "../../../helpers/motion";
import {
  PHI_CMS_MOUNT_POLICY_FIELD_OPTIONS,
  readPhiCmsMountPolicy,
  type PhiCmsMountPolicy,
} from "../../../types/cms-mount-policy";
import type { PhiCmsConfigField, PhiCmsConfigFieldVisibilityRule } from "../../../types/cms-plugins";
import { PHI_SPACING_SCALE_KEYS, type PhiSpacingScaleKey } from "./spacing-options";

/**
 * How a Widget that shows a run of things a few at a time moves through them.
 *
 * The Gallery runs through the pictures of a Folder, the Entries list through cards of News or Blog;
 * what moves differs, how it moves does not. So the settings are one vocabulary with one reader, one
 * set of Inspector fields and one set of defaults, and `PhiSequenceRun` draws them. The Carousel Layout
 * asks the same questions under its own older keys (`visibleSlots`, `transitionDurationMs`).
 *
 * No window anchor, unlike the Carousel. A run moves a page at a time -- one to three, then four to
 * six -- and nothing outside it names an item to show; a centred anchor would only shift every page by
 * one and leave the dots pointing between pages. The window starts at its active item.
 */
export const PHI_SEQUENCE_CONTROLS = ["none", "arrows", "dots", "both"] as const;
export type PhiSequenceControls = (typeof PHI_SEQUENCE_CONTROLS)[number];

export type PhiSequenceSettings = {
  visibleCount?: number;
  transition?: PhiSequenceTransition;
  durationMs?: number;
  easing?: PhiMotionEasing;
  /** A step of the spacing scale between the items of a window. */
  gap?: PhiSpacingScaleKey;
  /**
   * How many items beyond the window are kept mounted, and therefore told to load early.
   *
   * The browser will not do this for us. `loading="lazy"` decides from an element's distance to the
   * viewport and knows nothing about a track: on a fade every item sits in the same place and all of
   * them load at once, while on a slide the next one is off to the side and loads as it arrives --
   * during the transition, which is the worst moment. Next's escape hatch for that, `lazyRoot`, is a
   * deprecated no-op. So the window decides, and the window is ours.
   */
  lookahead?: number;
  mountPolicy?: PhiCmsMountPolicy;
  controls?: PhiSequenceControls;
  loop?: boolean;
  /** Absent or zero means it does not move on its own. */
  autoplayMs?: number;
};

/** What a run does where nobody said otherwise, stated so the Inspector shows it as the standing answer. */
export const PHI_SEQUENCE_SETTINGS_DEFAULTS = {
  visibleCount: 1,
  transition: "slide",
  durationMs: PHI_SEQUENCE_DEFAULT_DURATION_MS,
  easing: PHI_SEQUENCE_DEFAULT_EASING,
  gap: "xs",
  lookahead: 1,
  mountPolicy: "lazy-keep",
  controls: "both",
  loop: false,
  autoplayMs: 0,
} as const satisfies Required<PhiSequenceSettings>;

/*
 * Read strictly, and say so when a document is wrong.
 *
 * A stored value that is not one of the words this vocabulary knows is a mistake in the document, and
 * a Widget that renders anyway hides it. Absent is not the same as wrong -- a key that was never
 * written leaves the decision to the defaults. The Widget names itself in the message through `fail`.
 */
type PhiSequenceSettingsFail = (key: string, value: unknown, expected: string) => never;

function readMember<TMember extends string>(
  value: unknown,
  members: readonly TMember[],
  key: string,
  fail: PhiSequenceSettingsFail,
): TMember | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string" || !(members as readonly string[]).includes(value)) {
    fail(key, value, `one of ${members.join(", ")}`);
  }
  return value as TMember;
}

function readCount(value: unknown, key: string, min: number, fail: PhiSequenceSettingsFail): number | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "number" || !Number.isInteger(value) || value < min) {
    fail(key, value, `a whole number of at least ${min}`);
  }
  return value;
}

export function readPhiSequenceSettings(
  raw: Record<string, unknown>,
  fail: PhiSequenceSettingsFail,
): PhiSequenceSettings {
  const visibleCount = readCount(raw.visibleCount, "visibleCount", 1, fail);
  const transition = readMember(raw.transition, PHI_SEQUENCE_TRANSITIONS, "transition", fail);
  const easing = readPhiMotionEasing(raw.easing, undefined);
  const gap = readMember(raw.gap, PHI_SPACING_SCALE_KEYS, "gap", fail);
  const lookahead = readCount(raw.lookahead, "lookahead", 0, fail);
  const controls = readMember(raw.controls, PHI_SEQUENCE_CONTROLS, "controls", fail);
  if (raw.loop !== undefined && raw.loop !== null && typeof raw.loop !== "boolean") {
    fail("loop", raw.loop, "true or false");
  }
  const loop = typeof raw.loop === "boolean" ? raw.loop : undefined;
  const autoplayMs = readCount(raw.autoplayMs, "autoplayMs", 0, fail);

  return {
    ...(visibleCount === undefined ? {} : { visibleCount }),
    ...(transition === undefined ? {} : { transition }),
    ...(raw.durationMs === undefined || raw.durationMs === null
      ? {}
      : { durationMs: clampPhiSequenceTransitionMs(raw.durationMs) }),
    ...(easing === undefined ? {} : { easing }),
    ...(gap === undefined ? {} : { gap }),
    ...(lookahead === undefined ? {} : { lookahead }),
    mountPolicy: readPhiCmsMountPolicy(raw.mountPolicy, PHI_SEQUENCE_SETTINGS_DEFAULTS.mountPolicy),
    ...(controls === undefined ? {} : { controls }),
    ...(loop === undefined ? {} : { loop }),
    // Zero is how "does not move on its own" is written, so it is the one number below the floor
    // that means something.
    ...(autoplayMs === undefined || autoplayMs === 0
      ? {}
      : { autoplayMs: clampPhiSequenceTransitionMs(autoplayMs) }),
  };
}

const PHI_SEQUENCE_SETTINGS_KEYS = Object.keys(PHI_SEQUENCE_SETTINGS_DEFAULTS) as (keyof PhiSequenceSettings)[];

/** The run's settings out of a Widget's config, for a client half that needs these and nothing else. */
export function pickPhiSequenceSettings(config: PhiSequenceSettings): PhiSequenceSettings {
  return Object.fromEntries(
    PHI_SEQUENCE_SETTINGS_KEYS.filter((key) => config[key] !== undefined).map((key) => [key, config[key]]),
  ) as PhiSequenceSettings;
}

function withRule(
  field: PhiCmsConfigField,
  rule: PhiCmsConfigFieldVisibilityRule | undefined,
): PhiCmsConfigField {
  if (!rule) return field;
  const own = field.visibleWhen == null ? [] : Array.isArray(field.visibleWhen) ? field.visibleWhen : [field.visibleWhen];
  return { ...field, visibleWhen: [...own, rule] };
}

/**
 * The Inspector's fields for a run, in three groups a Widget places among its own: the window (how many
 * stand side by side and how far apart), the movement, and the controls.
 *
 * `visibleWhen` is added to every field, for a Widget where the run is one presentation among others.
 * `heading` names the window group; the Gallery leaves it out, its window stands under "Picture".
 */
export function buildPhiSequenceSettingsFields({
  countLabel,
  heading,
  visibleWhen,
}: {
  countLabel: string;
  heading?: string;
  visibleWhen?: PhiCmsConfigFieldVisibilityRule;
}): { window: PhiCmsConfigField[]; movement: PhiCmsConfigField[]; controls: PhiCmsConfigField[] } {
  const window: PhiCmsConfigField[] = [
    { key: "visibleCount", type: "number", label: countLabel, min: 1, ...(heading ? { heading } : {}) },
    {
      key: "gap",
      type: "choice",
      label: "Gap",
      options: PHI_SPACING_SCALE_KEYS.map((key) => ({ value: key, label: key })),
    },
  ];
  const movement: PhiCmsConfigField[] = [
    {
      key: "transition",
      type: "choice",
      heading: "Transition",
      label: "Transition",
      options: [
        { value: "none", label: "None" },
        { value: "fade", label: "Fade" },
        { value: "slide", label: "Slide" },
        { value: "diagonal", label: "Diagonal" },
      ],
    },
    {
      key: "durationMs",
      type: "number",
      label: "Duration",
      min: PHI_SEQUENCE_TRANSITION_MIN_MS,
      max: PHI_SEQUENCE_TRANSITION_MAX_MS,
      step: PHI_SEQUENCE_TRANSITION_STEP_MS,
      prefix: "ms",
      visibleWhen: { field: "transition", notEquals: "none" },
    },
    {
      key: "easing",
      type: "choice",
      label: "Easing",
      options: [...PHI_MOTION_EASING_FIELD_OPTIONS],
      visibleWhen: { field: "transition", notEquals: "none" },
    },
    {
      // Zero is the one value below the floor that means something: it does not move on its own.
      key: "autoplayMs",
      type: "number",
      label: "Autoplay",
      min: 0,
      max: PHI_SEQUENCE_TRANSITION_MAX_MS,
      step: PHI_SEQUENCE_TRANSITION_STEP_MS,
      prefix: "ms",
    },
    { key: "lookahead", type: "number", label: "Preload Ahead", min: 0 },
    {
      key: "mountPolicy",
      type: "choice",
      label: "Mounting",
      options: [...PHI_CMS_MOUNT_POLICY_FIELD_OPTIONS],
    },
  ];
  const controls: PhiCmsConfigField[] = [
    {
      key: "controls",
      type: "choice",
      heading: "Controls",
      label: "Controls",
      options: [
        { value: "both", label: "Arrows and dots" },
        { value: "arrows", label: "Arrows" },
        { value: "dots", label: "Dots" },
        { value: "none", label: "None" },
      ],
    },
    { key: "loop", type: "boolean", label: "Wrap Around" },
  ];
  return {
    window: window.map((field) => withRule(field, visibleWhen)),
    movement: movement.map((field) => withRule(field, visibleWhen)),
    controls: controls.map((field) => withRule(field, visibleWhen)),
  };
}
