import "server-only";

import { PHI_TR_CTX_WEB_UI_LABEL, type PhiGlobalTranslatorOptions } from "../../../gateway/tr";
import { definePhiLabelSet, definePhiMessageLabel, getPhiLabelSet } from "../../../gateway/label-set";

/**
 * What a placeholder says before a visitor has asked for anything.
 *
 * `notice_text` carries `%1` and the Control substitutes it. A label set holds plain text, so the
 * alternative was a sentence broken into a prefix and a suffix -- which decides word order in English
 * and then imposes it on every other language. The token lets the recipient sit where the sentence needs
 * it, and a translator moves it there.
 *
 * `%1` rather than a readable `{recipient}`, and that is not a style choice: a translator translates
 * words, so `{recipient}` came back from German as `{Empfänger}` and the placeholder showed a visitor
 * the braces instead of the company. `%1` is not a word and survives the round trip -- the house token,
 * the one every other label set sends ([helpers/text-placeholders.ts](../../../helpers/text-placeholders.ts)
 * explains the same trap for Site copy).
 */
const PHI_VIDEO_WIDGET_LABEL_SET = definePhiLabelSet({
  key: "widget:video",
  ctx: PHI_TR_CTX_WEB_UI_LABEL,
  labels: {
    load_label: "Load video",
    load_visit_label: "Load videos for this visit",
    notice_text: definePhiMessageLabel(
      "Loading this video sends a request to %1, which can recognise you there.",
    ),
    visit_active_text: definePhiMessageLabel(
      "Videos from %1 load without asking for the rest of this visit.",
    ),
    forget_label: "Ask again",
    privacy_label: "Privacy notice",
  },
});

export async function getPhiVideoWidgetLabels(options: PhiGlobalTranslatorOptions) {
  const labels = await getPhiLabelSet(options, PHI_VIDEO_WIDGET_LABEL_SET);
  return {
    loadLabel: labels.load_label,
    loadVisitLabel: labels.load_visit_label,
    noticeText: labels.notice_text,
    visitActiveText: labels.visit_active_text,
    forgetLabel: labels.forget_label,
    privacyLabel: labels.privacy_label,
  };
}

export type PhiVideoWidgetLabels = Awaited<ReturnType<typeof getPhiVideoWidgetLabels>>;
