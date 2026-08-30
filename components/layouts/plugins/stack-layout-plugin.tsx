import {
  PHI_CMS_STACK_LAYOUT_SLOTS,
  PhiCmsLayoutType,
} from "../../../constants/cms-layout-types";
import { resolvePhiLayoutDefaults } from "../../../helpers/cms-layout-defaults";
import type { PhiCmsLayoutPlugin } from "../../../types";
import type { PhiCmsStackLayoutConfig } from "../../../types/cms-config";
import { parsePhiCmsStackLayoutConfig } from "../../../types/cms-config";
import {
  serializePhiBaseLayoutConfigWithDefaults,
  resolvePhiAnchorPlacement,
} from "../phi-layout-contract";
import { PhiStackLayout } from "../phi-stack-layout";
import { definePhiLayoutRenderers } from "../layout-plugin-renderers";
import type { PhiCmsLayoutRenderNode } from "../../../types/cms";
import { comparePhiCmsInstanceIds } from "../../../types/cms-instance-id";
import { PHI_STACK_LAYOUT_DEFINITION } from "../layout-definitions";

function serializePhiCmsStackLayoutConfig(value: unknown) {
  return serializePhiBaseLayoutConfigWithDefaults<PhiCmsStackLayoutConfig>(
    value,
    resolvePhiLayoutDefaults("stack"),
    (next, normalized) => {
      next.activeSlotKey = normalized.activeSlotKey;
      next.defaultActiveSlotKey = normalized.defaultActiveSlotKey;
      next.mountPolicy = normalized.mountPolicy;
      next.slotTransition = normalized.slotTransition;
    },
  );
}

function resolvePhiStackSlotKeys() {
  return PHI_CMS_STACK_LAYOUT_SLOTS.map((slot) => slot.key);
}

function resolvePhiStackSlotMeta(node: PhiCmsLayoutRenderNode) {
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

  return PHI_CMS_STACK_LAYOUT_SLOTS
    .filter((slot) => occupiedSlotIndices.has(slot.slotIndex))
    .map((slot) => ({
      key: slot.key,
      label: labelsBySlotIndex.get(slot.slotIndex) ?? slot.label,
      slotIndex: slot.slotIndex,
      hasContent: true,
    }));
}

export const PHI_STACK_LAYOUT_PLUGIN: PhiCmsLayoutPlugin<PhiCmsStackLayoutConfig> = {
  ...PHI_STACK_LAYOUT_DEFINITION,
  serializeConfig: serializePhiCmsStackLayoutConfig,
  parseConfig: parsePhiCmsStackLayoutConfig,
  ...definePhiLayoutRenderers<PhiCmsStackLayoutConfig>((
    { node, config, layoutKind, renderSequentialSlotChildren },
    renderMode,
  ) => (
    <PhiStackLayout
      key={`layout-${node.id}`}
      blockId={node.id}
      layoutKind={layoutKind}
      slots={renderSequentialSlotChildren(node)}
      slotKeys={resolvePhiStackSlotKeys()}
      slotMeta={resolvePhiStackSlotMeta(node)}
      renderMode={renderMode}
      activeSlotKey={config.activeSlotKey}
      defaultActiveSlotKey={config.defaultActiveSlotKey}
      mountPolicy={config.mountPolicy}
      slotTransition={config.slotTransition}
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

export const PHI_STACK_LAYOUT_PLUGIN_TYPE = PhiCmsLayoutType.Stack;
