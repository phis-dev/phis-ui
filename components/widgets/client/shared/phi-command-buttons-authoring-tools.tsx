"use client";


import { PhiButtonControl } from "../../../controls/phi-button-control";
import { PhiPopoverControl } from "../../../controls/phi-popover-control";
import { usePhiConfig } from "../../../root/phi-config-provider";
import type { PhiCommandButtonConfig } from "../../../../types/core-widget-placements";
import { PHI_COMMON_CONTROL_DEFAULT_LABELS } from "../../label-types/common-controls";
import { usePhiWidgetScaffoldPopup } from "./phi-widget-scaffold-popup";
import { usePhiAuthoringToolsLabels } from "./phi-authoring-tools-labels";
import { PhiFlexControl } from "../../../controls/phi-flex-control";
import { PhiTypographyControl } from "../../../controls/phi-typography-control";
import { PhiCompactGroupControl } from "../../../controls/phi-compact-group-control";
import { PhiIcon } from "../../../shell/phi-icon";
import { PhiWidgetCountToolButton } from "./phi-widget-tool-buttons";
import { resizePhiCommandButtons, type PhiCommandButtonBounds } from "../../config/command-buttons";

function stopToolEvent(event: { stopPropagation: () => void }) {
  event.stopPropagation();
}

/* What a button is called here: its own label, else its action's, else its key. */
function readButtonName(button: PhiCommandButtonConfig) {
  return button.label || (button.action ? PHI_COMMON_CONTROL_DEFAULT_LABELS.actions[button.action].label : "") || button.key;
}

function moveButton(
  buttons: readonly PhiCommandButtonConfig[],
  index: number,
  direction: -1 | 1,
) {
  const targetIndex = index + direction;
  if (targetIndex < 0 || targetIndex >= buttons.length) {
    return buttons;
  }

  const nextButtons = [...buttons];
  [nextButtons[index], nextButtons[targetIndex]] = [nextButtons[targetIndex], nextButtons[index]];
  return nextButtons;
}

/**
 * The scaffold's tools for a Widget's command buttons: how many there are, and their order. The Command
 * Toolbar and the Float Button count them alike and differ only in how many they allow.
 */
export function PhiCommandButtonsAuthoringTools({
  buttons,
  bounds,
  onChange,
}: {
  buttons: readonly PhiCommandButtonConfig[];
  bounds: PhiCommandButtonBounds;
  onChange: (buttons: PhiCommandButtonConfig[]) => void;
}) {
  const labels = usePhiAuthoringToolsLabels();
  const { token } = usePhiConfig();
  const popup = usePhiWidgetScaffoldPopup();

  return (
    <PhiCompactGroupControl>
      <PhiWidgetCountToolButton
        count={buttons.length}
        min={bounds.min}
        max={bounds.max}
        label={labels.commands.buttons}
        onChange={(count) => onChange(resizePhiCommandButtons(buttons, count, bounds))}
      />
      <PhiPopoverControl
        trigger="click"
        placement="bottomRight"
        getPopupContainer={popup.getPopupContainer}
        rootClassName={popup.rootClassName}
        onOpenChange={popup.setOpen}
        content={(
          <PhiFlexControl
            vertical
            gap={token.paddingXXS}
            style={{ minWidth: 240 }}
            onClick={stopToolEvent}
            onPointerDown={stopToolEvent}
          >
            {buttons.length === 0 ? (
              <PhiTypographyControl type="secondary">No buttons</PhiTypographyControl>
            ) : buttons.map((button, index) => (
              <PhiFlexControl key={button.key} align="center" gap={token.paddingXXS}>
                <PhiTypographyControl ellipsis style={{ flex: "1 1 auto", minWidth: 0 }}>
                  {readButtonName(button)}
                </PhiTypographyControl>
                <PhiButtonControl
                  type="text"
                  size="small"
                  ariaLabel={`Move ${readButtonName(button)} earlier`}
                  disabled={index === 0}
                  icon={<PhiIcon name="arrow-up" size="inherit" />}
                  onClick={() => onChange([...moveButton(buttons, index, -1)])}
                />
                <PhiButtonControl
                  type="text"
                  size="small"
                  ariaLabel={`Move ${readButtonName(button)} later`}
                  disabled={index === buttons.length - 1}
                  icon={<PhiIcon name="arrow-down" size="inherit" />}
                  onClick={() => onChange([...moveButton(buttons, index, 1)])}
                />
                <PhiButtonControl
                  type="text"
                  size="small"
                  danger
                  ariaLabel={`Remove ${readButtonName(button)}`}
                  disabled={buttons.length <= bounds.min}
                  icon={<PhiIcon name="delete" size="inherit" />}
                  onClick={() => onChange(buttons.filter((_, candidateIndex) => candidateIndex !== index))}
                />
              </PhiFlexControl>
            ))}
          </PhiFlexControl>
        )}
      >
        <span onClick={stopToolEvent} onPointerDown={stopToolEvent} style={{ display: "inline-flex" }}>
          <PhiButtonControl
            type="text"
            size="small"
            ariaLabel={labels.commands.manageButtons}
            tooltip={labels.commands.manageButtons}
            disabled={buttons.length === 0}
            icon={<PhiIcon name="menu" size="inherit" />}
            onClick={() => undefined}
          />
        </span>
      </PhiPopoverControl>
    </PhiCompactGroupControl>
  );
}
