import type { PhiCmsConfigField } from "../../../types";
import {
  parsePhiControlOptionsProviderConfig,
  readPhiControlOptions,
  type PhiControlOption,
  type PhiControlOptionsProviderConfig,
} from "../../controls/phi-control-options";
import { createPhiConfigReader } from "./strict-config-reader";
import {
  PHI_CONTROL_PRESENTATION_FIELDS,
  PHI_CONTROL_STATE_FIELDS,
  parsePhiControlConfig,
  type PhiControlConfig,
} from "./control-signal-config";

export type PhiChoiceValueMode = "raw" | "stack-slot-index";

export type PhiChoiceOptionsConfig = {
  optionsProvider?: PhiControlOptionsProviderConfig | null;
  options: PhiControlOption[];
};

export type PhiChoiceControlConfig = PhiControlConfig & PhiChoiceOptionsConfig & {
  label?: string;
  description?: string;
  value?: string;
  placeholder?: string;
  presentation?: "select" | "autocomplete";
  allowCustom?: boolean;
};

export type PhiStackChoiceControlConfig = PhiChoiceControlConfig & {
  valueMode?: PhiChoiceValueMode;
};

export function buildPhiChoiceControlOptionFields(
  editorPlacement: "inspector" | "toolbar" = "inspector",
) {
  return [{
    key: "options",
    type: "collection",
    label: "Options",
    editorPlacement,
    itemKeyField: "value",
    itemLabelField: "label",
    defaultItem: { value: "option", label: "Option" },
    addLabel: "Add option",
    emptyLabel: "No static options",
    itemFields: [
      { key: "icon", type: "icon", label: "Icon" },
      { key: "value", type: "string", label: "Value", required: true },
      { key: "label", type: "string", label: "Label", required: true },
      { key: "description", type: "string", label: "Description" },
      { key: "disabled", type: "boolean", label: "Disabled" },
    ],
  }, {
    key: "optionsProvider",
    type: "data-provider",
    providerKind: "options",
    label: "Options Source",
  }] satisfies PhiCmsConfigField[];
}

export const PHI_CHOICE_CONTROL_OPTION_FIELDS = buildPhiChoiceControlOptionFields();

export function parsePhiChoiceOptionsConfig(
  config: Record<string, unknown>,
): PhiChoiceOptionsConfig {
  const reader = createPhiConfigReader(config);
  return {
    optionsProvider: reader.value(
      "optionsProvider",
      "an options provider",
      (value) => parsePhiControlOptionsProviderConfig(value) ?? undefined,
    ) ?? null,
    options: reader.value(
      "options",
      "a list of options",
      (value) => (Array.isArray(value) ? readPhiControlOptions(value) : undefined),
    ) ?? readPhiControlOptions(undefined),
  };
}

export const PHI_CHOICE_CONTROL_CONFIG_FIELDS = [
  ...PHI_CONTROL_PRESENTATION_FIELDS,
  ...PHI_CONTROL_STATE_FIELDS,
] satisfies PhiCmsConfigField[];

export const PHI_CHOICE_CONTROL_VALUE_MODE_FIELD = {
  key: "valueMode",
  type: "choice",
  label: "Value Mode",
  options: [
    { value: "raw", label: "Raw" },
    { value: "stack-slot-index", label: "Stack Slot Index" },
  ],
} satisfies PhiCmsConfigField;

export function parsePhiChoiceControlConfig(
  config: Record<string, unknown>,
): PhiChoiceControlConfig {
  const controlState = parsePhiControlConfig(config, {
    key: "choice",
  });

  const reader = createPhiConfigReader(config);
  return {
    ...controlState,
    label: reader.string("label"),
    description: reader.string("description"),
    value: reader.string("value"),
    placeholder: reader.string("placeholder"),
    presentation: reader.oneOf("presentation", ["select", "autocomplete"] as const) ?? "select",
    allowCustom: reader.boolean("allowCustom"),
    ...parsePhiChoiceOptionsConfig(config),
  };
}

export function parsePhiStackChoiceControlConfig(
  config: Record<string, unknown>,
): PhiStackChoiceControlConfig {
  return {
    ...parsePhiChoiceControlConfig(config),
    valueMode: createPhiConfigReader(config).oneOf("valueMode", ["raw", "stack-slot-index"] as const satisfies readonly PhiChoiceValueMode[]) ?? "raw",
  };
}
