import {
  PHI_SIGNAL_VALUE_SCHEMAS,
  type PhiSignalPluginMeta,
} from "../../../types/signals";

const PHI_CONTROL_SET_VALUE_SIGNAL = {
  id: "change",
  channel: "value",
  action: "change",
} as const;

const PHI_CONTROL_SET_ENABLED_SIGNAL = {
  id: "enabled",
  channel: "enabled",
  action: "change",
  valueType: "boolean",
} as const;

const PHI_SUBCONTROL_SET_ENABLED_SIGNAL = {
  ...PHI_CONTROL_SET_ENABLED_SIGNAL,
  target: "subcontrol",
} as const;

const PHI_CONTROL_CLEAR_SIGNAL = {
  id: "clear",
  channel: "value",
  action: "clear",
  valueType: "none",
} as const;

const PHI_CONTROL_ACTIVATE_SIGNAL = {
  id: "activate",
  action: "activate",
  valueType: "none",
} as const;

const PHI_CONTROL_FOCUS_SIGNALS = {
  emits: [
    { id: "focus", action: "change", valueType: "boolean" },
    { id: "blur", action: "change", valueType: "boolean" },
  ],
  listens: [
    { id: "focused", channel: "focused", action: "change", valueType: "boolean" },
  ],
} satisfies PhiSignalPluginMeta;

export const PHI_ACTIVATION_CONTROL_SIGNALS = {
  emits: [PHI_CONTROL_ACTIVATE_SIGNAL],
  listens: [],
} satisfies PhiSignalPluginMeta;

export const PHI_COMMAND_CONTROL_SIGNALS = {
  emits: [
    { id: "command", action: "activate", valueType: "string", target: "subcontrol" },
  ],
  listens: [
    PHI_SUBCONTROL_SET_ENABLED_SIGNAL,
    { id: "loading", channel: "loading", action: "change", valueType: "boolean", target: "subcontrol" },
    { id: "visibility", channel: "visibility", action: "change", valueType: "boolean", target: "subcontrol" },
    { id: "badgeText", channel: "badge", action: "change", valueType: "string", target: "subcontrol" },
    { id: "badgeCount", channel: "badge", action: "change", valueType: "number", target: "subcontrol" },
    { id: "icon", channel: "icon", action: "change", valueType: "icon", target: "subcontrol" },
    { id: "label", channel: "label", action: "change", valueType: "string", target: "subcontrol" },
  ],
} satisfies PhiSignalPluginMeta;

export const PHI_CONTROL_BADGE_SIGNALS = {
  listens: [
    { id: "badgeText", channel: "badge", action: "change", valueType: "string" },
    { id: "badgeCount", channel: "badge", action: "change", valueType: "number" },
  ],
} satisfies Pick<PhiSignalPluginMeta, "listens">;

export const PHI_BUTTON_CONTROL_SIGNALS = {
  emits: [
    { id: "activate", action: "activate", valueType: "none" },
    { id: "command", action: "activate", valueType: "string" },
    { id: "toggle", action: "toggle", valueType: "none" },
  ],
  listens: [
    ...PHI_CONTROL_BADGE_SIGNALS.listens,
  ],
} satisfies PhiSignalPluginMeta;

export const PHI_TEXT_CONTROL_SIGNALS = {
  emits: [
    { id: "change", action: "change", valueType: "string" },
    { id: "submit", action: "activate", valueType: "none" },
    { id: "clear", action: "clear", valueType: "none" },
    ...PHI_CONTROL_FOCUS_SIGNALS.emits,
  ],
  listens: [
    { ...PHI_CONTROL_SET_VALUE_SIGNAL, channel: "text", valueType: "string" },
    { ...PHI_CONTROL_CLEAR_SIGNAL, channel: "text" },
    ...PHI_CONTROL_FOCUS_SIGNALS.listens,
  ],
} satisfies PhiSignalPluginMeta;

export const PHI_PATH_CONTROL_SIGNALS = {
  emits: [
    { id: "change", action: "change", valueType: "path" },
    ...PHI_CONTROL_FOCUS_SIGNALS.emits,
  ],
  listens: [
    { ...PHI_CONTROL_SET_VALUE_SIGNAL, channel: "path", valueType: "path" },
    { ...PHI_CONTROL_CLEAR_SIGNAL, channel: "path" },
  ],
} satisfies PhiSignalPluginMeta;

export const PHI_COLOR_CONTROL_SIGNALS = {
  emits: [
    { id: "change", action: "change", valueType: "color" },
  ],
  listens: [
    { ...PHI_CONTROL_SET_VALUE_SIGNAL, channel: "color", valueType: "color" },
    { ...PHI_CONTROL_CLEAR_SIGNAL, channel: "color" },
  ],
} satisfies PhiSignalPluginMeta;

export const PHI_NUMBER_CONTROL_SIGNALS = {
  emits: [
    { id: "change", action: "change", valueType: "number" },
  ],
  listens: [
    { ...PHI_CONTROL_SET_VALUE_SIGNAL, channel: "number", valueType: "number" },
    { ...PHI_CONTROL_CLEAR_SIGNAL, channel: "number" },
  ],
} satisfies PhiSignalPluginMeta;

