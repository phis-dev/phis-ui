import { resolvePhiCmsWidgetPluginKey } from "../../../../../constants/cms-widget-types";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import type { PhiCmsWidgetPlugin } from "../../../../../types";
import {
  PHI_MOTION_EASING_FIELD_OPTIONS,
  clampPhiSequenceTransitionMs,
  readPhiMotionEasing,
  type PhiMotionEasing,
} from "../../../../../helpers/motion";
import {
  PHI_CMS_MOUNT_POLICY_FIELD_OPTIONS,
  readPhiCmsMountPolicy,
  type PhiCmsMountPolicy,
} from "../../../../../types/cms-mount-policy";
import {
  PHI_SEQUENCE_ANCHORS,
  PHI_SEQUENCE_TRANSITIONS,
  type PhiSequenceAnchor,
  type PhiSequenceTransition,
} from "../../../../../components/motion/phi-sequence-viewport";
import {
  readRenderableBlockConfig,
  type PhiCmsWidgetConfigBase,
} from "../../../../../components/widgets/config/parser-primitives";

/**
 * A run of pictures, shown a few at a time.
 *
 * Not a layout. A layout's slots are authored -- twelve of them, and somebody drops a Widget into
 * each -- while the pictures here are data: an unknown number per row, out of an assets slot whose
 * cardinality is `many`. A Carousel over authored slots could never show them, which is why the two
 * are separate things that share a viewport rather than one thing with a switch.
 */

export type PhiGalleryImage = {
  url: string;
  alt?: string;
  href?: string;
};

export type PhiCmsGalleryWidgetConfig = PhiCmsWidgetConfigBase & {
  images: PhiGalleryImage[];
  visibleCount?: number;
  windowAnchor?: PhiSequenceAnchor;
  transition?: PhiSequenceTransition;
  durationMs?: number;
  easing?: PhiMotionEasing;
  gap?: string;
  /**
   * How many pictures beyond the window are kept mounted, and therefore told to load early.
   *
   * The browser will not do this for us. `loading="lazy"` decides from an element's distance to the
   * viewport and knows nothing about a track: on a fade every picture sits in the same place and all
   * of them load at once, while on a slide the next one is off to the side and loads as it arrives --
   * during the transition, which is the worst moment. Next's escape hatch for that, `lazyRoot`, is a
   * deprecated no-op. So the window decides, and the window is ours.
   */
  lookahead?: number;
  mountPolicy?: PhiCmsMountPolicy;
  aspectRatio?: string;
  fit?: "cover" | "contain";
  controls?: "none" | "arrows" | "dots" | "both";
  loop?: boolean;
  /** Absent or zero means it does not move on its own. */
  autoplayMs?: number;
};

/*
 * Read strictly, and say so when a document is wrong.
 *
 * Nothing here falls back. A stored value that is not one of the words this Widget knows is a
 * mistake in the document, and a Widget that renders anyway hides it: the picture wall simply does
 * something other than what somebody wrote, on a page that reports no error at all. Absent is not
 * the same as wrong -- a key that was never written leaves the decision to the defaults below.
 */

function fail(key: string, value: unknown, expected: string): never {
  throw new Error(`Invalid Gallery ${key} ${JSON.stringify(value)}. Expected ${expected}.`);
}

function readMember<TMember extends string>(
  value: unknown,
  members: readonly TMember[],
  key: string,
): TMember | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string" || !(members as readonly string[]).includes(value)) {
    fail(key, value, `one of ${members.join(", ")}`);
  }
  return value as TMember;
}

function readCount(value: unknown, key: string, min: number): number | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "number" || !Number.isInteger(value) || value < min) {
    fail(key, value, `a whole number of at least ${min}`);
  }
  return value;
}

function readFlag(value: unknown, key: string): boolean | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "boolean") fail(key, value, "true or false");
  return value;
}

function readText(value: unknown, key: string): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string" || value.trim() === "") fail(key, value, "a non-empty string");
  return value;
}

function readGalleryImages(value: unknown): PhiGalleryImage[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) fail("images", value, "an array of pictures");
  return value.map((entry, index) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      fail(`images[${index}]`, entry, "an object with a url");
    }
    const record = entry as Record<string, unknown>;
    const url = readText(record.url, `images[${index}].url`);
    if (!url) fail(`images[${index}].url`, record.url, "a non-empty string");
    const alt = readText(record.alt, `images[${index}].alt`);
    const href = readText(record.href, `images[${index}].href`);
    return { url, ...(alt ? { alt } : {}), ...(href ? { href } : {}) };
  });
}

