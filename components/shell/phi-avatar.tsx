"use client";

import type { CSSProperties, ReactNode, Ref } from "react";
import Link from "next/link";

import { PhiAvatarControl } from "../controls/phi-avatar-control";
import { PhiFlexControl } from "../controls/phi-flex-control";
import { PhiPillDropdownControl } from "../controls/phi-dropdown-control";
import type { PhiMenuControlItem } from "../controls/phi-menu-control";

export type PhiAvatarProps = {
  label?: ReactNode;
  href?: string;
  src?: string;
  alt?: string;
  /** The name the initials are taken from when there is no picture; see `PhiAvatarControl`. */
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
  const avatarNode = (
    <PhiAvatarControl size={size} src={src} alt={alt} initialsFrom={initialsFrom} icon={icon} />
  );
  if (!href || (menuItems && menuItems.length > 0)) {
    return (
      <PhiPillDropdownControl
        items={menuItems ?? []}
        open={open}
        onOpenChange={onOpenChange}
        leading={href ? <Link href={href}>{avatarNode}</Link> : avatarNode}
        label={showLabel ? label : null}
        pill={labelPill}
        showChevron={showChevron}
        triggerRef={triggerRef}
        className={className}
        style={style}
      />
    );
  }

  return (
    <Link href={href} className={className} style={style}>
      <PhiFlexControl align="center" gap={8}>
        {avatarNode}
        {showLabel && label ? <span>{label}</span> : null}
      </PhiFlexControl>
    </Link>
  );
}
