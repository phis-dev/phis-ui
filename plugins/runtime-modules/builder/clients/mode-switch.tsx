"use client";

import { Flex, Segmented } from "antd";

import {
  createDefaultBuilderChromeControls,
  usePhiDeveloperBuilderStateValue,
} from "../developer-workspace-store";
import {
  PHI_BUILDER_CHROME_WIDGET_DEFAULT_LABELS,
  type PhiBuilderChromeWidgetLabels,
} from "../../../../components/widgets/label-types/builder-chrome";
import { usePhiControlSignalController } from "../../../../components/widgets/client/shared/phi-control-signals";
import { usePhiConfig } from "../../../../components/root/phi-config-provider";
import { createPhiBuilderControllerAddress } from "../controller/address";

export function PhiBuilderModeSwitchWidgetClient({
  disabled = false,
  labels = PHI_BUILDER_CHROME_WIDGET_DEFAULT_LABELS,
}: {
  disabled?: boolean;
  labels?: PhiBuilderChromeWidgetLabels;
}) {
  const { token } = usePhiConfig();
  const builderMode = usePhiDeveloperBuilderStateValue("public", (state) => state.builderMode);
  const builderChromeControls = usePhiDeveloperBuilderStateValue(
    "public",
    (state) => state.builderChromeControls,
  ) ?? createDefaultBuilderChromeControls();
  const isDisabled = disabled || builderChromeControls.editorPreviewDisabled;
  const controlSignals = usePhiControlSignalController<string>({
    key: "builderMode",
    sender: createPhiBuilderControllerAddress(),
    signalRoutes: {
      emits: [
        {
          routeKey: "builder-mode-change",
          capabilityId: "change",
          scope: "area",
          channel: "builderMode",
          action: "change",
          valueType: "string",
          receiver: "broadcast",
        },
      ],
    },
    typeKey: "segmented",
    initialDisabled: isDisabled,
    clearValue: builderMode,
    coerceValue: (nextValue) => (nextValue === "editor" || nextValue === "preview" ? nextValue : null),
  });

  return (
    <Flex align="center" gap={token.paddingXS} style={{ minWidth: 0 }}>
      <Segmented
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
    </Flex>
  );
}
