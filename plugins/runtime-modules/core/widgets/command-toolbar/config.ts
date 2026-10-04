import { resolvePhiCmsWidgetPluginKey } from "../../../../../constants/cms-widget-types";
import type {
  PhiCommandToolbarButtonConfig,
  PhiCommandToolbarButtonEmitConfig,
} from "../../../../../types/core-widget-placements";
import { readPhiButtonVariant } from "../../../../../components/widgets/config/button-variant";
import type { PhiCmsWidgetPlugin } from "../../../../../types";
import type { PhiSignalValue } from "../../../../../types/signals";
import { readPhiCommonControlActionKey } from "../../../../../components/widgets/label-types/common-controls";
import { PHI_COMMAND_CONTROL_SIGNALS } from "../../../../../components/widgets/signals/control-signal-capabilities";
import {
  readBoolean,
  readNumber,
  readRenderableBlockConfig,
  readString,
  type PhiCmsWidgetConfigBase,
} from "../../../../../components/widgets/config/parser-primitives";
import {
  PHI_CONTROL_PRESENTATION_FIELDS,
  parsePhiControlConfig,
  type PhiControlConfig,
} from "../../../../../components/widgets/config/control-signal-config";
import {
  canPhiViewerAccessOwnedPolicy,
  readPhiViewerAccessPolicy,
  type PhiAccessViewer,
  type PhiRoleProviderId,
} from "../../../../../types/access";

export type PhiCommandToolbarWidgetConfig = PhiCmsWidgetConfigBase & PhiControlConfig & {
  compact?: boolean;
  wrap?: boolean;
  showLabels?: boolean;
  buttons: PhiCommandToolbarButtonConfig[];
};

function readButtonEmitValue(value: unknown): PhiSignalValue | undefined {
  const stringValue = readString(value);
  if (stringValue !== undefined) {
    return stringValue;
  }
  const numberValue = readNumber(value);
  if (numberValue !== undefined) {
    return numberValue;
  }
  const booleanValue = readBoolean(value);
  if (booleanValue !== undefined) {
    return booleanValue;
  }
  if (value == null) {
    return undefined;
  }
  if (Array.isArray(value)) {
    const stringItems = value.filter((item): item is string => typeof item === "string");
    if (stringItems.length === value.length) {
      return stringItems;
    }
    const numberItems = value.filter((item): item is number => typeof item === "number" && Number.isFinite(item));
    if (numberItems.length === value.length) {
      return numberItems;
    }
    return undefined;
  }
  if (typeof value === "object") {
    return value as Record<string, unknown>;
  }
  return undefined;
}

function readCommandButtonEmitConfig(value: unknown): PhiCommandToolbarButtonEmitConfig | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const capabilityId = readString(record.capabilityId);
  if (!capabilityId) {
    return null;
  }

  return {
    capabilityId,
    value: readButtonEmitValue(record.value),
  };
}

function readCommandButtonEmits(value: unknown): PhiCommandToolbarButtonEmitConfig[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(readCommandButtonEmitConfig)
    .filter((item): item is PhiCommandToolbarButtonEmitConfig => item != null);
}

function readCommandButtonConfig(value: unknown): PhiCommandToolbarButtonConfig | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const key = readString(record.key);
  const emits = readCommandButtonEmits(record.emits);
  if (!key || emits.length === 0) {
    return null;
  }
  const hasAccessPolicy = Object.prototype.hasOwnProperty.call(record, "accessPolicy");
  const accessPolicy = hasAccessPolicy
    ? readPhiViewerAccessPolicy(record.accessPolicy)
    : null;
  if (hasAccessPolicy && !accessPolicy) {
    return null;
  }

  return {
    key,
    emits,
    ...(accessPolicy ? { accessPolicy } : {}),
    actionKey: readPhiCommonControlActionKey(readString(record.actionKey) ?? key) ?? undefined,
    label: readString(record.label),
    tooltip: readString(record.tooltip),
    icon: readString(record.icon),
    display: record.display === "icon" || record.display === "label" || record.display === "icon-label"
      ? record.display
      : undefined,
    danger: readBoolean(record.danger),
    disabled: readBoolean(record.disabled),
    readOnly: readBoolean(record.readOnly),
    variant: readPhiButtonVariant(record.variant),
  };
}

