"use client";

import { useState } from "react";

import { PhiIcon } from "../../../../../components/shell/phi-icon";
import type {
  PhiClientBlockBaseProps,
  PhiCmsInstanceId,
  PhiNoLabels,
  PhiRenderableBlockResponsiveSize,
} from "../../../../../types";
import { resolvePhiRenderableBlockGeometry } from "../../../../../types/renderable-block-geometry";
import {
  createPhiRenderableBlockReceiver,
  usePhiRenderableBlockSignalListener,
} from "../../../../../components/runtime/renderable-block-runtime";
import { PhiFlexControl } from "../../../../../components/controls/phi-flex-control";

const PHI_ICON_FALLBACK = "antd:question-circle-outlined";
const PHI_ICON_DEFAULT_SIZE = 24;

export type PhiIconWidgetClientLabels = PhiNoLabels;

export type PhiIconWidgetClientConfig = {
  icon?: string;
  color?: string;
  /**
   * The glyph's measurement, and the block's `size` field doing double duty.
   *
   * It is the same field a block states its box with, so it takes the same profile pair -- an Icon that
   * names a value per profile is not something the Control offers, but the type has to say what can
   * arrive. What is read is the base answer, through the one geometry reader.
   */
  size?: PhiRenderableBlockResponsiveSize;
};

export type PhiIconWidgetClientProps = PhiClientBlockBaseProps<
  PhiIconWidgetClientLabels,
  PhiIconWidgetClientConfig
> & {
  blockId: PhiCmsInstanceId;
};

function resolveIconSize(config?: PhiIconWidgetClientConfig | null) {
  const geometry = resolvePhiRenderableBlockGeometry({ size: config?.size });
  return geometry.inline.size?.css ?? geometry.block.size?.css ?? PHI_ICON_DEFAULT_SIZE;
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
    <PhiFlexControl
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
    </PhiFlexControl>
  );
}
