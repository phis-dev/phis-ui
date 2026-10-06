import { resolvePhiCmsWidgetPluginKey } from "../../../../../constants/cms-widget-types";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import type { PhiCmsWidgetPlugin } from "../../../../../types";
import type { PhiImageAssetVariantKeyValue } from "../../../../../types/media";
import { readPhiLinkTarget, type PhiLinkTarget } from "../../../../../types/references";
import { readPhiMediaImageSourceConfig } from "../../../../../components/widgets/config/image-source-parser";
import { PHI_SURFACE_CARD } from "../../../../../helpers/surface-presets";
import {
  PHI_CARD_HEADING_LEVELS,
  PHI_CARD_HOVER_EFFECTS,
  PHI_CARD_ICON_PLACEMENTS,
  PHI_CARD_TEXT_ALIGNS,
  PHI_CARD_VARIANTS,
  type PhiCardHeadingLevel,
  type PhiCardHoverEffect,
  type PhiCardIconPlacement,
  type PhiCardTextAlign,
  type PhiCardVariant,
  type PhiCardWidgetBody,
} from "../../../../../components/widgets/shared/card-vocabulary";
import { readPhiControlLabel } from "../../../../../components/widgets/config/common-action-field";
import { PHI_CARD_SIGNALS } from "../../../../../components/widgets/signals/control-signal-capabilities";
import { readPhiSignalRouteSet, type PhiSignalRouteSet } from "../../../../../types/signals";
import { PHI_CARD_WIDGET_DEFAULT_LABELS } from "../../../../../components/widgets/label-types/card";
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
  /** The icon's colour and the ground it stands on; absent, the Theme's. */
  iconColor?: string;
  iconBackground?: string;
  /** The picture's words for a reader who cannot see it; an Asset brings its own. */
  alt?: string;
  /** How much of the picture shows, in percent; the card's ground shows through the rest. */
  imageOpacity?: number;
  /** Where the whole card leads. */
  linkTarget?: PhiLinkTarget;
  /**
   * Whether the card draws its action button. It leads where the card leads; a button that should do
   * something else is wired from the Signals panel.
   */
  actionEnabled?: boolean;
  /**
   * The button's words. A new card is created with "Learn more" written in; absent is the label set's
   * "Learn more", and empty is no words, for a button that is only its icon.
   */
  actionLabel?: string;
  actionIcon?: string;
  /** How the card is set; the look is the card's Surface. */
  variant?: PhiCardVariant;
  highlight?: boolean;
  /** How a card that is a link answers the pointer. */
  hoverEffect?: PhiCardHoverEffect;
  signalRoutes?: PhiSignalRouteSet;
};

function readPhiCardImageOpacity(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : undefined;
}

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
    iconColor: readString(config.iconColor),
    iconBackground: readString(config.iconBackground),
    alt: readString(config.alt),
    imageOpacity: readPhiCardImageOpacity(config.imageOpacity),
    linkTarget: readPhiLinkTarget(config.linkTarget) ?? undefined,
    actionEnabled: readBoolean(config.actionEnabled),
    actionLabel: readPhiControlLabel(config.actionLabel),
    actionIcon: readString(config.actionIcon),
    variant: readChoice(readString(config.variant), PHI_CARD_VARIANTS),
    highlight: readBoolean(config.highlight),
    hoverEffect: readChoice(readString(config.hoverEffect), PHI_CARD_HOVER_EFFECTS),
    signalRoutes: readPhiSignalRouteSet(config.signalRoutes) ?? undefined,
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

const PHI_CARD_DEFAULT_CONFIG = {
  body: "text",
  imageOpacity: 100,
  headingLevel: "h3",
  textAlign: "start",
} satisfies Partial<PhiCmsCardWidgetConfig>;

