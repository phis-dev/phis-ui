"use client";

import Link from "next/link";
import type { ReactNode, Ref } from "react";

import type { PhiMenuControlItem } from "../controls/phi-menu-control";
import type { PhiNavItem } from "../shell/shell-types";
import type { PhiAccountAreaEntry } from "../widgets/area-menu-items";
import { PhiAvatar } from "../shell/phi-avatar";

export type PhiAccountMenuLabels = {
  trigger: {
    account: string;
  };
  guest: {
    login: string;
    register: string;
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
      displayName?: string;
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
  /**
   * The Areas this person may enter, the one they are standing in among them.
   *
   * They head the menu rather than trail it: the first thing it says is where the reader is, and the
   * entries below are about the account, ending in signing out. No surface can carry this list -- an
   * Area's address is its own segment and the list is a property of the person, not of the Page.
   */
  areaEntries?: readonly PhiAccountAreaEntry[];
  onOpenOverlay?: (overlayInstanceId: string) => void;
  /** Sends what an entry carries, for an entry that sends rather than goes. */
  onEmit?: (item: PhiNavItem) => void;
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
  areaEntries,
  onOpenOverlay,
  onEmit,
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
   *
   * An entry that has entries below it is a submenu and keeps them. A Module contributing a group said
   * it was a group; flattening it here, or dropping what was under it, would answer for the Module. A
   * group is a heading and not a destination, so it carries no link even where the resolver found one.
   */
  function toContributedMenuItem(item: PhiNavItem): PhiMenuControlItem {
    if (item.separator) {
      return { key: item.key, type: "divider" as const };
    }
    const children = item.children?.map(toContributedMenuItem);
    if (children && children.length > 0) {
      return { key: item.key, label: item.label, children };
    }
    if (item.emits?.length) {
      return {
        key: item.key,
        label: item.label,
        onClick: onEmit ? () => onEmit(item) : undefined,
        disabled: !onEmit,
      };
    }
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
  }

  const contributedMenuItems: PhiMenuControlItem[] = (contributedItems ?? []).map(toContributedMenuItem);

  /*
   * The Area the reader is in is shown and not offered: a link back to the page you are on is an
   * invitation to a round trip that changes nothing, and leaving it out would drop the one entry that
   * says where you are. An Area root forwards to wherever this viewer lands, so the segment is enough.
   */
  const areaMenuItems: PhiMenuControlItem[] = (areaEntries ?? []).map((entry) => ({
    key: `area-${entry.area}`,
    label: entry.current ? entry.label : <Link href={entry.href}>{entry.label}</Link>,
    disabled: entry.current,
  }));

  /*
   * Nothing about the account is drawn here any more.
   *
   * Profile, account security and signing out are entries of the `<area>:account` surface like the ones
   * a Module contributes, so they arrive through `contributedItems` and are moved, renamed or removed in
   * the Builder like any other entry. What the menu drew itself was the part nobody could rearrange.
   */
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
          ...areaMenuItems,
          ...(areaMenuItems.length > 0 && contributedMenuItems.length > 0
            ? [{ key: "contributed-divider", type: "divider" as const }]
            : []),
          ...contributedMenuItems,
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
