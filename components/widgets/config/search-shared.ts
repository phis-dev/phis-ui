import { resolvePhiCmsWidgetPluginKey } from "../../../constants/cms-widget-types";
import type { PhiCmsWidgetPlugin } from "../../../types";
import { PHI_TEXT_CONTROL_SIGNALS } from "../signals/control-signal-capabilities";
import type { PhiCmsWidgetConfigBase } from "./parser-primitives";
import {
  PHI_CONTROL_PRESENTATION_FIELDS,
  PHI_CONTROL_STATE_FIELDS,
  parsePhiControlConfig,
  type PhiControlConfig,
} from "./control-signal-config";

export type PhiCmsSearchWidgetConfig = PhiCmsWidgetConfigBase & PhiControlConfig & {
  value?: string;
  placeholder?: string;
  allowClear?: boolean;
  debounceMs?: number;
  minQueryLength?: number;
  submitOnEnter?: boolean;
};

export function parsePhiCmsSearchWidgetConfig(
  rawConfig: Record<string, unknown> | null | undefined,
): PhiCmsSearchWidgetConfig {
  const raw = rawConfig ?? {};

  return {
    ...parsePhiControlConfig(raw, { key: "search" }),
    value: typeof raw.value === "string" ? raw.value : undefined,
    placeholder: typeof raw.placeholder === "string" ? raw.placeholder : undefined,
    allowClear: typeof raw.allowClear === "boolean" ? raw.allowClear : undefined,
    debounceMs: typeof raw.debounceMs === "number" ? raw.debounceMs : undefined,
    minQueryLength: typeof raw.minQueryLength === "number" ? raw.minQueryLength : undefined,
    submitOnEnter: typeof raw.submitOnEnter === "boolean" ? raw.submitOnEnter : undefined,
  };
}

export const PHI_SEARCH_WIDGET_FIELDS: PhiCmsWidgetPlugin<PhiCmsSearchWidgetConfig>["fields"] = [
  { key: "value", type: "string", label: "Value" },
  { key: "placeholder", type: "string", label: "Placeholder" },
  { key: "allowClear", type: "boolean", label: "Allow Clear" },
  ...PHI_CONTROL_PRESENTATION_FIELDS,
  ...PHI_CONTROL_STATE_FIELDS,
  { key: "debounceMs", type: "number", label: "Debounce Ms", min: 0, precision: 0 },
  { key: "minQueryLength", type: "number", label: "Min Query Length", min: 0, precision: 0 },
  { key: "submitOnEnter", type: "boolean", label: "Submit On Enter" },
];

export const PHI_SEARCH_WIDGET_DEFAULT_CONFIG: Partial<PhiCmsSearchWidgetConfig> = {
  key: "search",
  allowClear: true,
  debounceMs: 250,
  minQueryLength: 3,
  submitOnEnter: true,
};

export function buildPhiSearchWidgetDefinition(
  options: Pick<
    PhiCmsWidgetPlugin<PhiCmsSearchWidgetConfig>,
    "typeKey" | "title" | "description"
  > &
    Partial<
      Pick<
        PhiCmsWidgetPlugin<PhiCmsSearchWidgetConfig>,
        "category" | "iconFamily" | "slotSizePolicy" | "defaultConfig"
      >
    >,
) {
  return {
    kind: "widget",
    pluginKey: resolvePhiCmsWidgetPluginKey(options.typeKey),
    typeKey: options.typeKey,
    title: options.title,
    description: options.description,
    category: options.category ?? "navigation",
    iconFamily: options.iconFamily ?? "navigation",
    ...(options.slotSizePolicy ? { slotSizePolicy: options.slotSizePolicy } : {}),
    runtimeSignals: {
      ...PHI_TEXT_CONTROL_SIGNALS,
    },
    fields: PHI_SEARCH_WIDGET_FIELDS,
    defaultConfig: {
      ...PHI_SEARCH_WIDGET_DEFAULT_CONFIG,
      ...(options.defaultConfig ?? {}),
    },
    parseConfig: parsePhiCmsSearchWidgetConfig,
  } satisfies Pick<
    PhiCmsWidgetPlugin<PhiCmsSearchWidgetConfig>,
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
}
