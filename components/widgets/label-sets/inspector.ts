import "server-only";

import {
  PHI_TR_CTX_WEB_UI_LABEL,
  type PhiGlobalTranslatorOptions,
} from "../../../gateway/tr";
import { definePhiLabelSet, getPhiLabelSet } from "../../../gateway/label-set";
import {
  PHI_INSPECTOR_WIDGET_DEFAULT_LABELS,
  type PhiInspectorWidgetLabels,
} from "../label-types/inspector";

const PHI_INSPECTOR_WIDGET_LABEL_SET = definePhiLabelSet({
  key: "widget:inspector",
  ctx: PHI_TR_CTX_WEB_UI_LABEL,
  labels: {
    region: PHI_INSPECTOR_WIDGET_DEFAULT_LABELS.region,
    layout: PHI_INSPECTOR_WIDGET_DEFAULT_LABELS.layout,
    surface: PHI_INSPECTOR_WIDGET_DEFAULT_LABELS.surface,
    widget: PHI_INSPECTOR_WIDGET_DEFAULT_LABELS.widget,
    section_settings: PHI_INSPECTOR_WIDGET_DEFAULT_LABELS.sections.settings,
    section_geometry: PHI_INSPECTOR_WIDGET_DEFAULT_LABELS.sections.geometry,
    section_anchor: PHI_INSPECTOR_WIDGET_DEFAULT_LABELS.sections.anchor,
    section_viewport: PHI_INSPECTOR_WIDGET_DEFAULT_LABELS.sections.viewport,
    section_padding: PHI_INSPECTOR_WIDGET_DEFAULT_LABELS.sections.padding,
    section_background: PHI_INSPECTOR_WIDGET_DEFAULT_LABELS.sections.background,
    section_border: PHI_INSPECTOR_WIDGET_DEFAULT_LABELS.sections.border,
    section_shadow: PHI_INSPECTOR_WIDGET_DEFAULT_LABELS.sections.shadow,
    section_surface: PHI_INSPECTOR_WIDGET_DEFAULT_LABELS.sections.surface,
    section_signals: PHI_INSPECTOR_WIDGET_DEFAULT_LABELS.sections.signals,
    surface_style_title: PHI_INSPECTOR_WIDGET_DEFAULT_LABELS.surfaceStyle.title,
    surface_style_none: PHI_INSPECTOR_WIDGET_DEFAULT_LABELS.surfaceStyle.none,
    surface_style_card: PHI_INSPECTOR_WIDGET_DEFAULT_LABELS.surfaceStyle.card,
    surface_style_wash: PHI_INSPECTOR_WIDGET_DEFAULT_LABELS.surfaceStyle.wash,
    surface_style_custom: PHI_INSPECTOR_WIDGET_DEFAULT_LABELS.surfaceStyle.custom,
    tone_title: PHI_INSPECTOR_WIDGET_DEFAULT_LABELS.tone.title,
    tone_inherit: PHI_INSPECTOR_WIDGET_DEFAULT_LABELS.tone.inherit,
    tone_light: PHI_INSPECTOR_WIDGET_DEFAULT_LABELS.tone.light,
    tone_dark: PHI_INSPECTOR_WIDGET_DEFAULT_LABELS.tone.dark,
    tone_inverse: PHI_INSPECTOR_WIDGET_DEFAULT_LABELS.tone.inverse,
  },
});

export async function getPhiInspectorWidgetLabels(
  options: PhiGlobalTranslatorOptions,
): Promise<PhiInspectorWidgetLabels> {
  const labels = await getPhiLabelSet(options, PHI_INSPECTOR_WIDGET_LABEL_SET);
  return {
    region: labels.region,
    layout: labels.layout,
    surface: labels.surface,
    widget: labels.widget,
    sections: {
      settings: labels.section_settings,
      geometry: labels.section_geometry,
      anchor: labels.section_anchor,
      viewport: labels.section_viewport,
      padding: labels.section_padding,
      background: labels.section_background,
      border: labels.section_border,
      shadow: labels.section_shadow,
      surface: labels.section_surface,
      signals: labels.section_signals,
    },
    surfaceStyle: {
      title: labels.surface_style_title,
      none: labels.surface_style_none,
      card: labels.surface_style_card,
      wash: labels.surface_style_wash,
      custom: labels.surface_style_custom,
    },
    tone: {
      title: labels.tone_title,
      inherit: labels.tone_inherit,
      light: labels.tone_light,
      dark: labels.tone_dark,
      inverse: labels.tone_inverse,
    },
  };
}
