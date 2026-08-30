import type { PhiCmsConfigField } from "../../../types";
import {
  parsePhiControlOptionsProviderConfig,
  readPhiControlOptions,
  type PhiControlOption,
  type PhiControlOptionsProviderConfig,
} from "../../controls/phi-control-options";
import { readBoolean, readString } from "./parser-primitives";
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
  return {
    optionsProvider: parsePhiControlOptionsProviderConfig(config.optionsProvider),
    options: readPhiControlOptions(config.options),
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

export function readPhiChoiceValueMode(value: unknown): PhiChoiceValueMode {
  return readString(value) === "stack-slot-index" ? "stack-slot-index" : "raw";
}

export function parsePhiChoiceControlConfig(
  config: Record<string, unknown>,
): PhiChoiceControlConfig {
  const controlState = parsePhiControlConfig(config, {
    key: "choice",
  });

  return {
    ...controlState,
    label: readString(config.label),
    description: readString(config.description),
    value: readString(config.value),
    placeholder: readString(config.placeholder),
    presentation: readString(config.presentation) === "autocomplete" ? "autocomplete" : "select",
    allowCustom: readBoolean(config.allowCustom),
    ...parsePhiChoiceOptionsConfig(config),
  };
}

export function parsePhiStackChoiceControlConfig(
  config: Record<string, unknown>,
): PhiStackChoiceControlConfig {
  return {
    ...parsePhiChoiceControlConfig(config),
    valueMode: readPhiChoiceValueMode(config.valueMode),
  };
}
