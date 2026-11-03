import { isPhiRecord } from "../../../helpers/is-record";
import type {
  PhiCommandButtonConfig,
  PhiCommandButtonEmitConfig,
} from "../../../types/core-widget-placements";
import type { PhiCmsConfigField, PhiCmsWidgetSignalSubcontrolCollection } from "../../../types";
import type { PhiCmsConfigFieldVisibilityRule } from "../../../types/cms-plugins";
import type { PhiSignalValue } from "../../../types/signals";
import {
  canPhiViewerAccessOwnedPolicy,
  readPhiViewerAccessPolicy,
  type PhiAccessViewer,
  type PhiRoleProviderId,
} from "../../../types/access";
import {
  PHI_COMMON_CONTROL_DEFAULT_LABELS,
  readPhiCommonControlActionKey,
} from "../label-types/common-controls";
import { PHI_BUTTON_VARIANT_FIELD_OPTIONS, readPhiButtonVariant } from "./button-variant";
import { createPhiCommonActionField, readPhiControlLabel } from "./common-action-field";
import { PHI_CONTROL_BADGE_FIELDS, parsePhiControlBadgeConfig } from "./control-signal-config";
import { createPhiConfigReader, type PhiConfigReader } from "./strict-config-reader";

/*
 * The buttons of a Widget that holds several: the Command Toolbar's row, and the Float Button's corner.
 *
 * Each button is a signal subcontrol of its Widget -- its key is its address, what it sends is its first
 * emit, and the Signals panel wires both. The two Widgets differ in how the buttons stand, never in what
 * a button is, so the parser, the Inspector fields, the viewer filter and the scaffold's count are one.
 */

