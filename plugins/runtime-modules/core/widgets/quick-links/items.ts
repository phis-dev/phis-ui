import { resolvePhiNavHref } from "../../../../../helpers/locale";
import type { PhiNavItem } from "../../../../../components/shell/shell-types";
import type { PhiQuickLinksWidgetItem } from "./client";

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
