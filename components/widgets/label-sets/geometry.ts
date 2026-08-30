import "server-only";

import {
  PHI_TR_CTX_WEB_UI_LABEL,
  type PhiGlobalTranslatorOptions,
} from "../../../gateway/tr";
import { definePhiLabelSet, getPhiLabelSet } from "../../../gateway/label-set";
import {
  PHI_GEOMETRY_WIDGET_DEFAULT_LABELS,
  type PhiGeometryWidgetLabels,
} from "../label-types/geometry";

const PHI_GEOMETRY_WIDGET_LABEL_SET = definePhiLabelSet({
  key: "widget:geometry",
  ctx: PHI_TR_CTX_WEB_UI_LABEL,
  labels: {
    title: PHI_GEOMETRY_WIDGET_DEFAULT_LABELS.title,
    description: PHI_GEOMETRY_WIDGET_DEFAULT_LABELS.description,
    section_position: PHI_GEOMETRY_WIDGET_DEFAULT_LABELS.sections.position,
    section_size: PHI_GEOMETRY_WIDGET_DEFAULT_LABELS.sections.size,
    section_constraints: PHI_GEOMETRY_WIDGET_DEFAULT_LABELS.sections.constraints,
    section_stacking: PHI_GEOMETRY_WIDGET_DEFAULT_LABELS.sections.stacking,
    field_sticky: PHI_GEOMETRY_WIDGET_DEFAULT_LABELS.fields.sticky,
    field_offset_top: PHI_GEOMETRY_WIDGET_DEFAULT_LABELS.fields.offsetTop,
    field_size: PHI_GEOMETRY_WIDGET_DEFAULT_LABELS.fields.size,
    field_min_size: PHI_GEOMETRY_WIDGET_DEFAULT_LABELS.fields.minSize,
    field_max_size: PHI_GEOMETRY_WIDGET_DEFAULT_LABELS.fields.maxSize,
    field_z_index: PHI_GEOMETRY_WIDGET_DEFAULT_LABELS.fields.zIndex,
    field_viewport: PHI_GEOMETRY_WIDGET_DEFAULT_LABELS.fields.viewport,
    viewport_compact: PHI_GEOMETRY_WIDGET_DEFAULT_LABELS.viewport.compact,
    viewport_medium: PHI_GEOMETRY_WIDGET_DEFAULT_LABELS.viewport.medium,
    viewport_wide: PHI_GEOMETRY_WIDGET_DEFAULT_LABELS.viewport.wide,
    placeholder_auto: PHI_GEOMETRY_WIDGET_DEFAULT_LABELS.placeholders.auto,
  },
});

export async function getPhiGeometryWidgetLabels(options: PhiGlobalTranslatorOptions): Promise<PhiGeometryWidgetLabels> {
  const labels = await getPhiLabelSet(options, PHI_GEOMETRY_WIDGET_LABEL_SET);
  return {
    title: labels.title,
    description: labels.description,
    sections: {
      position: labels.section_position,
      size: labels.section_size,
      constraints: labels.section_constraints,
      stacking: labels.section_stacking,
    },
    fields: {
      sticky: labels.field_sticky,
      offsetTop: labels.field_offset_top,
      size: labels.field_size,
      minSize: labels.field_min_size,
      maxSize: labels.field_max_size,
      zIndex: labels.field_z_index,
      viewport: labels.field_viewport,
    },
    viewport: {
      compact: labels.viewport_compact,
      medium: labels.viewport_medium,
      wide: labels.viewport_wide,
    },
    placeholders: {
      auto: labels.placeholder_auto,
    },
  };
}
