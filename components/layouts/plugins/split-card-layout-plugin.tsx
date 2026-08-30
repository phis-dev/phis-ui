import { PhiCmsLayoutType } from "../../../constants/cms-layout-types";
import type { PhiCmsLayoutPlugin } from "../../../types";
import type { PhiCmsSplitCardLayoutConfig } from "../../../types/cms-config";
import { resolvePhiLayoutDefaults } from "../../../helpers/cms-layout-defaults";
import { parsePhiCmsSplitCardLayoutConfig } from "../../../types/cms-config";
import {
  serializePhiBaseLayoutConfigWithDefaults,
  resolvePhiAnchorPlacement,
} from "../phi-layout-contract";
import { PhiSplitCardLayout } from "../phi-split-card-layout";
import { definePhiLayoutRenderers } from "../layout-plugin-renderers";
import { PHI_SPLIT_CARD_LAYOUT_DEFINITION } from "../layout-definitions";

function serializePhiCmsSplitCardLayoutConfig(value: unknown) {
  return serializePhiBaseLayoutConfigWithDefaults<PhiCmsSplitCardLayoutConfig>(
    value,
    resolvePhiLayoutDefaults("split"),
    (next, normalized) => {
      next.gap = normalized.gap;
      next.paddingTop = normalized.paddingTop;
      next.paddingBottom = normalized.paddingBottom;
      next.effect = normalized.effect;
      next.leftPadding = normalized.leftPadding;
      next.rightPadding = normalized.rightPadding;
      next.leftBackground = normalized.leftBackground;
      next.rightBackground = normalized.rightBackground;
      next.leftBorder = normalized.leftBorder;
      next.rightBorder = normalized.rightBorder;
      next.leftShadow = normalized.leftShadow;
      next.rightShadow = normalized.rightShadow;
    },
  );
}

export const PHI_SPLIT_CARD_LAYOUT_PLUGIN: PhiCmsLayoutPlugin<PhiCmsSplitCardLayoutConfig> = {
  ...PHI_SPLIT_CARD_LAYOUT_DEFINITION,
  serializeConfig: serializePhiCmsSplitCardLayoutConfig,
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
