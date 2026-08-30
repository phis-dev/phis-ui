import { PhiCmsLayoutType } from "../../../constants/cms-layout-types";
import type { PhiCmsLayoutPlugin } from "../../../types";
import type { PhiCmsFormLayoutConfig } from "../../../types/cms-config";
import { resolvePhiLayoutDefaults } from "../../../helpers/cms-layout-defaults";
import { parsePhiCmsFormLayoutConfig } from "../../../types/cms-config";
import {
  resolvePhiAnchorPlacement,
  serializePhiBaseLayoutConfigWithDefaults,
} from "../phi-layout-contract";
import { PhiFormLayout } from "../phi-form-layout";
import { definePhiLayoutRenderers } from "../layout-plugin-renderers";
import { PHI_FORM_LAYOUT_DEFINITION } from "../layout-definitions";

function serializePhiCmsFormLayoutConfig(value: unknown) {
  return serializePhiBaseLayoutConfigWithDefaults<PhiCmsFormLayoutConfig>(
    value,
    resolvePhiLayoutDefaults("form"),
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

export const PHI_FORM_LAYOUT_PLUGIN: PhiCmsLayoutPlugin<PhiCmsFormLayoutConfig> = {
  ...PHI_FORM_LAYOUT_DEFINITION,
  serializeConfig: serializePhiCmsFormLayoutConfig,
  parseConfig: parsePhiCmsFormLayoutConfig,
  ...definePhiLayoutRenderers<PhiCmsFormLayoutConfig>(({ node, config, layoutKind, renderChildren }, renderMode) => (
    <PhiFormLayout
      key={`layout-${node.id}`}
      blockId={node.id}
      layoutKind={layoutKind}
      slots={renderChildren(node)}
      renderMode={renderMode}
      size={config.size}
      maxSize={config.maxSize}
      minSize={config.minSize}
      margin={config.margin}
      editSlotAnchor={config.anchor ? resolvePhiAnchorPlacement(config.anchor) : undefined}
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
    />
  )),
};

export const PHI_FORM_LAYOUT_PLUGIN_TYPE = PhiCmsLayoutType.Form;
