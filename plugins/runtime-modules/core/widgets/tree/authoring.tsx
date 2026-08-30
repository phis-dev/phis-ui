"use client";

import type { PhiTreeWidgetConfig } from "../../../../../types";
import { createPhiCmsBuilderWidgetPlugin } from "../../../../../plugins/factories/widget-builder-plugin";
import { PHI_TREE_WIDGET_DEFINITION } from "./config";
import { PhiTreeWidgetClient } from "./client";
import { PHI_TREE_WIDGET_DEFAULT_LABELS } from "../../../../../components/widgets/label-types/tree";

export const PHI_TREE_WIDGET_BUILDER_PLUGIN = createPhiCmsBuilderWidgetPlugin<PhiTreeWidgetConfig>(
  PHI_TREE_WIDGET_DEFINITION,
  ({ config }) => <PhiTreeWidgetClient config={config} labels={PHI_TREE_WIDGET_DEFAULT_LABELS} />,
);
