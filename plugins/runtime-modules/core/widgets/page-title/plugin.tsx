import type { PhiCmsServerWidgetPlugin } from "../../../../../types";
import { definePhiPassiveWidgetRenderers } from "../../../../../plugins/factories/widget-renderers";
import { PHI_PAGE_TITLE_WIDGET_DEFINITION, type PhiPageTitleWidgetConfig } from "./config";
import { PhiPageTitleWidgetServer } from "./server";

export const PHI_PAGE_TITLE_WIDGET_PLUGIN: PhiCmsServerWidgetPlugin<PhiPageTitleWidgetConfig> = {
  ...PHI_PAGE_TITLE_WIDGET_DEFINITION,
  ...definePhiPassiveWidgetRenderers(({ runtime }) => <PhiPageTitleWidgetServer runtime={runtime} />),
};
