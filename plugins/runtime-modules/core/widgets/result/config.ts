import { resolvePhiCmsWidgetPluginKey } from "../../../../../constants/cms-widget-types";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import { PHI_RENDERABLE_BLOCK_GEOMETRY_FIELDS } from "../../../../../helpers/renderable-block-plugin-fields";
import type { PhiCmsWidgetPlugin } from "../../../../../types";
import {
  readBoolean,
  readRenderableBlockConfig,
  readString,
  type PhiCmsWidgetConfigBase,
} from "../../../../../components/widgets/config/parser-primitives";

export type PhiResultWidgetVisualStatus = "success" | "error" | "info" | "warning" | "403" | "404" | "500";

export type PhiCmsResultWidgetConfig = PhiCmsWidgetConfigBase & {
  status?: PhiResultWidgetVisualStatus;
  code?: string;
  title?: string;
  subTitle?: string;
  translate?: boolean;
  homeLink?: boolean;
  homeLinkLabel?: string;
};

/**
 * The way out of a result that ended a journey.
 *
 * A refusal page draws no Shell, so there is no navigation on it at all: without this the visitor is
 * left on a page with nothing to press. The target is not configured because there is only one sensible
 * answer -- the root of the Area the result was rendered in -- and asking a Site to state it would
 * invite a broken one.
 */
export const PHI_RESULT_HOME_LINK_SOURCE_LABEL = "Back to homepage" as const;

const PHI_RESULT_STATUS_OPTIONS: Array<{ value: PhiResultWidgetVisualStatus; label: string }> = [
  { value: "success", label: "Success" },
  { value: "error", label: "Error" },
  { value: "info", label: "Info" },
  { value: "warning", label: "Warning" },
  { value: "403", label: "403" },
  { value: "404", label: "404" },
  { value: "500", label: "500" },
];

function readResultStatus(value: unknown): PhiResultWidgetVisualStatus | undefined {
  return PHI_RESULT_STATUS_OPTIONS.some((option) => option.value === value)
    ? value as PhiResultWidgetVisualStatus
    : undefined;
}

export function parsePhiCmsResultWidgetConfig(config: Record<string, unknown>): PhiCmsResultWidgetConfig {
  return {
    ...readRenderableBlockConfig(config),
    status: readResultStatus(config.status),
    code: readString(config.code),
    title: readString(config.title),
    subTitle: readString(config.subTitle),
    translate: readBoolean(config.translate) ?? true,
    homeLink: readBoolean(config.homeLink) ?? false,
    homeLinkLabel: readString(config.homeLinkLabel),
  };
}

export const PHI_RESULT_WIDGET_DEFINITION = {
  kind: "widget",
  pluginKey: resolvePhiCmsWidgetPluginKey("result"),
  typeKey: "result",
  title: "Result",
  category: "content",
  description: "Render a compact Ant Design result state.",
  iconFamily: "content",
  slotSizePolicy: "fill-inline",
  fields: [
    ...PHI_RENDERABLE_BLOCK_GEOMETRY_FIELDS,
    {
      key: "status",
      type: "choice",
      label: "Status",
      options: PHI_RESULT_STATUS_OPTIONS,
    },
    { key: "code", type: "string", label: "Code" },
    { key: "title", type: "string", label: "Title" },
    { key: "subTitle", type: "string", label: "Subtitle" },
    { key: "translate", type: "boolean", label: "Translate Text" },
    { key: "homeLink", type: "boolean", label: "Show Home Link" },
    { key: "homeLinkLabel", type: "string", label: "Home Link Label" },
  ],
  defaultConfig: {
    status: "info",
    title: "Information",
    subTitle: "",
    translate: true,
    homeLink: false,
    size: {
      width: "100%",
      height: "auto",
    },
    maxSize: {
      width: "100%",
    },
  },
  parseConfig: parsePhiCmsResultWidgetConfig,
} satisfies Pick<
  PhiCmsWidgetPlugin<PhiCmsResultWidgetConfig>,
  | "kind"
  | "pluginKey"
  | "typeKey"
  | "title"
  | "description"
  | "category"
  | "iconFamily"
  | "slotSizePolicy"
  | "runtimeSignals"
  | "fields"
  | "defaultConfig"
  | "parseConfig"
>;

export const PHI_RESULT_WIDGET_PLUGIN_TYPE = PhiCmsWidgetType.Result;
