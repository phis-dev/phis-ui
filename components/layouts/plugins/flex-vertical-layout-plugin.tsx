import {
  PhiCmsLayoutType,
} from "../../../constants/cms-layout-types";
import { resolvePhiLayoutDefaults } from "../../../helpers/cms-layout-defaults";
import type { PhiCmsLayoutPlugin } from "../../../types";
import type { PhiCmsFlexVerticalLayoutConfig } from "../../../types/cms-config";
import {
  parsePhiCmsFlexVerticalLayoutConfig,
} from "../../../types/cms-config";
import {
  serializePhiBaseLayoutConfigWithDefaults,
} from "../phi-layout-contract";
import { resolvePhiAnchorPlacement } from "../phi-layout-contract";
import { PhiFlexVerticalLayout } from "../phi-flex-vertical-layout";
import { definePhiLayoutRenderers } from "../layout-plugin-renderers";
import { PHI_FLEX_VERTICAL_LAYOUT_DEFINITION } from "../layout-definitions";

function serializePhiCmsFlexVerticalLayoutConfig(value: unknown) {
  return serializePhiBaseLayoutConfigWithDefaults<PhiCmsFlexVerticalLayoutConfig>(
    value,
    resolvePhiLayoutDefaults("verticalflex"),
    (next, normalized) => {
      next.initialSlotStates = normalized.initialSlotStates;
      next.anchor = normalized.anchor;
      next.gap = normalized.gap;
    },
  );
}

export const PHI_FLEX_VERTICAL_LAYOUT_PLUGIN: PhiCmsLayoutPlugin<PhiCmsFlexVerticalLayoutConfig> = {
  ...PHI_FLEX_VERTICAL_LAYOUT_DEFINITION,
  parseConfig: parsePhiCmsFlexVerticalLayoutConfig,
  serializeConfig: serializePhiCmsFlexVerticalLayoutConfig,
  ...definePhiLayoutRenderers<PhiCmsFlexVerticalLayoutConfig>((
    { node, config, layoutKind, renderSequentialSlotChildren },
    renderMode,
  ) => (
    <PhiFlexVerticalLayout
      key={`layout-${node.id}`}
      blockId={node.id}
      layoutKind={layoutKind}
      slots={renderSequentialSlotChildren(node)}
      renderMode={renderMode}
      gap={config.gap}
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
      initialSlotStates={config.initialSlotStates}
    />
  )),
};

export const PHI_FLEX_VERTICAL_LAYOUT_PLUGIN_TYPE = PhiCmsLayoutType.FlexVertical;
