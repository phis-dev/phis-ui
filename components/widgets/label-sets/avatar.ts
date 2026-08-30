import "server-only";

import {
  PHI_TR_CTX_WEB_UI_LABEL,
  type PhiGlobalTranslatorOptions,
} from "../../../gateway/tr";
import { definePhiLabelSet, getPhiLabelSet } from "../../../gateway/label-set";

const PHI_AVATAR_WIDGET_LABEL_SET = definePhiLabelSet({
  key: "widget:avatar",
  ctx: PHI_TR_CTX_WEB_UI_LABEL,
  labels: {
    title: "Picture",
    description: "The picture shown next to your name, wherever it appears.",
    change_label: "Change picture",
    remove_label: "Remove picture",
    empty_text: "No picture yet.",
    overlay_title: "Choose a picture",
    upload_label: "Upload a picture",
    upload_hint: "Your picture is shown to anyone who sees your name.",
    unavailable_text: "Pictures are not available on this site.",
    error_title: "That did not work",
    error_generic: "The picture could not be saved.",
    error_network: "The site could not be reached.",
    error_too_large: "That file is too large.",
    error_not_an_image: "Choose an image file.",
    error_duplicate: "That picture is already here.",
    error_quota_exceeded: "There is no room left in your space.",
    error_space_unavailable: "Pictures are not available on this site.",
    error_storage_unreachable: "The picture storage could not be reached.",
    success_text: "Your picture was updated.",
  },
});

export async function getPhiAvatarWidgetLabels(options: PhiGlobalTranslatorOptions) {
  const labels = await getPhiLabelSet(options, PHI_AVATAR_WIDGET_LABEL_SET);
  return {
    title: labels.title,
    description: labels.description,
    changeLabel: labels.change_label,
    removeLabel: labels.remove_label,
    emptyText: labels.empty_text,
    overlayTitle: labels.overlay_title,
    uploadLabel: labels.upload_label,
    uploadHint: labels.upload_hint,
    unavailableText: labels.unavailable_text,
    feedback: {
      errorTitle: labels.error_title,
      errorGeneric: labels.error_generic,
      errorNetwork: labels.error_network,
      errorTooLarge: labels.error_too_large,
      errorNotAnImage: labels.error_not_an_image,
      errorDuplicate: labels.error_duplicate,
      errorQuotaExceeded: labels.error_quota_exceeded,
      errorSpaceUnavailable: labels.error_space_unavailable,
      errorStorageUnreachable: labels.error_storage_unreachable,
      successText: labels.success_text,
    },
  };
}

export type PhiAvatarWidgetLabels = Awaited<ReturnType<typeof getPhiAvatarWidgetLabels>>;
