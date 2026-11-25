import type { PhiCmsServerWidgetPlugin } from "../../../../../types";
import { PHI_CDN_UPLOAD_WIDGET_DEFINITION, type PhiCdnUploadWidgetConfig } from "./config";
import { PhiCdnUploadWidget } from "./server";

export const PHI_CDN_UPLOAD_WIDGET_PLUGIN: PhiCmsServerWidgetPlugin<PhiCdnUploadWidgetConfig> = {
  ...PHI_CDN_UPLOAD_WIDGET_DEFINITION,
  render: ({ config, runtime }) => <PhiCdnUploadWidget config={config} runtime={runtime} />,
};
