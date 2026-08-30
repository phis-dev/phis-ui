import { PhiCmsLayoutType } from "../../../constants/cms-layout-types";
import { resolvePhiLayoutDefaults } from "../../../helpers/cms-layout-defaults";
import type { PhiCmsLayoutPlugin } from "../../../types";
import type { PhiCmsGridLayoutConfig } from "../../../types/cms-config";
import { parsePhiCmsGridLayoutConfig } from "../../../types/cms-config";
import {
  serializePhiBaseLayoutConfigWithDefaults,
  resolvePhiAnchorPlacement,
} from "../phi-layout-contract";
import { PhiGridLayout } from "../phi-grid-layout";
import { definePhiLayoutRenderers } from "../layout-plugin-renderers";
import { PHI_GRID_LAYOUT_DEFINITION } from "../layout-definitions";

function serializePhiCmsGridLayoutConfig(value: unknown) {
  return serializePhiBaseLayoutConfigWithDefaults<PhiCmsGridLayoutConfig>(
    value,
    resolvePhiLayoutDefaults("grid"),
    (next, normalized) => {
      next.gap = normalized.gap;
      next.anchor = normalized.anchor;
      next.columnGap = normalized.columnGap;
      next.wrap = normalized.wrap;
      next.slotPlacements = normalized.slotPlacements;
      next.slotBackground = normalized.slotBackground;
      next.slotBorder = normalized.slotBorder;
      next.slotBorderRadius = normalized.slotBorderRadius;
      next.slotShadow = normalized.slotShadow;
    },
  );
}

export const PHI_GRID_LAYOUT_PLUGIN: PhiCmsLayoutPlugin<PhiCmsGridLayoutConfig> = {
  ...PHI_GRID_LAYOUT_DEFINITION,
  serializeConfig: serializePhiCmsGridLayoutConfig,
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
