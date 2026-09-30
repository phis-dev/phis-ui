import { resolvePhiCmsWidgetPluginKey } from "../../../../../constants/cms-widget-types";
import {
  PHI_BUTTON_VARIANT_FIELD_OPTIONS,
  readPhiButtonVariant,
  type PhiButtonVariant,
} from "../../../../../components/widgets/config/button-variant";
import { PHI_SIGNAL_VALUE_SCHEMAS } from "../../../../../types/signals";
import type { PhiCmsWidgetPlugin } from "../../../../../types";
import {
  PHI_COMMON_CONTROL_DEFAULT_LABELS,
  readPhiCommonControlActionKey,
  type PhiCommonControlActionKey,
} from "../../../../../components/widgets/label-types/common-controls";
import { readPhiLinkTarget, type PhiLinkTarget } from "../../../../../types/references";
import { PHI_BUTTON_CONTROL_SIGNALS } from "../../../../../components/widgets/signals/control-signal-capabilities";
import {
  readBoolean,
  readRenderableBlockConfig,
  readString,
  type PhiCmsWidgetConfigBase,
} from "../../../../../components/widgets/config/parser-primitives";
import {
  PHI_CONTROL_BADGE_FIELDS,
  PHI_CONTROL_PRESENTATION_FIELDS,
  PHI_CONTROL_STATE_FIELDS,
  parsePhiControlBadgeConfig,
  parsePhiControlConfig,
  type PhiControlBadgeConfig,
  type PhiControlConfig,
} from "../../../../../components/widgets/config/control-signal-config";

export type PhiButtonWidgetConfig = PhiCmsWidgetConfigBase & PhiControlBadgeConfig & PhiControlConfig & {
  actionKey?: PhiCommonControlActionKey;
  label?: string;
  tooltip?: string;
  icon?: string;
  value?: string;
  variant?: PhiButtonVariant;
  /**
   * Where it leads, for a Button that is a way somewhere rather than a command.
   *
   * The Control already renders a real anchor for this -- it works before hydration and on a page that
   * mounts no Controller. A Button with a target emits nothing and needs no route: "Create account"
   * beside a sign-in form is a link, and making it a signal would only add a wire that can break.
   *
   * A structured target rather than an href, so an internal Page is named by identity and survives its
   * path moving. `REFERENCES.md` requires that of every Control that selects a Page; this Widget offered
   * a text box instead, which meant it offered no way to select one at all, and the paths authors typed
   * went stale the moment the Page moved.
   */
  linkTarget?: PhiLinkTarget;
  danger?: boolean;
};

export function parsePhiButtonWidgetConfig(config: Record<string, unknown>): PhiButtonWidgetConfig {
  const controlState = parsePhiControlConfig(config, {
    key: "button",
  });

  return {
    ...readRenderableBlockConfig(config),
    ...controlState,
    ...parsePhiControlBadgeConfig(config),
    actionKey: readPhiCommonControlActionKey(readString(config.actionKey)) ?? undefined,
    label: readString(config.label),
    tooltip: readString(config.tooltip),
    icon: readString(config.icon),
    value: readString(config.value),
    variant: readPhiButtonVariant(config.variant),
    linkTarget: readPhiLinkTarget(config.linkTarget) ?? undefined,
    danger: readBoolean(config.danger),
  };
}

/*
 * The action keys as a list to pick from, read off the label set that defines them rather than typed a
 * second time here. It was a free-text field over a closed enum, so a typo silently became "no action":
 * the Button kept its own label and lost the icon, the tooltip, the type and the danger colour the key
 * would have brought, with nothing anywhere saying why.
 */
const PHI_BUTTON_ACTION_KEY_OPTIONS = (
  Object.keys(PHI_COMMON_CONTROL_DEFAULT_LABELS.actions) as PhiCommonControlActionKey[]
).map((value) => ({ value, label: PHI_COMMON_CONTROL_DEFAULT_LABELS.actions[value].label }));

export const PHI_BUTTON_WIDGET_DEFINITION = {
  kind: "widget",
  pluginKey: resolvePhiCmsWidgetPluginKey("button"),
  typeKey: "button",
  title: "Button",
  description: "Reusable command button that emits a configured runtime signal.",
  category: "form",
  iconFamily: "form",
  translatesOwnText: true,
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
    {
      key: "actionKey",
      type: "choice",
      label: "Action Key",
      emptyOption: { value: "", label: "None" },
      emptyValue: undefined,
      options: PHI_BUTTON_ACTION_KEY_OPTIONS,
    },
    { key: "linkTarget", type: "link-target", label: "Link target" },
    { key: "label", type: "string", label: "Label" },
    { key: "tooltip", type: "string", label: "Tooltip" },
    { key: "icon", type: "icon", label: "Icon", editorPlacement: "toolbar" },
    { key: "value", type: "string", label: "Signal Value" },
    {
      key: "variant",
      type: "choice",
      label: "Variant",
      options: [...PHI_BUTTON_VARIANT_FIELD_OPTIONS],
    },
    { key: "danger", type: "boolean", label: "Danger" },
    ...PHI_CONTROL_PRESENTATION_FIELDS,
    ...PHI_CONTROL_STATE_FIELDS,
    ...PHI_CONTROL_BADGE_FIELDS,
  ],
  defaultConfig: {
    key: "button",
    variant: "normal",
    badgeEnabled: false,
  },
  parseConfig: parsePhiButtonWidgetConfig,
} satisfies Pick<
  PhiCmsWidgetPlugin<PhiButtonWidgetConfig>,
  | "translatesOwnText"
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
