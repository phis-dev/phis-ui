import { PhiCmsLayoutType } from "../../../constants/cms-layout-types";
import type { PhiCmsLayoutPlugin } from "../../../types";
import type { PhiCmsSplitCardLayoutConfig } from "../../../types/cms-config";
import { parsePhiCmsSplitCardLayoutConfig } from "../../../types/cms-config";
import {
  resolvePhiAnchorPlacement,
} from "../phi-layout-contract";
import { PhiSplitCardLayout } from "../phi-split-card-layout";
import { definePhiLayoutRenderers } from "../layout-plugin-renderers";
import { PHI_SPLIT_CARD_LAYOUT_DEFINITION } from "../layout-definitions";

export const PHI_SPLIT_CARD_LAYOUT_PLUGIN: PhiCmsLayoutPlugin<PhiCmsSplitCardLayoutConfig> = {
  ...PHI_SPLIT_CARD_LAYOUT_DEFINITION,
  parseConfig: parsePhiCmsSplitCardLayoutConfig,
  ...definePhiLayoutRenderers<PhiCmsSplitCardLayoutConfig>((
    { node, config, layoutKind, renderSequentialSlotChildren },
    renderMode,
  ) => (
    <PhiSplitCardLayout
      key={`layout-${node.id}`}
      blockId={node.id}
      layoutKind={layoutKind}
      slots={renderSequentialSlotChildren(node)}
      gap={config.gap}
      zIndex={config.zIndex}
      shadow={config.shadow}
      padding={config.padding}
      paddingTop={config.paddingTop}
      paddingBottom={config.paddingBottom}
      background={config.background}
      border={config.border}
      borderRadius={config.borderRadius}
      effect={config.effect}
      editSlotAnchor={config.anchor ? resolvePhiAnchorPlacement(config.anchor) : undefined}
      leftPadding={config.leftPadding}
      rightPadding={config.rightPadding}
      leftBackground={config.leftBackground}
      rightBackground={config.rightBackground}
      leftBorder={config.leftBorder}
      rightBorder={config.rightBorder}
      leftShadow={config.leftShadow}
      rightShadow={config.rightShadow}
      size={config.size}
      minSize={config.minSize}
      maxSize={config.maxSize}
      collapsedSizeHint={config.collapsedSizeHint}
      renderMode={renderMode}
    />
  )),
};

export const PHI_SPLIT_CARD_LAYOUT_PLUGIN_TYPE = PhiCmsLayoutType.SplitCard;
