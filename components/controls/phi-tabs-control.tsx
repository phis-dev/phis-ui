"use client";

import type { CSSProperties, ReactNode } from "react";
import { Tabs } from "antd";
import type { PhiControlSize } from "../../types/control";

export type PhiTabsControlItem = {
  key: string;
  label: ReactNode;
  content?: ReactNode;
  disabled?: boolean;
  closable?: boolean;
};

export type PhiTabsControlProps = {
  className?: string;
  items: readonly PhiTabsControlItem[];
  value?: string;
  placement?: "top" | "bottom" | "start" | "end";
  size?: PhiControlSize;
  type?: "line" | "card" | "editable-card";
  centered?: boolean;
  animated?: boolean;
  tabBarStyle?: CSSProperties;
  onChange?: (key: string) => void;
  onEdit?: (key: string | React.MouseEvent | React.KeyboardEvent, action: "add" | "remove") => void;
};

export function PhiTabsControl({
  className,
  items,
  value,
  placement = "top",
  size,
  type,
  centered,
  animated,
  tabBarStyle,
  onChange,
  onEdit,
}: PhiTabsControlProps) {
  return (
    <Tabs
      className={className}
      items={items.map((item) => ({
        key: item.key,
        label: item.label,
        children: item.content ?? null,
        disabled: item.disabled,
        closable: item.closable,
      }))}
      activeKey={value}
      tabPlacement={placement}
      size={size}
      type={type}
      centered={centered}
      animated={animated}
      tabBarStyle={tabBarStyle}
      onChange={onChange}
      onEdit={onEdit}
    />
  );
}
