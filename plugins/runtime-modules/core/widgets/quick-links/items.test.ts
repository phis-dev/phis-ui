import { describe, expect, it } from "vitest";

import type { PhiBuilderNavigationItem } from "../../../../../helpers/cms-navigation-catalog";
import type { PhiCmsInstanceId } from "../../../../../types/cms-instance-id";
import { mapPhiBuilderNavigationItemsToNavItems } from "../../../../../components/widgets/builder/navigation-items";
import { mapPhiNavItemsToQuickLinksItems } from "./items";

function item(id: string, href: string, hidden = false): PhiBuilderNavigationItem {
  return {
    id: id as PhiCmsInstanceId,
    source: "module",
    ownerModuleId: null,
    kind: "link",
    label: id,
    href,
    hidden,
    children: [],
  };
}

describe("the Quick Links preview", () => {
  it("leaves out a hidden item, as the live render does", () => {
    const links = mapPhiNavItemsToQuickLinksItems(
      mapPhiBuilderNavigationItemsToNavItems([item("terms", "/terms"), item("contact", "/contact", true)]),
      "de",
      "public",
      false,
    );
    expect(links.map((link) => link.href)).toEqual(["/de/terms"]);
  });
});
