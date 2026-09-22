import { resolvePhiCmsWidgetPluginKey } from "../../../../../constants/cms-widget-types";
import type { PhiCmsWidgetPlugin } from "../../../../../types";
import { readBoolean, readString } from "../../../../../components/widgets/config/parser-primitives";
import { PHI_BOOLEAN_CONTROL_SIGNALS } from "../../../../../components/widgets/signals/control-signal-capabilities";
import {
  PHI_COMPACT_CONTROL_PRESENTATION_FIELDS,
  PHI_CONTROL_STATE_FIELDS,
  parsePhiControlConfig,
  type PhiControlConfig,
} from "../../../../../components/widgets/config/control-signal-config";

type PhiSwitchControlSize = "small" | "medium";

export type PhiSwitchWidgetConfig = PhiControlConfig<PhiSwitchControlSize> & {
  label?: string;
  defaultChecked?: boolean;
  checkedChildren?: string;
  unCheckedChildren?: string;
};

export function parsePhiSwitchWidgetConfig(config: Record<string, unknown>): PhiSwitchWidgetConfig {
  const controlState = parsePhiControlConfig(
    config,
    { key: "switch" },
    ["small", "medium"] as const,
  );

  return {
    ...controlState,
    label: readString(config.label),
    defaultChecked: readBoolean(config.defaultChecked) ?? false,
    checkedChildren: readString(config.checkedChildren),
    unCheckedChildren: readString(config.unCheckedChildren),
  };
}

export const PHI_SWITCH_WIDGET_DEFINITION = {
  kind: "widget",
  pluginKey: resolvePhiCmsWidgetPluginKey("switch"),
  typeKey: "switch",
  title: "Switch",
  description: "Reusable boolean switch that emits a generic state/switch signal.",
  category: "form",
  iconFamily: "form",
  slotSizePolicy: "intrinsic",
  /*
   * A boolean switch, and nothing beyond that.
   *
   * It carried a `themeMode` input once, so that a switch wired to light and dark could follow the
   * mode on screen. That put one Theme into the contract of every switch on every Site, and it needed
   * somebody to keep telling it -- which is what the Theme Mode Relay did, by broadcasting to the
   * whole Area each time anything registered in it. Both are gone: the Theme Mode Switch reads the
   * mode from the same context that hands it its tokens, and asks nobody.
   */
  runtimeSignals: PHI_BOOLEAN_CONTROL_SIGNALS,
  fields: [
    { key: "label", type: "string", label: "Label" },
    { key: "defaultChecked", type: "boolean", label: "Default Checked" },
    { key: "checkedChildren", type: "string", label: "Checked Text" },
    { key: "unCheckedChildren", type: "string", label: "Unchecked Text" },
    ...PHI_COMPACT_CONTROL_PRESENTATION_FIELDS,
    ...PHI_CONTROL_STATE_FIELDS,
  ],
  defaultConfig: {
    defaultChecked: false,
    key: "switch",
  },
  parseConfig: parsePhiSwitchWidgetConfig,
} satisfies Pick<
  PhiCmsWidgetPlugin<PhiSwitchWidgetConfig>,
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
