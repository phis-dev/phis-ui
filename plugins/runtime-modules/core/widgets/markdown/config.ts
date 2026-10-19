import { resolvePhiCmsWidgetPluginKey } from "../../../../../constants/cms-widget-types";
import type { PhiMarkdownTextAlign } from "../../../../../types/core-widget-placements";
import { PHI_SPACING_SCALE_KEYS, type PhiSpacingScaleKey } from "../../../../../components/widgets/config/spacing-options";
import type { PhiCmsWidgetPlugin } from "../../../../../types";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import type { PhiCmsResolvedContent } from "../../../../../types/cms";
import {
  buildPhiBulletListFields,
  readPhiBulletListStyle,
  type PhiBulletListStyle,
} from "../../../../../components/widgets/shared/bullet-list-vocabulary";
import {
  readNumber,
  readRenderableBlockConfig,
  readString,
  type PhiCmsWidgetConfigBase,
} from "../../../../../components/widgets/config/parser-primitives";

export type PhiCmsMarkdownWidgetConfig = PhiCmsWidgetConfigBase & {
  sourceMode?: "inline" | "url";
  markdown?: string;
  widgetId?: string | number | null;
  sourceUrl?: string;
  sourceLocale?: string;
  revalidateSeconds?: number;
  /** Set at render from the node's `NoTranslate` flag, or by a caller that knows; never authored. */
  translate?: boolean;
  textAlign?: PhiMarkdownTextAlign;
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
    sourceMode: readMarkdownSourceMode(config.sourceMode) ?? (sourceUrl ? "url" : "inline"),
    widgetId: typeof config.widgetId === "number" || typeof config.widgetId === "string" ? config.widgetId : undefined,
    markdown: readString(config.markdown),
    sourceUrl,
    sourceLocale: readString(config.sourceLocale),
    revalidateSeconds: readNumber(config.revalidateSeconds),
    textAlign: readMarkdownTextAlign(config.textAlign),
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
    textAlign: "start",
    textBlockSpacingBefore: "none",
    textBlockSpacingAfter: "sm",
    headingBlockSpacingBefore: "none",
    headingBlockSpacingAfter: "sm",
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
      min: 0,
      max: PHI_MARKDOWN_HEADING_OFFSET_MAX,
      precision: 0,
    },
    { key: "tocKey", type: "string", label: "TOC Key" },
    ...buildPhiBulletListFields("list", "Lists"),
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
