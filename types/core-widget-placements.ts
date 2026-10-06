import type { PhiRenderableBlockBase } from "./renderable-block";
import type { PhiRuntimeConditionExpression } from "./runtime-condition";
import type { PhiSignalRoute, PhiSignalValue } from "./signals";
import type { PhiCssLength } from "./length";
import type { PhiControlSize } from "./control";
import type { PhiCollectionProviderQuery } from "./collection-provider";
import type { PhiProviderResourceSource } from "./runtime-data-provider";
import type { PhiFormId } from "./form-id";
import type { PhiLinkTarget } from "./references";
import type { PhiMediaImageSourceConfig } from "./media";
import type { PhiViewerAccessPolicy } from "./access";
import type { PhiWidgetFontFamilyKey, PhiWidgetFontSizeKey } from "./site-theme";
import type {
  PhiTableQuery,
  PhiTableWidgetConfig,
  PhiTableWidgetFeatures,
  PhiTableWidgetPresentation,
} from "./table-widget";
import type { PhiButtonVariant } from "../components/widgets/config/button-variant";
import type { PhiTextTone } from "../components/widgets/config/text-tone";
import type { PhiCommonControlActionKey } from "../components/widgets/label-types/common-controls";
import type { PhiMaskConfig } from "../components/widgets/config/mask";
import type { PhiCardVariant } from "../components/widgets/shared/card-vocabulary";
import type {
  PhiControlBadgeConfig,
  PhiControlConfig,
} from "../components/widgets/config/control-signal-config";

/*
 * What a Module writes when it places a Core Widget.
 *
 * A Page is built from Widgets, and a Module that is not Core builds its Pages from Core's Widgets like
 * everybody else -- by type key, as data, never by importing Core. The type key alone told it nothing
 * about the config that goes with it, so every placement outside Core was an untyped record whose
 * mistakes surfaced as a Widget quietly ignoring a field. These types are what Core promises to read.
 *
 * They are written here and not derived from the parsers, because a parser's output is what the Widget
 * works with -- defaults filled in, runtime fields added -- and a placement is what an author states.
 * `validate-core-widget-placements` holds them to each Widget's Inspector fields, so a field one side
 * gains and the other does not is a failed check rather than drift.
 */

/**
 * The part of a placement every Widget shares, whatever it is.
 *
 * The block base is applied by the slot frame from the node's raw config, not by the Widget, which is
 * why it holds for every Widget alike -- a Widget whose own type forgot it still gets it. Render and
 * debug modes are left out: the renderer sets them, an author does not. Node flags such as
 * `NoTranslate` are not config at all and stay on the node.
 */
export type PhiWidgetPlacementBase = Omit<PhiRenderableBlockBase, "renderMode" | "debugMode"> & {
  /** Shows the Widget only while the condition holds; the renderer evaluates it for every Widget. */
  visibleWhen?: PhiRuntimeConditionExpression;
  signalRoutes?: PhiWidgetPlacementSignalRoutes | null;
};

/** The routes a placement wires. Read-only lists, so a Preset can build them from shared constants. */
export type PhiWidgetPlacementSignalRoutes = {
  emits?: readonly PhiSignalRoute[] | null;
  listens?: readonly PhiSignalRoute[] | null;
};

/** A Control's own settings in a placement; its routes are the envelope's. */
type PhiControlPlacement = Omit<PhiControlConfig, "signalRoutes">;

// Markdown

export type PhiMarkdownSpacingKey = "none" | "xxs" | "xs" | "sm" | "base" | "md" | "lg" | "xl" | "xxl";

/** Logical, not left and right: a Site in an RTL locale reads "start" as the right-hand edge. */
export type PhiMarkdownTextAlign = "start" | "center" | "end" | "justify";

export type PhiMarkdownWidgetPlacement = PhiWidgetPlacementBase & {
  sourceMode?: "inline" | "url";
  markdown?: string;
  sourceUrl?: string;
  sourceLocale?: string;
  revalidateSeconds?: number;
  textAlign?: PhiMarkdownTextAlign;
  textBlockSpacingBefore?: PhiMarkdownSpacingKey;
  textBlockSpacingAfter?: PhiMarkdownSpacingKey;
  headingBlockSpacingBefore?: PhiMarkdownSpacingKey;
  headingBlockSpacingAfter?: PhiMarkdownSpacingKey;
  tocKey?: string;
};

// Simple Text

/** The marks a Simple Text can carry, each on or off. */
export const PHI_SIMPLE_TEXT_MARKS = ["bold", "italic", "underline", "strike", "code"] as const;

export type PhiSimpleTextMark = (typeof PHI_SIMPLE_TEXT_MARKS)[number];

