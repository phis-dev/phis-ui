"use client";

import Link from "next/link";
import type { ReactNode, Ref } from "react";

import type { PhiMenuControlItem } from "../controls/phi-menu-control";
import type { PhiNavItem } from "../shell/shell-types";
import { PhiAvatar } from "../shell/phi-avatar";

export type PhiAccountMenuLabels = {
  trigger: {
    account: string;
  };
  guest: {
    login: string;
    register: string;
  };
  authenticated: {
    profile: string;
    settings: string;
    logout: string;
  };
};

export type PhiAccountMenuState =
  | {
      kind: "guest";
      loginHref?: string;
      onLogin?: () => void;
      registerHref?: string;
    }
  | {
      kind: "authenticated";
      profileHref?: string;
      settingsHref?: string;
      logoutHref?: string;
      displayName?: string;
      onProfile?: () => void;
      onLogout?: () => void;
    };

export type PhiAccountMenuProps = {
  labels: PhiAccountMenuLabels;
  state: PhiAccountMenuState;
  /**
   * Entries Modules contributed to the `<area>:account` surface.
   *
   * They sit above the Area's own account entries and their divider, because a Module's entry is about
   * the person -- their picture, their preferences -- while what follows is about the session. An entry
   * with an `overlayInstanceId` opens something in place and gets `onOpenOverlay`; one with an `href`
   * is an ordinary link.
   */
  contributedItems?: readonly PhiNavItem[];
  onOpenOverlay?: (overlayInstanceId: string) => void;
  avatarSrc?: string;
  avatarAlt?: string;
  icon?: ReactNode;
  triggerRef?: Ref<HTMLButtonElement>;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  mode?: "full" | "compact" | "icon-only";
  showLabel?: boolean;
  showChevron?: boolean;
};

export function PhiAccountMenu({
  labels,
  state,
  contributedItems,
  onOpenOverlay,
  avatarSrc,
  avatarAlt,
  icon,
  triggerRef,
  open,
  onOpenChange,
  mode = "full",
  showLabel,
  showChevron,
}: PhiAccountMenuProps) {
  const resolvedShowLabel = showLabel ?? mode === "full";
  const resolvedShowChevron = showChevron ?? mode !== "icon-only";

  const guestLoginItems: PhiMenuControlItem[] =
    state.kind === "guest"
      ? state.loginHref
        ? [{
            key: "login",
            label: <Link href={state.loginHref}>{labels.guest.login}</Link>,
          }]
        : state.onLogin
          ? [{
            key: "login",
            label: labels.guest.login,
            onClick: state.onLogin,
          }]
          : []
      : [];

  /*
   * A contributed entry is a link when it names a path and a button when it names an Overlay. The menu
   * control takes both shapes already -- `label` may be an anchor, or plain text with an `onClick` --
   * so nothing new is needed to render an opener, only to tell the two apart.
   */
  const contributedMenuItems: PhiMenuControlItem[] = (contributedItems ?? []).map((item) => {
    if (item.overlayInstanceId) {
      const overlayInstanceId = item.overlayInstanceId;
      return {
        key: item.key,
        label: item.label,
        onClick: onOpenOverlay ? () => onOpenOverlay(overlayInstanceId) : undefined,
        disabled: !onOpenOverlay,
      };
    }
    return {
      key: item.key,
      label: item.href ? <Link href={item.href}>{item.label}</Link> : item.label,
      disabled: !item.href,
    };
  });

  const menuItems: PhiMenuControlItem[] =
    state.kind === "guest"
      ? [
          ...guestLoginItems,
          ...(state.registerHref
            ? [{
                key: "register",
                label: <Link href={state.registerHref}>{labels.guest.register}</Link>,
              }]
            : []),
        ]
      : [
          ...contributedMenuItems,
          ...(contributedMenuItems.length > 0
            ? [{ key: "contributed-divider", type: "divider" as const }]
            : []),
          ...(state.profileHref || state.onProfile
            ? [
                {
                  key: "profile",
                  label: state.profileHref
                    ? <Link href={state.profileHref}>{labels.authenticated.profile}</Link>
                    : labels.authenticated.profile,
                  onClick: state.profileHref ? undefined : state.onProfile,
                },
              ]
            : []),
          ...(state.settingsHref
            ? [
                {
                  key: "settings",
                  label: <Link href={state.settingsHref}>{labels.authenticated.settings}</Link>,
                },
              ]
            : []),
          ...((state.profileHref || state.onProfile || state.settingsHref)
            ? [
                {
                  key: "account-divider",
                  type: "divider" as const,
                },
              ]
            : []),
          state.logoutHref
            ? {
                key: "logout",
                label: <Link href={state.logoutHref}>{labels.authenticated.logout}</Link>,
              }
            : {
                key: "logout",
                label: labels.authenticated.logout,
                onClick: state.onLogout,
              },
        ];

  return (
    <PhiAvatar
      src={avatarSrc}
      alt={avatarAlt}
      // A signed-in person has a name; a guest has none, and falls through to the generic icon.
      initialsFrom={state.kind === "authenticated" ? state.displayName ?? null : null}
      icon={icon}
      label={
        state.kind === "authenticated"
          ? (state.displayName ?? labels.trigger.account)
          : labels.trigger.account
      }
      menuItems={menuItems}
      triggerRef={triggerRef}
      open={open}
      onOpenChange={onOpenChange}
      showLabel={resolvedShowLabel}
      showChevron={resolvedShowChevron}
      labelPill={resolvedShowLabel}
    />
  );
}
