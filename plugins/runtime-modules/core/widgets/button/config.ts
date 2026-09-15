import { resolvePhiCmsWidgetPluginKey } from "../../../../../constants/cms-widget-types";
import { PHI_SIGNAL_VALUE_SCHEMAS } from "../../../../../types/signals";
import type { PhiCmsWidgetPlugin } from "../../../../../types";
import { readPhiCommonControlActionKey, type PhiCommonControlActionKey } from "../../../../../components/widgets/label-types/common-controls";
import { PHI_BUTTON_CONTROL_SIGNALS } from "../../../../../components/widgets/signals/control-signal-capabilities";
import { readBoolean, readString } from "../../../../../components/widgets/config/parser-primitives";
import { readPhiButtonType, type PhiButtonType } from "../../../../../components/controls/phi-button-types";
import {
  PHI_CONTROL_BADGE_FIELDS,
  PHI_CONTROL_PRESENTATION_FIELDS,
  PHI_CONTROL_STATE_FIELDS,
  parsePhiControlBadgeConfig,
  parsePhiControlConfig,
  type PhiControlBadgeConfig,
  type PhiControlConfig,
} from "../../../../../components/widgets/config/control-signal-config";

export type PhiButtonWidgetConfig = PhiControlBadgeConfig & PhiControlConfig & {
  actionKey?: PhiCommonControlActionKey;
  label?: string;
  tooltip?: string;
  icon?: string;
  value?: string;
  buttonType?: PhiButtonType;
  /**
   * Where it leads, for a Button that is a way somewhere rather than a command.
   *
   * The Control already renders a real anchor for this -- it works before hydration and on a page that
   * mounts no Controller. A Button with a target emits nothing and needs no route: "Create account"
   * beside a sign-in form is a link, and making it a signal would only add a wire that can break.
   */
  href?: string;
  danger?: boolean;
};

export function parsePhiButtonWidgetConfig(config: Record<string, unknown>): PhiButtonWidgetConfig {
  const controlState = parsePhiControlConfig(config, {
    key: "button",
  });

  return {
    ...controlState,
    ...parsePhiControlBadgeConfig(config),
    actionKey: readPhiCommonControlActionKey(readString(config.actionKey) ?? readString(config.action)) ?? undefined,
    label: readString(config.label),
    tooltip: readString(config.tooltip),
    icon: readString(config.icon),
    value: readString(config.value),
    buttonType: readString(config.buttonType) == null
      ? undefined
      : readPhiButtonType(config.buttonType),
    href: readString(config.href),
    danger: readBoolean(config.danger),
  };
}

export const PHI_BUTTON_WIDGET_DEFINITION = {
  kind: "widget",
  pluginKey: resolvePhiCmsWidgetPluginKey("button"),
  typeKey: "button",
  title: "Button",
  description: "Reusable command button that emits a configured runtime signal.",
  category: "form",
  iconFamily: "form",
  slotSizePolicy: "intrinsic",
  runtimeSignals: {
    ...PHI_BUTTON_CONTROL_SIGNALS,
    emits: [
      ...PHI_BUTTON_CONTROL_SIGNALS.emits,
      /*
       * Going somewhere, for the Button that cannot be an anchor.
       *
       * A target the placement knows belongs in `href`, where it becomes a real link -- it survives a
       * middle click and a page that never hydrates. This is for the rest: a Button in a toolbar, or one
       * whose destination a Controller decides. It asks the Runtime Controller rather than navigating,
       * so the same refusal applies to it as to everything else that names a target.
       */
      {
        id: "navigate",
        action: "activate",
        valueType: "json",
        valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.runtimeNavigation,
      },
    ],
  },
  fields: [
    { key: "actionKey", type: "string", label: "Action Key" },
    { key: "href", type: "url", label: "Link target" },
    { key: "label", type: "string", label: "Label" },
    { key: "tooltip", type: "string", label: "Tooltip" },
    { key: "icon", type: "icon", label: "Icon", editorPlacement: "toolbar" },
    { key: "value", type: "string", label: "Signal Value" },
    {
      key: "buttonType",
      type: "choice",
      label: "Button Type",
      options: [
        { value: "default", label: "Default" },
        { value: "primary", label: "Primary" },
        { value: "dashed", label: "Dashed" },
        { value: "text", label: "Text" },
        { value: "link", label: "Link" },
      ],
    },
    { key: "danger", type: "boolean", label: "Danger" },
    ...PHI_CONTROL_PRESENTATION_FIELDS,
    ...PHI_CONTROL_STATE_FIELDS,
    ...PHI_CONTROL_BADGE_FIELDS,
  ],
  defaultConfig: {
    key: "button",
    buttonType: "default",
    badgeEnabled: false,
  },
  parseConfig: parsePhiButtonWidgetConfig,
} satisfies Pick<
  PhiCmsWidgetPlugin<PhiButtonWidgetConfig>,
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
