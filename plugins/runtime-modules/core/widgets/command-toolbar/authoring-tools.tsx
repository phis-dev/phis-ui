"use client";


import { PhiButtonControl } from "../../../../../components/controls/phi-button-control";
import { PhiPopoverControl } from "../../../../../components/controls/phi-popover-control";
import { usePhiConfig } from "../../../../../components/root/phi-config-provider";
import type { PhiCommandToolbarButtonConfig } from "../../../../../types/core-widget-placements";
import { usePhiWidgetScaffoldPopup } from "../../../../../components/widgets/client/shared/phi-widget-scaffold-popup";
import { usePhiAuthoringToolsLabels } from "../../../../../components/widgets/client/shared/phi-authoring-tools-labels";
import { PhiFlexControl } from "../../../../../components/controls/phi-flex-control";
import { PhiTypographyControl } from "../../../../../components/controls/phi-typography-control";
import { PhiCompactGroupControl } from "../../../../../components/controls/phi-compact-group-control";
import { PhiIcon } from "../../../../../components/shell/phi-icon";
import { PhiWidgetCountToolButton } from "../../../../../components/widgets/client/shared/phi-widget-tool-buttons";
import {
  PHI_COMMAND_TOOLBAR_MAX_BUTTONS,
  PHI_COMMAND_TOOLBAR_MIN_BUTTONS,
  resizePhiCommandToolbarButtons,
} from "./config";

function stopToolEvent(event: { stopPropagation: () => void }) {
  event.stopPropagation();
}

function moveButton(
  buttons: readonly PhiCommandToolbarButtonConfig[],
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

export function PhiCommandToolbarAuthoringTools({
  buttons,
  onChange,
}: {
  buttons: readonly PhiCommandToolbarButtonConfig[];
  onChange: (buttons: PhiCommandToolbarButtonConfig[]) => void;
}) {
  const labels = usePhiAuthoringToolsLabels();
  const { token } = usePhiConfig();
  const popup = usePhiWidgetScaffoldPopup();

  return (
    <PhiCompactGroupControl>
      <PhiWidgetCountToolButton
        count={buttons.length}
        min={PHI_COMMAND_TOOLBAR_MIN_BUTTONS}
        max={PHI_COMMAND_TOOLBAR_MAX_BUTTONS}
        label={labels.commands.buttons}
        onChange={(count) => onChange(resizePhiCommandToolbarButtons(buttons, count))}
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
                  {button.label ?? button.actionKey ?? button.key}
                </PhiTypographyControl>
                <PhiButtonControl
                  type="text"
                  size="small"
                  ariaLabel={`Move ${button.label ?? button.key} earlier`}
                  disabled={index === 0}
                  icon={<PhiIcon name="arrow-up" size="inherit" />}
                  onClick={() => onChange([...moveButton(buttons, index, -1)])}
                />
                <PhiButtonControl
                  type="text"
                  size="small"
                  ariaLabel={`Move ${button.label ?? button.key} later`}
                  disabled={index === buttons.length - 1}
                  icon={<PhiIcon name="arrow-down" size="inherit" />}
                  onClick={() => onChange([...moveButton(buttons, index, 1)])}
                />
                <PhiButtonControl
                  type="text"
                  size="small"
                  danger
                  ariaLabel={`Remove ${button.label ?? button.key}`}
                  disabled={buttons.length <= PHI_COMMAND_TOOLBAR_MIN_BUTTONS}
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