export const PHI_DIMENSION_CONTROL_SIGNALS = {
  emits: [
    { id: "change", action: "change", valueType: "size" },
  ],
  listens: [
    { ...PHI_CONTROL_SET_VALUE_SIGNAL, channel: "size", valueType: "size" },
    { ...PHI_CONTROL_CLEAR_SIGNAL, channel: "size" },
  ],
} satisfies PhiSignalPluginMeta;

export const PHI_LENGTH_CONTROL_SIGNALS = {
  emits: [
    { id: "change", action: "change", valueType: "length" },
  ],
  listens: [
    { ...PHI_CONTROL_SET_VALUE_SIGNAL, channel: "length", valueType: "length" },
    { ...PHI_CONTROL_CLEAR_SIGNAL, channel: "length" },
  ],
} satisfies PhiSignalPluginMeta;

export const PHI_PAGINATION_CONTROL_SIGNALS = {
  emits: [
    {
      id: "change",
      action: "change",
      valueType: "json",
      valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.pagination,
    },
  ],
  listens: [
    {
      ...PHI_CONTROL_SET_VALUE_SIGNAL,
      valueType: "json",
      valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.pagination,
    },
    PHI_CONTROL_CLEAR_SIGNAL,
  ],
} satisfies PhiSignalPluginMeta;

export const PHI_BOOLEAN_CONTROL_SIGNALS = {
  emits: [
    { id: "change", action: "change", valueType: "boolean" },
  ],
  listens: [
    { ...PHI_CONTROL_SET_VALUE_SIGNAL, valueType: "boolean" },
    { id: "toggle", channel: "value", action: "toggle", valueType: "none" },
  ],
} satisfies PhiSignalPluginMeta;

export const PHI_SELECT_CONTROL_SIGNALS = {
  emits: [
    { id: "change", action: "change", valueType: "string" },
    { id: "stackMeta", action: "activate", valueType: "none" },
    { id: "activeSlotIndex", action: "change", valueType: "number" },
    ...PHI_CONTROL_FOCUS_SIGNALS.emits,
  ],
  listens: [
    { ...PHI_CONTROL_SET_VALUE_SIGNAL, channel: "selection", valueType: "string" },
    {
      id: "stackMeta",
      channel: "stackMeta",
      action: "change",
      valueType: "json",
      valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.stackMeta,
    },
    { ...PHI_CONTROL_CLEAR_SIGNAL, channel: "selection" },
  ],
} satisfies PhiSignalPluginMeta;

export const PHI_MULTI_SELECT_CONTROL_SIGNALS = {
  emits: [
    { id: "change", action: "change", valueType: "enum[]" },
    ...PHI_CONTROL_FOCUS_SIGNALS.emits,
  ],
  listens: [
    { ...PHI_CONTROL_SET_VALUE_SIGNAL, channel: "selection", valueType: "enum[]" },
    { ...PHI_CONTROL_CLEAR_SIGNAL, channel: "selection" },
  ],
} satisfies PhiSignalPluginMeta;

export const PHI_NUMBER_MULTI_SELECT_CONTROL_SIGNALS = {
  emits: [
    { id: "change", action: "change", valueType: "number[]" },
    ...PHI_CONTROL_FOCUS_SIGNALS.emits,
  ],
  listens: [
    { ...PHI_CONTROL_SET_VALUE_SIGNAL, channel: "selection", valueType: "number[]" },
    { ...PHI_CONTROL_CLEAR_SIGNAL, channel: "selection" },
  ],
} satisfies PhiSignalPluginMeta;

export const PHI_DRAG_SOURCE_CONTROL_SIGNALS = {
  emits: [
    {
      id: "dragStart",
      action: "start",
      valueType: "json",
      valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.dragDrop,
    },
    {
      id: "dragChange",
      action: "change",
      valueType: "json",
      valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.dragDrop,
    },
    {
      id: "dragEnd",
      action: "stop",
      valueType: "json",
      valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.dragDrop,
    },
  ],
} satisfies PhiSignalPluginMeta;

export const PHI_DROP_TARGET_CONTROL_SIGNALS = {
  emits: [
    {
      id: "dragStart",
      action: "start",
      valueType: "json",
      valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.dragDrop,
    },
    {
      id: "dragOver",
      action: "change",
      valueType: "json",
      valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.dragDrop,
    },
    {
      id: "dragEnd",
      action: "stop",
      valueType: "json",
      valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.dragDrop,
    },
    {
      id: "drop",
      action: "drop",
      valueType: "json",
      valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.dragDrop,
    },
  ],
  listens: [
    {
      id: "dragStart",
      channel: "drag",
      action: "start",
      valueType: "json",
      valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.dragDrop,
    },
    {
      id: "dragChange",
      channel: "drag",
      action: "change",
      valueType: "json",
      valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.dragDrop,
    },
    {
      id: "dragEnd",
      channel: "drag",
      action: "stop",
      valueType: "json",
      valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.dragDrop,
    },
  ],
} satisfies PhiSignalPluginMeta;
