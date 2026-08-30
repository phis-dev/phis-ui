import "server-only";

import {
  PHI_TR_CTX_WEB_UI_LABEL,
  type PhiGlobalTranslatorOptions,
} from "../../../gateway/tr";
import { definePhiLabelSet, getPhiLabelSet } from "../../../gateway/label-set";
import {
  PHI_BORDER_WIDGET_DEFAULT_LABELS,
  type PhiBorderWidgetLabels,
} from "../label-types/border";

const PHI_BORDER_WIDGET_LABEL_SET = definePhiLabelSet({
  key: "widget:border",
  ctx: PHI_TR_CTX_WEB_UI_LABEL,
  labels: {
    title: PHI_BORDER_WIDGET_DEFAULT_LABELS.title,
    description: PHI_BORDER_WIDGET_DEFAULT_LABELS.description,
    section_border: PHI_BORDER_WIDGET_DEFAULT_LABELS.sections.border,
    section_color: PHI_BORDER_WIDGET_DEFAULT_LABELS.sections.color,
    section_radius: PHI_BORDER_WIDGET_DEFAULT_LABELS.sections.radius,
    field_style: PHI_BORDER_WIDGET_DEFAULT_LABELS.fields.style,
    field_color: PHI_BORDER_WIDGET_DEFAULT_LABELS.fields.color,
    field_corners: PHI_BORDER_WIDGET_DEFAULT_LABELS.fields.corners,
    field_top_left: PHI_BORDER_WIDGET_DEFAULT_LABELS.fields.topLeft,
    field_top_right: PHI_BORDER_WIDGET_DEFAULT_LABELS.fields.topRight,
    field_bottom_left: PHI_BORDER_WIDGET_DEFAULT_LABELS.fields.bottomLeft,
    field_bottom_right: PHI_BORDER_WIDGET_DEFAULT_LABELS.fields.bottomRight,
    placeholder_width: PHI_BORDER_WIDGET_DEFAULT_LABELS.placeholders.width,
    placeholder_color_hex: PHI_BORDER_WIDGET_DEFAULT_LABELS.placeholders.colorHex,
    radius_size_none: PHI_BORDER_WIDGET_DEFAULT_LABELS.radiusSizes.none,
    radius_size_xxs: PHI_BORDER_WIDGET_DEFAULT_LABELS.radiusSizes.xxs,
    radius_size_xs: PHI_BORDER_WIDGET_DEFAULT_LABELS.radiusSizes.xs,
    radius_size_sm: PHI_BORDER_WIDGET_DEFAULT_LABELS.radiusSizes.sm,
    radius_size_base: PHI_BORDER_WIDGET_DEFAULT_LABELS.radiusSizes.base,
    radius_size_md: PHI_BORDER_WIDGET_DEFAULT_LABELS.radiusSizes.md,
    radius_size_lg: PHI_BORDER_WIDGET_DEFAULT_LABELS.radiusSizes.lg,
    radius_size_xl: PHI_BORDER_WIDGET_DEFAULT_LABELS.radiusSizes.xl,
    radius_size_xxl: PHI_BORDER_WIDGET_DEFAULT_LABELS.radiusSizes.xxl,
    radius_size_round: PHI_BORDER_WIDGET_DEFAULT_LABELS.radiusSizes.round,
    border_style_none: PHI_BORDER_WIDGET_DEFAULT_LABELS.borderStyles.none,
    border_style_solid: PHI_BORDER_WIDGET_DEFAULT_LABELS.borderStyles.solid,
    border_style_dashed: PHI_BORDER_WIDGET_DEFAULT_LABELS.borderStyles.dashed,
    border_style_dotted: PHI_BORDER_WIDGET_DEFAULT_LABELS.borderStyles.dotted,
    border_style_double: PHI_BORDER_WIDGET_DEFAULT_LABELS.borderStyles.double,
  },
});

export async function getPhiBorderWidgetLabels(options: PhiGlobalTranslatorOptions): Promise<PhiBorderWidgetLabels> {
  const labels = await getPhiLabelSet(options, PHI_BORDER_WIDGET_LABEL_SET);
  return {
    title: labels.title,
    description: labels.description,
    sections: {
      border: labels.section_border,
      color: labels.section_color,
      radius: labels.section_radius,
    },
    fields: {
      style: labels.field_style,
      color: labels.field_color,
      corners: labels.field_corners,
      topLeft: labels.field_top_left,
      topRight: labels.field_top_right,
      bottomLeft: labels.field_bottom_left,
      bottomRight: labels.field_bottom_right,
    },
    placeholders: {
      width: labels.placeholder_width,
      colorHex: labels.placeholder_color_hex,
    },
    radiusSizes: {
      none: labels.radius_size_none,
      xxs: labels.radius_size_xxs,
      xs: labels.radius_size_xs,
      sm: labels.radius_size_sm,
      base: labels.radius_size_base,
      md: labels.radius_size_md,
      lg: labels.radius_size_lg,
      xl: labels.radius_size_xl,
      xxl: labels.radius_size_xxl,
      round: labels.radius_size_round,
    },
    borderStyles: {
      none: labels.border_style_none,
      solid: labels.border_style_solid,
      dashed: labels.border_style_dashed,
      dotted: labels.border_style_dotted,
      double: labels.border_style_double,
    },
  };
}
