import { resolvePhiNavHref } from "../../helpers/locale";
import {
  type PhiBuilderNavigationItem,
} from "../../helpers/cms-navigation-catalog";
import type { PhiNavItem } from "../shell/shell-types";
import type { PhiQuickLinksWidgetItem } from "../../plugins/runtime-modules/core/widgets/quick-links/client";

export const PHI_QUICK_LINKS_PREVIEW_ITEMS: PhiQuickLinksWidgetItem[] = [
  { label: "Overview", href: "/overview" },
  { label: "Pricing", href: "/pricing" },
  { label: "Contact", href: "/contact" },
];

export function mapPhiNavItemsToQuickLinksItems(
  items: PhiNavItem[],
  locale: string,
  area: string,
  interactive = true,
): PhiQuickLinksWidgetItem[] {
  return items
    .filter((item): item is PhiNavItem & { href: string } => !item.separator && Boolean(item.href))
    .map(
      (item): PhiQuickLinksWidgetItem => ({
        label: item.label,
        href: resolvePhiNavHref(locale, area, item.href),
        icon: item.icon,
        external: item.external,
        newTab: interactive ? item.newTab : false,
      }),
    );
}

function flattenPhiBuilderNavigationItems(items: PhiBuilderNavigationItem[]): PhiBuilderNavigationItem[] {
  return items.flatMap((item) => [item, ...(Array.isArray(item.children) ? flattenPhiBuilderNavigationItems(item.children) : [])]);
}

export function mapPhiBuilderNavigationItemsToQuickLinksItems(
  items: PhiBuilderNavigationItem[],
  locale: string,
  area: string,
): PhiQuickLinksWidgetItem[] {
  return flattenPhiBuilderNavigationItems(items)
    .filter((item) => item.href !== null)
    .map(
      (item): PhiQuickLinksWidgetItem => ({
        label: item.label,
        href: resolvePhiNavHref(locale, area, item.href!),
        icon: item.icon ?? undefined,
        external: false,
        newTab: false,
      }),
    );
}
