import { resolvePhiCmsWidgetPluginKey } from "../../../../../constants/cms-widget-types";
import type { PhiMarkdownImageFloat, PhiMarkdownTextAlign } from "../../../../../types/core-widget-placements";
import {
  readPhiMarkdownFoldSections,
  type PhiMarkdownFoldSections,
} from "../../../../../components/widgets/shared/markdown-sections";
import {
  readPhiMarkdownImageAspectRatio,
  type PhiMarkdownImageAspectRatio,
} from "../../../../../components/widgets/shared/markdown-image-vocabulary";
import { PHI_SPACING_SCALE_KEYS, type PhiSpacingScaleKey } from "../../../../../components/widgets/config/spacing-options";
import type { PhiCmsWidgetPlugin } from "../../../../../types";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import type { PhiCmsResolvedContent } from "../../../../../types/cms";
import {
  buildPhiBulletListFields,
  PHI_BULLET_LIST_DEFAULT_STYLE,
  readPhiBulletListStyle,
  type PhiBulletListStyle,
} from "../../../../../components/widgets/shared/bullet-list-vocabulary";
import {
  readNumber,
  readRenderableBlockConfig,
  readBoolean,
  readString,
  type PhiCmsWidgetConfigBase,
} from "../../../../../components/widgets/config/parser-primitives";

export type PhiCmsMarkdownWidgetConfig = PhiCmsWidgetConfigBase & {
  /**
   * A section's label above the text -- "The story", "Why phis" -- drawn as a Card's eyebrow is
   * (`eyebrow-style.ts`) and translated like the text. Markdown has no form for it, and a bold line
   * reads as a small title.
   */
  eyebrow?: string;
  sourceMode?: "inline" | "url";
  markdown?: string;
  widgetId?: string | number | null;
  sourceUrl?: string;
  sourceLocale?: string;
  revalidateSeconds?: number;
  /** Set at render from the node's `NoTranslate` flag, or by a caller that knows; never authored. */
  translate?: boolean;
  textAlign?: PhiMarkdownTextAlign;
  /** Pictures stand at this edge and the text flows past them; absent, a picture is a line of its own. */
  imageFloat?: PhiMarkdownImageFloat;
  /**
   * How tall every Media picture standing on its own in the text is (`markdown-image-vocabulary.ts`);
   * absent is `auto`, the picture's own proportion. A picture's own address may say otherwise.
   */
  imageAspectRatio?: PhiMarkdownImageAspectRatio;
  /**
   * Whether every `##` section folds under its heading -- each on its own or one at a time
   * (`markdown-sections.ts`) -- the way a page of questions and answers reads; absent, `none`.
   */
  foldSections?: PhiMarkdownFoldSections;
  /** With folding sections: state them as schema.org `FAQPage` data for search engines. */
  faqStructuredData?: boolean;
  textBlockSpacingBefore?: PhiSpacingScaleKey;
  textBlockSpacingAfter?: PhiSpacingScaleKey;
  headingBlockSpacingBefore?: PhiSpacingScaleKey;
  headingBlockSpacingAfter?: PhiSpacingScaleKey;
  /** How many levels the text's headings move down, for a text standing under a heading of its own. */
  headingOffset?: number;
  tocKey?: string;
  /** How the text's lists are set. */
  list?: PhiBulletListStyle;
  resolvedContent?: PhiCmsResolvedContent | null;
  preferSource?: boolean;
};

const PHI_MARKDOWN_TEXT_ALIGN_OPTIONS: Array<{ value: PhiMarkdownTextAlign; label: string }> = [
  { value: "start", label: "Start" },
  { value: "center", label: "Center" },
  { value: "end", label: "End" },
  { value: "justify", label: "Justify" },
];

const PHI_MARKDOWN_IMAGE_FLOAT_OPTIONS: Array<{ value: PhiMarkdownImageFloat; label: string }> = [
  { value: "start", label: "Start" },
  { value: "end", label: "End" },
];

function readMarkdownImageFloat(value: unknown): PhiMarkdownImageFloat | undefined {
  return value === "start" || value === "end" ? value : undefined;
}

// The one spacing scale every padding and gap speaks (`theme/phi-tokens.ts`), stored by its key.
const PHI_MARKDOWN_SPACING_OPTIONS = PHI_SPACING_SCALE_KEYS.map((key) => ({ value: key, label: key }));

function readMarkdownSourceMode(value: unknown): PhiCmsMarkdownWidgetConfig["sourceMode"] | undefined {
  return value === "inline" || value === "url" ? value : undefined;
}

