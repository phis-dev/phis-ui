"use client";

import type { PhiTableWidgetConfig } from "../../../../../types";
import { createPhiCmsBuilderWidgetPlugin } from "../../../../../plugins/factories/widget-builder-plugin";
import { PHI_TABLE_WIDGET_DEFINITION } from "./config";
import { PhiTableWidgetClient } from "./client";
import { PHI_TABLE_WIDGET_DEFAULT_LABELS } from "../../../../../components/widgets/label-types/table";

export const PHI_TABLE_WIDGET_BUILDER_PLUGIN = createPhiCmsBuilderWidgetPlugin<PhiTableWidgetConfig>(
  PHI_TABLE_WIDGET_DEFINITION,
  ({ config }) => <PhiTableWidgetClient config={config} labels={PHI_TABLE_WIDGET_DEFAULT_LABELS} />,
);
