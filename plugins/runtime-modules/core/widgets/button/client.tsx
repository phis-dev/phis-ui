"use client";

import type { PhiButtonWidgetConfig } from "./config";
import type { PhiCommonControlLabels } from "../../../../../components/widgets/label-types/common-controls";
import { usePhiControlSignalController } from "../../../../../components/widgets/client/shared/phi-control-signals";
import { usePhiControlBadgeController } from "../../../../../components/widgets/client/shared/phi-control-badge";
import { resolvePhiButtonIcon } from "../../../../../components/widgets/client/shared/phi-button-icons";
import { resolvePhiCommonControlAction } from "../../../../../components/widgets/client/shared/phi-common-controls";
import { PhiButtonControl } from "../../../../../components/controls/phi-button-control";

export function PhiButtonWidget({
  config,
  labels,
  disabled,
  signalsEnabled = true,
  onClick,
}: {
  config?: PhiButtonWidgetConfig | null;
  blockId?: string | number | null;
  labels?: PhiCommonControlLabels | null;
  disabled?: boolean;
  signalsEnabled?: boolean;
  onClick?: () => void;
}) {
  const signalValue = config?.value ?? config?.key ?? "click";
  const action = resolvePhiCommonControlAction(labels, config?.actionKey ?? config?.value);
  const icon = resolvePhiButtonIcon(config?.icon ?? action?.icon);
  const controlSignals = usePhiControlSignalController<string>({
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
  const resolvedDisabled = disabled || controlSignals.disabled;

  function publish() {
    if (controlSignals.readOnly) {
      return;
    }

    onClick?.();
    if (!signalsEnabled) {
      return;
    }

    controlSignals.emitCapability(config?.signalRoutes?.emits?.[0]?.capabilityId ?? "activate", signalValue);
  }

  const label = config?.label ?? action?.label ?? controlSignals.key;
  const tooltip = config?.tooltip ?? action?.tooltip;
  return (
    <PhiButtonControl
      label={label}
      tooltip={tooltip}
      type={config?.buttonType ?? action?.buttonType ?? "default"}
      danger={config?.danger === true || action?.danger === true}
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
