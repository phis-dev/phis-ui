"use client";

import { useMemo } from "react";

import type { PhiClientBlockBaseProps, PhiNoLabels } from "../../../types";
import type { PhiCmsTabBarWidgetConfig } from "../config/stack-tabs";
import { usePhiStackChoiceController } from "./shared/phi-choice-controller";
import { PhiTabsControl } from "../../controls/phi-tabs-control";

export type PhiTabBarWidgetClientProps = PhiClientBlockBaseProps<
  PhiNoLabels,
  PhiCmsTabBarWidgetConfig
>;

function resolveTabPlacement(placement: PhiCmsTabBarWidgetConfig["placement"]) {
  if (placement === "left") {
    return "start";
  }
  if (placement === "right") {
    return "end";
  }
  return placement ?? "top";
}

export function PhiTabBarWidgetClient({
  config,
  signalsEnabled = true,
}: PhiTabBarWidgetClientProps & {
  signalsEnabled?: boolean;
}) {
  const choice = usePhiStackChoiceController({
    config,
    signalsEnabled,
    typeKey: "tab-bar",
    defaultKey: "tab",
  });
  const items = choice.options.map((option) => ({
    key: option.value,
    label: option.label,
    children: null,
  }));
  const tabBarStyle = useMemo(() => {
    const longestLabelLength = items.reduce((length, item) => Math.max(length, item.label.length), 0);
    return {
      margin: 0,
      ...(config?.placement === "left" || config?.placement === "right"
        ? { width: `max(8rem, ${longestLabelLength + 3}ch)` }
        : {}),
    };
  }, [config?.placement, items]);

  if (items.length === 0) {
    return null;
  }

  return (
    <PhiTabsControl
      className="phi-tab-bar"
      items={items}
      value={choice.value || undefined}
      size={config?.controlSize}
      placement={resolveTabPlacement(config?.placement)}
      tabBarStyle={tabBarStyle}
      onChange={choice.publish}
    />
  );
}
