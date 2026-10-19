import { isValidElement } from "react";
import { describe, expect, it, vi } from "vitest";

import { parsePhiCmsCollapsibleLayoutConfig } from "../../../types/cms-config";
import type { PhiCmsLayoutPluginRenderArgs } from "../../../types/cms-plugins";
import type { PhiCmsCollapsibleLayoutConfig } from "../../../types/cms-config";
import { PHI_COLLAPSIBLE_LAYOUT_PLUGIN } from "./collapsible-layout-plugin";

/*
 * A Collapsible panel's description is the hint behind its title: stored beside `slotTitles` in slot
 * order, and translated with them as the Layout's own text.
 */
describe("a Collapsible's panel descriptions", () => {
  it("are read in slot order, an empty one keeping its place and trailing empties dropped", () => {
    expect(parsePhiCmsCollapsibleLayoutConfig({ slotDescriptions: ["", " Who sees it ", "", ""] }).slotDescriptions)
      .toEqual(["", "Who sees it"]);
    expect(parsePhiCmsCollapsibleLayoutConfig({ slotDescriptions: ["", ""] }).slotDescriptions ?? []).toEqual([]);
  });

  it("are translated in the same question as the titles and handed to the panels", async () => {
    const translateOwnText = vi.fn(async (texts: readonly string[]) => texts.map((text) => `de:${text}`));
    const config = parsePhiCmsCollapsibleLayoutConfig({ slotTitles: ["General", "Access"], slotDescriptions: ["", "Who sees it"] });
    const rendered = await PHI_COLLAPSIBLE_LAYOUT_PLUGIN.render({
      node: { id: "1", flags: 0, childLayouts: [], childWidgets: [] },
      config,
      renderSequentialSlotChildren: () => [],
      translateOwnText,
    } as unknown as PhiCmsLayoutPluginRenderArgs<PhiCmsCollapsibleLayoutConfig>);

    expect(translateOwnText).toHaveBeenCalledTimes(1);
    expect(translateOwnText).toHaveBeenCalledWith(["General", "Access", "", "Who sees it"]);
    expect(isValidElement(rendered)).toBe(true);
    const props = (rendered as { props: { slotTitles?: string[]; slotDescriptions?: string[] } }).props;
    expect(props.slotTitles).toEqual(["de:General", "de:Access"]);
    expect(props.slotDescriptions).toEqual(["de:", "de:Who sees it"]);
  });
});
