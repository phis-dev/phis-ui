import { PhiCmsLayoutType } from "../../../constants/cms-layout-types";
import type { PhiCmsLayoutPlugin } from "../../../types";
import type { PhiCmsGridLayoutConfig } from "../../../types/cms-config";
import { parsePhiCmsGridLayoutConfig } from "../../../types/cms-config";
import {
  resolvePhiAnchorPlacement,
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
      editSlotAnchor={config.anchor ? resolvePhiAnchorPlacement(config.anchor) : undefined}
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
      border={config.border}
      borderRadius={config.borderRadius}
    />
  )),
};

export const PHI_GRID_LAYOUT_PLUGIN_TYPE = PhiCmsLayoutType.Grid;
