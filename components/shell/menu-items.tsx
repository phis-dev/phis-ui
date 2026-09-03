"use client";

import type { PhiMenuControlItem } from "../controls/phi-menu-control";

import { resolvePhiNavHref } from "../../helpers/locale";
import { isPhiNavPathActive } from "../../helpers/nav-selection";
import { PhiIcon } from "./phi-icon";
import { PhiNavLink } from "./phi-nav-link";
import type { PhiBlockRuntime } from "../../types";
import type { PhiNavItem } from "./shell-types";

export function mapPhiNavItems(
  currentLocale: string,
  currentArea: PhiBlockRuntime["area"],
  currentPathname: string,
  items: PhiNavItem[],
  /** Which locales this Site has, so a locale prefix is recognised as one. */
  availableLocales: readonly string[],
  options?: {
    interactive?: boolean;
    onAction?: (action: NonNullable<PhiNavItem["action"]>) => void;
  },
): PhiMenuControlItem[] {
  const interactive = options?.interactive ?? true;

  function resolveNavHref(item: PhiNavItem) {
    return item.href
      ? resolvePhiNavHref(currentLocale, currentArea, item.href)
      : null;
  }

  return items.map((item) => {
    if (item.separator) {
      return {
        type: "divider",
      };
    }

    if (item.action) {
      return {
        key: item.key,
        label: <span>{item.label}</span>,
        disabled: item.disabled,
        ...(item.icon ? { icon: <PhiIcon name={item.icon} /> } : {}),
        ...(interactive ? { onClick: () => options?.onAction?.(item.action!) } : {}),
      };
    }

    const hasChildren = (item.children?.length ?? 0) > 0;
    const localizedHref = resolveNavHref(item);
    const isCurrent =
      !item.external && !hasChildren && localizedHref !== null &&
      isPhiNavPathActive(currentPathname, localizedHref, availableLocales);
    const labelContent = <span>{item.label}</span>;

    return {
      key: item.key,
      className: isCurrent ? "phi-menu-item-current" : undefined,
      label: hasChildren || !interactive || localizedHref === null ? (
        labelContent
      ) : isCurrent ? (
        labelContent
      ) : (
        <PhiNavLink
          href={localizedHref}
          external={item.external}
          newTab={item.newTab}
          style={{ textDecoration: "none" }}
        >
          {labelContent}
        </PhiNavLink>
      ),
      disabled: item.disabled,
      ...(item.icon ? { icon: <PhiIcon name={item.icon} /> } : {}),
      ...(hasChildren
        ? { children: mapPhiNavItems(currentLocale, currentArea, currentPathname, item.children ?? [], availableLocales, options) }
        : {}),
    };
  });
}
