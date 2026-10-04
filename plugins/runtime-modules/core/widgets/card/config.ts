import { resolvePhiCmsWidgetPluginKey } from "../../../../../constants/cms-widget-types";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import type { PhiCmsWidgetPlugin } from "../../../../../types";
import type { PhiImageAssetVariantKeyValue } from "../../../../../types/media";
import { readPhiLinkTarget, type PhiLinkTarget } from "../../../../../types/references";
import { readPhiMediaImageSourceConfig } from "../../../../../components/widgets/config/image-source-parser";
import {
  PHI_CARD_DEFAULT_SURFACE,
  PHI_CARD_HEADING_LEVELS,
  PHI_CARD_HOVER_EFFECTS,
  PHI_CARD_ICON_PLACEMENTS,
  PHI_CARD_TEXT_ALIGNS,
  type PhiCardHeadingLevel,
  type PhiCardHoverEffect,
  type PhiCardIconPlacement,
  type PhiCardTextAlign,
  type PhiCardWidgetBody,
} from "../../../../../components/widgets/shared/card-vocabulary";
import {
  readBoolean,
  readRenderableBlockConfig,
  readString,
  type PhiCmsWidgetConfigBase,
} from "../../../../../components/widgets/config/parser-primitives";

type PhiCardImageSource =
  | { sourceKind?: "url"; sourceUrl?: string }
  | {
      sourceKind: "asset";
      assetId?: number;
      variantKey?: PhiImageAssetVariantKeyValue | null;
      variantVersion?: number | null;
    };

export type PhiCmsCardWidgetConfig = PhiCmsWidgetConfigBase & PhiCardImageSource & {
  eyebrow?: string;
  title?: string;
  description?: string;
  meta?: string;
  /** Which body draws. Absent is `text`. */
  body?: PhiCardWidgetBody;
  /** The figure a `stat` body draws. Never translated, whatever the node's `NoTranslate` flag says. */
  value?: string;
  /** The tag of the heading; how large it is drawn is the variant's business. */
  headingLevel?: PhiCardHeadingLevel;
  textAlign?: PhiCardTextAlign;
  /** An icon name, as the icon picker writes it (`antd:*`, `iconify:*`, `asset:*`). */
  icon?: string;
  iconPlacement?: PhiCardIconPlacement;
  /** The picture's words for a reader who cannot see it; an Asset brings its own. */
  alt?: string;
  /** Where the whole card leads. */
  linkTarget?: PhiLinkTarget;
  actionLabel?: string;
  /** Where the action button leads, beside the card's own target. */
  actionLinkTarget?: PhiLinkTarget;
  /** Size and weight only; the look is the card's Surface. */
  variant?: "default" | "compact" | "featured";
  highlight?: boolean;
  /** How a card that is a link answers the pointer. */
  hoverEffect?: PhiCardHoverEffect;
};

function readChoice<T extends string>(value: unknown, choices: readonly T[]): T | undefined {
  return choices.includes(value as T) ? value as T : undefined;
}

export function parsePhiCmsCardWidgetConfig(config: Record<string, unknown>): PhiCmsCardWidgetConfig {
  const source = readPhiMediaImageSourceConfig(config);
  const normalized = {
    ...readRenderableBlockConfig(config),
    eyebrow: readString(config.eyebrow),
    title: readString(config.title),
    description: readString(config.description),
    meta: readString(config.meta),
    value: readString(config.value),
    body: readChoice(readString(config.body), ["text", "stat"] as const),
    headingLevel: readChoice(readString(config.headingLevel), PHI_CARD_HEADING_LEVELS),
    textAlign: readChoice(readString(config.textAlign), PHI_CARD_TEXT_ALIGNS),
    icon: readString(config.icon),
    iconPlacement: readChoice(readString(config.iconPlacement), PHI_CARD_ICON_PLACEMENTS),
    alt: readString(config.alt),
    linkTarget: readPhiLinkTarget(config.linkTarget) ?? undefined,
    actionLabel: readString(config.actionLabel),
    actionLinkTarget: readPhiLinkTarget(config.actionLinkTarget) ?? undefined,
    variant: readChoice(readString(config.variant), ["default", "compact", "featured"] as const),
    highlight: readBoolean(config.highlight),
    hoverEffect: readChoice(readString(config.hoverEffect), PHI_CARD_HOVER_EFFECTS),
  };
  return source.sourceKind === "asset"
    ? {
        ...normalized,
        sourceKind: "asset",
        assetId: source.assetId,
        variantKey: source.variantKey,
        variantVersion: source.variantVersion,
      }
    : { ...normalized, sourceKind: "url", sourceUrl: source.sourceUrl };
}

