"use client";

import type { PhiButtonWidgetConfig } from "./config";
import { resolvePhiButtonVariantType } from "../../../../../components/widgets/config/button-variant";
import type { PhiCommonControlLabels } from "../../../../../components/widgets/label-types/common-controls";
import { usePhiControlSignalController } from "../../../../../components/widgets/client/shared/phi-control-signals";
import { usePhiControlBadgeController } from "../../../../../components/widgets/client/shared/phi-control-badge";
import { resolvePhiButtonIcon } from "../../../../../components/widgets/client/shared/phi-button-icons";
import { resolvePhiCommonControlAction } from "../../../../../components/widgets/client/shared/phi-common-controls";
import { PhiButtonControl } from "../../../../../components/controls/phi-button-control";
import { findPhiSignalRoutesByCapabilityId } from "../../../../../types/signals";

export type PhiButtonWidgetLink = {
  href: string;
  newTab: boolean;
  external: boolean;
};

export function PhiButtonWidget({
  config,
  labels,
  link,
  disabled,
  signalsEnabled = true,
  onClick,
}: {
  config?: PhiButtonWidgetConfig | null;
  blockId?: string | number | null;
  labels?: PhiCommonControlLabels | null;
  /**
   * Where the target leads, resolved before this ever ran.
   *
   * A Page reference means nothing in a browser: only the server knows which address it answers on now,
   * and only it resolved every target on the page in one go. Absent means either no target or one that
   * did not resolve, and both draw the same thing -- a Button that is not a link.
   */
  link?: PhiButtonWidgetLink | null;
  disabled?: boolean;
  signalsEnabled?: boolean;
  onClick?: () => void;
}) {
  const signalValue = config?.value ?? config?.key ?? "click";
  /* An action answers for the words and the look; the icon stays the Button's to swap. */
  const action = resolvePhiCommonControlAction(labels, config?.action);
  const icon = resolvePhiButtonIcon(config?.icon ?? action?.icon);
  const controlSignals = usePhiControlSignalController<string>({
    /* Not the parser's default repeated: `config` itself is optional here, and this is that case. */
    key: config?.key ?? "button",
    signalRoutes: config?.signalRoutes,
    typeKey: "button",
    signalsEnabled,
    initialDisabled: config?.disabled === true,
    initialReadOnly: config?.readOnly === true,
    clearValue: "",
    coerceValue: (nextValue) => (typeof nextValue === "string" ? nextValue : nextValue == null ? "" : String(nextValue)),
  });
  const badge = usePhiControlBadgeController({
    config,
    signalRoutes: config?.signalRoutes,
    signalsEnabled,
  });
  /*
   * Read-only shows. `publish` already refused to emit for it, so the Button sat there looking alive and
   * doing nothing when clicked, with no way to tell it from one that simply had nothing wired. A Button
   * is not a value somebody reads without editing it -- there is nothing for read-only to mean here that
   * disabled does not already say, and saying it visibly is the whole difference.
   */
  const resolvedDisabled = disabled || controlSignals.disabled || controlSignals.readOnly;

  function publish() {
    if (controlSignals.readOnly) {
      return;
    }

    onClick?.();
    if (!signalsEnabled) {
      return;
    }

    /*
     * A wired `navigate` carries the target; the ordinary capability carries whatever this Button is for.
     * Both can be wired at once -- a Button that records something and then moves on.
     */
    if (link && findPhiSignalRoutesByCapabilityId(config?.signalRoutes?.emits, "navigate").length > 0) {
      controlSignals.emitCapability("navigate", { path: link.href });
    }

    controlSignals.emitCapability(config?.signalRoutes?.emits?.[0]?.capabilityId ?? "activate", signalValue);
  }

  const label = action ? action.label : config?.label ?? controlSignals.key;
  /* The author's or none: an empty tooltip shows nothing, whatever action the Button is. */
  const tooltip = config?.tooltip;
  return (
    <PhiButtonControl
      label={label}
      /* An icon-only Button still needs a name for whoever cannot see the icon. */
      {...(label ? {} : { ariaLabel: tooltip ?? action?.label })}
      {...(link && !config?.signalRoutes?.emits?.length
        ? { href: link.href, newTab: link.newTab, external: link.external }
        : {})}
      tooltip={tooltip}
      type={resolvePhiButtonVariantType(action ? action.variant : config?.variant)}
      danger={action ? action.danger === true : config?.danger === true}
      disabled={resolvedDisabled}
      size={config?.controlSize}
      icon={icon}
      onClick={publish}
      badge={{
        enabled: badge.enabled,
        value: badge.visible ? badge.value : 0,
        color: badge.color,
        overflowCount: badge.overflowCount,
        showZero: badge.showZero,
      }}
    />
  );
}
