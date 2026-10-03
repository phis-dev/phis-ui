"use client";

import type { CSSProperties } from "react";

import type { PhiRenderableBlockEffects } from "../../../../types/renderable-block";
import type { PhiEffectsWidgetLabels } from "../../../../components/widgets/label-types/effects";
import { PHI_EFFECTS_WIDGET_DEFAULT_LABELS } from "../../../../components/widgets/label-types/effects";
import { PhiButtonControl } from "../../../../components/controls/phi-button-control";
import { openPhiDeveloperBuilderEffectsEditor } from "../developer-workspace-store";
import type { PhiDeveloperBuilderEffectsRequest } from "../developer-workspace-types";
import { PhiIcon } from "../../../../components/shell/phi-icon";

export function PhiWidgetEffectsToolButton({
  effects,
  target,
  disabled = false,
  labels: labelsProp,
  onChange,
}: {
  effects?: PhiRenderableBlockEffects | null;
  /** Which node these effects belong to, so the canvas can draw them while the editor is open. */
  target: PhiDeveloperBuilderEffectsRequest["target"];
  disabled?: boolean;
  labels?: PhiEffectsWidgetLabels | null;
  onChange?: (nextEffects: PhiRenderableBlockEffects) => void;
}) {
  const labels = labelsProp ?? PHI_EFFECTS_WIDGET_DEFAULT_LABELS;

  const open = () => {
    if (disabled || !onChange) return;
    openPhiDeveloperBuilderEffectsEditor("public", effects ?? {}, target, onChange);
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
        icon={<PhiIcon name="node-index" size="inherit" />}
        type="text"
        size="small"
        disabled={disabled || !onChange}
        onClick={open}
      />
    </div>
  );
}
