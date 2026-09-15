import { PhiCmsWidgetType, resolvePhiCmsWidgetPluginKey } from "../../../../../constants/cms-widget-types";
import type { PhiCmsWidgetPlugin } from "../../../../../types";
import { isPhiFormId, normalizePhiFormId, type PhiFormId } from "../../../../../types/form-id";
import { PHI_SIGNAL_VALUE_SCHEMAS, readPhiSignalRouteSet } from "../../../../../types/signals";
import { PHI_BUILDER_RUNTIME_DATA_PROVIDER_KEYS } from "../../../builder/ids";

/**
 * What a form is about to do, shown before it is done.
 *
 * A form that is reached by a link -- a confirmation, an invitation, a one-time change -- spends a token
 * that stands for a pending record, and the person following the link deserves to see what they are
 * confirming before they confirm it. That reading is not part of the form: it asks no questions and
 * submits nothing. It is a Widget beside the form, and what it found out reaches the form the way one
 * Widget reaches another -- as a reported state the form's placement puts a condition on.
 */
export type PhiCmsFormPreviewWidgetConfig = {
  formId: PhiFormId | null;
  /** Which query parameter carries the token this preview is about. */
  tokenParam: string;
  signalRoutes: ReturnType<typeof readPhiSignalRouteSet>;
};

export function parsePhiFormPreviewWidgetConfig(
  rawConfig: Record<string, unknown>,
): PhiCmsFormPreviewWidgetConfig {
  const normalizedFormId = typeof rawConfig.formId === "string"
    ? normalizePhiFormId(rawConfig.formId)
    : "";
  const tokenParam = typeof rawConfig.tokenParam === "string" && rawConfig.tokenParam.trim()
    ? rawConfig.tokenParam.trim()
    : "token";

  return {
    formId: isPhiFormId(normalizedFormId) ? normalizedFormId : null,
    tokenParam,
    signalRoutes: readPhiSignalRouteSet(rawConfig.signalRoutes),
  };
}

export const PHI_FORM_PREVIEW_WIDGET_DEFINITION = {
  kind: "widget",
  pluginKey: resolvePhiCmsWidgetPluginKey("form-preview"),
  typeKey: "form-preview",
  title: "Form Preview",
  category: "form",
  description: "Shows what the token in the address is about, beside the form that spends it.",
  iconFamily: "form",
  slotSizePolicy: "fill-inline",
  runtimeSignals: {
    emits: [
      {
        id: "conditionStateChange",
        action: "change",
        valueType: "json",
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.runtimeConditionState,
      },
    ],
    listens: [],
  },
  fields: [
    {
      key: "formId",
      type: "choice",
      label: "Form",
      required: true,
      optionsProvider: {
        providerKey: PHI_BUILDER_RUNTIME_DATA_PROVIDER_KEYS.forms,
      },
    },
    { key: "tokenParam", type: "string", label: "Token parameter" },
  ],
  defaultConfig: {
    formId: null,
    tokenParam: "token",
    signalRoutes: null,
  },
  parseConfig: parsePhiFormPreviewWidgetConfig,
} satisfies Pick<
  PhiCmsWidgetPlugin<PhiCmsFormPreviewWidgetConfig>,
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

export const PHI_FORM_PREVIEW_WIDGET_PLUGIN_TYPE = PhiCmsWidgetType.FormPreview;
