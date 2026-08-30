import { resolvePhiCmsWidgetPluginKey } from "../../../../../constants/cms-widget-types";
import type { PhiCmsWidgetPlugin } from "../../../../../types";
import type { PhiSignalValue } from "../../../../../types/signals";
import { readPhiCommonControlActionKey, type PhiCommonControlActionKey } from "../../../../../components/widgets/label-types/common-controls";
import { PHI_COMMAND_CONTROL_SIGNALS } from "../../../../../components/widgets/signals/control-signal-capabilities";
import { readBoolean, readNumber, readString } from "../../../../../components/widgets/config/parser-primitives";
import { readPhiButtonType, type PhiButtonType } from "../../../../../components/controls/phi-button-types";
import {
  PHI_CONTROL_PRESENTATION_FIELDS,
  PHI_CONTROL_STATE_FIELDS,
  parsePhiControlConfig,
  type PhiControlConfig,
} from "../../../../../components/widgets/config/control-signal-config";
import {
  canPhiViewerAccessOwnedPolicy,
  readPhiViewerAccessPolicy,
  type PhiAccessViewer,
  type PhiRoleProviderId,
  type PhiViewerAccessPolicy,
} from "../../../../../types/access";

export type PhiCommandToolbarButtonEmitConfig = {
  capabilityId: string;
  value?: PhiSignalValue;
};

export type PhiCommandToolbarButtonConfig = {
  key: string;
  emits: PhiCommandToolbarButtonEmitConfig[];
  accessPolicy?: PhiViewerAccessPolicy;
  actionKey?: PhiCommonControlActionKey;
  label?: string;
  tooltip?: string;
  icon?: string;
  display?: "icon" | "label" | "icon-label";
  danger?: boolean;
  disabled?: boolean;
  buttonType?: PhiButtonType;
};

export type PhiCommandToolbarWidgetConfig = PhiControlConfig & {
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
    actionKey: readPhiCommonControlActionKey(readString(record.actionKey) ?? readString(record.action) ?? key) ?? undefined,
    label: readString(record.label),
    tooltip: readString(record.tooltip),
    icon: readString(record.icon),
    display: record.display === "icon" || record.display === "label" || record.display === "icon-label"
      ? record.display
      : undefined,
    danger: readBoolean(record.danger),
    disabled: readBoolean(record.disabled),
    buttonType: readString(record.buttonType) == null
      ? undefined
      : readPhiButtonType(record.buttonType),
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
    ...controlState,
    compact: readBoolean(config.compact) ?? true,
    wrap: readBoolean(config.wrap) ?? false,
    showLabels: readBoolean(config.showLabels) ?? false,
    buttons: readCommandButtons(config.buttons),
  };
}

export const PHI_COMMAND_TOOLBAR_WIDGET_DEFINITION = {
  kind: "widget",
  pluginKey: resolvePhiCmsWidgetPluginKey("command-toolbar"),
  typeKey: "command-toolbar",
  title: "Command Toolbar",
  description: "Reusable toolbar that emits configured command values through the runtime signal bus.",
  category: "form",
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
    { key: "buttons", type: "string", label: "Buttons", editorPlacement: "toolbar" },
    { key: "compact", type: "boolean", label: "Compact" },
    { key: "wrap", type: "boolean", label: "Wrap" },
    { key: "showLabels", type: "boolean", label: "Show Labels" },
    ...PHI_CONTROL_PRESENTATION_FIELDS,
    ...PHI_CONTROL_STATE_FIELDS,
  ],
  defaultConfig: {
    key: "command",
    compact: true,
    wrap: false,
    showLabels: false,
    buttons: [],
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
  | "iconFamily"
  | "slotSizePolicy"
  | "runtimeSignals"
  | "signalSubcontrols"
  | "fields"
  | "defaultConfig"
  | "parseConfig"
>;
