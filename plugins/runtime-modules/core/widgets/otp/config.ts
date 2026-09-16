import { resolvePhiCmsWidgetPluginKey } from "../../../../../constants/cms-widget-types";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import type { PhiCmsWidgetPlugin } from "../../../../../types";
import {
  readBoolean,
  readRenderableBlockConfig,
  readString,
  type PhiCmsWidgetConfigBase,
} from "../../../../../components/widgets/config/parser-primitives";
import { PHI_TEXT_CONTROL_SIGNALS } from "../../../../../components/widgets/signals/control-signal-capabilities";
import type { PhiOtpControlCharacters } from "../../../../../components/controls/phi-otp-control";
import {
  PHI_CONTROL_PRESENTATION_FIELDS,
  PHI_CONTROL_STATE_FIELDS,
  parsePhiControlConfig,
  type PhiControlConfig,
} from "../../../../../components/widgets/config/control-signal-config";

/*
 * Bounds on the cell count. Below four a code guards nothing a guess would not find; above twelve it
 * stops being a code a person reads off one screen and types into another.
 */
const PHI_OTP_WIDGET_MIN_LENGTH = 4;
const PHI_OTP_WIDGET_MAX_LENGTH = 12;
const PHI_OTP_WIDGET_DEFAULT_LENGTH = 6;

export type PhiCmsOtpWidgetConfig = PhiCmsWidgetConfigBase & PhiControlConfig & {
  label?: string;
  description?: string;
  length?: number;
  characters?: PhiOtpControlCharacters;
  mask?: boolean;
};

function readOtpLength(value: unknown) {
  return typeof value === "number" && Number.isInteger(value)
    ? Math.min(Math.max(value, PHI_OTP_WIDGET_MIN_LENGTH), PHI_OTP_WIDGET_MAX_LENGTH)
    : PHI_OTP_WIDGET_DEFAULT_LENGTH;
}

export function parsePhiCmsOtpWidgetConfig(config: Record<string, unknown>): PhiCmsOtpWidgetConfig {
  const controlState = parsePhiControlConfig(config, { key: "otp" });

  return {
    ...readRenderableBlockConfig(config),
    ...controlState,
    label: readString(config.label),
    description: readString(config.description),
    length: readOtpLength(config.length),
    characters: readString(config.characters) === "alphanumeric" ? "alphanumeric" : "digits",
    mask: readBoolean(config.mask) ?? false,
  };
}

export const PHI_OTP_WIDGET_DEFINITION = {
  kind: "widget",
  pluginKey: resolvePhiCmsWidgetPluginKey("otp"),
  typeKey: "otp",
  title: "One-time code",
  description: "A code of fixed length entered one character per cell; reports every edit and the completed code.",
  category: "form",
  iconFamily: "form",
  slotSizePolicy: "intrinsic",
  runtimeSignals: {
    ...PHI_TEXT_CONTROL_SIGNALS,
  },
  fields: [
    { key: "label", type: "string", label: "Label" },
    { key: "description", type: "string", label: "Description" },
    {
      key: "length",
      type: "number",
      label: "Length",
      min: PHI_OTP_WIDGET_MIN_LENGTH,
      max: PHI_OTP_WIDGET_MAX_LENGTH,
      precision: 0,
    },
    {
      key: "characters",
      type: "choice",
      label: "Characters",
      options: [
        { value: "digits", label: "Digits" },
        { value: "alphanumeric", label: "Letters and digits" },
      ],
    },
    { key: "mask", type: "boolean", label: "Hide Characters" },
    ...PHI_CONTROL_PRESENTATION_FIELDS,
    ...PHI_CONTROL_STATE_FIELDS,
  ],
  defaultConfig: {
    length: PHI_OTP_WIDGET_DEFAULT_LENGTH,
    characters: "digits",
    mask: false,
    key: "otp",
  },
  parseConfig: parsePhiCmsOtpWidgetConfig,
} satisfies Pick<
  PhiCmsWidgetPlugin<PhiCmsOtpWidgetConfig>,
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

export const PHI_OTP_WIDGET_PLUGIN_TYPE = PhiCmsWidgetType.Otp;
