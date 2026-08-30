"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Flex, Typography } from "antd";
import { UserOutlined } from "@ant-design/icons";
import { Avatar } from "antd";

import type { PhiBlockRuntime, PhiClientBlockBaseProps } from "../../../../../types";
import { PhiAlertControl } from "../../../../../components/controls/phi-alert-control";
import { PhiButtonControl } from "../../../../../components/controls/phi-button-control";
import {
  clearPhiViewerAvatar,
  fetchPhiViewerAvatar,
  type PhiAvatarAsset,
} from "../../../../../components/account/avatar-client";
import { PHI_AVATAR_REVISION } from "../../../../../components/account/avatar-revision";
import { PHI_AVATAR_OVERLAY_IDS } from "../../../../../components/runtime/avatar-overlay-ids";
import { createPhiSignalAddress } from "../../../../../types/signals";
import {
  createPhiSignalCorrelationId,
  usePhiSignalDispatcher,
} from "../../../../../components/runtime/runtime-signal-bus";
/**
 * Declared here rather than imported from the label set, which is `server-only`: the client needs the
 * shape, not the loader. The server component's labels satisfy it structurally.
 */
export type PhiAvatarWidgetLabels = {
  title: string;
  description: string;
  changeLabel: string;
  removeLabel: string;
  emptyText: string;
  overlayTitle: string;
  uploadLabel: string;
  uploadHint: string;
  unavailableText: string;
  feedback: {
    errorTitle: string;
    errorGeneric: string;
    errorNetwork: string;
    errorTooLarge: string;
    errorNotAnImage: string;
    errorDuplicate: string;
    errorQuotaExceeded: string;
    errorSpaceUnavailable: string;
    errorStorageUnreachable: string;
    successText: string;
  };
};

export type PhiAccountAvatarWidgetClientProps = PhiClientBlockBaseProps<
  PhiAvatarWidgetLabels,
  { padding?: number | string },
  Pick<PhiBlockRuntime, "site" | "locale" | "viewer">
>;

export function PhiAccountAvatarWidgetClient({ labels, config }: PhiAccountAvatarWidgetClientProps) {
  const dispatchSignal = usePhiSignalDispatcher();
  const revision = useSyncExternalStore(
    PHI_AVATAR_REVISION.subscribe,
    PHI_AVATAR_REVISION.getSnapshot,
    PHI_AVATAR_REVISION.getServerSnapshot,
  );
  const [avatar, setAvatar] = useState<PhiAvatarAsset | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetchPhiViewerAvatar(controller.signal)
      .then((value) => setAvatar(value))
      .catch(() => {
        // A read that fails leaves the placeholder standing. It is a picture; saying so twice with an
        // alert would be louder than the thing is worth.
      });
    return () => controller.abort();
  }, [revision]);

  const overlayAddress = useMemo(
    () => createPhiSignalAddress("cms", PHI_AVATAR_OVERLAY_IDS.overlayPicker),
    [],
  );

  const openPicker = useCallback(() => {
    setError(null);
    dispatchSignal({
      scope: "area",
      channel: "dialog",
      action: "activate",
      valueType: "none",
      value: null,
      receiver: overlayAddress,
      sender: createPhiSignalAddress("cms", PHI_AVATAR_OVERLAY_IDS.overlayPicker),
      correlationId: createPhiSignalCorrelationId(),
      timestamp: Date.now(),
    });
  }, [dispatchSignal, overlayAddress]);

  const removePicture = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      await clearPhiViewerAvatar();
      PHI_AVATAR_REVISION.bump();
    } catch {
      setError(labels.feedback.errorGeneric);
    } finally {
      setBusy(false);
    }
  }, [labels.feedback.errorGeneric]);

  // Thumbnail first, then the original: a freshly uploaded picture has no variant yet, and showing
  // nothing until one exists would read as a failed upload.
  const src = avatar?.thumbnailUrl ?? avatar?.previewUrl ?? avatar?.deliveryUrl ?? undefined;

  return (
    <Flex vertical gap="small" style={{ padding: config?.padding }}>
      <Typography.Title level={5} style={{ margin: 0 }}>{labels.title}</Typography.Title>
      <Typography.Text type="secondary">{labels.description}</Typography.Text>
      {error ? <PhiAlertControl level="error" title={labels.feedback.errorTitle} description={error} /> : null}
      <Flex align="center" gap="middle">
        <Avatar size={64} src={src} icon={<UserOutlined />} alt={avatar?.altText ?? labels.title} />
        <Flex vertical gap="small">
          {!avatar ? <Typography.Text type="secondary">{labels.emptyText}</Typography.Text> : null}
          <Flex gap="small" wrap>
            <PhiButtonControl type="primary" label={labels.changeLabel} onClick={openPicker} disabled={busy} />
            {avatar ? (
              <PhiButtonControl label={labels.removeLabel} onClick={removePicture} disabled={busy} />
            ) : null}
          </Flex>
        </Flex>
      </Flex>
    </Flex>
  );
}
