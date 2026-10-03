import {
} from "../../../constants/cms-layout-types";
import type { PhiCmsLayoutPlugin } from "../../../types";
import type { PhiCmsContentLayoutConfig } from "../../../types/cms-config";
import { parsePhiCmsContentLayoutConfig } from "../../../types/cms-config";
import { PhiContentLayout } from "../phi-content-layout";
import { definePhiLayoutRenderers } from "../layout-plugin-renderers";
import { PHI_CONTENT_LAYOUT_DEFINITION } from "../layout-definitions";
import { resolvePhiLayoutAnchor } from "../phi-layout-contract";

export const PHI_CONTENT_LAYOUT_PLUGIN: PhiCmsLayoutPlugin<PhiCmsContentLayoutConfig> = {
  ...PHI_CONTENT_LAYOUT_DEFINITION,
  parseConfig: parsePhiCmsContentLayoutConfig,
  ...definePhiLayoutRenderers<PhiCmsContentLayoutConfig>(({ node, config, renderChildren }, renderMode) => (
    <PhiContentLayout
      key={`layout-${node.id}`}
      blockId={node.id}
      layoutKind="content"
      slots={renderChildren(node)}
      renderMode={renderMode}
      size={config.size}
      minSize={config.minSize}
      maxSize={config.maxSize}
      margin={config.margin}
      zIndex={config.zIndex}
      surface={config.surface}
      padding={config.padding}
      paddingLeft={config.paddingLeft}
      paddingRight={config.paddingRight}
      paddingTop={config.paddingTop}
      paddingBottom={config.paddingBottom}
      labelEnd={config.labelEnd}
      editSlotAnchor={resolvePhiLayoutAnchor(config.anchor, PHI_CONTENT_LAYOUT_DEFINITION.defaultAnchor)}
    />
  )),
};
