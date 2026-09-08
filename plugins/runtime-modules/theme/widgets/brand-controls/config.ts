import type { PhiCmsWidgetPlugin } from "../../../../../types";
import {
  isPhiCmsAreaKey,
  type PhiCmsAreaKey,
} from "../../../../../constants/cms-areas";
import { PHI_ASSET_RUNTIME_DATA_PROVIDER_KEYS } from "../../../asset/ids";
import { PHI_THEME_SIGNAL_CHANNELS } from "../../../../../plugins/runtime-modules/theme/controller/signals";
import { createPhiCmsWidgetDefinition } from "../../../../../components/widgets/config/helpers";
import { readString } from "../../../../../components/widgets/config/parser-primitives";

export type PhiBuilderBrandWidgetConfig = {
  themeKey?: string;
  reviewArea?: PhiCmsAreaKey;
};

function parseBuilderBrandWidgetConfig(config: Record<string, unknown>): PhiBuilderBrandWidgetConfig {
  const reviewArea = readString(config.reviewArea);
  return {
    themeKey: readString(config.themeKey),
    reviewArea: isPhiCmsAreaKey(reviewArea) ? reviewArea : undefined,
  };
}

type PhiBuilderBrandWidgetDefinition = Pick<
  PhiCmsWidgetPlugin<PhiBuilderBrandWidgetConfig>,
  | "kind"
  | "pluginKey"
  | "typeKey"
  | "title"
  | "description"
  | "category"
  | "iconFamily"
  | "runtimeSignals"
  | "requiredDataProviders"
  | "slotSizePolicy"
  | "fields"
  | "parseConfig"
>;

export const PHI_BUILDER_BRAND_THEME_CONTROLS_WIDGET_DEFINITION: PhiBuilderBrandWidgetDefinition = createPhiCmsWidgetDefinition({
  typeKey: "builder-brand-theme-controls",
  title: "Builder Brand Theme Controls",
  description: "Ant Design theme controls for the brand Builder workspace.",
  category: "configuration",
  iconFamily: "theme",
  slotSizePolicy: "fill-inline",
  fields: [
    { key: "themeKey", type: "string", label: "Theme Key" },
    { key: "reviewArea", type: "string", label: "Review Area" },
  ],
  parseConfig: parseBuilderBrandWidgetConfig,
});

export const PHI_BUILDER_BRAND_STYLE_CONTROLS_WIDGET_DEFINITION: PhiBuilderBrandWidgetDefinition = createPhiCmsWidgetDefinition({
  typeKey: "builder-brand-style-controls",
  title: "Builder Brand Style Controls",
  description: "Ant Design style controls for the brand Builder workspace.",
  category: "configuration",
  iconFamily: "theme",
  slotSizePolicy: "fill-inline",
  fields: [
    { key: "themeKey", type: "string", label: "Theme Key" },
    { key: "reviewArea", type: "string", label: "Review Area" },
  ],
  parseConfig: parseBuilderBrandWidgetConfig,
});

export const PHI_BUILDER_BRAND_BACKGROUND_CONTROLS_WIDGET_DEFINITION: PhiBuilderBrandWidgetDefinition = createPhiCmsWidgetDefinition({
  typeKey: "builder-brand-background-controls",
  title: "Builder Brand Background Controls",
  description: "Theme Root Background authoring for the brand Builder workspace.",
  category: "configuration",
  iconFamily: "theme",
  slotSizePolicy: "fill-inline",
  /*
   * The Theme Root Background is authored here, and its image source is picked from the Media
   * library. A Page mounts only the Data Providers its tree asks for, and the tree scan can see a
   * `providerKey` in a Widget's config or this declaration -- not a Provider a Widget reaches for
   * from inside its own client code. Without the declaration the picker opened on
   * "Collection provider ... is not available from the active runtime modules" over an empty
   * library, on a Page where the Assets Module was active the whole time.
   */
  requiredDataProviders: [PHI_ASSET_RUNTIME_DATA_PROVIDER_KEYS.mediaCollection],
  runtimeSignals: {
    emits: [],
    listens: [
      {
        id: "previewThemeMode",
        channel: PHI_THEME_SIGNAL_CHANNELS.previewThemeMode,
        action: "change",
        valueType: "boolean",
      },
    ],
  },
  fields: [
    { key: "themeKey", type: "string", label: "Theme Key" },
    { key: "reviewArea", type: "string", label: "Review Area" },
  ],
  parseConfig: parseBuilderBrandWidgetConfig,
});

export const PHI_BUILDER_BRAND_THEME_PREVIEW_WIDGET_DEFINITION: PhiBuilderBrandWidgetDefinition = createPhiCmsWidgetDefinition({
  typeKey: "builder-brand-theme-preview",
  title: "Builder Brand Theme Preview",
  description: "Ant Design live preview for the brand Builder workspace.",
  category: "configuration",
  iconFamily: "theme",
  slotSizePolicy: "fill-inline",
  runtimeSignals: {
    emits: [],
    listens: [
      {
        id: "previewThemeMode",
        channel: PHI_THEME_SIGNAL_CHANNELS.previewThemeMode,
        action: "change",
        valueType: "boolean",
      },
    ],
  },
  fields: [
    { key: "themeKey", type: "string", label: "Theme Key" },
    { key: "reviewArea", type: "string", label: "Review Area" },
  ],
  parseConfig: parseBuilderBrandWidgetConfig,
});
