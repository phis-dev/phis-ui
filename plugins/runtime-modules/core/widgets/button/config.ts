import { resolvePhiCmsWidgetPluginKey } from "../../../../../constants/cms-widget-types";
import {
  PHI_BUTTON_VARIANT_FIELD_OPTIONS,
  readPhiButtonVariant,
  type PhiButtonVariant,
} from "../../../../../components/widgets/config/button-variant";
import { PHI_SIGNAL_VALUE_SCHEMAS } from "../../../../../types/signals";
import type { PhiCmsWidgetPlugin } from "../../../../../types";
import {
  createPhiCommonActionField,
  readPhiControlLabel,
} from "../../../../../components/widgets/config/common-action-field";
import {
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
  /**
   * A common action the Button is: its label, variant and colour come from the common control label
   * set, translated there, and the Button's own fields for them are not read. The icon is the Button's
   * where it states one and the action's otherwise; the tooltip is always the Button's own. Absent is "Custom" -- the Button is what its own fields say.
   */
  action?: PhiCommonControlActionKey;
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
    action: readPhiCommonControlActionKey(readString(config.action)) ?? undefined,
    label: readPhiControlLabel(config.label),
    tooltip: readString(config.tooltip),
    icon: readString(config.icon),
    value: readString(config.value),
    variant: readPhiButtonVariant(config.variant),
    linkTarget: readPhiLinkTarget(config.linkTarget) ?? undefined,
    danger: readBoolean(config.danger),
  };
}

const PHI_BUTTON_DEFAULT_CONFIG = {
  key: "button",
  variant: "normal",
  badgeEnabled: false,
  /* 999 still drawn as a number, 1000 as "999+"; Ant Design's own 99 cut a busy inbox short. */
  badgeOverflowCount: 999,
} satisfies Partial<PhiButtonWidgetConfig>;

export const PHI_BUTTON_WIDGET_DEFINITION = {
  kind: "widget",
  pluginKey: resolvePhiCmsWidgetPluginKey("button"),
  typeKey: "button",
  title: "Button",
  description: "Reusable command button that emits a configured runtime signal.",
  category: "form",
  icon: "antd:edit-outlined",
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
    createPhiCommonActionField({ signalValuePath: "value", heading: "Appearance" }),
    {
      key: "variant",
      type: "choice",
      label: "Variant",
      options: [...PHI_BUTTON_VARIANT_FIELD_OPTIONS],
    },
    { key: "label", type: "string", label: "Label", emptyValue: "" },
    { key: "tooltip", type: "string", label: "Tooltip" },
    { key: "icon", type: "icon", label: "Icon", editorPlacement: "toolbar" },
    { key: "value", type: "string", label: "Signal Value" },
    /* Above Danger, so Danger stands with the state switches below it. */
    ...PHI_CONTROL_PRESENTATION_FIELDS,
    { key: "danger", type: "boolean", label: "Danger" },
    ...PHI_CONTROL_STATE_FIELDS,
    /*
     * Gone while a signal is wired: the Control draws an anchor only for a Button that emits nothing, so
     * a target beside a route would be a setting with no effect.
     */
    {
      key: "linkTarget",
      type: "link-target",
      heading: "Link target",
      label: "Link target",
      visibleWhen: { field: "signalRoutes.emits", equals: null },
    },
    ...PHI_CONTROL_BADGE_FIELDS,
  ],
  defaultConfig: PHI_BUTTON_DEFAULT_CONFIG,
  /*
   * The label is written in rather than defaulted. A default would sit under every Button that states
   * none -- the preset ones that take their words from an action key included -- and would come back
   * the moment an author cleared it for an icon-only Button.
   */
  creationConfig: {
    ...PHI_BUTTON_DEFAULT_CONFIG,
    label: "Button",
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
  | "icon"
  | "iconFamily"
  | "slotSizePolicy"
  | "runtimeSignals"
  | "fields"
  | "defaultConfig"
  | "creationConfig"
  | "parseConfig"
>;