export function parsePhiCmsGalleryWidgetConfig(raw: Record<string, unknown>): PhiCmsGalleryWidgetConfig {
  const visibleCount = readCount(raw.visibleCount, "visibleCount", 1);
  const windowAnchor = readMember(raw.windowAnchor, PHI_SEQUENCE_ANCHORS, "windowAnchor");
  const transition = readMember(raw.transition, PHI_SEQUENCE_TRANSITIONS, "transition");
  const easing = readPhiMotionEasing(raw.easing, undefined);
  const gap = readText(raw.gap, "gap");
  const lookahead = readCount(raw.lookahead, "lookahead", 0);
  const aspectRatio = readText(raw.aspectRatio, "aspectRatio");
  const fit = readMember(raw.fit, ["cover", "contain"] as const, "fit");
  const controls = readMember(raw.controls, ["none", "arrows", "dots", "both"] as const, "controls");
  const loop = readFlag(raw.loop, "loop");
  const autoplayMs = readCount(raw.autoplayMs, "autoplayMs", 0);

  return {
    ...readRenderableBlockConfig(raw),
    images: readGalleryImages(raw.images),
    ...(visibleCount === undefined ? {} : { visibleCount }),
    ...(windowAnchor === undefined ? {} : { windowAnchor }),
    ...(transition === undefined ? {} : { transition }),
    // Absent stays absent: the viewport then moves at the pace the theme sets rather than one this
    // Widget invented.
    ...(raw.durationMs === undefined || raw.durationMs === null
      ? {}
      : { durationMs: clampPhiSequenceTransitionMs(raw.durationMs) }),
    ...(easing === undefined ? {} : { easing }),
    ...(gap === undefined ? {} : { gap }),
    ...(lookahead === undefined ? {} : { lookahead }),
    mountPolicy: readPhiCmsMountPolicy(raw.mountPolicy, "lazy-keep"),
    ...(aspectRatio === undefined ? {} : { aspectRatio }),
    ...(fit === undefined ? {} : { fit }),
    ...(controls === undefined ? {} : { controls }),
    ...(loop === undefined ? {} : { loop }),
    // Zero is how "does not move on its own" is written, so it is the one number below the floor
    // that means something.
    ...(autoplayMs === undefined || autoplayMs === 0
      ? {}
      : { autoplayMs: clampPhiSequenceTransitionMs(autoplayMs) }),
  };
}

export const PHI_GALLERY_WIDGET_DEFINITION = {
  kind: "widget",
  pluginKey: resolvePhiCmsWidgetPluginKey("gallery"),
  typeKey: "gallery",
  title: "Gallery",
  description: "A run of pictures shown a few at a time, with arrows, dots and optional autoplay.",
  category: "media",
  icon: "antd:picture-outlined",
  iconFamily: "media",
  fields: [
    { key: "visibleCount", type: "number", label: "Visible Pictures" },
    {
      key: "windowAnchor",
      type: "choice",
      label: "Window Anchor",
      options: [
        { value: "start", label: "Leading edge" },
        { value: "center", label: "Centre" },
      ],
    },
    {
      key: "transition",
      type: "choice",
      label: "Transition",
      options: [
        { value: "none", label: "None" },
        { value: "fade", label: "Fade" },
        { value: "slide", label: "Slide" },
        { value: "diagonal", label: "Diagonal" },
      ],
    },
    { key: "durationMs", type: "number", label: "Transition Duration (ms)" },
    {
      key: "easing",
      type: "choice",
      label: "Transition Easing",
      options: [...PHI_MOTION_EASING_FIELD_OPTIONS],
    },
    { key: "gap", type: "string", label: "Gap" },
    { key: "lookahead", type: "number", label: "Preload Ahead" },
    {
      key: "mountPolicy",
      type: "choice",
      label: "Picture Mounting",
      options: [...PHI_CMS_MOUNT_POLICY_FIELD_OPTIONS],
    },
    { key: "aspectRatio", type: "string", label: "Aspect Ratio" },
    {
      key: "fit",
      type: "choice",
      label: "Fit",
      options: [
        { value: "cover", label: "Cover" },
        { value: "contain", label: "Contain" },
      ],
    },
    {
      key: "controls",
      type: "choice",
      label: "Controls",
      options: [
        { value: "both", label: "Arrows and dots" },
        { value: "arrows", label: "Arrows" },
        { value: "dots", label: "Dots" },
        { value: "none", label: "None" },
      ],
    },
    { key: "loop", type: "boolean", label: "Wrap Around" },
    { key: "autoplayMs", type: "number", label: "Autoplay Interval (ms)" },
  ],
  parseConfig: parsePhiCmsGalleryWidgetConfig,
} satisfies Pick<
  PhiCmsWidgetPlugin<PhiCmsGalleryWidgetConfig>,
  | "kind"
  | "pluginKey"
  | "typeKey"
  | "title"
  | "description"
  | "category"
  | "icon"
  | "iconFamily"
  | "fields"
  | "parseConfig"
>;

export const PHI_GALLERY_WIDGET_PLUGIN_TYPE = PhiCmsWidgetType.Gallery;