export type PhiSimpleTextWidgetPlacement = PhiWidgetPlacementBase & {
  text?: string;
  href?: string;
  icon?: string;
  color?: string;
  fontFamily?: PhiWidgetFontFamilyKey;
  fontSize?: PhiWidgetFontSizeKey;
  external?: boolean;
  newTab?: boolean;
  tone?: PhiTextTone;
  marks?: PhiSimpleTextMark[];
  disabled?: boolean;
};

// Description

export type PhiDescriptionWidgetPlacement = PhiWidgetPlacementBase & {
  eyebrow?: string;
  title?: string;
  description?: string;
  asideTitle?: string;
  asideItems?: string[];
  footer?: string;
  tone?: PhiTextTone;
};

// Button

export type PhiButtonWidgetPlacement = PhiWidgetPlacementBase &
  PhiControlPlacement &
  PhiControlBadgeConfig & {
  action?: PhiCommonControlActionKey;
  label?: string;
  tooltip?: string;
  icon?: string;
  value?: string;
  variant?: PhiButtonVariant;
  linkTarget?: PhiLinkTarget;
  danger?: boolean;
};

// Image

export type PhiImageWidgetPreviewMode = "none" | "native" | "lightbox";

export type PhiImageWidgetFit = "cover" | "contain" | "fill";

export type PhiImageWidgetSize = {
  width?: number | string;
  height?: number | string;
};

export type PhiImageWidgetPlacement = PhiWidgetPlacementBase & PhiMediaImageSourceConfig & {
  fit?: PhiImageWidgetFit;
  objectPosition?: string;
  title?: string;
  imageSize?: PhiImageWidgetSize;
  borderTopLeftRadius?: number | string;
  borderTopRightRadius?: number | string;
  borderBottomLeftRadius?: number | string;
  borderBottomRightRadius?: number | string;
  mask?: PhiMaskConfig;
};

// Icon

export type PhiIconWidgetPlacement = PhiWidgetPlacementBase & {
  icon?: string;
  color?: string;
};

// Spacer

/** Nothing of its own: a Spacer is its block, and the block is the envelope. */
export type PhiSpacerWidgetPlacement = PhiWidgetPlacementBase;

// HTML

export type PhiHtmlWidgetPlacement = PhiWidgetPlacementBase & {
  html?: string;
  sourceMode?: "inline" | "url";
  sourceUrl?: string;
  sourceLocale?: string;
  revalidateSeconds?: number;
  fontFamily?: PhiWidgetFontFamilyKey;
  fontSize?: PhiWidgetFontSizeKey;
};

// Table

export type PhiTableWidgetPlacement = PhiWidgetPlacementBase & {
  presentation?: Partial<PhiTableWidgetPresentation>;
  features?: PhiTableWidgetFeatures;
  initialQuery?: PhiTableQuery;
  fixedFilters?: PhiTableWidgetConfig["fixedFilters"];
  source?: PhiProviderResourceSource | null;
};

// Form

/**
 * Whether this placement draws the form's own submit.
 *
 * `inline` draws the button the descriptor describes (`submit`: what it says, where on the grid it
 * stands). `external` draws none: the form is submitted by whoever holds its `submit` capability -- a
 * Button Widget, an Overlay footer, a toolbar -- or by Enter where `submitOnEnter` allows it. Either way
 * there is one path; the button is only one more sender on the same channel.
 *
 * The placement answers this and not the form, because the same form stands on a page of its own with
 * a button under its fields and in a dialog whose footer carries the button.
 */
export type PhiCmsFormWidgetSubmitPlacement = "inline" | "external";

/**
 * A way out of the form, standing where its submit stands.
 *
 * "Forgot password" and "Create account" are not fields and not commands -- they are the two other
 * things a person at a sign-in might want. They belong to the Widget for the same reason the submit
 * does: whether they are offered, and in which column they sit, is the placement's decision. Being in
 * the Widget is also the only way they can line up under the inputs, because the label column is a
 * property of the form's own grid and nothing outside it can read where that column ends.
 */
export type PhiCmsFormWidgetLinkConfig = {
  /** Names the link's label in the form's label set, as `actions.<key>Label`. */
  key: string;
  href: string;
  /** A published Module fact this link depends on, such as `auth.registration`. */
  requiresFeature?: string;
};

/**
 * Whether a submit is worth saying out loud, and how.
 *
 * A Form already shows what happened where it stands: an error above the fields, and a success panel
 * where its descriptor has one. That is enough on a Page somebody came to in order to submit it. It is
 * not enough in Settings, where a panel is one of several and a switch that saves on change has nothing
 * to show at all -- the Widget that used to own the profile name reported through the application
 * feedback, and the registered Form that replaced it said nothing.
 *
 * So the placement decides, the way it decides whether there is a submit button: a Form on a Page of
 * its own stays quiet, a Form in a Settings panel reports. `successText` is what a success says where
 * the descriptor says nothing, already translated by whoever placed it.
 */
