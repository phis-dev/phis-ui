"use client";

import type { PhiCmsBuilderWidgetPlugin } from "../../../types";
import {
  PHI_STRUCTURE_REGION_WIDGET_DEFINITION,
  type PhiStructureRegionWidgetConfig,
} from "../../../plugins/runtime-modules/builder/widgets/structure-region/config";
import { PhiWidgetEditorPlaceholder } from "./widget-editor-placeholder";

export const PHI_STRUCTURE_REGION_WIDGET_BUILDER_PLUGIN =
  {
    ...PHI_STRUCTURE_REGION_WIDGET_DEFINITION,
    renderEditor: ({ widget }) => (
      <PhiWidgetEditorPlaceholder
        widget={widget}
        pluginTitle={PHI_STRUCTURE_REGION_WIDGET_DEFINITION.title}
        summary="Builder editor placeholder for a structure region."
      />
    ),
  } satisfies PhiCmsBuilderWidgetPlugin<PhiStructureRegionWidgetConfig>;
