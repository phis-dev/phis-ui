import { resolvePhiCmsWidgetPluginKey } from "../../../../../constants/cms-widget-types";
import type { PhiCmsWidgetPlugin } from "../../../../../types";
import { PHI_PAGINATION_CONTROL_SIGNALS } from "../../../../../components/widgets/signals/control-signal-capabilities";
import { readBoolean, readInteger, readString } from "../../../../../components/widgets/config/parser-primitives";
import {
  PHI_CONTROL_PRESENTATION_FIELDS,
  PHI_CONTROL_STATE_FIELDS,
  parsePhiControlConfig,
  type PhiControlConfig,
} from "../../../../../components/widgets/config/control-signal-config";

export type PhiPaginationValue = {
  page: number;
  pageSize: number;
  total: number;
};

export type PhiPaginationWidgetConfig = PhiControlConfig & {
  label?: string;
  page?: number;
  pageSize?: number;
  total?: number;
  showSizeChanger?: boolean;
  simple?: boolean;
};

function readPositiveInteger(value: unknown, fallback: number) {
  const parsed = readInteger(value);
  return parsed != null && parsed > 0 ? parsed : fallback;
}

export function parsePhiPaginationWidgetConfig(config: Record<string, unknown>): PhiPaginationWidgetConfig {
  const controlState = parsePhiControlConfig(config, {
    key: "pagination",
  });

  return {
    ...controlState,
    label: readString(config.label),
    page: readPositiveInteger(config.page, 1),
    pageSize: readPositiveInteger(config.pageSize, 20),
    total: readPositiveInteger(config.total, 0),
    showSizeChanger: readBoolean(config.showSizeChanger),
    simple: readBoolean(config.simple),
  };
}

export const PHI_PAGINATION_WIDGET_DEFINITION = {
  kind: "widget",
  pluginKey: resolvePhiCmsWidgetPluginKey("pagination"),
  typeKey: "pagination",
  title: "Pagination",
  description: "Reusable pagination control that emits page state signals.",
  category: "form",
  iconFamily: "form",
  slotSizePolicy: "intrinsic",
  runtimeSignals: {
    ...PHI_PAGINATION_CONTROL_SIGNALS,
  },
  fields: [
    { key: "label", type: "string", label: "Label" },
    { key: "page", type: "number", label: "Page", min: 1, precision: 0 },
    { key: "pageSize", type: "number", label: "Page Size", min: 1, precision: 0 },
    { key: "total", type: "number", label: "Total", min: 0, precision: 0 },
    { key: "showSizeChanger", type: "boolean", label: "Show Size Changer" },
    { key: "simple", type: "boolean", label: "Simple" },
    ...PHI_CONTROL_PRESENTATION_FIELDS,
    ...PHI_CONTROL_STATE_FIELDS,
  ],
  defaultConfig: {
    page: 1,
    pageSize: 20,
    total: 0,
    key: "pagination",
  },
  parseConfig: parsePhiPaginationWidgetConfig,
} satisfies Pick<
  PhiCmsWidgetPlugin<PhiPaginationWidgetConfig>,
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