function readMarkdownTextAlign(value: unknown): PhiMarkdownTextAlign | undefined {
  return PHI_MARKDOWN_TEXT_ALIGN_OPTIONS.some((option) => option.value === value)
    ? (value as PhiMarkdownTextAlign)
    : undefined;
}

/** Up to three levels: `#` lands at `h4` at most, and `h5` is the deepest a heading goes. */
const PHI_MARKDOWN_HEADING_OFFSET_MAX = 3;

function readMarkdownHeadingOffset(value: unknown): number | undefined {
  const offset = readNumber(value);
  return offset !== undefined && Number.isInteger(offset) && offset >= 0 && offset <= PHI_MARKDOWN_HEADING_OFFSET_MAX
    ? offset
    : undefined;
}

function readMarkdownSpacingKey(value: unknown): PhiSpacingScaleKey | undefined {
  return PHI_SPACING_SCALE_KEYS.includes(value as PhiSpacingScaleKey) ? (value as PhiSpacingScaleKey) : undefined;
}

export function parsePhiCmsMarkdownWidgetConfig(config: Record<string, unknown>): PhiCmsMarkdownWidgetConfig {
  const sourceUrl = readString(config.sourceUrl);

  return {
    ...readRenderableBlockConfig(config),
    eyebrow: readString(config.eyebrow),
    sourceMode: readMarkdownSourceMode(config.sourceMode) ?? (sourceUrl ? "url" : "inline"),
    widgetId: typeof config.widgetId === "number" || typeof config.widgetId === "string" ? config.widgetId : undefined,
    markdown: readString(config.markdown),
    sourceUrl,
    sourceLocale: readString(config.sourceLocale),
    revalidateSeconds: readNumber(config.revalidateSeconds),
    textAlign: readMarkdownTextAlign(config.textAlign),
    imageFloat: readMarkdownImageFloat(config.imageFloat),
    imageAspectRatio: readPhiMarkdownImageAspectRatio(config.imageAspectRatio),
    foldSections: readPhiMarkdownFoldSections(config.foldSections),
    faqStructuredData: readBoolean(config.faqStructuredData),
    textBlockSpacingBefore: readMarkdownSpacingKey(config.textBlockSpacingBefore),
    textBlockSpacingAfter: readMarkdownSpacingKey(config.textBlockSpacingAfter),
    headingBlockSpacingBefore: readMarkdownSpacingKey(config.headingBlockSpacingBefore),
    headingBlockSpacingAfter: readMarkdownSpacingKey(config.headingBlockSpacingAfter),
    headingOffset: readMarkdownHeadingOffset(config.headingOffset),
    tocKey: readString(config.tocKey),
    list: readPhiBulletListStyle(config.list),
  };
}

