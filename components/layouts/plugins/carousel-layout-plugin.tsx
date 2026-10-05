import {
  PHI_CMS_CAROUSEL_LAYOUT_SLOTS,
} from "../../../constants/cms-layout-types";
import type { PhiCmsLayoutPlugin } from "../../../types";
import type { PhiCmsCarouselLayoutConfig } from "../../../types/cms-config";
import { parsePhiCmsCarouselLayoutConfig } from "../../../types/cms-config";
import { resolvePhiLayoutAnchor } from "../phi-layout-contract";
import { PhiCarouselLayout } from "../phi-carousel-layout";
import { definePhiLayoutRenderers } from "../layout-plugin-renderers";
import { resolvePhiLayoutSlotMeta } from "../layout-slot-meta";
import { PHI_CAROUSEL_LAYOUT_DEFINITION } from "../layout-definitions";

function resolvePhiCarouselSlotKeys() {
  return PHI_CMS_CAROUSEL_LAYOUT_SLOTS.map((slot) => slot.key);
}

export const PHI_CAROUSEL_LAYOUT_PLUGIN: PhiCmsLayoutPlugin<PhiCmsCarouselLayoutConfig> = {
  ...PHI_CAROUSEL_LAYOUT_DEFINITION,
  parseConfig: parsePhiCmsCarouselLayoutConfig,
  ...definePhiLayoutRenderers<PhiCmsCarouselLayoutConfig>((
    { node, config, renderSequentialSlotChildren },
    renderMode,
  ) => (
    <PhiCarouselLayout
      key={`layout-${node.id}`}
      blockId={node.id}
      layoutKind="carousel"
      slots={renderSequentialSlotChildren(node)}
      slotKeys={resolvePhiCarouselSlotKeys()}
      slotMeta={resolvePhiLayoutSlotMeta(node, PHI_CMS_CAROUSEL_LAYOUT_SLOTS)}
      renderMode={renderMode}
      defaultActiveSlotKey={config.defaultActiveSlotKey}
      visibleSlots={config.visibleSlots}
      windowAnchor={config.windowAnchor}
      transition={config.transition}
      transitionDurationMs={config.transitionDurationMs}
      transitionEasing={config.transitionEasing}
      slotGap={config.slotGap}
      controls={config.controls}
      loop={config.loop}
      autoplayMs={config.autoplayMs}
      lookahead={config.lookahead}
      slotAnchor={resolvePhiLayoutAnchor(config.anchor, PHI_CAROUSEL_LAYOUT_DEFINITION.defaultAnchor)}
      editSlotAnchor={resolvePhiLayoutAnchor(config.anchor, PHI_CAROUSEL_LAYOUT_DEFINITION.defaultAnchor)}
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
