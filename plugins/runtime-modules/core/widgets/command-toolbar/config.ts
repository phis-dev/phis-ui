import { resolvePhiCmsWidgetPluginKey } from "../../../../../constants/cms-widget-types";
import type { PhiCommandButtonConfig } from "../../../../../types/core-widget-placements";
import type { PhiCmsWidgetPlugin } from "../../../../../types";
import { PHI_COMMAND_CONTROL_SIGNALS } from "../../../../../components/widgets/signals/control-signal-capabilities";
import {
  readBoolean,
  readRenderableBlockConfig,
  type PhiCmsWidgetConfigBase,
} from "../../../../../components/widgets/config/parser-primitives";
import {
  PHI_CONTROL_PRESENTATION_FIELDS,
  parsePhiControlConfig,
  type PhiControlConfig,
} from "../../../../../components/widgets/config/control-signal-config";
import {
  PHI_COMMAND_BUTTONS_SIGNAL_SUBCONTROLS,
  buildPhiCommandButtonsField,
  createPhiCommandButton,
  readPhiCommandButtons,
  type PhiCommandButtonBounds,
} from "../../../../../components/widgets/config/command-buttons";

export type PhiCommandToolbarWidgetConfig = PhiCmsWidgetConfigBase & PhiControlConfig & {
  compact?: boolean;
  wrap?: boolean;
  showLabels?: boolean;
  buttons: PhiCommandButtonConfig[];
};

function parsePhiCommandToolbarWidgetConfig(
  config: Record<string, unknown>,
): PhiCommandToolbarWidgetConfig {
  const controlState = parsePhiControlConfig(config, {
    key: "command",
  });

  return {
    ...readRenderableBlockConfig(config),
    ...controlState,
    compact: readBoolean(config.compact) ?? true,
    wrap: readBoolean(config.wrap) ?? false,
    showLabels: readBoolean(config.showLabels) ?? false,
    buttons: readPhiCommandButtons(config.buttons),
  };
}

/** The fewest and most buttons the scaffold's count offers. */
export const PHI_COMMAND_TOOLBAR_BUTTON_BOUNDS = { min: 1, max: 12 } satisfies PhiCommandButtonBounds;

export const PHI_COMMAND_TOOLBAR_WIDGET_DEFINITION = {
  kind: "widget",
  pluginKey: resolvePhiCmsWidgetPluginKey("command-toolbar"),
  typeKey: "command-toolbar",
  title: "Command Toolbar",
  description: "Reusable toolbar that emits configured command values through the runtime signal bus.",
  category: "form",
  icon: "antd:build-outlined",
  iconFamily: "form",
  slotSizePolicy: "intrinsic",
  runtimeSignals: {
    ...PHI_COMMAND_CONTROL_SIGNALS,
  },
  signalSubcontrols: PHI_COMMAND_BUTTONS_SIGNAL_SUBCONTROLS,
  fields: [
    buildPhiCommandButtonsField({ extraItemFields: [
      /* Left at the toolbar's own answer, Show Labels decides; set, it decides for this button. */
      {
        key: "display",
        type: "choice",
        label: "Display",
        emptyOption: { value: "", label: "Toolbar", separator: "after" },
        emptyValue: undefined,
        options: [
          { value: "icon", label: "Icon" },
          { value: "label", label: "Label" },
          { value: "icon-label", label: "Icon and label" },
        ],
      },
    ] }),
    /*
     * What holds for every button. No Read only or Disabled of the whole toolbar here: each button
     * has its own, and switching all of them at once is what a signal is for -- every renderable block
     * receives `enabled/change`.
     */
    { key: "compact", type: "boolean", label: "Compact", heading: "Toolbar" },
    /*
     * Only while the group is not compact. A compact group cannot wrap (`PhiToolbarControl`), so with
     * compact on this is a switch whose position changes nothing -- and a control that does nothing is
     * read as one that is broken.
     */
    { key: "wrap", type: "boolean", label: "Wrap", visibleWhen: { field: "compact", equals: false } },
    { key: "showLabels", type: "boolean", label: "Show Labels" },
    ...PHI_CONTROL_PRESENTATION_FIELDS,
  ],
  defaultConfig: {
    key: "command",
    compact: true,
    wrap: false,
    showLabels: false,
    /* One to start with, so a toolbar just placed is something to see and to select. */
    buttons: [createPhiCommandButton([])],
  },
  parseConfig: parsePhiCommandToolbarWidgetConfig,
} satisfies Pick<
  PhiCmsWidgetPlugin<PhiCommandToolbarWidgetConfig>,
  | "kind"
  | "pluginKey"
  | "typeKey"
  | "title"
  | "description"
  | "category"
  | "icon"
  | "iconFamily"
  | "slotSizePolicy"
  | "runtimeSignals"
  | "signalSubcontrols"
  | "fields"
  | "defaultConfig"
  | "parseConfig"
>;
