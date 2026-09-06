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
  PHI_SEQUENCE_TRANSITIONS,
  type PhiSequenceAnchor,
  type PhiSequenceTransition,
} from "../../../../../components/motion/phi-sequence-viewport";
import {
  readBoolean,
  readInteger,
  readRenderableBlockConfig,
  readString,
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

function readGalleryImages(value: unknown): PhiGalleryImage[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const record = entry as Record<string, unknown>;
    const url = readString(record.url);
    if (!url) return [];
    const alt = readString(record.alt);
    const href = readString(record.href);
    return [{ url, ...(alt ? { alt } : {}), ...(href ? { href } : {}) }];
  });
}

function readTransition(value: unknown): PhiSequenceTransition | undefined {
  return typeof value === "string" && (PHI_SEQUENCE_TRANSITIONS as readonly string[]).includes(value)
    ? value as PhiSequenceTransition
    : undefined;
}

export function parsePhiCmsGalleryWidgetConfig(raw: Record<string, unknown>): PhiCmsGalleryWidgetConfig {
  const autoplayMs = readInteger(raw.autoplayMs);
  return {
    ...readRenderableBlockConfig(raw),
    images: readGalleryImages(raw.images),
    ...(readInteger(raw.visibleCount) === undefined
      ? {}
      : { visibleCount: Math.max(1, readInteger(raw.visibleCount)!) }),
    ...(raw.windowAnchor === "center" ? { windowAnchor: "center" as const } : {}),
    ...(readTransition(raw.transition) ? { transition: readTransition(raw.transition)! } : {}),
    // Absent stays absent: the viewport then moves at the pace the theme sets rather than one this
    // Widget invented.
    ...(raw.durationMs === undefined
      ? {}
      : { durationMs: clampPhiSequenceTransitionMs(raw.durationMs, 320) }),
    ...(readPhiMotionEasing(raw.easing, undefined)
      ? { easing: readPhiMotionEasing(raw.easing, undefined)! }
      : {}),
    ...(readString(raw.gap) ? { gap: readString(raw.gap)! } : {}),
    ...(readInteger(raw.lookahead) === undefined
      ? {}
      : { lookahead: Math.max(0, readInteger(raw.lookahead)!) }),
    mountPolicy: readPhiCmsMountPolicy(raw.mountPolicy, "lazy-keep"),
    ...(readString(raw.aspectRatio) ? { aspectRatio: readString(raw.aspectRatio)! } : {}),
    ...(raw.fit === "contain" ? { fit: "contain" as const } : {}),
    ...(raw.controls === "none" || raw.controls === "arrows" || raw.controls === "dots"
      ? { controls: raw.controls }
      : {}),
    ...(readBoolean(raw.loop) === undefined ? {} : { loop: readBoolean(raw.loop)! }),
    // Zero is how "do not move on its own" is written, so it is not clamped up to the floor.
    ...(autoplayMs === undefined || autoplayMs <= 0
      ? {}
      : { autoplayMs: clampPhiSequenceTransitionMs(autoplayMs, 5000) }),
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
