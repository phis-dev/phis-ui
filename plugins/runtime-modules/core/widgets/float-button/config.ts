import { resolvePhiCmsWidgetPluginKey } from "../../../../../constants/cms-widget-types";
import type { PhiCommandButtonConfig } from "../../../../../types/core-widget-placements";
import type { PhiCmsWidgetPlugin } from "../../../../../types";
import { readPhiLengthValue, type PhiCssLength } from "../../../../../types/length";
import { PHI_COMMAND_CONTROL_SIGNALS } from "../../../../../components/widgets/signals/control-signal-capabilities";
import {
  readRenderableBlockConfig,
  readString,
  type PhiCmsWidgetConfigBase,
} from "../../../../../components/widgets/config/parser-primitives";
import {
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
import type {
  PhiFloatButtonControlGroup,
  PhiFloatButtonControlPlacement,
} from "../../../../../components/controls/phi-float-button-control";

/**
 * Buttons that stay in a corner of the viewport while the Page scrolls: one, or a group of them.
 *
 * The buttons are the Command Toolbar's -- the same fields, the same subcontrol addresses, the same
 * runtime -- and only how they stand is this Widget's. It sits in a slot of the Page it belongs to and
 * takes no room there; a Float Button for every Page of an Area is the Area's Pages each placing one.
 */
export type PhiFloatButtonWidgetConfig = PhiCmsWidgetConfigBase & PhiControlConfig & {
  buttons: PhiCommandButtonConfig[];
  placement?: PhiFloatButtonControlPlacement;
  offsetBlock?: PhiCssLength;
  offsetInline?: PhiCssLength;
  shape?: "circle" | "square";
  groupTrigger?: NonNullable<PhiFloatButtonControlGroup["trigger"]>;
  groupIcon?: string;
  groupDirection?: NonNullable<PhiFloatButtonControlGroup["direction"]>;
};

const PHI_FLOAT_BUTTON_PLACEMENTS = ["bottom-end", "bottom-start", "top-end", "top-start"] as const;
const PHI_FLOAT_BUTTON_GROUP_DIRECTIONS = ["top", "bottom", "left", "right"] as const;

function readOneOf<T extends string>(value: unknown, allowed: readonly T[]): T | undefined {
  const text = readString(value);
  return (allowed as readonly string[]).includes(text ?? "") ? text as T : undefined;
}

function parsePhiFloatButtonWidgetConfig(config: Record<string, unknown>): PhiFloatButtonWidgetConfig {
  return {
    ...readRenderableBlockConfig(config),
    ...parsePhiControlConfig(config, { key: "float" }),
    buttons: readPhiCommandButtons(config.buttons),
    placement: readOneOf(config.placement, PHI_FLOAT_BUTTON_PLACEMENTS) ?? "bottom-end",
    offsetBlock: readPhiLengthValue(config.offsetBlock) ?? undefined,
    offsetInline: readPhiLengthValue(config.offsetInline) ?? undefined,
    shape: readString(config.shape) === "square" ? "square" : "circle",
    groupTrigger: readOneOf(config.groupTrigger, ["click", "hover"] as const),
    groupIcon: readString(config.groupIcon),
    groupDirection: readOneOf(config.groupDirection, PHI_FLOAT_BUTTON_GROUP_DIRECTIONS),
  };
}

/** A corner holds fewer buttons than a toolbar: past six, a group covers the Page it floats over. */
export const PHI_FLOAT_BUTTON_BOUNDS = { min: 1, max: 6 } satisfies PhiCommandButtonBounds;

export const PHI_FLOAT_BUTTON_WIDGET_DEFINITION = {
  kind: "widget",
  pluginKey: resolvePhiCmsWidgetPluginKey("float-button"),
  typeKey: "float-button",
  title: "Float Button",
  description: "Buttons fixed to a corner of the viewport, alone or as a group, emitting configured commands.",
  category: "form",
  icon: "antd:plus-circle-outlined",
  iconFamily: "form",
  slotSizePolicy: "intrinsic",
  runtimeSignals: {
    ...PHI_COMMAND_CONTROL_SIGNALS,
  },
  signalSubcontrols: PHI_COMMAND_BUTTONS_SIGNAL_SUBCONTROLS,
  fields: [
    buildPhiCommandButtonsField([
      /* Only a square button has room for its label; a round one shows it as the tooltip. */
      {
        key: "display",
        type: "choice",
        label: "Display",
        emptyOption: { value: "", label: "Icon", separator: "after" },
        emptyValue: undefined,
        options: [
          { value: "icon-label", label: "Icon and label" },
          { value: "label", label: "Label" },
        ],
      },
    ]),
    {
      key: "placement",
      type: "choice",
      label: "Corner",
      heading: "Float Button",
      options: [
        { value: "bottom-end", label: "Bottom end" },
        { value: "bottom-start", label: "Bottom start" },
        { value: "top-end", label: "Top end" },
        { value: "top-start", label: "Top start" },
      ],
    },
    { key: "offsetBlock", type: "length", label: "Distance from top or bottom", min: 0 },
    { key: "offsetInline", type: "length", label: "Distance from the side", min: 0 },
    {
      key: "shape",
      type: "choice",
      label: "Shape",
      options: [
        { value: "circle", label: "Circle" },
        { value: "square", label: "Square" },
      ],
    },
    /* The group's own settings; a single button has no group to open. */
    {
      key: "groupTrigger",
      type: "choice",
      label: "Group opens",
      heading: "Group",
      emptyOption: { value: "", label: "Always open", separator: "after" },
      emptyValue: undefined,
      options: [
        { value: "click", label: "On click" },
        { value: "hover", label: "On hover" },
      ],
    },
    { key: "groupIcon", type: "icon", label: "Group icon", visibleWhen: { field: "groupTrigger", notEquals: null } },
    {
      key: "groupDirection",
      type: "choice",
      label: "Unfolds",
      emptyOption: { value: "", label: "Away from the edge", separator: "after" },
      emptyValue: undefined,
      options: [
        { value: "top", label: "Up" },
        { value: "bottom", label: "Down" },
        { value: "left", label: "Left" },
        { value: "right", label: "Right" },
      ],
    },
  ],
  defaultConfig: {
    key: "float",
    placement: "bottom-end",
    shape: "circle",
    /* One to start with, so a Float Button just placed is something to see and to select. */
    buttons: [createPhiCommandButton([])],
  },
  parseConfig: parsePhiFloatButtonWidgetConfig,
} satisfies Pick<
  PhiCmsWidgetPlugin<PhiFloatButtonWidgetConfig>,
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
