import {
  PHI_CMS_COLLAPSIBLE_LAYOUT_SLOTS,
  PhiCmsLayoutType,
} from "../../../constants/cms-layout-types";
import type { PhiCmsLayoutPlugin } from "../../../types";
import type { PhiCmsCollapsibleLayoutConfig } from "../../../types/cms-config";
import {
  parsePhiCmsCollapsibleLayoutConfig,
} from "../../../types/cms-config";
import {
  resolvePhiAnchorPlacement,
} from "../phi-layout-contract";
import { PhiCollapsibleLayout } from "../phi-collapsible-layout";
import { definePhiLayoutRenderers } from "../layout-plugin-renderers";
import type { PhiCmsLayoutRenderNode } from "../../../types/cms";
import { comparePhiCmsInstanceIds } from "../../../types/cms-instance-id";
import { PHI_COLLAPSIBLE_LAYOUT_DEFINITION } from "../layout-definitions";

function resolvePhiCollapsibleSlotKeys() {
  return PHI_CMS_COLLAPSIBLE_LAYOUT_SLOTS.map((slot) => slot.key);
}

function resolvePhiCollapsibleSlotMeta(
  node: PhiCmsLayoutRenderNode,
  config: PhiCmsCollapsibleLayoutConfig,
) {
  const occupiedSlotIndices = new Set<number>();
  const children = [
    ...(node.childLayouts ?? []).map((child) => ({ ...child, _kindOrder: 0 })),
    ...(node.childWidgets ?? []).map((child) => ({ ...child, _kindOrder: 1 })),
  ].sort((left, right) => left.slotIndex - right.slotIndex || left.sortOrder - right.sortOrder || left._kindOrder - right._kindOrder || comparePhiCmsInstanceIds(left.id, right.id));

  for (const child of children) {
    occupiedSlotIndices.add(child.slotIndex);
  }

  return PHI_CMS_COLLAPSIBLE_LAYOUT_SLOTS.map((slot) => ({
    key: slot.key,
    label: node.resolvedSlotTitles?.[slot.slotIndex]?.trim() || config.slotTitles?.[slot.slotIndex]?.trim() || slot.label,
    slotIndex: slot.slotIndex,
    hasContent: occupiedSlotIndices.has(slot.slotIndex),
  }));
}

export const PHI_COLLAPSIBLE_LAYOUT_PLUGIN: PhiCmsLayoutPlugin<PhiCmsCollapsibleLayoutConfig> = {
  ...PHI_COLLAPSIBLE_LAYOUT_DEFINITION,
  parseConfig: parsePhiCmsCollapsibleLayoutConfig,
  ...definePhiLayoutRenderers<PhiCmsCollapsibleLayoutConfig>((
    { node, config, layoutKind, renderSequentialSlotChildren },
    renderMode,
  ) => (
    <PhiCollapsibleLayout
      key={`layout-${node.id}`}
      blockId={node.id}
      layoutKind={layoutKind}
      slots={renderSequentialSlotChildren(node)}
      slotKeys={resolvePhiCollapsibleSlotKeys()}
      slotMeta={resolvePhiCollapsibleSlotMeta(node, config)}
      renderMode={renderMode}
      anchor={config.anchor}
      editSlotAnchor={config.anchor ? resolvePhiAnchorPlacement(config.anchor) : undefined}
      panelMinHeight={config.panelMinHeight}
      accordion={config.accordion}
      slotTitles={node.resolvedSlotTitles ?? config.slotTitles}
      translateSlotTitles={config.translateSlotTitles}
      defaultOpenSlotKeys={config.defaultOpenSlotKeys}
      collapsible={config.collapsible}
      bordered={config.bordered}
      ghost={config.ghost}
      expandIconPlacement={config.expandIconPlacement}
      collapseSize={config.collapseSize}
      titleStrong={config.titleStrong}
      headerPadding={config.headerPadding}
      innerPadding={config.innerPadding}
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

export const PHI_COLLAPSIBLE_LAYOUT_PLUGIN_TYPE = PhiCmsLayoutType.Collapsible;
