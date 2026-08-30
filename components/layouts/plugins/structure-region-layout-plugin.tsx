import { PhiCmsLayoutType } from "../../../constants/cms-layout-types";
import type { PhiCmsLayoutPlugin } from "../../../types";
import { PHI_REGION_WIDGET_DEFAULT_LABELS } from "../../widgets/label-types/region";
import { PhiStructureRegionLayout } from "../phi-structure-region-layout";
import { definePhiLayoutRenderers } from "../layout-plugin-renderers";
import { PHI_STRUCTURE_REGION_LAYOUT_DEFINITION } from "../layout-definitions";

type PhiStructureRegionLayoutConfig = Record<string, never>;

function parseConfig(): PhiStructureRegionLayoutConfig {
  return {};
}

export const PHI_STRUCTURE_REGION_LAYOUT_PLUGIN: PhiCmsLayoutPlugin<PhiStructureRegionLayoutConfig> = {
  ...PHI_STRUCTURE_REGION_LAYOUT_DEFINITION,
  parseConfig,
  ...definePhiLayoutRenderers<PhiStructureRegionLayoutConfig>(({ node, renderSequentialSlotChildren }) => {
    const slots = renderSequentialSlotChildren(node);

    return (
      <PhiStructureRegionLayout
        key={`layout-${node.id}`}
        blockId={node.id}
        labels={PHI_REGION_WIDGET_DEFAULT_LABELS}
        headerTop={slots[0] ?? null}
        headerMain={slots[1] ?? null}
        siderLeft={slots[2] ?? null}
        footerMain={slots[3] ?? null}
        footerBottom={slots[4] ?? null}
      />
    );
  }),
};

export const PHI_STRUCTURE_REGION_LAYOUT_PLUGIN_TYPE = PhiCmsLayoutType.StructureRegion;
