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
    { node, config, layoutKind, renderSequentialSlotChildren },
    renderMode,
  ) => (
    <PhiGridLayout
      key={`layout-${node.id}`}
      blockId={node.id}
      layoutKind={layoutKind}
      slots={renderSequentialSlotChildren(node)}
      renderMode={renderMode}
      gap={config.gap}
      anchor={config.anchor}
      editSlotAnchor={resolvePhiLayoutAnchor(config.anchor)}
      columnGap={config.columnGap}
      slotPlacements={config.slotPlacements}
      align={config.align}
      justify={config.justify}
      wrap={config.wrap}
      size={config.size}
      minSize={config.minSize}
      maxSize={config.maxSize}
      collapsedSizeHint={config.collapsedSizeHint}
      shadow={config.shadow}
      effect={config.effect}
      padding={config.padding}
      background={config.background}
      borderSource={config.borderSource}
      border={config.border}
      borderRadius={config.borderRadius}
      labelEnd={config.labelEnd}
    />
  )),
};
