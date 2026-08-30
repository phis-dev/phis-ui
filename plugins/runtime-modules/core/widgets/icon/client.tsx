"use client";

import { Flex } from "antd";
import { useState } from "react";

import { PhiIcon } from "../../../../../components/shell/phi-icon";
import type { PhiClientBlockBaseProps, PhiCmsInstanceId, PhiNoLabels, PhiRenderableBlockSize } from "../../../../../types";
import {
  createPhiRenderableBlockReceiver,
  usePhiRenderableBlockSignalListener,
} from "../../../../../components/runtime/renderable-block-runtime";

const PHI_ICON_FALLBACK = "antd:question-circle-outlined";
const PHI_ICON_DEFAULT_SIZE = 24;

export type PhiIconWidgetClientLabels = PhiNoLabels;

export type PhiIconWidgetClientConfig = {
  icon?: string;
  color?: string;
  size?: PhiRenderableBlockSize;
};

export type PhiIconWidgetClientProps = PhiClientBlockBaseProps<
  PhiIconWidgetClientLabels,
  PhiIconWidgetClientConfig
> & {
  blockId: PhiCmsInstanceId;
};

function resolveIconSize(config?: PhiIconWidgetClientConfig | null) {
  return config?.size?.width ?? config?.size?.height ?? PHI_ICON_DEFAULT_SIZE;
}

export function PhiIconWidgetClient({
  blockId,
  config,
}: PhiIconWidgetClientProps) {
  const [iconOverride, setIconOverride] = useState<{ active: boolean; value?: string }>({
    active: false,
    value: undefined,
  });
  const [colorOverride, setColorOverride] = useState<{ active: boolean; value?: string }>({
    active: false,
    value: undefined,
  });
  const iconValue = iconOverride.active ? iconOverride.value : config?.icon;
  const colorValue = colorOverride.active ? colorOverride.value : config?.color;
  const receiver = createPhiRenderableBlockReceiver("widget", blockId);

  usePhiRenderableBlockSignalListener(receiver, (signal) => {
    if (signal.channel === "icon" && signal.action === "change") {
      const nextIcon =
        typeof signal.value === "string" && signal.value.trim().length > 0 ? signal.value : undefined;
      setIconOverride({
        active: true,
        value: nextIcon,
      });
      return;
    }

    if (signal.channel !== "textColor" || signal.action !== "change") {
      return;
    }

    const nextColor =
      typeof signal.value === "string" && signal.value.trim().length > 0 ? signal.value : undefined;
    setColorOverride({
      active: true,
      value: nextColor,
    });
  });

  return (
    <Flex
      align="center"
      justify="center"
      style={{
        width: "100%",
        height: "100%",
        minWidth: 0,
        minHeight: 0,
        lineHeight: 1,
        color: colorValue ?? undefined,
      }}
    >
      <PhiIcon name={iconValue ?? PHI_ICON_FALLBACK} size={resolveIconSize(config)} />
    </Flex>
  );
}
