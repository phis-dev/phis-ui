"use client";

import type { PhiCommandToolbarWidgetConfig } from "./config";
import type { PhiCommonControlLabels } from "../../../../../components/widgets/label-types/common-controls";
import { usePhiCommandButtons } from "../../../../../components/widgets/client/shared/phi-command-buttons";
import type { PhiCmsInstanceId } from "../../../../../types/cms-instance-id";
import { PhiToolbarControl } from "../../../../../components/controls/phi-toolbar-control";

/* One empty list, so a toolbar without config does not hand the buttons a new identity every render. */
const NO_BUTTONS: PhiCommandToolbarWidgetConfig["buttons"] = [];

export function PhiCommandToolbarWidget({
  config,
  blockId,
  labels,
  disabled,
  signalsEnabled = true,
}: {
  config?: PhiCommandToolbarWidgetConfig | null;
  blockId?: PhiCmsInstanceId | null;
  labels?: PhiCommonControlLabels | null;
  disabled?: boolean;
  signalsEnabled?: boolean;
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
    <PhiToolbarControl
      items={commands.items}
      compact={config?.compact !== false}
      wrap={config?.wrap === true}
      showLabels={config?.showLabels === true}
      disabled={commands.disabled}
      size={config?.controlSize}
      onActivate={commands.activate}
    />
  );
}
