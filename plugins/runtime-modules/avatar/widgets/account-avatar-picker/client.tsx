"use client";

import { useCallback, useMemo } from "react";

import type { PhiBlockRuntime, PhiClientBlockBaseProps } from "../../../../../types";
import { PhiFileDropControl } from "../../../../../components/controls/phi-file-drop-control";
import { PhiProgressControl } from "../../../../../components/controls/phi-progress-control";
import { PhiAlertControl } from "../../../../../components/controls/phi-alert-control";
import { usePhiMediaUpload } from "../../../../../components/media/phi-media-upload";
import { PHI_AVATAR_USER_SPACE_MEDIA_KINDS } from "../../../../../plugins/runtime-modules/avatar/media-spaces";
import { setPhiViewerAvatar } from "../../../../../components/account/avatar-client";
import { PHI_AVATAR_REVISION } from "../../../../../components/account/avatar-revision";
import { PHI_AVATAR_OVERLAY_IDS } from "../../../../../components/runtime/avatar-overlay-ids";
import { createPhiSignalAddress } from "../../../../../types/signals";
import {
  createPhiSignalCorrelationId,
  usePhiSignalDispatcher,
} from "../../../../../components/runtime/runtime-signal-bus";
import type { PhiAvatarWidgetLabels } from "../account-avatar/client";
import { PhiFlexControl } from "../../../../../components/controls/phi-flex-control";
import { PhiTypographyControl } from "../../../../../components/controls/phi-typography-control";

export type PhiAccountAvatarPickerWidgetClientProps = PhiClientBlockBaseProps<
  PhiAvatarWidgetLabels,
  { padding?: number | string },
  Pick<PhiBlockRuntime, "site" | "locale" | "viewer">
>;

/**
 * Uploads a picture into the viewer's own Space and binds it as their avatar.
 *
 * Accept, transport, progress and refusal come from the shared upload hook, which every Media surface
 * uses; what stays here is the only part that is about avatars -- binding the result, announcing it,
 * and closing the Overlay. The Space is named `user` rather than resolved here, so a Site that has not
 * activated the Module answers with a refusal instead of this deciding on its own that it may not ask.
 */
export function PhiAccountAvatarPickerWidgetClient({
  labels,
  config,
}: PhiAccountAvatarPickerWidgetClientProps) {
  const dispatchSignal = usePhiSignalDispatcher();

  const overlayAddress = useMemo(
    () => createPhiSignalAddress("cms", PHI_AVATAR_OVERLAY_IDS.overlayPicker),
    [],
  );

  const closeOverlay = useCallback(() => {
    dispatchSignal({
      scope: "area",
      channel: "dialog",
      action: "close",
      valueType: "none",
      value: null,
      receiver: overlayAddress,
      sender: overlayAddress,
      correlationId: createPhiSignalCorrelationId(),
      timestamp: Date.now(),
    });
  }, [dispatchSignal, overlayAddress]);

  const uploadLabels = useMemo(() => ({
    errorGeneric: labels.feedback.errorGeneric,
    errorNetwork: labels.feedback.errorNetwork,
    errorTooLarge: labels.feedback.errorTooLarge,
    errorDuplicate: labels.feedback.errorDuplicate,
    errorTypeNotAllowed: labels.feedback.errorNotAnImage,
    errorQuotaExceeded: labels.feedback.errorQuotaExceeded,
    errorSpaceUnavailable: labels.feedback.errorSpaceUnavailable,
    errorStorageUnreachable: labels.feedback.errorStorageUnreachable,
  }), [labels]);

  const { accept, items, upload } = usePhiMediaUpload({
    labels: uploadLabels,
    /*
     * The Module's own declaration, read rather than restated.
     *
     * The same value reaches the control plane through the Area preset and decides the upload there, so
     * the file dialog and the answer cannot drift apart. This is the courtesy half: the server is what
     * actually refuses, and this is only what stops a person choosing a file that was never going to
     * be accepted.
     */
    acceptance: {
      kinds: PHI_AVATAR_USER_SPACE_MEDIA_KINDS,
      multiple: false,
    },
    initOptions: { spaceAddress: "user" },
    onUploaded: async (asset) => {
      await setPhiViewerAvatar(asset.id);
      PHI_AVATAR_REVISION.bump();
      closeOverlay();
    },
  });

  const active = items[0];
  const busy = active?.status === "uploading";

  return (
    <PhiFlexControl vertical gap="small" style={{ padding: config?.padding }}>
      <PhiTypographyControl type="secondary">{labels.uploadHint}</PhiTypographyControl>
      {active?.error
        ? <PhiAlertControl level="error" title={labels.feedback.errorTitle} description={active.error} />
        : null}
      <PhiFileDropControl
        dropZone
        accept={accept}
        multiple={false}
        disabled={busy}
        onFile={(file) => void upload(file)}
      >
        <PhiTypographyControl>{labels.uploadLabel}</PhiTypographyControl>
      </PhiFileDropControl>
      {busy ? <PhiProgressControl percent={Math.round(active?.progress ?? 0)} size="small" /> : null}
    </PhiFlexControl>
  );
}
