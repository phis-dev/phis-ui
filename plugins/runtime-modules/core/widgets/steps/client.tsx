"use client";

import type { PhiStepsWidgetConfig } from "./config";
import { usePhiStackChoiceController } from "../../../../../components/widgets/client/shared/phi-choice-controller";
import { PhiStepsControl } from "../../../../../components/controls/phi-steps-control";

export function PhiStepsWidget({
  config,
  signalsEnabled = true,
}: {
  config?: PhiStepsWidgetConfig | null;
  blockId?: string | number | null;
  signalsEnabled?: boolean;
}) {
  const choice = usePhiStackChoiceController({
    config,
    signalsEnabled,
    typeKey: "steps",
    defaultKey: "steps",
  });
  /* A value that names no step is the first step: a sequence always stands somewhere. */
  const current = Math.max(0, choice.options.findIndex((option) => option.value === choice.value));
  const navigable = config?.navigable === true && !choice.disabled && !choice.readOnly;

  return (
    <PhiStepsControl
      ariaLabel={config?.label}
      items={choice.options.map((option) => ({
        key: option.value,
        title: option.label,
        description: option.description,
        icon: option.icon,
        disabled: option.disabled,
      }))}
      current={current}
      orientation={config?.orientation}
      presentation={config?.stepMarker === "dot" ? "dot" : "default"}
      size={config?.controlSize}
      onChange={navigable
        ? (index) => {
            const option = choice.options[index];
            if (option) choice.publish(option.value);
          }
        : undefined}
    />
  );
}