export const PHI_MARKDOWN_WIDGET_DEFINITION = {
  kind: "widget",
  pluginKey: resolvePhiCmsWidgetPluginKey("markdown"),
  typeKey: "markdown",
  title: "Markdown",
  category: "content",
  description: "Render local or remote markdown with shared translation and typography.",
  icon: "antd:font-colors-outlined",
  iconFamily: "basic",
  /*
   * A text block takes the width it is given, like the HTML Widget and the Markdown TOC. As `intrinsic`
   * it was as wide as its own longest line: a short paragraph stood in a box narrower than the slot,
   * `textAlign: end` pushed the text to the box's far edge, and a stated maximum width never capped it -- the
   * cap's `100%` is cyclic inside a shrink-to-fit slot and the browser drops the whole cap. Filling, the
   * block is capped by its maximum and placed by the Layout's anchor, in the Builder and live alike.
   */
  translatesOwnText: true,
  slotSizePolicy: "fill-inline",
  defaultConfig: {
    revalidateSeconds: 14400,
    imageAspectRatio: "auto",
    foldSections: "none",
    textAlign: "start",
    textBlockSpacingBefore: "none",
    textBlockSpacingAfter: "sm",
    headingBlockSpacingBefore: "sm",
    headingBlockSpacingAfter: "sm",
    headingOffset: 0,
    // What the list draws with when nothing is set, so the Inspector shows it rather than empty fields.
    list: { ...PHI_BULLET_LIST_DEFAULT_STYLE },
  },
  contentBinding: {
    storage: "markdown",
    sourceField: "markdown",
    translatable: true,
    skipWhenConfigField: "sourceUrl",
    skipWhenConfigFieldValue: {
      field: "sourceMode",
      value: "url",
    },
  },
  fields: [
    { key: "eyebrow", type: "string", label: "Eyebrow" },
    {
      key: "sourceMode",
      type: "choice",
      label: "Source",
      options: [
        { value: "inline", label: "Inline" },
        { value: "url", label: "External URL" },
      ],
    },
    { key: "sourceUrl", type: "url", label: "Source URL", visibleWhen: { field: "sourceMode", equals: "url" } },
    {
      key: "sourceLocale",
      type: "string",
      label: "Source Locale",
      visibleWhen: { field: "sourceMode", equals: "url" },
    },
    {
      key: "revalidateSeconds",
      type: "number",
      label: "Revalidate Seconds",
      visibleWhen: { field: "sourceMode", equals: "url" },
    },
    {
      key: "textAlign",
      type: "choice",
      label: "Align",
      options: PHI_MARKDOWN_TEXT_ALIGN_OPTIONS,
    },
    /*
     * A page of questions and answers: every `##` folds under its heading. Each on its own, or one open at
     * a time; a link to a question opens it. With it, the questions can be stated for search engines.
     */
    {
      key: "foldSections",
      type: "choice",
      label: "Fold Sections",
      options: [
        { value: "none", label: "None" },
        { value: "independent", label: "Each on its own" },
        { value: "accordion", label: "One at a time" },
      ],
    },
    {
      key: "faqStructuredData",
      type: "boolean",
      label: "FAQ for search engines",
      visibleWhen: { field: "foldSections", notEquals: "none" },
    },
    {
      key: "imageFloat",
      type: "choice",
      label: "Image Float",
      // No float is the default and stores nothing; the line says so instead of an empty picker.
      emptyOption: { value: "none", label: "None" },
      options: PHI_MARKDOWN_IMAGE_FLOAT_OPTIONS,
    },
    /*
     * Every picture standing on its own takes this box; one that needs another says so in its own address
     * (`phis:asset/12?ratio=16:9`, and `float=start|end|none` beside it). Automatic is the picture's own.
     */
    {
      key: "imageAspectRatio",
      type: "choice",
      label: "Image Proportion",
      options: [
        { value: "auto", label: "Automatic" },
        { value: "phi", label: "φ (golden)" },
        { value: "3:2", label: "3:2" },
        { value: "4:3", label: "4:3" },
        { value: "16:9", label: "16:9" },
        { value: "2:1", label: "2:1" },
        { value: "1:1", label: "1:1" },
      ],
    },
    {
      key: "textBlockSpacingBefore",
      type: "choice",
      label: "Before Paragraph",
      options: PHI_MARKDOWN_SPACING_OPTIONS,
    },
    {
      key: "textBlockSpacingAfter",
      type: "choice",
      label: "After Paragraph",
      options: PHI_MARKDOWN_SPACING_OPTIONS,
    },
    {
      key: "headingBlockSpacingBefore",
      type: "choice",
      label: "Before Header",
      options: PHI_MARKDOWN_SPACING_OPTIONS,
    },
    {
      key: "headingBlockSpacingAfter",
      type: "choice",
      label: "After Header",
      options: PHI_MARKDOWN_SPACING_OPTIONS,
    },
    {
      key: "headingOffset",
      type: "number",
      label: "Heading Offset",
      description:
        "Moves every heading of the text down by this many levels: at 1, a # heading is drawn as H2, ## as H3, and so on. For a text that stands under a page title of its own, so its first heading does not compete with it.",
      min: 0,
      max: PHI_MARKDOWN_HEADING_OFFSET_MAX,
      precision: 0,
    },
    {
      key: "tocKey",
      type: "string",
      label: "TOC Key",
      // Empty is no key, and a TOC on "Auto" connects to the text all the same.
      placeholder: "Auto",
      description:
        "A name for this text's table of contents. A Markdown TOC widget set to Binding Mode \"Target\" with the same TOC Key lists this text's headings and no other's. Leave it empty while the page has one Markdown text: a TOC on \"Auto\" finds it by itself.",
    },
    // The markers are an unordered list's: a `1.` list counts, whatever its level's marker says.
    ...buildPhiBulletListFields("list", "Unordered Lists"),
  ],
  parseConfig: parsePhiCmsMarkdownWidgetConfig,
} satisfies Pick<
  PhiCmsWidgetPlugin<PhiCmsMarkdownWidgetConfig>,
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
  | "defaultConfig"
  | "runtimeSignals"
  | "contentBinding"
  | "fields"
  | "parseConfig"
>;

export const PHI_MARKDOWN_WIDGET_PLUGIN_TYPE = PhiCmsWidgetType.Markdown;
