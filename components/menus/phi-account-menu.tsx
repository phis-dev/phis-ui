"use client";

import Link from "next/link";
import type { ReactNode, Ref } from "react";

import type { PhiMenuControlItem } from "../controls/phi-menu-control";
import type { PhiAccountAreaEntry, PhiNavItem } from "../shell/shell-types";
import { PhiAvatar } from "../shell/phi-avatar";

export type PhiAccountMenuLabels = {
  trigger: {
    account: string;
  };
  guest: {
    login: string;
    register: string;
  };
  /*
   * Only the heading. Each Area entry arrives carrying its own name, so the six names have no second
   * home here -- one copy crossing to the browser, in the place that renders it.
   */
  areas: {
    title: string;
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
   * A group of their own at the foot of the menu: everything above is about the account, and this is
   * about where to go with it. No surface can carry the list -- an Area's address is its own segment
   * and which Areas are in it is a property of the person, not of the Page.
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

  /*
   * Where a contributed entry leads is one kind of thing; what it does is another.
   *
   * An entry that emits goes nowhere -- signing out is the first of them -- and it is told apart here
   * by that property rather than by its key, the same way the anchor is. So the destinations stand
   * together at the top, the acts below them, and the reader never hunts for the one entry that ends
   * their session among the ones that merely take them somewhere.
   */
  const contributed = contributedItems ?? [];
  const destinationMenuItems: PhiMenuControlItem[] = contributed
    .filter((item) => !item.emits?.length)
    .map(toContributedMenuItem);
  const actionMenuItems: PhiMenuControlItem[] = contributed
    .filter((item) => item.emits?.length)
    .map(toContributedMenuItem);

  /*
   * The Area the reader is in is shown and not offered: a link back to the page you are on is an
   * invitation to a round trip that changes nothing, and leaving it out would drop the one entry that
   * says where you are. An Area root forwards to wherever this viewer lands, so the segment is enough.
   *
   * They stand in a titled group rather than as entries after a rule. What is above the rule is this
   * account -- the profile, the password, signing out -- and what is below it is somewhere else
   * entirely. A rule says only that something changes here; the heading says what, which is worth a
   * line in the one menu that has to make sense from inside every Area.
   */
  const areaMenuItems: PhiMenuControlItem[] = (areaEntries ?? []).length === 0 ? [] : [{
    type: "group",
    key: "account-areas",
    label: labels.areas.title,
    /*
     * A plain anchor, where every other entry in this menu is a `Link`.
     *
     * Crossing into another Area is not a step within this application, it is leaving it for the next
     * one: other Modules, other Chrome, other access. A client navigation keeps the whole provider tree
     * of the Area being left mounted while the segments underneath are swapped, which asks the old
     * arrangement to serve the new one; a document request builds the arriving Area from nothing, which
     * is what it is entitled to. Nobody carries unsaved work from the Builder into the App, so there is
     * no state here worth the trick.
     *
     * It is also, still, the only thing standing between this click and a runaway -- and measuring it
     * again narrowed what the runaway is. It is not the Area boundary: the same click as a `Link`, aimed
     * at a Page *inside* the arriving Area instead of at its root, costs one navigation and one RSC
     * request, three runs out of three. What loops is `href` being an Area root, whose forward to the
     * landing Page crosses the `(root)`/`(pages)` group boundary in the same navigation that crosses the
     * Area. Either boundary on its own is quiet; together they are not (TODOS.md).
     *
     * So there is a version of this that could be a `Link` -- one naming where the Area root would have
     * sent this viewer. It would have to resolve six Areas' landing Pages to draw one menu, which is a
     * decision about cost rather than about links, and it is not taken here.
     */
    children: (areaEntries ?? []).map((entry) => ({
      key: `area-${entry.area}`,
      label: entry.current ? entry.label : <a href={entry.href}>{entry.label}</a>,
      disabled: entry.current,
    })),
  }];

  /*
   * Nothing about the account is drawn here any more.
   *
   * Profile, account security and signing out are entries of the `<area>:account` surface like the ones
   * a Module contributes, so they arrive through `contributedItems` and are moved, renamed or removed in
   * the Builder like any other entry. What the menu drew itself was the part nobody could rearrange.
   *
   * What it still decides is the grouping: what a Module contributed, then what acts, then where else
   * this person may go, each set off from the next. A divider appears only between two groups that both
   * have something in them, so a menu missing a group has no rule hanging in the air. The Areas carry
   * a heading of their own, so the rule before them says where the account ends and the heading says
   * what begins.
   */
  const groups = [destinationMenuItems, actionMenuItems, areaMenuItems].filter((group) => group.length > 0);
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
      : groups.flatMap((group, index) => index === 0
        ? group
        : [{ key: `account-group-divider-${index}`, type: "divider" as const }, ...group]);

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
