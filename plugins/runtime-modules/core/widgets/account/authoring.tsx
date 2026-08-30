"use client";

import type { PhiCmsBuilderWidgetPlugin } from "../../../../../types";
import { PHI_ACCOUNT_WIDGET_DEFINITION } from "./config";
import type { PhiAccountWidgetConfig } from "./client";
import { PhiAccountWidgetPreview } from "../../../../../components/widgets/client/account-preview";

export const PHI_ACCOUNT_WIDGET_BUILDER_PLUGIN: PhiCmsBuilderWidgetPlugin<PhiAccountWidgetConfig> = {
  ...PHI_ACCOUNT_WIDGET_DEFINITION,
  renderEditor: () => <PhiAccountWidgetPreview />,
};
