import type { PhiCmsLayoutPlugin } from "../../../types";
import type { PhiCmsMasonryLayoutConfig } from "../../../types/cms-config";
import { parsePhiCmsMasonryLayoutConfig } from "../../../types/cms-config";
import { PhiMasonryLayout } from "../phi-masonry-layout";
import { definePhiLayoutRenderers } from "../layout-plugin-renderers";
import { PHI_MASONRY_LAYOUT_DEFINITION } from "../layout-definitions";

export const PHI_MASONRY_LAYOUT_PLUGIN: PhiCmsLayoutPlugin<PhiCmsMasonryLayoutConfig> = {
  ...PHI_MASONRY_LAYOUT_DEFINITION,
  parseConfig: parsePhiCmsMasonryLayoutConfig,
  ...definePhiLayoutRenderers<PhiCmsMasonryLayoutConfig>((
    { node, config, renderSequentialSlotChildren },
    renderMode,
  ) => (
    <PhiMasonryLayout
      key={`layout-${node.id}`}
      blockId={node.id}
      layoutKind="masonry"
      slots={renderSequentialSlotChildren(node)}
      renderMode={renderMode}
      columns={config.columns}
      minColumnWidth={config.minColumnWidth}
      gap={config.gap}
      zIndex={config.zIndex}
      surface={config.surface}
      size={config.size}
      minSize={config.minSize}
      maxSize={config.maxSize}
      collapsedSizeHint={config.collapsedSizeHint}
      padding={config.padding}
      paddingTop={config.paddingTop}
      paddingRight={config.paddingRight}
      paddingBottom={config.paddingBottom}
      paddingLeft={config.paddingLeft}
      labelEnd={config.labelEnd}
    />
  )),
};
