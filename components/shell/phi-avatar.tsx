"use client";

import type { CSSProperties, ReactNode, Ref } from "react";
import { DownOutlined, UserOutlined } from "@ant-design/icons";
import Link from "next/link";
import { Avatar, Space } from "antd";

import {
  PHI_DROPDOWN_TRIGGER_CLASS_NAME,
  PHI_PILL_TRIGGER_CLASS_NAME,
  PhiDropdownControl,
} from "../controls/phi-dropdown-control";
import type { PhiMenuControlItem } from "../controls/phi-menu-control";

export type PhiAvatarProps = {
  label?: ReactNode;
  href?: string;
  src?: string;
  alt?: string;
  /**
   * The name the initials are taken from when there is no picture.
   *
   * Three steps, in this order: the picture, then initials, then the generic icon. Initials matter
   * because "no picture" is the ordinary state -- most people never choose one -- and a row of
   * identical grey silhouettes tells a reader nothing, while two letters tell them who.
   */
  initialsFrom?: string | null;
  icon?: ReactNode;
  size?: number;
  menuItems?: readonly PhiMenuControlItem[];
  className?: string;
  style?: CSSProperties;
  triggerRef?: Ref<HTMLButtonElement>;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showLabel?: boolean;
  showChevron?: boolean;
  labelPill?: boolean;
};

/**
 * Two letters from a name: the first of the first two words, or the first two of a single word.
 *
 * Works on what it is given rather than on a first/last name pair, because the callers hold different
 * shapes -- a display name, a full name, sometimes an address local part -- and none of them should
 * have to split it themselves.
 */
export function readPhiAvatarInitials(value: string | null | undefined) {
  const words = (value ?? "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return null;
  }
  const letters = words.length === 1
    ? [...words[0]!].slice(0, 2)
    : [words[0]!, words[1]!].map((word) => [...word][0]!);
  const initials = letters.join("").toLocaleUpperCase();
  return initials || null;
}

export function PhiAvatar({
  label,
  href,
  src,
  alt,
  initialsFrom,
  icon,
  size = 32,
  menuItems,
  className,
  style,
  triggerRef,
  open,
  onOpenChange,
  showLabel = true,
  showChevron = true,
  labelPill = false,
}: PhiAvatarProps) {
  const initials = src ? null : readPhiAvatarInitials(initialsFrom);
  const avatarNode = (
    <Avatar
      size={size}
      src={src}
      alt={alt}
      // Ant Design draws `children` only when `src` is absent or fails, which is exactly the fallback
      // order wanted here -- a broken picture lands on the initials rather than on nothing.
      icon={src || initials ? icon : icon ?? <UserOutlined />}
      style={{ flexShrink: 0 }}
    >
      {initials}
    </Avatar>
  );
  const hasMenu = Boolean(menuItems && menuItems.length > 0);
  const showLabelPill = labelPill && showLabel && Boolean(label);

  const labelNode = showLabelPill ? (
    <span className={PHI_PILL_TRIGGER_CLASS_NAME}>
      <Space size={5}>
        <span>{label}</span>
        {showChevron && hasMenu ? <DownOutlined style={{ fontSize: 12 }} /> : null}
      </Space>
    </span>
  ) : showLabel && label ? (
    <span>{label}</span>
  ) : null;

  const trigger = (
    <button
      ref={triggerRef}
      type="button"
      className={[PHI_DROPDOWN_TRIGGER_CLASS_NAME, className].filter(Boolean).join(" ")}
      style={{
        fontSize: "inherit",
        color: "inherit",
        background: "transparent",
        border: 0,
        padding: 0,
        cursor: "pointer",
        ...style,
      }}
      aria-haspopup={hasMenu ? "menu" : undefined}
    >
      <Space size={8}>
        {href ? <Link href={href}>{avatarNode}</Link> : avatarNode}
        {labelNode}
        {!showLabelPill && showChevron && hasMenu ? <DownOutlined style={{ fontSize: 12 }} /> : null}
      </Space>
    </button>
  );

  if (hasMenu) {
    return (
      <PhiDropdownControl
        items={menuItems ?? []}
        open={open}
        onOpenChange={onOpenChange}
      >
        {trigger}
      </PhiDropdownControl>
    );
  }

  if (href) {
    return (
      <Link href={href} className={className} style={style}>
        <Space size={8}>
          {avatarNode}
          {showLabel && label ? <span>{label}</span> : null}
        </Space>
      </Link>
    );
  }

  return trigger;
}
