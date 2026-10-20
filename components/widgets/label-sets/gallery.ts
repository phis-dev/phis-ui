import "server-only";

import { definePhiLabelSet, definePhiMessageLabel, getPhiLabelSet } from "../../../gateway/label-set";
import { PHI_TR_CTX_WEB_UI_LABEL, type PhiGlobalTranslatorOptions } from "../../../gateway/tr";
import {
  PHI_GALLERY_WIDGET_DEFAULT_LABELS,
  type PhiGalleryWidgetLabels,
} from "../label-types/gallery";

const PHI_GALLERY_WIDGET_LABEL_SET = definePhiLabelSet({
  key: "widget:gallery",
  ctx: PHI_TR_CTX_WEB_UI_LABEL,
  labels: {
    previous: PHI_GALLERY_WIDGET_DEFAULT_LABELS.previous,
    next: PHI_GALLERY_WIDGET_DEFAULT_LABELS.next,
    page: definePhiMessageLabel(PHI_GALLERY_WIDGET_DEFAULT_LABELS.page),
    pause: PHI_GALLERY_WIDGET_DEFAULT_LABELS.pause,
    play: PHI_GALLERY_WIDGET_DEFAULT_LABELS.play,
    region: PHI_GALLERY_WIDGET_DEFAULT_LABELS.region,
    pages: definePhiMessageLabel(PHI_GALLERY_WIDGET_DEFAULT_LABELS.pages),
    unavailable: definePhiMessageLabel(PHI_GALLERY_WIDGET_DEFAULT_LABELS.unavailable),
  },
});

export async function getPhiGalleryWidgetLabels(
  options: PhiGlobalTranslatorOptions,
): Promise<PhiGalleryWidgetLabels> {
  const labels = await getPhiLabelSet(options, PHI_GALLERY_WIDGET_LABEL_SET);
  return {
    previous: labels.previous,
    next: labels.next,
    page: labels.page,
    pause: labels.pause,
    play: labels.play,
    region: labels.region,
    pages: labels.pages,
    unavailable: labels.unavailable,
  };
}