export const PHI_CARD_WIDGET_DEFINITION = {
  kind: "widget",
  pluginKey: resolvePhiCmsWidgetPluginKey("card"),
  typeKey: "card",
  title: "Card",
  category: "content",
  description: "Content card with a picture or an icon, a heading or a figure, and a link.",
  iconFamily: "basic",
  translatesOwnText: true,
  slotSizePolicy: "fill-inline",
  /*
   * The card draws its Surface itself: its picture zooms inside the box under the pointer, and the box
   * clips it to its corners, so the ground has to be the card's own and not the slot frame's.
   */
  surface: "own",
  // A block default, so a card a Preset places reads the same as one dropped in the Builder.
  defaultConfig: { surface: PHI_CARD_DEFAULT_SURFACE },
  fields: [
    { key: "eyebrow", type: "string", label: "Eyebrow" },
    { key: "title", type: "string", label: "Title" },
    {
      key: "headingLevel",
      type: "choice",
      label: "Heading level",
      presentation: "segmented",
      options: PHI_CARD_HEADING_LEVELS.map((level) => ({ value: level, label: level.toUpperCase() })),
    },
    { key: "description", type: "string", label: "Description" },
    { key: "meta", type: "string", label: "Meta" },
    {
      key: "body",
      type: "choice",
      label: "Body",
      options: [
        { value: "text", label: "Text" },
        { value: "stat", label: "Statistic" },
      ],
    },
    { key: "value", type: "string", label: "Value", visibleWhen: { field: "body", equals: "stat" } },
    {
      key: "textAlign",
      type: "choice",
      label: "Text align",
      presentation: "segmented",
      options: [
        { value: "start", label: "Start" },
        { value: "center", label: "Center" },
        { value: "end", label: "End" },
      ],
    },
    { key: "icon", type: "icon", label: "Icon" },
    {
      key: "iconPlacement",
      type: "choice",
      label: "Icon placement",
      presentation: "segmented",
      options: [
        { value: "inline", label: "Before title" },
        { value: "top", label: "Top" },
      ],
    },
    {
      key: "sourceKind",
      type: "choice",
      label: "Image Source Kind",
      options: [
        { value: "url", label: "URL" },
        { value: "asset", label: "Asset" },
      ],
    },
    { key: "sourceUrl", type: "url", label: "Image Source URL", visibleWhen: { field: "sourceKind", equals: "url" } },
    { key: "assetId", type: "number", label: "Asset ID", editorPlacement: "toolbar" },
    { key: "alt", type: "string", label: "Image Alt" },
    { key: "linkTarget", type: "link-target", label: "Link" },
    {
      key: "hoverEffect",
      type: "choice",
      label: "Hover effect",
      options: [
        { value: "none", label: "None" },
        { value: "lift", label: "Lift" },
        { value: "zoom", label: "Zoom" },
      ],
    },
    { key: "actionLabel", type: "string", label: "Action Label" },
    { key: "actionLinkTarget", type: "link-target", label: "Action Link" },
    {
      key: "variant",
      type: "choice",
      label: "Size",
      options: [
        { value: "default", label: "Default" },
        { value: "compact", label: "Compact" },
        { value: "featured", label: "Featured" },
      ],
    },
    { key: "highlight", type: "boolean", label: "Highlight" },
  ],
  parseConfig: parsePhiCmsCardWidgetConfig,
} satisfies Pick<
  PhiCmsWidgetPlugin<PhiCmsCardWidgetConfig>,
  | "translatesOwnText"
  | "kind"
  | "pluginKey"
  | "typeKey"
  | "title"
  | "description"
  | "category"
  | "iconFamily"
  | "slotSizePolicy"
  | "surface"
  | "defaultConfig"
  | "fields"
  | "parseConfig"
>;

export const PHI_CARD_WIDGET_PLUGIN_TYPE = PhiCmsWidgetType.Card;
