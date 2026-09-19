"use client";

import type { ReactNode } from "react";
import { UserOutlined } from "@ant-design/icons";
import { Avatar } from "antd";

/**
 * Two letters from a name: the first of the first two words, or the first two of a single word.
 *
 * Works on what it is given rather than on a first/last name pair, because the callers hold different
 * shapes -- a display name, a full name, sometimes an address local part -- and none of them should
 * have to split it themselves.
 */
function readPhiAvatarInitials(value: string | null | undefined) {
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

/**
 * Who this is, in the space of a picture.
 *
 * **Three steps, in this order: the picture, then initials, then the generic silhouette.** Initials
 * matter because "no picture" is the ordinary state -- most people never choose one -- and a row of
 * identical grey silhouettes tells a reader nothing, while two letters tell them who. The rule was
 * written down once, in the account menu, and the account page's own avatar was drawing the silhouette
 * straight away; a person with a name and no picture therefore looked different depending on which
 * surface was showing them. That is a platform decision about how people are identified, not a
 * per-surface one, so it lives here.
 *
 * The fallback order is the primitive's own: Ant Design draws `children` only when `src` is absent or
 * fails, which means a broken picture lands on the initials rather than on nothing.
 *
 * A caller with no name to offer gets the silhouette, and that is the honest outcome rather than a
 * choice -- `initialsFrom` is what a surface passes when it knows who it is drawing.
 */
export type PhiAvatarControlProps = {
  src?: string;
  alt?: string;
  /** The name the initials are taken from when there is no picture. */
  initialsFrom?: string | null;
  /**
   * A different silhouette for the last step, where a surface draws something other than a person --
   * never a way to skip the initials.
   */
  icon?: ReactNode;
  size?: number;
};

export function PhiAvatarControl({ src, alt, initialsFrom, icon, size = 32 }: PhiAvatarControlProps) {
  const initials = src ? null : readPhiAvatarInitials(initialsFrom);
  return (
    <Avatar
      size={size}
      src={src}
      alt={alt}
      icon={src || initials ? icon : icon ?? <UserOutlined />}
      style={{ flexShrink: 0 }}
    >
      {initials}
    </Avatar>
  );
}
