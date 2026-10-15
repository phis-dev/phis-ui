"use client";

import type { PhiFloatButtonWidgetConfig } from "./config";
import type { PhiCssLength } from "../../../../../types/length";
import type { PhiCmsInstanceId } from "../../../../../types/cms-instance-id";
import type { PhiCommonControlLabels } from "../../../../../components/widgets/label-types/common-controls";
import { usePhiCommandButtons } from "../../../../../components/widgets/client/shared/phi-command-buttons";
import { PhiFloatButtonControl } from "../../../../../components/controls/phi-float-button-control";

/* One empty list, so a Float Button without config does not hand the buttons a new identity every render. */
const NO_BUTTONS: PhiFloatButtonWidgetConfig["buttons"] = [];

function toCssLength(value: PhiCssLength | undefined) {
  return typeof value === "number" ? `${value}px` : value;
}

export function PhiFloatButtonWidget({
  config,
  blockId,
  labels,
  disabled,
  signalsEnabled = true,
  inPlace = false,
}: {
  config?: PhiFloatButtonWidgetConfig | null;
  blockId?: PhiCmsInstanceId | null;
  labels?: PhiCommonControlLabels | null;
  disabled?: boolean;
  signalsEnabled?: boolean;
  /** Drawn in its slot rather than fixed to the viewport: the Builder's canvas and the preview. */
  inPlace?: boolean;
}) {
  const commands = usePhiCommandButtons({
    buttons: config?.buttons ?? NO_BUTTONS,
    signalRoutes: config?.signalRoutes,
    blockId,
    labels,
    disabled,
    signalsEnabled,
  });

  return (
    <PhiFloatButtonControl
      items={commands.items}
      placement={config?.placement}
      offset={{ block: toCssLength(config?.offsetBlock), inline: toCssLength(config?.offsetInline) }}
      shape={config?.shape}
      group={{
        trigger: config?.groupTrigger,
        icon: config?.groupIcon,
        direction: config?.groupDirection,
      }}
      inPlace={inPlace}
      disabled={commands.disabled}
      onActivate={commands.activate}
    />
  );
}
