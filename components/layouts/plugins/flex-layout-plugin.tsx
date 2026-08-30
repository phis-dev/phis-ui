import {
  PhiCmsLayoutType,
} from "../../../constants/cms-layout-types";
import { resolvePhiLayoutDefaults } from "../../../helpers/cms-layout-defaults";
import type { PhiCmsLayoutPlugin } from "../../../types";
import type { PhiCmsFlexLayoutConfig } from "../../../types/cms-config";
import { parsePhiCmsFlexLayoutConfig } from "../../../types/cms-config";
import {
  serializePhiBaseLayoutConfigWithDefaults,
} from "../phi-layout-contract";
import { resolvePhiAnchorPlacement } from "../phi-layout-contract";
import { PhiFlexLayout } from "../phi-flex-layout";
import { definePhiLayoutRenderers } from "../layout-plugin-renderers";
import { PHI_FLEX_LAYOUT_DEFINITION } from "../layout-definitions";

function serializePhiCmsFlexLayoutConfig(value: unknown) {
  return serializePhiBaseLayoutConfigWithDefaults<PhiCmsFlexLayoutConfig>(
    value,
    resolvePhiLayoutDefaults("flex"),
    (next, normalized) => {
      next.initialSlotStates = normalized.initialSlotStates;
      next.anchor = normalized.anchor;
      next.gap = normalized.gap;
      next.distribution = normalized.distribution;
      next.verticalSeparators = normalized.verticalSeparators;
      next.separatorBeforeFirst = normalized.separatorBeforeFirst;
      next.separatorSpan = normalized.separatorSpan;
      next.wrap = normalized.wrap;
    },
  );
}

export const PHI_FLEX_LAYOUT_PLUGIN: PhiCmsLayoutPlugin<PhiCmsFlexLayoutConfig> = {
  ...PHI_FLEX_LAYOUT_DEFINITION,
  serializeConfig: serializePhiCmsFlexLayoutConfig,
  parseConfig: parsePhiCmsFlexLayoutConfig,
  ...definePhiLayoutRenderers<PhiCmsFlexLayoutConfig>((
    { node, config, layoutKind, renderSequentialSlotChildren },
    renderMode,
  ) => (
    <PhiFlexLayout
      key={`layout-${node.id}`}
      blockId={node.id}
      layoutKind={layoutKind}
      slots={renderSequentialSlotChildren(node)}
      renderMode={renderMode}
      gap={config.gap}
      distribution={config.distribution}
      wrap={config.wrap}
      editSlotAnchor={config.anchor ? resolvePhiAnchorPlacement(config.anchor) : undefined}
      verticalSeparators={config.verticalSeparators}
      separatorBeforeFirst={config.separatorBeforeFirst}
      separatorSpan={config.separatorSpan}
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

export const PHI_FLEX_LAYOUT_PLUGIN_TYPE = PhiCmsLayoutType.Flex;
