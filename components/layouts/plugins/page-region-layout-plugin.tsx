import { PhiCmsLayoutType } from "../../../constants/cms-layout-types";
import type { PhiCmsLayoutPlugin } from "../../../types";
import { PhiPageRegionLayout } from "../phi-page-region-layout";
import { definePhiLayoutRenderers } from "../layout-plugin-renderers";
import { PHI_PAGE_REGION_LAYOUT_DEFINITION } from "../layout-definitions";

type PhiPageRegionLayoutConfig = Record<string, never>;

function parseConfig(): PhiPageRegionLayoutConfig {
  return {};
}

export const PHI_PAGE_REGION_LAYOUT_PLUGIN: PhiCmsLayoutPlugin<PhiPageRegionLayoutConfig> = {
  ...PHI_PAGE_REGION_LAYOUT_DEFINITION,
  parseConfig,
  ...definePhiLayoutRenderers<PhiPageRegionLayoutConfig>(({ node, renderSequentialSlotChildren }) => {
    const slots = renderSequentialSlotChildren(node);

    return (
      <PhiPageRegionLayout
        key={`layout-${node.id}`}
        blockId={node.id}
        headerBottom={slots[0] ?? null}
        hero={slots[1] ?? null}
        content={slots[2] ?? null}
        siderRight={slots[3] ?? null}
        footerTop={slots[4] ?? null}
      />
    );
  }),
};

export const PHI_PAGE_REGION_LAYOUT_PLUGIN_TYPE = PhiCmsLayoutType.PageRegion;
