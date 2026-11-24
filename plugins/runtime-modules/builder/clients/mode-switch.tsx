"use client";

import { PhiSegmentedControl } from "../../../../components/controls/phi-segmented-control";

import { usePhiDeveloperBuilderStateValue } from "../developer-workspace-store";
import {
  PHI_BUILDER_CHROME_WIDGET_DEFAULT_LABELS,
  type PhiBuilderChromeWidgetLabels,
} from "../../../../components/widgets/label-types/builder-chrome";
import { usePhiControlSignalController } from "../../../../components/widgets/client/shared/phi-control-signals";
import { usePhiConfig } from "../../../../components/root/phi-config-provider";
import { PhiFlexControl } from "../../../../components/controls/phi-flex-control";
import type { PhiSignalRouteSet } from "../../../../types/signals";

export function PhiBuilderModeSwitchWidgetClient({
  disabled = false,
  labels = PHI_BUILDER_CHROME_WIDGET_DEFAULT_LABELS,
  signalRoutes = null,
}: {
  disabled?: boolean;
  labels?: PhiBuilderChromeWidgetLabels;
  /** The routes its tree writes for `change`: to the Builder Controller, which enters the mode. */
  signalRoutes?: PhiSignalRouteSet | null;
}) {
  const { token } = usePhiConfig();
  const builderMode = usePhiDeveloperBuilderStateValue((state) => state.builderMode);
  const isDisabled = disabled;
  const controlSignals = usePhiControlSignalController<string>({
    key: "builderMode",
    signalRoutes,
    typeKey: "segmented",
    initialDisabled: isDisabled,
    clearValue: builderMode,
    coerceValue: (nextValue) => (nextValue === "editor" || nextValue === "preview" ? nextValue : null),
  });

  return (
    <PhiFlexControl align="center" gap={token.paddingXS} style={{ minWidth: 0 }}>
      <PhiSegmentedControl
        value={builderMode}
        disabled={controlSignals.disabled}
        options={[
          { value: "editor", label: labels.modeSwitch.editor },
          { value: "preview", label: labels.modeSwitch.preview },
        ]}
        onChange={(nextValue) => {
          controlSignals.emitChange(String(nextValue));
        }}
        onFocus={controlSignals.emitFocus}
        onBlur={controlSignals.emitBlur}
      />
    </PhiFlexControl>
  );
}