export type PhiCmsFormWidgetFeedbackConfig = {
  mode: "message" | "notification";
  successText?: string;
};

/**
 * The box the Widget draws around its Form, or none at all.
 *
 * A Form describes fields. Whether it stands in a box is the same kind of question as whether it carries
 * its own submit -- the placement's, not the Form's -- which is why it is configured here and appears in
 * no descriptor. It exists because the box was being built by hand: a client Widget with its own Card,
 * its own inset and, in one revision, its own Ant Design colour variable, standing beside a Form that
 * could not have a box at all. What draws it is `PhiCardControl`, so the Theme's surface shape reaches it
 * through the same component token every other surface reads and the ground and the frame are the
 * Theme's -- nothing here names a colour or a corner.
 *
 * `presentation` is the switch as well as the step: absent, or anything outside the three names, is no
 * box at all -- no ground and no inset -- which is what every Form placed before this one has and keeps.
 * That matters more than it sounds: the Login and its siblings stand in a Split Card half whose Layout
 * already paints a card's ground, so a box there would be a plate inside a plate, and an inset would
 * move the query container the fields are measured in for nothing.
 *
 * The three names are one ladder -- how far the box separates itself from what is behind it -- and each
 * step is stated once. `card` and `panel` deliberately share a ground: the inset already says how deep
 * the box sits, and a second ground would say it again and drift the moment one of the two gains a
 * source the other has not.
 */
export type PhiCmsFormWidgetCardConfig = {
  /**
   * `card` is a box on a Page of its own; `panel` is the same box at the inset of chrome -- a Settings
   * section; `wash` is the quietest filling the Theme has with no frame at all, for a Form that already
   * stands on a container and only needs its fields set off from it.
   */
  presentation: "card" | "panel" | "wash";
  /** A heading in a bar above the fields, already translated by whoever placed the Form. */
  title: string | null;
  /** The box's own inset, where the Theme's answer for this box is not the right one. */
  padding: number | string | null;
};

export type PhiFormWidgetPlacement = PhiWidgetPlacementBase & {
  formId?: PhiFormId | null;
  submit?: PhiCmsFormWidgetSubmitPlacement;
  submitOnEnter?: boolean;
  card?:
    | (Pick<PhiCmsFormWidgetCardConfig, "presentation"> &
        Partial<Omit<PhiCmsFormWidgetCardConfig, "presentation">>)
    | null;
  maxFormWidth?: number | string;
  feedback?: PhiCmsFormWidgetFeedbackConfig | null;
  links?: readonly PhiCmsFormWidgetLinkConfig[];
  /** Prepared for the Form Builder: the placement's own settings for the Form it shows. */
  formConfig?: Record<string, unknown>;
  execution?: {
    mode?: "handler" | "signal";
    phase?: "submit" | "confirm";
  };
  source?: PhiProviderResourceSource | null;
  /** Absent is a single-record form; the Form Widget's config says why that is an answer. */
  openActionKey?: string;
};

// Collection View

export type PhiCmsCollectionViewMode = "grid" | "masonry" | "stack";

export type PhiCmsCollectionFilterControl = "select" | "multi-select" | "cascader";

export type PhiCmsCollectionFilterPresentation = {
  key: string;
  control: PhiCmsCollectionFilterControl;
  placeholder?: string;
  width?: PhiCssLength;
  minWidth?: PhiCssLength;
  actions?: PhiCmsCollectionToolbarActionPresentation[];
};

export type PhiCmsCollectionToolbarActionPresentation = {
  key: string;
  label?: string;
  description?: string;
  icon?: string;
  display?: "icon" | "label" | "icon-label";
  mode?: "normal" | "primary" | "danger";
};

/**
 * Where a card takes each of its parts from, as paths into one item.
 *
 * The Card Widget already knows what a card is -- eyebrow, title, description, meta, a cover, a link --
 * and a Collection already knows how to lay items out. What was missing between them is only this: which
 * field of a row is the title. Stating it here rather than in the provider keeps it where the rest of
 * the presentation lives, so a Site can point the title at another field without anybody writing code,
 * exactly as a Table's columns are chosen from the fields a provider offers.
 *
 * A resource that outgrows this ships its own View instead; that is one field in its registration, and
 * the Media library is the example of a domain that needed one.
 */
