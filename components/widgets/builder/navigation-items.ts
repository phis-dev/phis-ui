"use client";

import {
  type PhiBuilderNavigationItem,
} from "../../../helpers/cms-navigation-catalog";
import type { PhiNavItem } from "../../shell/shell-types";

export function mapPhiBuilderNavigationItemsToNavItems(items: PhiBuilderNavigationItem[]): PhiNavItem[] {
  return items.filter((item) => !item.hidden).map((item) => {
    const children = mapPhiBuilderNavigationItemsToNavItems(item.children);

    return {
      key: item.id,
      label: item.label,
      ...(item.href?.trim() ? { href: item.href.trim() } : {}),
      ...(item.icon ? { icon: item.icon } : {}),
      ...(item.external === true ? { external: true } : {}),
      ...(item.newTab === true ? { newTab: true } : {}),
      ...(item.kind === "separator" ? { separator: true } : {}),
      ...(children.length > 0 ? { children } : {}),
    };
  });
}
