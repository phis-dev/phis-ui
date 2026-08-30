"use client";

import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  DeleteOutlined,
  MenuOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { Flex, Space, Typography } from "antd";

import { PhiButtonControl } from "../../controls/phi-button-control";
import { PhiPopoverControl } from "../../controls/phi-popover-control";
import { usePhiConfig } from "../../root/phi-config-provider";
import type { PhiCommandToolbarButtonConfig } from "../../../plugins/runtime-modules/core/widgets/command-toolbar/config";
import { usePhiWidgetScaffoldPopup } from "../client/shared/phi-widget-scaffold-popup";

function stopToolEvent(event: { stopPropagation: () => void }) {
  event.stopPropagation();
}

function createNextButton(buttons: readonly PhiCommandToolbarButtonConfig[]) {
  const keys = new Set(buttons.map((button) => button.key));
  let index = buttons.length + 1;
  let key = `button${index}`;
  while (keys.has(key)) {
    index += 1;
    key = `button${index}`;
  }

  return {
    key,
    label: `Button ${index}`,
    emits: [{ capabilityId: "command", value: key }],
  } satisfies PhiCommandToolbarButtonConfig;
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
  const { token } = usePhiConfig();
  const popup = usePhiWidgetScaffoldPopup();

  return (
    <Space.Compact>
      <span onClick={stopToolEvent} onPointerDown={stopToolEvent} style={{ display: "inline-flex" }}>
        <PhiButtonControl
          type="text"
          size="small"
          ariaLabel="Add button"
          tooltip="Add button"
          icon={<PlusOutlined />}
          onClick={() => {
            onChange([...buttons, createNextButton(buttons)]);
          }}
        />
      </span>
      <PhiPopoverControl
        trigger="click"
        placement="bottomRight"
        getPopupContainer={popup.getPopupContainer}
        rootClassName={popup.rootClassName}
        onOpenChange={popup.setOpen}
        content={(
          <Flex
            vertical
            gap={token.paddingXXS}
            style={{ minWidth: 240 }}
            onClick={stopToolEvent}
            onPointerDown={stopToolEvent}
          >
            {buttons.length === 0 ? (
              <Typography.Text type="secondary">No buttons</Typography.Text>
            ) : buttons.map((button, index) => (
              <Flex key={button.key} align="center" gap={token.paddingXXS}>
                <Typography.Text ellipsis style={{ flex: "1 1 auto", minWidth: 0 }}>
                  {button.label ?? button.actionKey ?? button.key}
                </Typography.Text>
                <PhiButtonControl
                  type="text"
                  size="small"
                  ariaLabel={`Move ${button.label ?? button.key} earlier`}
                  disabled={index === 0}
                  icon={<ArrowUpOutlined />}
                  onClick={() => onChange([...moveButton(buttons, index, -1)])}
                />
                <PhiButtonControl
                  type="text"
                  size="small"
                  ariaLabel={`Move ${button.label ?? button.key} later`}
                  disabled={index === buttons.length - 1}
                  icon={<ArrowDownOutlined />}
                  onClick={() => onChange([...moveButton(buttons, index, 1)])}
                />
                <PhiButtonControl
                  type="text"
                  size="small"
                  danger
                  ariaLabel={`Remove ${button.label ?? button.key}`}
                  icon={<DeleteOutlined />}
                  onClick={() => onChange(buttons.filter((_, candidateIndex) => candidateIndex !== index))}
                />
              </Flex>
            ))}
          </Flex>
        )}
      >
        <span onClick={stopToolEvent} onPointerDown={stopToolEvent} style={{ display: "inline-flex" }}>
          <PhiButtonControl
            type="text"
            size="small"
            ariaLabel="Manage buttons"
            tooltip="Manage buttons"
            disabled={buttons.length === 0}
            icon={<MenuOutlined />}
            onClick={() => undefined}
          />
        </span>
      </PhiPopoverControl>
    </Space.Compact>
  );
}
