import {
  PHI_CMS_CAROUSEL_LAYOUT_SLOTS,
  PhiCmsLayoutType,
} from "../../../constants/cms-layout-types";
import type { PhiCmsLayoutPlugin } from "../../../types";
import type { PhiCmsCarouselLayoutConfig } from "../../../types/cms-config";
import { parsePhiCmsCarouselLayoutConfig } from "../../../types/cms-config";
import { resolvePhiAnchorPlacement } from "../phi-layout-contract";
import { PhiCarouselLayout } from "../phi-carousel-layout";
import { definePhiLayoutRenderers } from "../layout-plugin-renderers";
import type { PhiCmsLayoutRenderNode } from "../../../types/cms";
import { comparePhiCmsInstanceIds } from "../../../types/cms-instance-id";
import { PHI_CAROUSEL_LAYOUT_DEFINITION } from "../layout-definitions";

function resolvePhiCarouselSlotKeys() {
  return PHI_CMS_CAROUSEL_LAYOUT_SLOTS.map((slot) => slot.key);
}

/**
 * What the pager Widgets are told this Carousel holds.
 *
 * Only the filled slots, named the way the person who filled them named them, because a Segmented
 * offering twelve entries for three pictures would be a list of mostly nothing.
 */
function resolvePhiCarouselSlotMeta(node: PhiCmsLayoutRenderNode) {
  const labelsBySlotIndex = new Map<number, string>();
  const occupiedSlotIndices = new Set<number>();
  const children = [
    ...(node.childLayouts ?? []).map((child) => ({ ...child, _kindOrder: 0 })),
    ...(node.childWidgets ?? []).map((child) => ({ ...child, _kindOrder: 1 })),
  ].sort((left, right) => left.slotIndex - right.slotIndex || left.sortOrder - right.sortOrder || left._kindOrder - right._kindOrder || comparePhiCmsInstanceIds(left.id, right.id));

  for (const child of children) {
    occupiedSlotIndices.add(child.slotIndex);
    const label = child.label?.trim();
    if (label && !labelsBySlotIndex.has(child.slotIndex)) {
      labelsBySlotIndex.set(child.slotIndex, label);
    }
  }

  return PHI_CMS_CAROUSEL_LAYOUT_SLOTS
    .filter((slot) => occupiedSlotIndices.has(slot.slotIndex))
    .map((slot) => ({
      key: slot.key,
      label: labelsBySlotIndex.get(slot.slotIndex) ?? slot.label,
      slotIndex: slot.slotIndex,
      hasContent: true,
    }));
}

export const PHI_CAROUSEL_LAYOUT_PLUGIN: PhiCmsLayoutPlugin<PhiCmsCarouselLayoutConfig> = {
  ...PHI_CAROUSEL_LAYOUT_DEFINITION,
  parseConfig: parsePhiCmsCarouselLayoutConfig,
  ...definePhiLayoutRenderers<PhiCmsCarouselLayoutConfig>((
    { node, config, layoutKind, renderSequentialSlotChildren },
    renderMode,
  ) => (
    <PhiCarouselLayout
      key={`layout-${node.id}`}
      blockId={node.id}
      layoutKind={layoutKind}
      slots={renderSequentialSlotChildren(node)}
      slotKeys={resolvePhiCarouselSlotKeys()}
      slotMeta={resolvePhiCarouselSlotMeta(node)}
      renderMode={renderMode}
      activeSlotKey={config.activeSlotKey}
      defaultActiveSlotKey={config.defaultActiveSlotKey}
      visibleSlots={config.visibleSlots}
      windowAnchor={config.windowAnchor}
      transition={config.transition}
      transitionDurationMs={config.transitionDurationMs}
      transitionEasing={config.transitionEasing}
      slotGap={config.slotGap}
      loop={config.loop}
      autoplayMs={config.autoplayMs}
      lookahead={config.lookahead}
      slotAnchor={config.anchor ? resolvePhiAnchorPlacement(config.anchor) : undefined}
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
    />
  )),
};

export const PHI_CAROUSEL_LAYOUT_PLUGIN_TYPE = PhiCmsLayoutType.Carousel;
