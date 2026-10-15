"use client";

import type { ReactNode } from "react";

import type { PhiSegmentedWidgetConfig } from "./config";
import { usePhiStackChoiceController } from "../../../../../components/widgets/client/shared/phi-choice-controller";
import type { PhiWidgetControlMode } from "../../../../../types/widget-ui";
import { PhiSegmentedControl } from "../../../../../components/controls/phi-segmented-control";
import { PhiEmptyControl } from "../../../../../components/controls/phi-empty-control";

export function PhiSegmentedWidget({
  config,
  signalsEnabled = true,
  mode = "preview",
  onChange,
  emptyHint,
}: {
  config?: PhiSegmentedWidgetConfig | null;
  blockId?: string | number | null;
  signalsEnabled?: boolean;
  mode?: PhiWidgetControlMode;
  onChange?: (value: string) => void;
  /** Drawn while there are no options -- in the Builder, a Stack mode with no Stack followed yet. */
  emptyHint?: ReactNode;
}) {
  const choice = usePhiStackChoiceController({
    config,
    signalsEnabled,
    typeKey: "segmented",
    defaultKey: "segmented",
  });
  const fill = mode === "control" || mode === "config";
  if (choice.options.length === 0 && emptyHint) {
    return <PhiEmptyControl description={emptyHint} />;
  }

  return (
    <PhiSegmentedControl
      block={fill}
      label={config?.label}
      value={choice.value || undefined}
      disabled={choice.disabled}
      readOnly={choice.readOnly}
      size={config?.controlSize}
      options={choice.options}
      onChange={(resolvedValue) => {
          onChange?.(resolvedValue);
          choice.publish(resolvedValue);
      }}
      onFocus={choice.emitFocus}
      onBlur={choice.emitBlur}
    />
  );
}
