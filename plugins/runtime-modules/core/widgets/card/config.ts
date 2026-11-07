import { readPhiThemeGradientKey, type PhiThemeGradientKey } from "../../../../../theme/phi-theme-gradients";
import { PHI_THEME_GRADIENT_FIELD_OPTIONS } from "../../../../../components/widgets/config/theme-gradient";
import {
  PHI_BUTTON_VARIANT_FIELD_OPTIONS,
  readPhiButtonVariant,
  type PhiButtonVariant,
} from "../../../../../components/widgets/config/button-variant";
import { resolvePhiCmsWidgetPluginKey } from "../../../../../constants/cms-widget-types";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import type { PhiCmsWidgetPlugin } from "../../../../../types";
import type { PhiCmsConfigField } from "../../../../../types/cms-plugins";
import type { PhiImageAssetVariantKeyValue } from "../../../../../types/media";
import { readPhiLinkTarget, type PhiLinkTarget } from "../../../../../types/references";
import { readPhiMediaImageSourceConfig } from "../../../../../components/widgets/config/image-source-parser";
import { PHI_SURFACE_CARD } from "../../../../../helpers/surface-presets";
import { normalizePhiBackgroundWidgetConfig, type PhiBackgroundOverlay } from "../../../../../components/widgets/config/background";
import {
  buildPhiBulletListFields,
  readPhiBulletListEntries,
  readPhiBulletListStyle,
  type PhiBulletListEntry,
  type PhiBulletListStyle,
} from "../../../../../components/widgets/shared/bullet-list-vocabulary";
import {
  PHI_CARD_HEADING_LEVELS,
  PHI_CARD_HOVER_EFFECTS,
  PHI_CARD_ICON_PLACEMENTS,
  PHI_CARD_TEXT_ALIGNS,
  PHI_CARD_BADGE_STYLES,
  PHI_CARD_MEDIA_ASPECT_RATIOS,
  PHI_CARD_VARIANTS,
  readPhiCardBillingPeriod,
  type PhiCardBillingPeriod,
  type PhiCardHeadingLevel,
  type PhiCardHoverEffect,
  type PhiCardIconPlacement,
  type PhiCardTextAlign,
  type PhiCardBadgeStyle,
  type PhiCardMediaAspectRatio,
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
  /** The words on the band at the card's end edge; any body may carry one. */
  badge?: string;
  /** The band's colour; absent, the Theme's primary. */
  badgeColor?: string;
  /** How the badge is drawn (`PHI_CARD_BADGE_STYLES`); absent, `none`. */
  badgeStyle?: PhiCardBadgeStyle;
  /** A Theme gradient slot the badge is filled with, over `badgeColor`; absent, the colour. */
  badgeGradient?: PhiThemeGradientKey;
  /** A `plan` body's prices, never translated, and what each is paid per (`/ month`), which is. */
  price?: string;
  pricePeriod?: string;
  priceYearly?: string;
  pricePeriodYearly?: string;
  /** Which of the two prices a `plan` shows until the page sends another. Absent is `monthly`. */
  billingPeriod?: PhiCardBillingPeriod;
  /** What a `plan` includes and what it does not, each entry with its state. */
  features?: PhiBulletListEntry[];
  /** How the features list is set (`bullet-list-vocabulary.ts`). */
  featureList?: PhiBulletListStyle;
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
  /**
   * How tall the picture stands (`PHI_CARD_MEDIA_ASPECT_RATIOS`); absent is `auto`, the proportion of the
   * file shown -- for a Media picture the Card variant's 3:2.
   */
  mediaAspectRatio?: PhiCardMediaAspectRatio;
  /** How much of the picture shows, in percent; the card's ground shows through the rest. */
  imageOpacity?: number;
  /**
   * A layer laid over the picture, under the card's marks and words: a colour, a gradient that fades the
   * picture into the card, a pattern. The Background Overlay's shape (`PhiBackgroundOverlay`); stated by
   * a Preset or an agent, not offered in the Inspector yet.
   */
  imageOverlay?: PhiBackgroundOverlay;
  /** Where the whole card leads. */
  linkTarget?: PhiLinkTarget;
  /** Whether the card draws its action button. */
  actionEnabled?: boolean;
  /**
   * The button's words. A new card is created with "Learn more" written in; absent is the label set's
   * "Learn more", and empty is no words, for a button that is only its icon.
   */
  actionLabel?: string;
  actionIcon?: string;
  /** Where the action button leads; absent, nowhere -- it then only emits `activate`. */
  actionLinkTarget?: PhiLinkTarget;
  /** How the action button stands out; absent, primary on a highlighted card and normal otherwise. */
  actionVariant?: PhiButtonVariant;
  /** The Theme gradient slot a `gradient` action button is filled with; absent, the first. */
  actionGradient?: PhiThemeGradientKey;
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

/** The Overlay over the picture, read as a Background reads its own; one it cannot read is none. */
function readPhiCardImageOverlay(value: unknown): PhiBackgroundOverlay | undefined {
  return value == null ? undefined : normalizePhiBackgroundWidgetConfig({ base: { kind: "none" }, overlay: value }).overlay ?? undefined;
}

function readChoice<T extends string>(value: unknown, choices: readonly T[]): T | undefined {
  return choices.includes(value as T) ? value as T : undefined;
}

function parsePhiCmsCardWidgetConfig(config: Record<string, unknown>): PhiCmsCardWidgetConfig {
  const source = readPhiMediaImageSourceConfig(config);
  const normalized = {
    ...readRenderableBlockConfig(config),
    eyebrow: readString(config.eyebrow),
    title: readString(config.title),
    description: readString(config.description),
    meta: readString(config.meta),
    value: readString(config.value),
    badge: readString(config.badge),
    badgeColor: readString(config.badgeColor),
    badgeStyle: readChoice(readString(config.badgeStyle), PHI_CARD_BADGE_STYLES),
    badgeGradient: readPhiThemeGradientKey(config.badgeGradient),
    price: readString(config.price),
    pricePeriod: readString(config.pricePeriod),
    priceYearly: readString(config.priceYearly),
    pricePeriodYearly: readString(config.pricePeriodYearly),
    billingPeriod: readPhiCardBillingPeriod(config.billingPeriod),
    features: config.features === undefined ? undefined : readPhiBulletListEntries(config.features),
    featureList: readPhiBulletListStyle(config.featureList),
    body: readChoice(readString(config.body), ["text", "stat", "plan"] as const),
    headingLevel: readChoice(readString(config.headingLevel), PHI_CARD_HEADING_LEVELS),
    textAlign: readChoice(readString(config.textAlign), PHI_CARD_TEXT_ALIGNS),
    icon: readString(config.icon),
    iconPlacement: readChoice(readString(config.iconPlacement), PHI_CARD_ICON_PLACEMENTS),
    iconColor: readString(config.iconColor),
    iconBackground: readString(config.iconBackground),
    alt: readString(config.alt),
    mediaAspectRatio: readChoice(readString(config.mediaAspectRatio), PHI_CARD_MEDIA_ASPECT_RATIOS),
    imageOpacity: readPhiCardImageOpacity(config.imageOpacity),
    imageOverlay: readPhiCardImageOverlay(config.imageOverlay),
    linkTarget: readPhiLinkTarget(config.linkTarget) ?? undefined,
    actionEnabled: readBoolean(config.actionEnabled),
    actionLabel: readPhiControlLabel(config.actionLabel),
    actionIcon: readString(config.actionIcon),
    actionLinkTarget: readPhiLinkTarget(config.actionLinkTarget) ?? undefined,
    actionVariant: readPhiButtonVariant(config.actionVariant),
    actionGradient: readPhiThemeGradientKey(config.actionGradient),
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
  badgeStyle: "none",
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
  /*
   * A card fills its slot both ways, as a Layout does.
   *
   * It filled only across, and stood at its own content's height inside the slot: three cards whose
   * texts differ, side by side in a Grid row, ended at three different lines although the row had laid
   * their slots out at one height. Filling the block axis lets the row's height reach the card. Where
   * the slot has no height of its own -- a Stack or a Masonry column of content height -- a percentage
   * against it stays auto and the card is as tall as its content, as before. A card in a container of
   * fixed height grows into it, as a Layout there does; a card that should not says so with a height.
   */
  slotSizePolicy: "fill",
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
        { value: "plan", label: "Plan" },
      ],
    },
    /*
     * The prices and the features are written on the card; asked here is only which price it shows
     * first. The canvas shows that one, so the yearly price is written by choosing Yearly here.
     */
    {
      key: "billingPeriod",
      type: "choice",
      label: "Price shown",
      presentation: "segmented",
      visibleWhen: { field: "body", equals: "plan" },
      options: [
        { value: "monthly", label: "Monthly" },
        { value: "yearly", label: "Yearly" },
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
    /*
     * Automatic is the Card variant's 3:2 for a Media picture, so a row of cards stands at one height; a
     * step crops every card it is set on into the same box, Original shows the whole picture.
     */
    {
      key: "mediaAspectRatio",
      type: "choice",
      label: "Proportion",
      options: [
        { value: "auto", label: "Automatic" },
        { value: "original", label: "Original" },
        { value: "3:2", label: "3:2" },
        { value: "4:3", label: "4:3" },
        { value: "16:9", label: "16:9" },
        { value: "2:1", label: "2:1" },
        { value: "1:1", label: "1:1" },
      ],
      placeholder: "Automatic",
    },
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
    /*
     * Where the whole card leads, and how it answers the pointer: only a card that leads somewhere has
     * a hover effect, so it is shown with a link and goes when the link does. `Icon` turns the icon's
     * colour and ground round.
     */
    {
      key: "linkTarget",
      type: "link-target",
      heading: "Link card",
      label: "Link card",
      clearsWhenEmpty: ["hoverEffect"],
    },
    {
      key: "hoverEffect",
      type: "choice",
      label: "Hover effect",
      presentation: "segmented",
      visibleWhen: { field: "linkTarget", notEquals: null },
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
    /* Its own target, unlabelled under the divider; None is a button that only says it was pressed. */
    {
      key: "actionLinkTarget",
      type: "link-target",
      label: "",
      visibleWhen: { field: "actionEnabled", equals: true },
    },
    {
      key: "actionVariant",
      type: "choice",
      label: "Variant",
      description: "How the button stands out. Empty follows the card: primary when it is highlighted, normal otherwise.",
      options: [...PHI_BUTTON_VARIANT_FIELD_OPTIONS],
      emptyOption: { value: "", label: "Card" },
      visibleWhen: { field: "actionEnabled", equals: true },
    },
    {
      key: "actionGradient",
      type: "choice",
      label: "Gradient",
      options: [...PHI_THEME_GRADIENT_FIELD_OPTIONS],
      placeholder: "Gradient 1",
      visibleWhen: { field: "actionVariant", equals: "gradient" },
    },
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
    /* The band's words are written on the card; how it is drawn and its colour are asked here. */
    {
      key: "badgeStyle",
      type: "choice",
      heading: "Badge",
      label: "Style",
      presentation: "segmented",
      description:
        "Corner: a band in the card's top corner. Tag: a rounded mark a little down the edge. Ribbon: hangs over the card's edge with a fold, and needs room beside the card -- a Layout that clips at the card's edge cuts it off. None: hides the badge and keeps its words.",
      options: [
        { value: "none", label: "None" },
        { value: "corner", label: "Corner" },
        { value: "tag", label: "Tag" },
        { value: "ribbon", label: "Ribbon" },
      ],
    },
    {
      key: "badgeColor",
      type: "color",
      label: "Color",
      visibleWhen: { field: "badgeStyle", notEquals: "none" },
      mode: "single",
      defaultToken: "colorPrimary",
    },
    {
      key: "badgeGradient",
      type: "choice",
      label: "Gradient",
      description: "Fills the badge with one of the Theme's gradients instead of the colour. A ribbon's fold keeps the colour.",
      options: [...PHI_THEME_GRADIENT_FIELD_OPTIONS],
      emptyOption: { value: "", label: "None" },
      visibleWhen: { field: "badgeStyle", notEquals: "none" },
    },
    ...buildPhiBulletListFields("featureList", "Features").map((field) => ({
      ...field,
      visibleWhen: { field: "body", equals: "plan" },
    }) as PhiCmsConfigField),
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
