import { resolvePhiCmsWidgetPluginKey } from "../../../../../constants/cms-widget-types";
import { PHI_MEDIA_LIBRARY_DATA_PROVIDER_KEYS } from "../../../../../constants/media-library-provider-keys";
import {
  PHI_MEDIA_ASPECT_RATIOS,
  PHI_MEDIA_ASPECT_RATIO_OPTIONS,
  type PhiMediaAspectRatio,
} from "../../../../../components/media/aspect-ratios";
import { PHI_IMAGE_VARIANT_OPTIONS } from "../../../../../components/widgets/config/image-variant-options";
import {
  buildPhiSequenceSettingsFields,
  PHI_SEQUENCE_SETTINGS_DEFAULTS,
  readPhiSequenceSettings,
  type PhiSequenceSettings,
} from "../../../../../components/widgets/config/sequence-settings";
import type { PhiCmsWidgetPlugin } from "../../../../../types";
import type { PhiImageAssetVariantKeyValue } from "../../../../../types/media";
import { PHI_GALLERY_DEFAULT_ASPECT_RATIO } from "./defaults";
import {
  readPhiRuntimeDataProviderBinding,
  type PhiRuntimeDataProviderBinding,
} from "../../../../../types/runtime-data-provider";
import {
  readRenderableBlockConfig,
  type PhiCmsWidgetConfigBase,
} from "../../../../../components/widgets/config/parser-primitives";

/**
 * A run of pictures, shown a few at a time.
 *
 * Not a layout. A layout's slots are authored -- twelve of them, and somebody drops a Widget into
 * each -- while the pictures here are data: however many a Media Folder holds, read on the server
 * while the page is drawn through the Folder Provider. A Carousel over authored slots could never show
 * them, which is why the two are separate things that share a viewport rather than one thing with a
 * switch. How the run moves is the shared vocabulary of `sequence-settings.ts`.
 */

export type PhiCmsGalleryWidgetConfig = PhiCmsWidgetConfigBase & PhiSequenceSettings & {
  /** The Folder the pictures come from: always the Media Folder Provider, with its parameters. */
  source: PhiRuntimeDataProviderBinding | null;
  /** The rendition each picture is drawn in; absent is the original. */
  variantKey?: PhiImageAssetVariantKeyValue;
  /** Opens a picture larger over the page when clicked. */
  preview?: boolean;
  /** The frame's proportion for originals; a variant brings its own. */
  aspectRatio?: PhiMediaAspectRatio;
  fit?: "cover" | "contain";
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

function readFlag(value: unknown, key: string): boolean | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "boolean") fail(key, value, "true or false");
  return value;
}

/** The Folder the pictures come from; a binding to any other Provider is a mistake in the document. */
function readFolderSource(value: unknown): PhiRuntimeDataProviderBinding | null {
  const binding = readPhiRuntimeDataProviderBinding(value);
  if (binding && binding.providerKey !== PHI_MEDIA_LIBRARY_DATA_PROVIDER_KEYS.folderImages) {
    fail("source", binding.providerKey, PHI_MEDIA_LIBRARY_DATA_PROVIDER_KEYS.folderImages);
  }
  return binding;
}

function readVariantKey(value: unknown): PhiImageAssetVariantKeyValue | undefined {
  if (value === undefined || value === null) return undefined;
  if (!PHI_IMAGE_VARIANT_OPTIONS.some((option) => option.value === value)) {
    fail("variantKey", value, `one of ${PHI_IMAGE_VARIANT_OPTIONS.map((option) => option.value).join(", ")}`);
  }
  return value as PhiImageAssetVariantKeyValue;
}

export function parsePhiCmsGalleryWidgetConfig(raw: Record<string, unknown>): PhiCmsGalleryWidgetConfig {
  const aspectRatio = readMember(raw.aspectRatio, PHI_MEDIA_ASPECT_RATIOS, "aspectRatio");
  const fit = readMember(raw.fit, ["cover", "contain"] as const, "fit");
  const variantKey = readVariantKey(raw.variantKey);
  const preview = readFlag(raw.preview, "preview");

  return {
    ...readRenderableBlockConfig(raw),
    ...readPhiSequenceSettings(raw, fail),
    source: readFolderSource(raw.source),
    ...(variantKey === undefined ? {} : { variantKey }),
    ...(preview === undefined ? {} : { preview }),
    ...(aspectRatio === undefined ? {} : { aspectRatio }),
    ...(fit === undefined ? {} : { fit }),
  };
}

const PHI_GALLERY_SEQUENCE_FIELDS = buildPhiSequenceSettingsFields({ countLabel: "Visible Pictures" });

export const PHI_GALLERY_WIDGET_DEFINITION = {
  kind: "widget",
  pluginKey: resolvePhiCmsWidgetPluginKey("gallery"),
  typeKey: "gallery",
  // A slideshow is as wide as the place it is put; its height follows from the aspect ratio.
  slotSizePolicy: "fill-inline",
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
      // Always a Folder: the Inspector asks for the folder and its order, never for a Provider.
      providerKey: PHI_MEDIA_LIBRARY_DATA_PROVIDER_KEYS.folderImages,
      label: "Source",
    },
    {
      key: "variantKey",
      type: "choice",
      valueType: "number",
      heading: "Picture",
      label: "Variant",
      options: PHI_IMAGE_VARIANT_OPTIONS,
      emptyOption: { value: "__original__", label: "Original" },
      emptyValue: null,
    },
    /*
     * Proportion and fit are questions only the original asks. A variant is cut to its own width and
     * height, so the frame takes that proportion and the picture fills it exactly; a second ratio on
     * top would crop a crop. Originals come in every shape, and a run of them needs one frame to
     * stand in, or the Gallery changes height with every step.
     */
    {
      key: "aspectRatio",
      type: "choice",
      label: "Aspect Ratio",
      options: PHI_MEDIA_ASPECT_RATIO_OPTIONS,
      visibleWhen: { field: "variantKey", equals: null },
    },
    {
      key: "fit",
      type: "choice",
      label: "Fit",
      options: [
        { value: "cover", label: "Cover" },
        { value: "contain", label: "Contain" },
      ],
      visibleWhen: { field: "variantKey", equals: null },
    },
    { key: "preview", type: "boolean", label: "Lightbox", description: "Open a picture larger over the page when it is clicked." },
    ...PHI_GALLERY_SEQUENCE_FIELDS.window,
    ...PHI_GALLERY_SEQUENCE_FIELDS.movement,
    ...PHI_GALLERY_SEQUENCE_FIELDS.controls,
  ],
  /*
   * Bound to the Folder Provider from the start, so the inspector asks for a folder and nothing else.
   * The rest is what the Gallery does when nobody said otherwise, stated here so the Inspector shows
   * it as the standing answer rather than an empty box over a setting that was never in doubt.
   */
  defaultConfig: {
    source: { providerKey: PHI_MEDIA_LIBRARY_DATA_PROVIDER_KEYS.folderImages, params: {} },
    preview: false,
    aspectRatio: PHI_GALLERY_DEFAULT_ASPECT_RATIO,
    fit: "cover",
    ...PHI_SEQUENCE_SETTINGS_DEFAULTS,
  },
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
