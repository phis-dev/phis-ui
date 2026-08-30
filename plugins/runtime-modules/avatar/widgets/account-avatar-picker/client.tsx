"use client";

import { useCallback, useMemo } from "react";
import { Flex, Progress, Typography, Upload } from "antd";

import type { PhiBlockRuntime, PhiClientBlockBaseProps } from "../../../../../types";
import { PhiAlertControl } from "../../../../../components/controls/phi-alert-control";
import { usePhiMediaUpload } from "../../../../../components/media/phi-media-upload";
import { PHI_AVATAR_RUNTIME_MODULE_DEFINITION } from "../../../../../plugins/runtime-modules/avatar/definition";
import { setPhiViewerAvatar } from "../../../../../components/account/avatar-client";
import { PHI_AVATAR_REVISION } from "../../../../../components/account/avatar-revision";
import { PHI_AVATAR_OVERLAY_IDS } from "../../../../../components/runtime/avatar-overlay-ids";
import { createPhiSignalAddress } from "../../../../../types/signals";
import {
  createPhiSignalCorrelationId,
  usePhiSignalDispatcher,
} from "../../../../../components/runtime/runtime-signal-bus";
import type { PhiAvatarWidgetLabels } from "../account-avatar/client";

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
      kinds: PHI_AVATAR_RUNTIME_MODULE_DEFINITION.mediaSpaces.user.kinds,
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
    <Flex vertical gap="small" style={{ padding: config?.padding }}>
      <Typography.Text type="secondary">{labels.uploadHint}</Typography.Text>
      {active?.error
        ? <PhiAlertControl level="error" title={labels.feedback.errorTitle} description={active.error} />
        : null}
      <Upload.Dragger
        accept={accept}
        multiple={false}
        showUploadList={false}
        disabled={busy}
        // Never hand the file to Ant Design's own uploader: the transport is the Provider-issued plan.
        beforeUpload={(file) => { void upload(file as File); return false; }}
      >
        <Typography.Text>{labels.uploadLabel}</Typography.Text>
      </Upload.Dragger>
      {busy ? <Progress percent={Math.round(active?.progress ?? 0)} size="small" /> : null}
    </Flex>
  );
}
