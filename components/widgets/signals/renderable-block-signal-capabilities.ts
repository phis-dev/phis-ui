import type { PhiSignalInputCapability } from "../../../types/signals";
import { PHI_SIGNAL_VALUE_SCHEMAS } from "../../../types/signals";

export const PHI_RENDERABLE_BLOCK_RECEIVE_BINDINGS = [
  {
    id: "visibility",
    channel: "visibility",
    action: "change",
    valueType: "enum",
    enumValues: ["visible", "collapsed", "hidden"],
  },
  {
    id: "visibilityToggle",
    channel: "visibility",
    action: "toggle",
    valueType: "none",
  },
  {
    id: "enabled",
    channel: "enabled",
    action: "change",
    valueType: "boolean",
  },
  {
    id: "background",
    channel: "background",
    action: "change",
    valueType: "json",
    valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.backgroundConfig,
  },
  {
    id: "border",
    channel: "border",
    action: "change",
    valueType: "json",
    valueSchema: PHI_SIGNAL_VALUE_SCHEMAS.borderConfig,
  },
  {
    id: "size",
    channel: "size",
    action: "change",
    valueType: "size",
  },
  {
    id: "minSize",
    channel: "minSize",
    action: "change",
    valueType: "size",
  },
  {
    id: "maxSize",
    channel: "maxSize",
    action: "change",
    valueType: "size",
  },
  {
    id: "shadow",
    channel: "shadow",
    action: "change",
    valueType: "string",
  },
  {
    id: "zIndex",
    channel: "zIndex",
    action: "change",
    valueType: "number",
  },
  {
    id: "opacity",
    channel: "opacity",
    action: "change",
    valueType: "number",
  },
  {
    id: "effectsStart",
    channel: "effects",
    action: "start",
    valueType: "none",
  },
  {
    id: "effectsStop",
    channel: "effects",
    action: "stop",
    valueType: "none",
  },
  {
    id: "effectsClear",
    channel: "effects",
    action: "clear",
    valueType: "none",
  },
] as const satisfies readonly PhiSignalInputCapability[];

export const PHI_RENDERABLE_BLOCK_RECEIVE_CHANNELS: ReadonlySet<string> = new Set(
  PHI_RENDERABLE_BLOCK_RECEIVE_BINDINGS.map((capability) => capability.channel),
);
