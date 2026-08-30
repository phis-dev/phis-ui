"use client";

import { usePhiConfig } from "../../../../../components/root/phi-config-provider";
import type { PhiSignalAddress } from "../../../../../types/signals";
import type { PhiSelectBoxWidgetConfig } from "./config";
import { PhiSelectControl } from "../../../../../components/controls/phi-select-control";
import { usePhiChoiceController } from "../../../../../components/widgets/client/shared/phi-choice-controller";
import type { PhiWidgetControlMode } from "../../../../../types/widget-ui";

export function PhiSelectBoxWidget({
  config,
  sender,
  signalsEnabled = true,
  value,
  disabled,
  readOnly,
  mode = "preview",
  onChange,
}: {
  config?: PhiSelectBoxWidgetConfig | null;
  blockId?: string | number | null;
  sender?: PhiSignalAddress | null;
  signalsEnabled?: boolean;
  value?: string;
  disabled?: boolean;
  readOnly?: boolean;
  mode?: PhiWidgetControlMode;
  onChange?: (value: string) => void;
}) {
  const { token } = usePhiConfig();
  const minWidth = token.controlHeight * 4;
  const resolvedConfig: PhiSelectBoxWidgetConfig = {
    ...(config ?? { options: [] }),
    ...(value === undefined ? null : { value }),
    ...(disabled === undefined ? null : { disabled }),
    ...(readOnly === undefined ? null : { readOnly }),
  };
  const choice = usePhiChoiceController({
    config: resolvedConfig,
    signalsEnabled,
    typeKey: "select-box",
    defaultKey: "select",
    sender,
  });
  const fill = mode === "control" || mode === "config";
  const controlStyle = {
    minWidth: fill ? 0 : minWidth,
    width: fill ? "100%" : undefined,
  };
  const handleChange = (nextValue: string) => {
    choice.publish(nextValue);
    onChange?.(nextValue);
  };
  const control = (
    <PhiSelectControl
      label={resolvedConfig.label}
      description={resolvedConfig.description}
      value={choice.value}
      placeholder={resolvedConfig.placeholder}
      disabled={choice.disabled}
      readOnly={choice.readOnly}
      size={resolvedConfig.controlSize}
      presentation={resolvedConfig.presentation}
      allowCustom={resolvedConfig.allowCustom}
      options={choice.options}
      onFocus={choice.emitFocus}
      onBlur={choice.emitBlur}
      onChange={handleChange}
      style={controlStyle}
    />
  );

  return control;
}
