import { resolvePhiCmsWidgetPluginKey } from "../../../../../constants/cms-widget-types";
import { PHI_MEDIA_LIBRARY_DATA_PROVIDER_KEYS } from "../../../../../constants/media-library-provider-keys";
import { PHI_IMAGE_VARIANT_OPTIONS } from "../../../../../components/widgets/config/image-variant-options";
import type { PhiCmsWidgetPlugin } from "../../../../../types";
import {
  readPhiRuntimeDataProviderBinding,
  type PhiRuntimeDataProviderBinding,
} from "../../../../../types/runtime-data-provider";
import {
  PHI_MOTION_EASING_FIELD_OPTIONS,
  PHI_SEQUENCE_TRANSITION_MAX_MS,
  PHI_SEQUENCE_TRANSITION_MIN_MS,
  PHI_SEQUENCE_TRANSITION_STEP_MS,
  clampPhiSequenceTransitionMs,
  PHI_SEQUENCE_ANCHORS,
  PHI_SEQUENCE_TRANSITIONS,
  readPhiMotionEasing,
  type PhiMotionEasing,
  type PhiSequenceAnchor,
  type PhiSequenceTransition,
} from "../../../../../helpers/motion";
import {
  PHI_CMS_MOUNT_POLICY_FIELD_OPTIONS,
  readPhiCmsMountPolicy,
  type PhiCmsMountPolicy,
} from "../../../../../types/cms-mount-policy";
import {
  readRenderableBlockConfig,
  type PhiCmsWidgetConfigBase,
} from "../../../../../components/widgets/config/parser-primitives";

/**
 * A run of pictures, shown a few at a time.
 *
 * Not a layout. A layout's slots are authored -- twelve of them, and somebody drops a Widget into
 * each -- while the pictures here are data: however many a Media Folder holds, read on the server
 * while the page is drawn through the record Provider the binding names. A Carousel over authored
 * slots could never show them, which is why the two are separate things that share a viewport rather
 * than one thing with a switch.
 */

export type PhiCmsGalleryWidgetConfig = PhiCmsWidgetConfigBase & {
  /** The record Provider the pictures come from; starts on the Media Folder Provider. */
  source: PhiRuntimeDataProviderBinding | null;
  /** The rendition each picture is drawn in; absent is the original. */
  variantKey?: string;
  /** Opens a picture larger over the page when clicked. */
  preview?: boolean;
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
  const variantKey = readMember(raw.variantKey, PHI_IMAGE_VARIANT_OPTIONS.map((option) => option.value), "variantKey");
  const preview = readFlag(raw.preview, "preview");

  return {
    ...readRenderableBlockConfig(raw),
    source: readPhiRuntimeDataProviderBinding(raw.source),
    ...(variantKey === undefined ? {} : { variantKey }),
    ...(preview === undefined ? {} : { preview }),
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
  slotSizePolicy: "intrinsic",
  title: "Gallery",
  description: "A run of pictures shown a few at a time, with arrows, dots and optional autoplay.",
  category: "media",
  icon: "antd:picture-outlined",
  iconFamily: "media",
  fields: [
    {
      key: "source",
      type: "data-provider",
      providerKind: "record",
      label: "Pictures",
      description: "Where the pictures come from. The folder and its order are set inside the binding.",
    },
    {
      key: "variantKey",
      type: "choice",
      label: "Variant",
      options: PHI_IMAGE_VARIANT_OPTIONS,
      emptyOption: { value: "__original__", label: "Original" },
      emptyValue: null,
    },
    { key: "preview", type: "boolean", label: "Lightbox", description: "Open a picture larger over the page when it is clicked." },
    { key: "visibleCount", type: "number", label: "Visible Pictures", min: 1 },
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
    {
      key: "durationMs",
      type: "number",
      label: "Duration",
      min: PHI_SEQUENCE_TRANSITION_MIN_MS,
      max: PHI_SEQUENCE_TRANSITION_MAX_MS,
      step: PHI_SEQUENCE_TRANSITION_STEP_MS,
      prefix: "ms",
    },
    {
      key: "easing",
      type: "choice",
      label: "Easing",
      options: [...PHI_MOTION_EASING_FIELD_OPTIONS],
    },
    { key: "gap", type: "string", label: "Gap" },
    { key: "lookahead", type: "number", label: "Preload Ahead", min: 0 },
    {
      key: "mountPolicy",
      type: "choice",
      label: "Mounting",
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
  ],
  // Bound to the Folder Provider from the start, so the inspector asks for a folder and nothing else.
  defaultConfig: { source: { providerKey: PHI_MEDIA_LIBRARY_DATA_PROVIDER_KEYS.folderImages, params: {} } },
  parseConfig: parsePhiCmsGalleryWidgetConfig,
} satisfies Pick<
  PhiCmsWidgetPlugin<PhiCmsGalleryWidgetConfig>,
  | "kind"
  | "pluginKey"
  | "typeKey"
  | "slotSizePolicy"
  | "title"
  | "description"
  | "category"
  | "icon"
  | "iconFamily"
  | "fields"
  | "defaultConfig"
  | "parseConfig"
>;
