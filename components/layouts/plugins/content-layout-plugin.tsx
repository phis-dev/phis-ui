import {
  PhiCmsLayoutType,
} from "../../../constants/cms-layout-types";
import type { PhiCmsLayoutPlugin } from "../../../types";
import type { PhiCmsContentLayoutConfig } from "../../../types/cms-config";
import { resolvePhiLayoutDefaults } from "../../../helpers/cms-layout-defaults";
import { parsePhiCmsContentLayoutConfig } from "../../../types/cms-config";
import {
  serializePhiBaseLayoutConfigWithDefaults,
} from "../phi-layout-contract";
import { PhiContentLayout } from "../phi-content-layout";
import { definePhiLayoutRenderers } from "../layout-plugin-renderers";
import { PHI_CONTENT_LAYOUT_DEFINITION } from "../layout-definitions";

function serializePhiCmsContentLayoutConfig(value: unknown) {
  return serializePhiBaseLayoutConfigWithDefaults<PhiCmsContentLayoutConfig>(
    value,
    resolvePhiLayoutDefaults("content"),
    (next, normalized) => {
      next.margin = normalized.margin;
      next.paddingLeft = normalized.paddingLeft;
      next.paddingRight = normalized.paddingRight;
      next.paddingTop = normalized.paddingTop;
      next.paddingBottom = normalized.paddingBottom;
      next.anchor = normalized.anchor;
    },
  );
}

export const PHI_CONTENT_LAYOUT_PLUGIN: PhiCmsLayoutPlugin<PhiCmsContentLayoutConfig> = {
  ...PHI_CONTENT_LAYOUT_DEFINITION,
  serializeConfig: serializePhiCmsContentLayoutConfig,
  parseConfig: parsePhiCmsContentLayoutConfig,
  ...definePhiLayoutRenderers<PhiCmsContentLayoutConfig>(({ node, config, layoutKind, renderChildren }, renderMode) => (
    <PhiContentLayout
      key={`layout-${node.id}`}
      blockId={node.id}
      layoutKind={layoutKind}
      slots={renderChildren(node)}
      renderMode={renderMode}
      size={config.size}
      minSize={config.minSize}
      maxSize={config.maxSize}
      margin={config.margin}
      zIndex={config.zIndex}
      shadow={config.shadow}
      effect={config.effect}
      padding={config.padding}
      paddingLeft={config.paddingLeft}
      paddingRight={config.paddingRight}
      paddingTop={config.paddingTop}
      paddingBottom={config.paddingBottom}
      background={config.background}
      border={config.border}
      borderRadius={config.borderRadius}
      editSlotAnchor={config.anchor ?? "center"}
    />
  )),
};

export const PHI_CONTENT_LAYOUT_PLUGIN_TYPE = PhiCmsLayoutType.Content;
