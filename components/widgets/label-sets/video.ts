import "server-only";

import { PHI_TR_CTX_WEB_UI_LABEL, type PhiGlobalTranslatorOptions } from "../../../gateway/tr";
import { definePhiLabelSet, definePhiMessageLabel, getPhiLabelSet } from "../../../gateway/label-set";

/**
 * What a placeholder says before a visitor has asked for anything.
 *
 * `notice_text` carries `{recipient}` and the Control substitutes it. A label set holds plain text, so
 * the alternative was a sentence broken into a prefix and a suffix -- which decides word order in
 * English and then imposes it on every other language. The token travels through translation the way it
 * does anywhere else, and it is what lets the recipient sit where the sentence needs it.
 */
const PHI_VIDEO_WIDGET_LABEL_SET = definePhiLabelSet({
  key: "widget:video",
  ctx: PHI_TR_CTX_WEB_UI_LABEL,
  labels: {
    load_label: "Load video",
    notice_text: definePhiMessageLabel(
      "Loading this video sends a request to {recipient}, which can recognise you there.",
    ),
    privacy_label: "Privacy notice",
  },
});

export async function getPhiVideoWidgetLabels(options: PhiGlobalTranslatorOptions) {
  const labels = await getPhiLabelSet(options, PHI_VIDEO_WIDGET_LABEL_SET);
  return {
    loadLabel: labels.load_label,
    noticeText: labels.notice_text,
    privacyLabel: labels.privacy_label,
  };
}

export type PhiVideoWidgetLabels = Awaited<ReturnType<typeof getPhiVideoWidgetLabels>>;
