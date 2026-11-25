import {
  buildPhiCmsWidgetNamespacedTypeKey,
  resolvePhiCmsWidgetPluginKey,
} from "../../../../../constants/cms-widget-types";
import { readPhiSignalRouteSet, type PhiSignalRouteSet } from "../../../../../types/signals";
import type { PhiCmsWidgetPlugin } from "../../../../../types";
import {
  readRenderableBlockConfig,
  type PhiCmsWidgetConfigBase,
} from "../../../../../widget-config";

/**
 * A file put into the Site's CDN from the browser: its name, version and file name, the platform it is
 * for, and the upload itself -- the parts hashed and sent through Core, resumed where a reload broke
 * them off.
 *
 * A Widget because nothing else can hold it. A Form submits values through a handler on the server
 * (FORMS.md), and this is bytes that exist only on the person's computer, divided, hashed and sent
 * before there is anything to submit; the Media `upload` field sends a file into a Media Space, which
 * the CDN is not. So the dialog of the CDN page holds this, and it says nothing but what an upload
 * needs: no settings, and one announcement, `uploaded`, when a file was published.
 */
const PHI_CDN_UPLOAD_WIDGET_TYPE_KEY = "cdn-upload";
const PHI_CDN_UPLOAD_WIDGET_PLUGIN_KEY = resolvePhiCmsWidgetPluginKey(PHI_CDN_UPLOAD_WIDGET_TYPE_KEY);
export const PHI_CDN_UPLOAD_WIDGET_TYPE = buildPhiCmsWidgetNamespacedTypeKey(
  PHI_CDN_UPLOAD_WIDGET_PLUGIN_KEY,
  PHI_CDN_UPLOAD_WIDGET_TYPE_KEY,
);

export type PhiCdnUploadWidgetConfig = PhiCmsWidgetConfigBase & {
  signalRoutes?: PhiSignalRouteSet | null;
};

function parsePhiCdnUploadWidgetConfig(config: Record<string, unknown>): PhiCdnUploadWidgetConfig {
  return {
    ...readRenderableBlockConfig(config),
    signalRoutes: readPhiSignalRouteSet(config.signalRoutes),
  };
}

export const PHI_CDN_UPLOAD_WIDGET_DEFINITION = {
  kind: "widget",
  pluginKey: PHI_CDN_UPLOAD_WIDGET_PLUGIN_KEY,
  typeKey: PHI_CDN_UPLOAD_WIDGET_TYPE_KEY,
  slotSizePolicy: "fill-inline",
  title: "CDN upload",
  category: "media",
  description: "Uploads one file into the Site's CDN under a name, a version and a file name.",
  iconFamily: "cdn",
  fields: [],
  defaultConfig: {},
  parseConfig: parsePhiCdnUploadWidgetConfig,
  runtimeSignals: {
    emits: [
      // So the listing can read itself again. Sent once a file is published, never for a refusal.
      { id: "uploaded", action: "activate", valueType: "none" },
    ],
    listens: [],
  },
} satisfies Pick<
  PhiCmsWidgetPlugin<PhiCdnUploadWidgetConfig>,
  | "kind" | "pluginKey" | "typeKey" | "slotSizePolicy" | "title" | "description"
  | "category" | "iconFamily" | "fields" | "defaultConfig" | "parseConfig"
  | "runtimeSignals"
>;