export const PHI_CARD_WIDGET_DEFINITION = {
  kind: "widget",
  pluginKey: resolvePhiCmsWidgetPluginKey("card"),
  typeKey: "card",
  title: "Card",
  category: "content",
  description: "Content card with a picture or an icon, a heading or a figure, and a link.",
  icon: "antd:idcard-outlined",
  iconFamily: "basic",
  translatesOwnText: true,
  slotSizePolicy: "fill-inline",
  /*
   * The card draws its Surface itself: its picture zooms inside the box under the pointer, and the box
   * clips it to its corners, so the ground has to be the card's own and not the slot frame's.
   */
  surface: "own",
  runtimeSignals: PHI_CARD_SIGNALS,
  defaultConfig: PHI_CARD_DEFAULT_CONFIG,
  /*
   * What a new card is written with: the card's Surface, and the button's words, so the author edits
   * "Learn more" rather than a blank. The Surface is not a default, because a default is put back under
   * every card that states none -- and "None" in the Surface section is exactly a card that states none:
   * it is the card's contents without a box, and a default would draw the box again. A Preset that wants
   * the box states it, as a Preset states every other look.
   */
  creationConfig: {
    ...PHI_CARD_DEFAULT_CONFIG,
    surface: PHI_SURFACE_CARD,
    actionLabel: PHI_CARD_WIDGET_DEFAULT_LABELS.actionLabel,
  },
  /*
   * The words are written on the card itself, in place, so only how the card is set is asked here. The
   * dividers group what belongs together; a field that would do nothing is not shown.
   */
  fields: [
    {
      key: "body",
      type: "choice",
      heading: "Content",
      label: "Body",
      options: [
        { value: "text", label: "Text" },
        { value: "stat", label: "Statistic" },
      ],
    },
    {
      key: "headingLevel",
      type: "choice",
      label: "Heading level",
      presentation: "segmented",
      options: PHI_CARD_HEADING_LEVELS.map((level) => ({ value: level, label: level.toUpperCase() })),
      visibleWhen: { field: "title", notEquals: null },
    },
    {
      key: "textAlign",
      type: "choice",
      label: "Text align",
      // The Center variant places the words itself.
      visibleWhen: { field: "variant", notEquals: "center" },
      presentation: "segmented",
      options: [
        { value: "start", label: "Left" },
        { value: "center", label: "Center" },
        { value: "end", label: "Right" },
        { value: "justify", label: "Justify" },
      ],
    },
    { key: "image", type: "image", heading: "Image", label: "Image" },
    {
      key: "imageOpacity",
      type: "number",
      label: "Opacity",
      presentation: "slider",
      min: 0,
      max: 100,
      step: 5,
      suffix: "%",
    },
    /* The icon and where it stands, under one divider: what else an icon will need goes here as well. */
    { key: "icon", type: "icon", heading: "Icon", label: "Icon" },
    {
      key: "iconPlacement",
      type: "choice",
      // A select: four placements with their words do not fit side by side in the Inspector's column.
      label: "Icon placement",
      options: [
        { value: "inline", label: "Before title" },
        { value: "top", label: "Top left" },
        { value: "top-center", label: "Top center" },
        { value: "top-end", label: "Top right" },
      ],
      // Shown with an icon, and not under the Center variant, which puts it over the picture itself.
      visibleWhen: [{ field: "icon", notEquals: null }, { field: "variant", notEquals: "center" }],
    },
    /* Left empty, the Theme's: the secondary text colour on its quietest fill. */
    {
      key: "iconColor",
      type: "color",
      label: "Color",
      mode: "single",
      defaultToken: "colorTextSecondary",
      visibleWhen: { field: "icon", notEquals: null },
    },
    {
      key: "iconBackground",
      type: "color",
      label: "Background",
      mode: "single",
      defaultToken: "colorFillQuaternary",
      visibleWhen: { field: "icon", notEquals: null },
    },
    { key: "linkTarget", type: "link-target", heading: "Link target", label: "Link target" },
    /* The divider names the field; `Icon` turns the icon's colour and ground round. */
    {
      key: "hoverEffect",
      type: "choice",
      heading: "Hover effect",
      label: "Effect",
      presentation: "segmented",
      options: [
        { value: "none", label: "None" },
        { value: "zoom", label: "Zoom" },
        { value: "lift", label: "Lift" },
        { value: "icon", label: "Icon" },
      ],
    },
    { key: "actionEnabled", type: "boolean", heading: "Action button", label: "Enabled" },
    {
      key: "actionLabel",
      type: "string",
      label: "Label",
      emptyValue: "",
      visibleWhen: { field: "actionEnabled", equals: true },
    },
    { key: "actionIcon", type: "icon", label: "Icon", visibleWhen: { field: "actionEnabled", equals: true } },
    {
      key: "variant",
      type: "choice",
      heading: "Appearance",
      label: "Variant",
      options: [
        { value: "default", label: "Default" },
        { value: "compact", label: "Compact" },
        { value: "center", label: "Center" },
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
  | "icon"
  | "iconFamily"
  | "slotSizePolicy"
  | "surface"
  | "runtimeSignals"
  | "defaultConfig"
  | "creationConfig"
  | "fields"
  | "parseConfig"
>;

export const PHI_CARD_WIDGET_PLUGIN_TYPE = PhiCmsWidgetType.Card;
