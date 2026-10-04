import type { PhiCmsLayoutPlugin } from "../../../types";
import type { PhiCmsGridLayoutConfig } from "../../../types/cms-config";
import { parsePhiCmsGridLayoutConfig } from "../../../types/cms-config";
import {
  resolvePhiLayoutAnchor,
} from "../phi-layout-contract";
import { PhiGridLayout } from "../phi-grid-layout";
import { definePhiLayoutRenderers } from "../layout-plugin-renderers";
import { PHI_GRID_LAYOUT_DEFINITION } from "../layout-definitions";

export const PHI_GRID_LAYOUT_PLUGIN: PhiCmsLayoutPlugin<PhiCmsGridLayoutConfig> = {
  ...PHI_GRID_LAYOUT_DEFINITION,
  parseConfig: parsePhiCmsGridLayoutConfig,
  ...definePhiLayoutRenderers<PhiCmsGridLayoutConfig>((
    { node, config, renderSequentialSlotChildren },
    renderMode,
  ) => (
    <PhiGridLayout
      key={`layout-${node.id}`}
      blockId={node.id}
      layoutKind="grid"
      slots={renderSequentialSlotChildren(node)}
      renderMode={renderMode}
      gap={config.gap}
      anchor={config.anchor}
      editSlotAnchor={resolvePhiLayoutAnchor(config.anchor)}
      columns={config.columns}
      slotPlacements={config.slotPlacements}
      size={config.size}
      minSize={config.minSize}
      maxSize={config.maxSize}
      collapsedSizeHint={config.collapsedSizeHint}
      surface={config.surface}
      padding={config.padding}
      paddingTop={config.paddingTop}
      paddingRight={config.paddingRight}
      paddingBottom={config.paddingBottom}
      paddingLeft={config.paddingLeft}
      labelEnd={config.labelEnd}
    />
  )),
};
