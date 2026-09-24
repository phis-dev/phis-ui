import "server-only";

import { PHI_TR_CTX_WEB_UI_LABEL, type PhiGlobalTranslatorOptions } from "../../../gateway/tr";
import { definePhiLabelSet, definePhiMessageLabel, getPhiLabelSet } from "../../../gateway/label-set";
import {
  PHI_PADDING_WIDGET_DEFAULT_LABELS,
  type PhiPaddingWidgetLabels,
} from "../label-types/padding";

const PHI_PADDING_WIDGET_LABEL_SET = definePhiLabelSet({
  key: "widget:padding",
  ctx: PHI_TR_CTX_WEB_UI_LABEL,
  labels: {
    title: PHI_PADDING_WIDGET_DEFAULT_LABELS.title,
    description: definePhiMessageLabel(PHI_PADDING_WIDGET_DEFAULT_LABELS.description),
    field_top: PHI_PADDING_WIDGET_DEFAULT_LABELS.fields.top,
    field_gap: PHI_PADDING_WIDGET_DEFAULT_LABELS.fields.gap,
    field_left: PHI_PADDING_WIDGET_DEFAULT_LABELS.fields.left,
    field_right: PHI_PADDING_WIDGET_DEFAULT_LABELS.fields.right,
    field_bottom: PHI_PADDING_WIDGET_DEFAULT_LABELS.fields.bottom,
    placeholder_value: PHI_PADDING_WIDGET_DEFAULT_LABELS.placeholders.value,
    scale_size_none: PHI_PADDING_WIDGET_DEFAULT_LABELS.scaleSizes.none,
    scale_size_xxs: PHI_PADDING_WIDGET_DEFAULT_LABELS.scaleSizes.xxs,
    scale_size_xs: PHI_PADDING_WIDGET_DEFAULT_LABELS.scaleSizes.xs,
    scale_size_sm: PHI_PADDING_WIDGET_DEFAULT_LABELS.scaleSizes.sm,
    scale_size_base: PHI_PADDING_WIDGET_DEFAULT_LABELS.scaleSizes.base,
    scale_size_md: PHI_PADDING_WIDGET_DEFAULT_LABELS.scaleSizes.md,
    scale_size_lg: PHI_PADDING_WIDGET_DEFAULT_LABELS.scaleSizes.lg,
    scale_size_xl: PHI_PADDING_WIDGET_DEFAULT_LABELS.scaleSizes.xl,
    scale_size_xxl: PHI_PADDING_WIDGET_DEFAULT_LABELS.scaleSizes.xxl,
  },
});

export async function getPhiPaddingWidgetLabels(
  options: PhiGlobalTranslatorOptions,
): Promise<PhiPaddingWidgetLabels> {
  const labels = await getPhiLabelSet(options, PHI_PADDING_WIDGET_LABEL_SET);
  return {
    title: labels.title,
    description: labels.description,
    fields: {
      top: labels.field_top,
      gap: labels.field_gap,
      left: labels.field_left,
      right: labels.field_right,
      bottom: labels.field_bottom,
    },
    placeholders: {
      value: labels.placeholder_value,
    },
    scaleSizes: {
      none: labels.scale_size_none,
      xxs: labels.scale_size_xxs,
      xs: labels.scale_size_xs,
      sm: labels.scale_size_sm,
      base: labels.scale_size_base,
      md: labels.scale_size_md,
      lg: labels.scale_size_lg,
      xl: labels.scale_size_xl,
      xxl: labels.scale_size_xxl,
    },
  };
}
