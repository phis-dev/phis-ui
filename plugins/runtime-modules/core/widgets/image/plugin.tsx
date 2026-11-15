import type { PhiCmsServerWidgetPlugin, PhiCmsWidgetPluginRenderArgs } from "../../../../../types";
import { definePhiPassiveWidgetRenderers } from "../../../../../plugins/factories/widget-renderers";
import { resolvePhiWidgetRecordField } from "../../../../../server-helpers/record-fields";
import type { PhiCmsImageWidgetConfig } from "./config";
import { PhiImageWidgetServer } from "./server";
import { PHI_IMAGE_WIDGET_DEFINITION, PHI_IMAGE_WIDGET_PLUGIN_TYPE } from "./config";

/**
 * A picture field of the page record takes the Widget's own picture's place: by its address, with the
 * record's own words for it, which are in the page's language already. A record without the picture
 * leaves nothing to show; a Page about no record shows the picture chosen in the Widget.
 */
async function PhiImageWidgetSource({ widget, runtime, registry, config }: PhiCmsWidgetPluginRenderArgs<PhiCmsImageWidgetConfig>) {
  const recordField = await resolvePhiWidgetRecordField({ registry, runtime, key: config.recordField, kinds: ["picture"] });
  if (!recordField.bound) {
    return <PhiImageWidgetServer runtime={runtime} widget={widget} config={config} />;
  }
  if (!recordField.field) {
    return null;
  }
  const { src, alt } = recordField.field.value;
  const { assetId: _assetId, variantKey: _variantKey, variantVersion: _variantVersion, ...presentation } =
    config as PhiCmsImageWidgetConfig & { assetId?: unknown; variantKey?: unknown; variantVersion?: unknown };
  return (
    <PhiImageWidgetServer
      runtime={runtime}
      translate={false}
      config={{ ...presentation, sourceKind: "url", sourceUrl: src, alt: alt ?? "", title: undefined }}
    />
  );
}

export const PHI_IMAGE_WIDGET_PLUGIN: PhiCmsServerWidgetPlugin<PhiCmsImageWidgetConfig> = {
  ...PHI_IMAGE_WIDGET_DEFINITION,
  ...definePhiPassiveWidgetRenderers((args) => <PhiImageWidgetSource key={`widget-${args.widget.id}`} {...args} />),
};

export { PHI_IMAGE_WIDGET_PLUGIN_TYPE };
