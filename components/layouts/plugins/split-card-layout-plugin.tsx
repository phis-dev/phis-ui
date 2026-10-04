import type { PhiCmsLayoutPlugin } from "../../../types";
import type { PhiCmsSplitCardLayoutConfig } from "../../../types/cms-config";
import { parsePhiCmsSplitCardLayoutConfig } from "../../../types/cms-config";
import { resolvePhiLayoutAnchor } from "../phi-layout-contract";
import { PhiSplitCardLayout } from "../phi-split-card-layout";
import { definePhiLayoutRenderers } from "../layout-plugin-renderers";
import { PHI_SPLIT_CARD_LAYOUT_DEFINITION } from "../layout-definitions";

export const PHI_SPLIT_CARD_LAYOUT_PLUGIN: PhiCmsLayoutPlugin<PhiCmsSplitCardLayoutConfig> = {
  ...PHI_SPLIT_CARD_LAYOUT_DEFINITION,
  parseConfig: parsePhiCmsSplitCardLayoutConfig,
  ...definePhiLayoutRenderers<PhiCmsSplitCardLayoutConfig>((
    { node, config, renderSequentialSlotChildren },
    renderMode,
  ) => (
    <PhiSplitCardLayout
      key={`layout-${node.id}`}
      blockId={node.id}
      layoutKind="split"
      slots={renderSequentialSlotChildren(node)}
      gap={config.gap}
      swapRatio={config.swapRatio}
      zIndex={config.zIndex}
      surface={config.surface}
      padding={config.padding}
      paddingTop={config.paddingTop}
      paddingBottom={config.paddingBottom}
      labelEnd={config.labelEnd}
      editSlotAnchor={resolvePhiLayoutAnchor(config.anchor, PHI_SPLIT_CARD_LAYOUT_DEFINITION.defaultAnchor)}
      size={config.size}
      minSize={config.minSize}
      maxSize={config.maxSize}
      collapsedSizeHint={config.collapsedSizeHint}
      renderMode={renderMode}
    />
  )),
};
