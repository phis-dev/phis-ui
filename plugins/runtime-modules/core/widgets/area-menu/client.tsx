"use client";

import { DownOutlined } from "@ant-design/icons";
import { Typography } from "antd";
import type { MouseEvent } from "react";

import type { PhiClientBlockBaseProps, PhiBlockRuntime, PhiNoLabels } from "../../../../../types";
import {
  PHI_PILL_TRIGGER_CLASS_NAME,
  PhiDropdownControl,
} from "../../../../../components/controls/phi-dropdown-control";
import type { PhiMenuControlItem } from "../../../../../components/controls/phi-menu-control";
import { PhiNavLink } from "../../../../../components/shell/phi-nav-link";

const PHI_ICON_SIZE = "0.75rem";

export type PhiAreaMenuItem = {
  key: PhiBlockRuntime["area"];
  label: string;
  href: string;
  disabled?: boolean;
};

export type PhiAreaMenuWidgetClientProps = PhiClientBlockBaseProps<
  PhiNoLabels,
  Record<string, never>,
  Pick<PhiBlockRuntime, "area" | "locale">
> & {
  items: PhiAreaMenuItem[];
};

export function PhiAreaMenuWidgetClient({
  runtime,
  items,
}: PhiAreaMenuWidgetClientProps) {
  const currentArea = runtime?.area ?? "public";
  const currentItem = items.find((item) => item.key === currentArea) ?? items[0];

  if (!currentItem || items.length === 0) {
    return null;
  }

  const menuItems: PhiMenuControlItem[] = items.map((item) => ({
    key: item.key,
    disabled: item.disabled || item.key === currentArea,
    label: item.disabled || item.key === currentArea ? (
      <span>{item.label}</span>
    ) : (
      <PhiNavLink href={item.href} style={{ textDecoration: "none" }}>
        {item.label}
      </PhiNavLink>
    ),
  }));

  function handleTriggerClick(event: MouseEvent<HTMLElement>) {
    event.preventDefault();
  }

  return (
    <PhiDropdownControl items={menuItems} selectedKeys={[currentArea]}>
      <Typography.Link
        className={PHI_PILL_TRIGGER_CLASS_NAME}
        onClick={handleTriggerClick}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "var(--ant-padding-xs)",
          }}
        >
          <span>{currentItem.label}</span>
          <DownOutlined style={{ fontSize: PHI_ICON_SIZE }} />
        </span>
      </Typography.Link>
    </PhiDropdownControl>
  );
}