export function filterPhiCommandToolbarButtonsForViewer(
  buttons: readonly PhiCommandToolbarButtonConfig[],
  viewer: PhiAccessViewer,
  ownerProviderId?: PhiRoleProviderId | null,
) {
  return buttons.filter((button) =>
    canPhiViewerAccessOwnedPolicy(
      viewer,
      button.accessPolicy,
      ownerProviderId,
    )
  );
}

function readCommandButtons(value: unknown): PhiCommandToolbarButtonConfig[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(readCommandButtonConfig)
    .filter((item): item is PhiCommandToolbarButtonConfig => item != null);
}

export function parsePhiCommandToolbarWidgetConfig(
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
    buttons: readCommandButtons(config.buttons),
  };
}

/** The fewest and most buttons the scaffold's count offers. */
export const PHI_COMMAND_TOOLBAR_MIN_BUTTONS = 1;
export const PHI_COMMAND_TOOLBAR_MAX_BUTTONS = 12;

/**
 * What a new button shows. It has an icon so that Show Labels has something to switch between: a button
 * without one keeps its label whatever the toolbar says, or it would be an empty box.
 */
export const PHI_COMMAND_TOOLBAR_DEFAULT_BUTTON_ICON = "antd:star-outlined";

/**
 * A new button: the first free `buttonN` key, labelled after it, sending its key as the command. The
 * number counts on from the list's length, so a button added to three is `button4` unless that is taken.
 */
export function createPhiCommandToolbarButton(
  buttons: readonly PhiCommandToolbarButtonConfig[],
): PhiCommandToolbarButtonConfig {
  const keys = new Set(buttons.map((button) => button.key));
  let index = buttons.length + 1;
  while (keys.has(`button${index}`)) {
    index += 1;
  }
  const key = `button${index}`;

  return {
    key,
    label: `Button ${index}`,
    icon: PHI_COMMAND_TOOLBAR_DEFAULT_BUTTON_ICON,
    emits: [{ capabilityId: "command", value: key }],
  };
}

/**
 * The buttons at a new count: kept buttons stay as they are, new ones are created after them, a smaller
 * count drops the last. Held to at least one -- a toolbar without buttons draws nothing, and an author
 * has nothing to select it by.
 */
export function resizePhiCommandToolbarButtons(
  buttons: readonly PhiCommandToolbarButtonConfig[],
  count: number,
): PhiCommandToolbarButtonConfig[] {
  const nextCount = Math.max(
    PHI_COMMAND_TOOLBAR_MIN_BUTTONS,
    Math.min(PHI_COMMAND_TOOLBAR_MAX_BUTTONS, Math.trunc(count)),
  );
  const next = buttons.slice(0, nextCount);
  while (next.length < nextCount) {
    next.push(createPhiCommandToolbarButton(next));
  }
  return next;
}

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
  signalSubcontrols: [
    {
      configKey: "buttons",
      keyField: "key",
      labelFields: ["label", "actionKey"],
    },
  ],
  fields: [
    /*
     * How many there are is set on the scaffold; here one at a time, picked by a select. The key and
     * what a button sends stay as they were made: the key is its signal address, and the value is
     * wired from the Signals panel.
     */
    {
      key: "buttons",
      type: "collection",
      presentation: "select",
      label: "Button",
      itemKeyField: "key",
      itemLabelField: "label",
      reorderable: false,
      itemFields: [
        { key: "label", type: "string", label: "Label" },
        { key: "icon", type: "icon", label: "Icon" },
        { key: "danger", type: "boolean", label: "Danger" },
        { key: "readOnly", type: "boolean", label: "Read only" },
        { key: "disabled", type: "boolean", label: "Disabled" },
      ],
    },
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
    buttons: [createPhiCommandToolbarButton([])],
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
