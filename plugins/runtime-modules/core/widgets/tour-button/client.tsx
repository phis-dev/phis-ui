"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { PhiSignal } from "../../../../../types";
import type { PhiTourWidgetLabels } from "../../../../../components/widgets/label-types/tour";
import { usePhiSignalDispatcher, usePhiSignalListener } from "../../../../../components/runtime/runtime-signal-bus";
import { PhiButtonControl } from "../../../../../components/controls/phi-button-control";
import { PhiIcon } from "../../../../../components/shell/phi-icon";
import { PHI_TOUR_CONTROLLER_ADDRESS } from "../../../../../types/tours";
import type { PhiTourButtonWidgetConfig } from "./config";

function readAvailable(value: unknown) {
  return typeof value === "object" && value !== null && (value as { available?: unknown }).available === true;
}

/**
 * Asks the Tour Controller whether the shown Page has a Tour, shows itself only if so, and asks for it.
 *
 * The availability is pushed on every Page change and answered on request, so a button in a Shell that
 * outlives the Page follows it, and one that mounts after the answer went out asks once and is told.
 */
export function PhiTourButtonWidget({
  config,
  labels,
  signalsEnabled = true,
}: {
  config?: PhiTourButtonWidgetConfig | null;
  labels: PhiTourWidgetLabels;
  signalsEnabled?: boolean;
}) {
  const dispatchSignal = usePhiSignalDispatcher();
  const controller = PHI_TOUR_CONTROLLER_ADDRESS;
  // Drawn in the Builder without a Controller to ask, so an author sees what they placed.
  const [available, setAvailable] = useState(!signalsEnabled);

  useEffect(() => {
    if (!signalsEnabled) return;
    dispatchSignal({ scope: "area", channel: "tour", action: "reload", valueType: "none", value: null, receiver: controller });
  }, [controller, dispatchSignal, signalsEnabled]);

  usePhiSignalListener(useCallback((signal: PhiSignal) => {
    if (signal.sender === controller) setAvailable(readAvailable(signal.value));
  }, [controller]), useMemo(() => (signalsEnabled
    ? { scopes: ["area"], channels: ["tour"], receiver: "broadcast" } as const
    : null), [signalsEnabled]));

  if (!available) return null;

  return (
    <PhiButtonControl
      size={config?.controlSize}
      icon={<PhiIcon name="question-circle" size="inherit" />}
      label={labels.button}
      tooltip={labels.start}
      ariaLabel={labels.start}
      readOnly={!signalsEnabled}
      onClick={() => dispatchSignal({ scope: "area", channel: "tour", action: "open", valueType: "none", value: null, receiver: controller })}
    />
  );
}