export type PhiCmsCollectionCardPresentation = {
  eyebrow?: string;
  title?: string;
  description?: string;
  meta?: string;
  /** A path to something already servable: a Media delivery path or a URL. */
  imageUrl?: string;
  /**
   * The mark beside the title or at the top: a field holding an icon name, or a Site path to a picture
   * (a Media delivery path), which the card draws as an `asset:` icon. A cover and a mark are different
   * pictures.
   */
  icon?: string;
  /** The figure of a `stat` card. */
  value?: string;
  href?: string;
  actionLabel?: string;
  actionHref?: string;
  variant?: PhiCardVariant;
  /** Every card in the View draws this body; `stat` needs `value`. */
  body?: "text" | "stat";
  /** A field whose truth marks the card as highlighted. */
  highlight?: string;
};

export type PhiCollectionViewWidgetPlacement = PhiWidgetPlacementBase & {
  presentation?: {
    title?: string;
    description?: string;
    card?: PhiCmsCollectionCardPresentation;
    mode?: PhiCmsCollectionViewMode;
    gap?: PhiCssLength;
    minColumnWidth?: PhiCssLength;
    emptyDescription?: string;
    controlSize?: PhiControlSize;
    labels?: Record<string, unknown>;
  };
  features?: {
    tools?: {
      mode?: "self-contained" | "external";
      reload?: boolean;
      reset?: boolean;
    };
    search?: {
      enabled: boolean;
      placeholder?: string;
      minWidth?: PhiCssLength;
    };
    filters?: PhiCmsCollectionFilterPresentation[];
    actions?: {
      toolbar?: PhiCmsCollectionToolbarActionPresentation[];
    };
    pagination?: {
      enabled: boolean;
      pageSize?: number;
      pageSizes?: readonly number[];
      compact?: boolean;
    };
  };
  initialQuery?: PhiCollectionProviderQuery;
  source?: PhiProviderResourceSource | null;
  /** A Render Client other than the one the bound provider ships, registered by any Module. */
  itemRendererKey?: string | null;
};

// Command Toolbar

export type PhiCommandToolbarButtonEmitConfig = {
  capabilityId: string;
  value?: PhiSignalValue;
};

export type PhiCommandToolbarButtonConfig = {
  key: string;
  emits: PhiCommandToolbarButtonEmitConfig[];
  accessPolicy?: PhiViewerAccessPolicy;
  action?: PhiCommonControlActionKey;
  label?: string;
  tooltip?: string;
  icon?: string;
  display?: "icon" | "label" | "icon-label";
  danger?: boolean;
  disabled?: boolean;
  /** Shown as it is, not greyed out, and sends nothing when pressed. */
  readOnly?: boolean;
  variant?: PhiButtonVariant;
};

/**
 * Without the Control's own Read only and Disabled: each button has its own, and the whole toolbar is
 * switched by `enabled/change`, which every renderable block receives.
 */
export type PhiCommandToolbarWidgetPlacement = PhiWidgetPlacementBase & Omit<PhiControlPlacement, "readOnly" | "disabled"> & {
  compact?: boolean;
  wrap?: boolean;
  showLabels?: boolean;
  buttons?: PhiCommandToolbarButtonConfig[];
};

// Theme Mode Switch

export type PhiThemeModeSwitchSize = "small" | "medium";

export type PhiThemeModeSwitchWidgetPlacement = PhiWidgetPlacementBase & {
  label?: string;
  controlSize?: PhiThemeModeSwitchSize;
};

// Draft Status

/**
 * Wired, not configured: the placement's routes name the Controller whose draft it shows -- `request`
 * where it asks on mount, `status` what it hears back.
 */
export type PhiDraftStatusWidgetPlacement = PhiWidgetPlacementBase;

/**
 * The placement contract of each Core Widget, by type key.
 *
 * A Core Widget missing here is placed untyped until it is added -- Card among them, whose config is
 * still changing. The node factories read this map: a Core type key listed here takes its placement
 * type, anything else a plain record.
 */
export type PhiCoreWidgetPlacements = {
  markdown: PhiMarkdownWidgetPlacement;
  "simple-text": PhiSimpleTextWidgetPlacement;
  description: PhiDescriptionWidgetPlacement;
  button: PhiButtonWidgetPlacement;
  image: PhiImageWidgetPlacement;
  icon: PhiIconWidgetPlacement;
  spacer: PhiSpacerWidgetPlacement;
  html: PhiHtmlWidgetPlacement;
  table: PhiTableWidgetPlacement;
  form: PhiFormWidgetPlacement;
  "collection-view": PhiCollectionViewWidgetPlacement;
  "command-toolbar": PhiCommandToolbarWidgetPlacement;
  "theme-mode-switch": PhiThemeModeSwitchWidgetPlacement;
  "draft-status": PhiDraftStatusWidgetPlacement;
};

export type PhiCoreWidgetTypeKey = keyof PhiCoreWidgetPlacements;
