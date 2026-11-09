import type { PhiCmsWidgetPlugin } from "../../../../../types";
import { PHI_MEDIA_LIBRARY_DATA_PROVIDER_KEYS } from "../../../../../constants/media-library-provider-keys";
import { PHI_THEME_SIGNAL_CHANNELS } from "../../../../../plugins/runtime-modules/theme/controller/signals";
import { createPhiCmsWidgetDefinition } from "../../../../../components/widgets/config/helpers";
import { readString } from "../../../../../components/widgets/config/parser-primitives";
import {
  parsePhiControlSignalConfig,
  type PhiControlSignalConfig,
} from "../../../../../components/widgets/config/control-signal-config";

export type PhiBuilderBrandWidgetConfig = Pick<PhiControlSignalConfig, "key" | "signalRoutes"> & {
  themeKey?: string;
};

function parseBuilderBrandWidgetConfig(config: Record<string, unknown>): PhiBuilderBrandWidgetConfig {
  return {
    /*
     * The routes are read like any Widget's: the preview mode reaches a panel through the route its tree
     * wrote, so a route an author adds in the Builder works as well. The parser dropped them once and
     * the panels listened to a hard-coded broadcast, which left the declared input decoration.
     */
    ...parsePhiControlSignalConfig(config, { key: "brandPreviewThemeMode" }),
    themeKey: readString(config.themeKey),
  };
}

/** Every panel that draws in the preview's mode follows the mode switch. */
const PHI_BUILDER_BRAND_PREVIEW_MODE_SIGNALS = {
  emits: [],
  listens: [
    {
      id: "previewThemeMode",
      channel: PHI_THEME_SIGNAL_CHANNELS.previewThemeMode,
      action: "change" as const,
      valueType: "boolean" as const,
    },
  ],
};

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
  description: "Palette and seed controls for the brand Builder workspace.",
  category: "configuration",
  iconFamily: "theme",
  slotSizePolicy: "fill-inline",
  runtimeSignals: PHI_BUILDER_BRAND_PREVIEW_MODE_SIGNALS,
  fields: [
    { key: "themeKey", type: "string", label: "Theme Key" },
  ],
  parseConfig: parseBuilderBrandWidgetConfig,
});

export const PHI_BUILDER_BRAND_IDENTITY_CONTROLS_WIDGET_DEFINITION: PhiBuilderBrandWidgetDefinition = createPhiCmsWidgetDefinition({
  typeKey: "builder-brand-identity-controls",
  title: "Builder Brand Identity Controls",
  description: "Logo and Wordmark for the brand Builder workspace.",
  category: "configuration",
  iconFamily: "theme",
  slotSizePolicy: "fill-inline",
  /*
   * The Logo is picked from the Media library, and a Page mounts only the Data Providers its tree asks
   * for. The scan reads this declaration; a Provider a Widget reaches for from inside its client code is
   * invisible to it. Same reason the Background panel declares its own. The Brand's link needs none: its
   * Pages come from `/api/site/page-references`, as every link picker's outside the Builder catalog do.
   */
  requiredDataProviders: [PHI_MEDIA_LIBRARY_DATA_PROVIDER_KEYS.collection],
  runtimeSignals: PHI_BUILDER_BRAND_PREVIEW_MODE_SIGNALS,
  fields: [
    { key: "themeKey", type: "string", label: "Theme Key" },
  ],
  parseConfig: parseBuilderBrandWidgetConfig,
});

export const PHI_BUILDER_BRAND_STYLE_CONTROLS_WIDGET_DEFINITION: PhiBuilderBrandWidgetDefinition = createPhiCmsWidgetDefinition({
  typeKey: "builder-brand-style-controls",
  title: "Builder Brand Style Controls",
  description: "Type, spacing and surface controls for the brand Builder workspace.",
  category: "configuration",
  iconFamily: "theme",
  slotSizePolicy: "fill-inline",
  fields: [
    { key: "themeKey", type: "string", label: "Theme Key" },
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
  requiredDataProviders: [PHI_MEDIA_LIBRARY_DATA_PROVIDER_KEYS.collection],
  runtimeSignals: PHI_BUILDER_BRAND_PREVIEW_MODE_SIGNALS,
  fields: [
    { key: "themeKey", type: "string", label: "Theme Key" },
  ],
  parseConfig: parseBuilderBrandWidgetConfig,
});

export const PHI_BUILDER_BRAND_THEME_PREVIEW_WIDGET_DEFINITION: PhiBuilderBrandWidgetDefinition = createPhiCmsWidgetDefinition({
  typeKey: "builder-brand-theme-preview",
  title: "Builder Brand Theme Preview",
  description: "Live Theme preview for the brand Builder workspace.",
  category: "configuration",
  iconFamily: "theme",
  slotSizePolicy: "fill-inline",
  runtimeSignals: PHI_BUILDER_BRAND_PREVIEW_MODE_SIGNALS,
  fields: [
    { key: "themeKey", type: "string", label: "Theme Key" },
  ],
  parseConfig: parseBuilderBrandWidgetConfig,
});
