import "server-only";

import { PHI_TR_CTX_WEB_UI_LABEL, type PhiGlobalTranslatorOptions } from "../../../gateway/tr";
import { definePhiLabelSet, getPhiLabelSet } from "../../../gateway/label-set";

const PHI_PUB_ERROR_PAGE_LABEL_SET = definePhiLabelSet({
  key: "preset:pub-error-page",
  ctx: PHI_TR_CTX_WEB_UI_LABEL,
  labels: {
    error_401_title: "Not authorized",
    error_401_subtitle: "You are not authorized to view this page.",
    error_403_title: "Forbidden",
    error_403_subtitle: "You are not allowed to view this page.",
    error_404_title: "Not found",
    error_404_subtitle: "This page could not be found.",
    error_500_title: "Something went wrong",
    error_500_subtitle: "Something went wrong.",
  },
});

const SOURCE_LABELS = PHI_PUB_ERROR_PAGE_LABEL_SET.labels;

function canUseTranslator(options: Partial<PhiGlobalTranslatorOptions>) {
  return Boolean(
    options.apiBaseUrl?.trim() &&
    options.internalToken?.trim() &&
    options.locale?.trim(),
  );
}

export async function getPhiPubErrorPageLabels(options: Partial<PhiGlobalTranslatorOptions>) {
  const labels = canUseTranslator(options)
    ? await getPhiLabelSet(options as PhiGlobalTranslatorOptions, PHI_PUB_ERROR_PAGE_LABEL_SET)
    : SOURCE_LABELS;

  return {
    401: {
      title: labels.error_401_title,
      subTitle: labels.error_401_subtitle,
    },
    403: {
      title: labels.error_403_title,
      subTitle: labels.error_403_subtitle,
    },
    404: {
      title: labels.error_404_title,
      subTitle: labels.error_404_subtitle,
    },
    500: {
      title: labels.error_500_title,
      subTitle: labels.error_500_subtitle,
    },
  };
}
