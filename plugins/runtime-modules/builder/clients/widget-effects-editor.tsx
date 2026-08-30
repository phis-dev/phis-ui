"use client";

import type { CSSProperties } from "react";
import { NodeIndexOutlined } from "@ant-design/icons";

import type { PhiRenderableBlockEffects } from "../../../../types/renderable-block";
import type { PhiEffectsWidgetLabels } from "../../../../components/widgets/label-types/effects";
import { PHI_EFFECTS_WIDGET_DEFAULT_LABELS } from "../../../../components/widgets/label-types/effects";
import { PhiButtonControl } from "../../../../components/controls/phi-button-control";
import { openPhiDeveloperBuilderEffectsEditor } from "../developer-workspace-store";

export function PhiWidgetEffectsToolButton({
  effects,
  disabled = false,
  labels: labelsProp,
  onChange,
}: {
  effects?: PhiRenderableBlockEffects | null;
  disabled?: boolean;
  labels?: PhiEffectsWidgetLabels | null;
  onChange?: (nextEffects: PhiRenderableBlockEffects) => void;
}) {
  const labels = labelsProp ?? PHI_EFFECTS_WIDGET_DEFAULT_LABELS;

  const open = () => {
    if (disabled || !onChange) return;
    openPhiDeveloperBuilderEffectsEditor("public", effects ?? {}, onChange);
  };

  return (
    <div
      className="phi-layout-affordance phi-layout-affordance--effects"
      onMouseDown={(event) => { event.preventDefault(); event.stopPropagation(); }}
      onClick={(event) => event.stopPropagation()}
      style={{ "--phi-layout-affordance-size": "var(--ant-control-height-sm)" } as CSSProperties & Record<`--${string}`, string>}
    >
      <PhiButtonControl
        ariaLabel={labels.openEditor}
        tooltip={labels.openEditor}
        icon={<NodeIndexOutlined />}
        type="text"
        size="small"
        disabled={disabled || !onChange}
        onClick={open}
      />
    </div>
  );
}
