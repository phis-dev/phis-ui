import { resolvePhiCmsWidgetPluginKey } from "../../../../../constants/cms-widget-types";
import type { PhiCmsWidgetPlugin } from "../../../../../types";
import { readString } from "../../../../../components/widgets/config/parser-primitives";
import type { PhiCmsWidgetConfigBase } from "../../../../../components/widgets/config/parser-primitives";
import { PHI_COMPACT_CONTROL_PRESENTATION_FIELDS } from "../../../../../components/widgets/config/control-signal-config";

type PhiThemeModeSwitchSize = "small" | "medium";

/**
 * The switch that turns the Site light or dark.
 *
 * It asks for nothing about its state, which is the whole point of it existing beside the generic
 * Switch. The mode is the root's -- it arrives through `usePhiConfig()`, the same context that hands
 * every Widget its tokens -- so there is no `defaultChecked` to fall out of step with what is on
 * screen, and nothing to wire up for the switch to follow a change made elsewhere.
 *
 * What is left to configure is what it looks like: its label and the two words it wears.
 */
export type PhiThemeModeSwitchWidgetConfig = PhiCmsWidgetConfigBase & {
  label?: string;
  checkedChildren?: string;
  unCheckedChildren?: string;
  controlSize?: PhiThemeModeSwitchSize;
};

function readSize(value: unknown): PhiThemeModeSwitchSize | undefined {
  return value === "small" || value === "medium" ? value : undefined;
}

export function parsePhiThemeModeSwitchWidgetConfig(
  config: Record<string, unknown>,
): PhiThemeModeSwitchWidgetConfig {
  return {
    label: readString(config.label),
    checkedChildren: readString(config.checkedChildren),
    unCheckedChildren: readString(config.unCheckedChildren),
    controlSize: readSize(config.controlSize),
  };
}

export const PHI_THEME_MODE_SWITCH_WIDGET_DEFINITION = {
  kind: "widget",
  pluginKey: resolvePhiCmsWidgetPluginKey("theme-mode-switch"),
  typeKey: "theme-mode-switch",
  title: "Theme mode switch",
  description: "Switches the Site between light and dark, following the mode on screen.",
  category: "form",
  iconFamily: "form",
  slotSizePolicy: "intrinsic",
  /*
   * No signal surface at all, in either direction.
   *
   * Reading: the mode is context, not an event, so nothing has to be sent to this Widget for it to
   * show the truth -- including when it mounts late, inside an Overlay opened long after the page.
   *
   * Writing: the Core Runtime Controller is the one address that answers for the mode, and this Widget
   * knows it the way the Brand Widget knows to read the Brand. Offering it as a wire would invite a
   * placement to point the switch somewhere that cannot change anything.
   */
  fields: [
    { key: "label", type: "string", label: "Label" },
    { key: "checkedChildren", type: "string", label: "Dark Text" },
    { key: "unCheckedChildren", type: "string", label: "Light Text" },
    ...PHI_COMPACT_CONTROL_PRESENTATION_FIELDS,
  ],
  defaultConfig: {
    checkedChildren: "Dark",
    unCheckedChildren: "Light",
  },
  parseConfig: parsePhiThemeModeSwitchWidgetConfig,
} satisfies Pick<
  PhiCmsWidgetPlugin<PhiThemeModeSwitchWidgetConfig>,
  | "kind"
  | "pluginKey"
  | "typeKey"
  | "title"
  | "description"
  | "category"
  | "iconFamily"
  | "slotSizePolicy"
  | "fields"
  | "defaultConfig"
  | "parseConfig"
>;
