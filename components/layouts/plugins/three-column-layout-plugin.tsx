import { PhiCmsLayoutType } from "../../../constants/cms-layout-types";
import type { PhiCmsLayoutPlugin } from "../../../types";
import type { PhiCmsThreeColumnLayoutConfig } from "../../../types/cms-config";
import { parsePhiCmsThreeColumnLayoutConfig } from "../../../types/cms-config";
import { resolvePhiAnchorPlacement } from "../phi-layout-contract";
import { PhiThreeColumnLayout } from "../phi-three-column-layout";
import { definePhiLayoutRenderers } from "../layout-plugin-renderers";
import { PHI_THREE_COLUMN_LAYOUT_DEFINITION } from "../layout-definitions";

export const PHI_THREE_COLUMN_LAYOUT_PLUGIN: PhiCmsLayoutPlugin<PhiCmsThreeColumnLayoutConfig> = {
  ...PHI_THREE_COLUMN_LAYOUT_DEFINITION,
  parseConfig: parsePhiCmsThreeColumnLayoutConfig,
  ...definePhiLayoutRenderers<PhiCmsThreeColumnLayoutConfig>((
    { node, config, layoutKind, renderSequentialSlotChildren },
    renderMode,
  ) => (
    <PhiThreeColumnLayout
      key={`layout-${node.id}`}
      blockId={node.id}
      layoutKind={layoutKind}
      slots={renderSequentialSlotChildren(node)}
      balancedSides={config.balancedSides}
      gap={config.gap}
      align={config.align}
      justify={config.justify}
      wrap={config.wrap}
      leftWidth={config.leftWidth}
      middleWidth={config.middleWidth}
      rightWidth={config.rightWidth}
      editSlotAnchor={config.anchor ? resolvePhiAnchorPlacement(config.anchor) : undefined}
      zIndex={config.zIndex}
      shadow={config.shadow}
      effect={config.effect}
      padding={config.padding}
      paddingTop={config.paddingTop}
      paddingRight={config.paddingRight}
      paddingBottom={config.paddingBottom}
      paddingLeft={config.paddingLeft}
      background={config.background}
      border={config.border}
      borderRadius={config.borderRadius}
      size={config.size}
      minSize={config.minSize}
      maxSize={config.maxSize}
      collapsedSizeHint={config.collapsedSizeHint}
      renderMode={renderMode}
    />
  )),
};

export const PHI_THREE_COLUMN_LAYOUT_PLUGIN_TYPE = PhiCmsLayoutType.ThreeColumn;
