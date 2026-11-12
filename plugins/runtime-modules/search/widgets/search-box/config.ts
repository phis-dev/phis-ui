import { resolvePhiCmsWidgetPluginKey } from "../../../../../constants/cms-widget-types";
import type { PhiCmsWidgetPlugin } from "../../../../../types";
import type { PhiControlSize } from "../../../../../types/control";
import { PHI_SEARCH_WIDGET_DEFAULT_LABELS } from "../../../../../components/widgets/label-types/search";
import {
  readRenderableBlockConfig,
  type PhiCmsWidgetConfigBase,
} from "../../../../../components/widgets/config/parser-primitives";

const PHI_SEARCH_BOX_SIZES = ["small", "medium", "large"] as const satisfies readonly PhiControlSize[];

export const PHI_SEARCH_BOX_VARIANTS = ["input", "icon-only", "auto"] as const;

/**
 * How the box stands where it is placed, named as the Account Widget names its forms: the field itself;
 * a magnifier alone (`icon-only`) that opens into the field when it
 * is pressed, for a header where a field would crowd the row; or `auto`, the field where the screen has
 * room for it and the magnifier on a phone (below 768px of the render viewport, as the Shell's phone).
 */
export type PhiSearchBoxVariant = (typeof PHI_SEARCH_BOX_VARIANTS)[number];

/**
 * The box a visitor types a search into (SEARCH.md).
 *
 * It is a form the browser submits: `GET` to the Search Module's results Page of its Area -- always that
 * Page, which always holds the results -- the query in the URL. So it works before
 * anything hydrated and in a static render, where no script has run yet; and the results Page reads the
 * same URL whether it was reached from here, from a bookmark or from a link somebody pasted.
 */
export type PhiSearchBoxWidgetConfig = PhiCmsWidgetConfigBase & {
  /**
   * What the empty box says: the author's text, translated. Absent is "Search", which an author can
   * change or clear; cleared, the box says nothing.
   */
  placeholder: string;
  /** The field's size; `size` is the block's own geometry and cannot be this. */
  controlSize?: PhiControlSize;
  /** Absent is `input`, the box as it always was. */
  variant?: PhiSearchBoxVariant;
};

function normalizePhiSearchBoxWidgetConfig(raw: Record<string, unknown>): PhiSearchBoxWidgetConfig {
  return {
    ...readRenderableBlockConfig(raw),
    placeholder: typeof raw.placeholder === "string"
      ? raw.placeholder.trim()
      : PHI_SEARCH_WIDGET_DEFAULT_LABELS.placeholder,
    controlSize: (PHI_SEARCH_BOX_SIZES as readonly unknown[]).includes(raw.controlSize)
      ? raw.controlSize as PhiControlSize
      : undefined,
    variant: (PHI_SEARCH_BOX_VARIANTS as readonly unknown[]).includes(raw.variant)
      ? raw.variant as PhiSearchBoxVariant
      : undefined,
  };
}

export const PHI_SEARCH_BOX_WIDGET_DEFINITION = {
  kind: "widget",
  pluginKey: resolvePhiCmsWidgetPluginKey("search-box"),
  typeKey: "search-box",
  title: "Search Box",
  description: "A box that sends what a visitor types to the Site's search results page.",
  category: "navigation",
  tags: ["search", "find", "navigation"],
  icon: "antd:search",
  slotSizePolicy: "fill-inline",
  fields: [
    {
      key: "placeholder",
      type: "string",
      label: "Placeholder",
      // Cleared is kept as cleared: the box then says nothing, rather than "Search" again.
      emptyValue: "",
      description: "Translated. Empty shows nothing.",
    },
    {
      key: "variant",
      type: "choice",
      label: "Variant",
      description: "Icon only opens into the field when pressed. Auto is the input, and the icon on a phone.",
      options: [
        { value: "input", label: "Input" },
        { value: "icon-only", label: "Icon only" },
        { value: "auto", label: "Auto" },
      ],
    },
    {
      key: "controlSize",
      type: "choice",
      label: "Size",
      options: [
        { value: "small", label: "Small" },
        { value: "medium", label: "Medium" },
        { value: "large", label: "Large" },
      ],
    },
  ],
  /*
   * What the Inspector shows chosen where a box states nothing, and what an absent value renders as: the
   * input, at the house's medium size.
   */
  defaultConfig: { ...normalizePhiSearchBoxWidgetConfig({}), variant: "input", controlSize: "medium" },
  parseConfig: normalizePhiSearchBoxWidgetConfig,
} satisfies Pick<
  PhiCmsWidgetPlugin<PhiSearchBoxWidgetConfig>,
  | "kind"
  | "pluginKey"
  | "typeKey"
  | "title"
  | "description"
  | "category"
  | "tags"
  | "icon"
  | "slotSizePolicy"
  | "fields"
  | "defaultConfig"
  | "parseConfig"
>;