/** What a button sends: a text, a number, true/false, a list of texts or of numbers, or an object. */
function readButtonEmitValue(value: unknown): PhiSignalValue | undefined {
  if (typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (Array.isArray(value)) {
    if (value.every((item) => typeof item === "string")) return value as string[];
    if (value.every((item) => typeof item === "number" && Number.isFinite(item))) return value as number[];
    return undefined;
  }
  return isPhiRecord(value) ? value as Record<string, unknown> : undefined;
}

function readCommandButtonEmitConfig(reader: PhiConfigReader): PhiCommandButtonEmitConfig {
  return {
    capabilityId: reader.string("capabilityId") ?? reader.fail("capabilityId", "a capability id"),
    value: reader.value("value", "a text, number, true/false, list or object", readButtonEmitValue),
  };
}

function readCommandButtonConfig(reader: PhiConfigReader): PhiCommandButtonConfig {
  const key = reader.string("key") ?? reader.fail("key", "a text");
  const emits = reader.list("emits", readCommandButtonEmitConfig) ?? [];
  if (emits.length === 0) reader.fail("emits", "at least one emit");
  const accessPolicy = Object.prototype.hasOwnProperty.call(reader.record, "accessPolicy")
    ? readPhiViewerAccessPolicy(reader.record.accessPolicy) ?? reader.fail("accessPolicy", "an access policy")
    : null;

  return {
    key,
    emits,
    ...(accessPolicy ? { accessPolicy } : {}),
    ...parsePhiControlBadgeConfig(reader.record, reader.path),
    action: reader.value("action", "a common action", (value) =>
      typeof value === "string" ? readPhiCommonControlActionKey(value) ?? undefined : undefined),
    label: readPhiControlLabel(reader.record.label),
    tooltip: reader.string("tooltip"),
    icon: reader.string("icon"),
    display: reader.oneOf("display", ["icon", "label", "icon-label"] as const),
    danger: reader.boolean("danger"),
    disabled: reader.boolean("disabled"),
    readOnly: reader.boolean("readOnly"),
    variant: reader.value("variant", "a button variant", readPhiButtonVariant),
  };
}

/**
 * A Widget's buttons. Strict (`strict-config-reader.ts`): a button without a key or without an emit is
 * an error naming it, not a button left out.
 */
export function readPhiCommandButtons(value: unknown, path = "buttons"): PhiCommandButtonConfig[] {
  if (value === undefined || value === null) return [];
  return createPhiConfigReader({ [path]: value }).list(path, readCommandButtonConfig) ?? [];
}

export function filterPhiCommandButtonsForViewer(
  buttons: readonly PhiCommandButtonConfig[],
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

/**
 * What a new button shows. It has an icon so that Show Labels has something to switch between: a button
 * without one keeps its label whatever the toolbar says, or it would be an empty box.
 */
const PHI_COMMAND_BUTTON_DEFAULT_ICON = "antd:star-outlined";

/**
 * A new button: the first free `buttonN` key, labelled after it, sending its key as the command. The
 * number counts on from the list's length, so a button added to three is `button4` unless that is taken.
 */
export function createPhiCommandButton(
  buttons: readonly PhiCommandButtonConfig[],
): PhiCommandButtonConfig {
  const keys = new Set(buttons.map((button) => button.key));
  let index = buttons.length + 1;
  while (keys.has(`button${index}`)) {
    index += 1;
  }
  const key = `button${index}`;

  return {
    key,
    label: `Button ${index}`,
    icon: PHI_COMMAND_BUTTON_DEFAULT_ICON,
    emits: [{ capabilityId: "command", value: key }],
  };
}

/** The fewest and most buttons a Widget's scaffold offers. */
export type PhiCommandButtonBounds = {
  min: number;
  max: number;
};

/**
 * The buttons at a new count: kept buttons stay as they are, new ones are created after them, a smaller
 * count drops the last. Held to the Widget's bounds -- a Widget without buttons draws nothing, and an
 * author has nothing to select it by.
 */
export function resizePhiCommandButtons(
  buttons: readonly PhiCommandButtonConfig[],
  count: number,
  bounds: PhiCommandButtonBounds,
): PhiCommandButtonConfig[] {
  const nextCount = Math.max(bounds.min, Math.min(bounds.max, Math.trunc(count)));
  const next = buttons.slice(0, nextCount);
  while (next.length < nextCount) {
    next.push(createPhiCommandButton(next));
  }
  return next;
}

export type PhiCommandButtonsFieldOptions = {
  /** Fields a Widget's buttons have no use for: a Float Button knows no danger. */
  omit?: readonly "danger"[];
  /** When a button's label is offered: a round Float Button has no room for one. */
  labelVisibleWhen?: PhiCmsConfigFieldVisibilityRule;
  /** Fields of the Widget's own, after the icon. */
  extraItemFields?: readonly PhiCmsConfigField[];
};

/**
 * The buttons, one at a time, picked by a select.
 *
 * How many there are is set on the scaffold. The key and what a button sends stay as they were made: the
 * key is its signal address, and the value is wired from the Signals panel.
 */
export function buildPhiCommandButtonsField({
  omit = [],
  labelVisibleWhen,
  extraItemFields = [],
}: PhiCommandButtonsFieldOptions = {}): PhiCmsConfigField {
  const omitted = new Set(omit);
  return {
    key: "buttons",
    type: "collection",
    presentation: "select",
    label: "Button",
    itemKeyField: "key",
    itemLabelField: "label",
    reorderable: false,
    itemFields: [
      /*
       * What it sends is its first emit; the Signals panel wires it and may change it after. The divider
       * sets the picked button's own fields apart from the select that picks it.
       */
      createPhiCommonActionField({ signalValuePath: "emits.0.value", heading: "Appearance" }),
      {
        key: "variant",
        type: "choice",
        label: "Variant",
        options: [...PHI_BUTTON_VARIANT_FIELD_OPTIONS],
      },
      {
        key: "label",
        type: "string",
        label: "Label",
        emptyValue: "",
        ...(labelVisibleWhen ? { visibleWhen: labelVisibleWhen } : {}),
      },
      { key: "tooltip", type: "string", label: "Tooltip" },
      { key: "icon", type: "icon", label: "Icon" },
      ...extraItemFields,
      ...(omitted.has("danger") ? [] : [{ key: "danger", type: "boolean", label: "Danger" } satisfies PhiCmsConfigField]),
      { key: "readOnly", type: "boolean", label: "Read only" },
      { key: "disabled", type: "boolean", label: "Disabled" },
      ...PHI_CONTROL_BADGE_FIELDS,
    ],
  };
}

/** Each button answers at its own address, named in the Signals panel after its label or its action. */
export const PHI_COMMAND_BUTTONS_SIGNAL_SUBCONTROLS = [
  {
    configKey: "buttons",
    keyField: "key",
    labelFields: ["label", "action"],
    labelFieldValues: {
      action: Object.fromEntries(Object.entries(PHI_COMMON_CONTROL_DEFAULT_LABELS.actions)
        .map(([key, action]) => [key, action.label])),
    },
  },
] satisfies readonly PhiCmsWidgetSignalSubcontrolCollection[];
