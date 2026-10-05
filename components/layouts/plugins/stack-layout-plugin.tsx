import {
  PHI_CMS_STACK_LAYOUT_SLOTS,
} from "../../../constants/cms-layout-types";
import type { PhiCmsLayoutPlugin } from "../../../types";
import type { PhiCmsStackLayoutConfig } from "../../../types/cms-config";
import { parsePhiCmsStackLayoutConfig } from "../../../types/cms-config";
import {
  resolvePhiLayoutAnchor,
} from "../phi-layout-contract";
import { PhiStackLayout } from "../phi-stack-layout";
import { definePhiLayoutRenderers } from "../layout-plugin-renderers";
import { resolvePhiLayoutSlotMeta } from "../layout-slot-meta";
import { PHI_STACK_LAYOUT_DEFINITION } from "../layout-definitions";

function resolvePhiStackSlotKeys() {
  return PHI_CMS_STACK_LAYOUT_SLOTS.map((slot) => slot.key);
}

export const PHI_STACK_LAYOUT_PLUGIN: PhiCmsLayoutPlugin<PhiCmsStackLayoutConfig> = {
  ...PHI_STACK_LAYOUT_DEFINITION,
  parseConfig: parsePhiCmsStackLayoutConfig,
  ...definePhiLayoutRenderers<PhiCmsStackLayoutConfig>((
    { node, config, renderSequentialSlotChildren },
    renderMode,
  ) => (
    <PhiStackLayout
      key={`layout-${node.id}`}
      blockId={node.id}
      layoutKind="stack"
      slots={renderSequentialSlotChildren(node)}
      slotKeys={resolvePhiStackSlotKeys()}
      slotMeta={resolvePhiLayoutSlotMeta(node, PHI_CMS_STACK_LAYOUT_SLOTS)}
      renderMode={renderMode}
      defaultActiveSlotKey={config.defaultActiveSlotKey}
      slotDisplay={config.slotDisplay}
      mountPolicy={config.mountPolicy}
      slotTransition={config.slotTransition}
      slotTransitionDurationMs={config.slotTransitionDurationMs}
      slotTransitionEasing={config.slotTransitionEasing}
      slotAnchor={resolvePhiLayoutAnchor(config.anchor, PHI_STACK_LAYOUT_DEFINITION.defaultAnchor)}
      editSlotAnchor={resolvePhiLayoutAnchor(config.anchor, PHI_STACK_LAYOUT_DEFINITION.defaultAnchor)}
      zIndex={config.zIndex}
      surface={config.surface}
      padding={config.padding}
      paddingTop={config.paddingTop}
      paddingRight={config.paddingRight}
      paddingBottom={config.paddingBottom}
      paddingLeft={config.paddingLeft}
      labelEnd={config.labelEnd}
      size={config.size}
      minSize={config.minSize}
      maxSize={config.maxSize}
      collapsedSizeHint={config.collapsedSizeHint}
    />
  )),
};
