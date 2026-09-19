"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { PhiAccountMenu, type PhiAccountMenuLabels } from "../../../../../components/menus/phi-account-menu";
import type { PhiClientBlockBaseProps, PhiBlockRuntime } from "../../../../../types";
import type { PhiAccountWidgetState } from "./server";
import { normalizeLoginRedirectTarget } from "../../../../../components/widgets/login-redirect";
import {
  createPhiSignalCorrelationId,
  usePhiSignalDispatcher,
} from "../../../../../components/runtime/runtime-signal-bus";
import { createPhiSignalAddress } from "../../../../../types/signals";
import type { PhiCmsInstanceId } from "../../../../../types/cms-instance-id";
import type { PhiAccountAreaEntry, PhiNavItem } from "../../../../../components/shell/shell-types";
import { fetchPhiViewerAvatar } from "../../../../../components/account/avatar-client";
import { PHI_AVATAR_REVISION } from "../../../../../components/account/avatar-revision";

export type PhiAccountWidgetConfig = {
  variant?: "full" | "compact" | "icon-only";
  showLabel?: boolean;
  showChevron?: boolean;
};

export type PhiAccountWidgetLabels = {
  menu: PhiAccountMenuLabels;
};

export type PhiAccountWidgetClientProps = PhiClientBlockBaseProps<
  PhiAccountWidgetLabels,
  PhiAccountWidgetConfig,
  Pick<PhiBlockRuntime, "site" | "locale" | "viewer" | "authUiProvider">
> & {
  avatarSrc?: string;
  avatarAlt?: string;
  contributedItems?: readonly PhiNavItem[];
  areaEntries?: readonly PhiAccountAreaEntry[];
  successAction?: "reload" | "none";
  state: PhiAccountWidgetState;
};

export function PhiAccountWidgetClient({
  runtime,
  avatarSrc,
  avatarAlt,
  contributedItems,
  areaEntries,
  state,
  labels,
  config,
}: PhiAccountWidgetClientProps) {
  const searchParams = useSearchParams();
  const dispatchSignal = usePhiSignalDispatcher();
  const [menuOpen, setMenuOpen] = useState(false);
  const configuredVariant = config?.variant ?? "full";
  const showLabel = config?.showLabel;
  const showChevron = config?.showChevron;
  const nextTarget = normalizeLoginRedirectTarget(searchParams.get("next"));
  const authUiProvider = runtime?.authUiProvider ?? null;

  function openLoginFromMenu() {
    setMenuOpen(false);
    const provider = authUiProvider;
    if (!provider) {
      return;
    }
    dispatchSignal({
      scope: "area",
      channel: "command",
      action: "open",
      value: nextTarget,
      valueType: "path",
      sender: null,
      receiver: provider.controllerAddress,
    });
  }

  const emitFromItem = useCallback((item: PhiNavItem) => {
    const sender = createPhiSignalAddress("cms", item.key as PhiCmsInstanceId);
    for (const route of item.emits ?? []) {
      if (route.receiver == null || (route.valueType === "json" && !route.valueSchema)) {
        continue;
      }
      dispatchSignal({
        scope: route.scope,
        channel: route.channel,
        action: route.action,
        value: null,
        valueType: route.valueType,
        valueSchema: route.valueSchema ?? null,
        receiver: route.receiver,
        sender,
        correlationId: createPhiSignalCorrelationId(),
        timestamp: Date.now(),
      });
    }
    setMenuOpen(false);
  }, [dispatchSignal]);

  const openOverlay = useCallback((overlayInstanceId: string) => {
    dispatchSignal({
      scope: "area",
      channel: "dialog",
      action: "activate",
      valueType: "none",
      value: null,
      receiver: createPhiSignalAddress("cms", overlayInstanceId as PhiCmsInstanceId),
      sender: createPhiSignalAddress("cms", overlayInstanceId as PhiCmsInstanceId),
      correlationId: createPhiSignalCorrelationId(),
      timestamp: Date.now(),
    });
  }, [dispatchSignal]);

  const avatarRevision = useSyncExternalStore(
    PHI_AVATAR_REVISION.subscribe,
    PHI_AVATAR_REVISION.getSnapshot,
    PHI_AVATAR_REVISION.getServerSnapshot,
  );
  const [viewerAvatarSrc, setViewerAvatarSrc] = useState<string | null>(null);
  useEffect(() => {
    // A guest has no avatar to read, and nothing to clear either: the state is derived below, so the
    // effect only ever fills it in.
    if (state.kind !== "authenticated") {
      return;
    }
    const controller = new AbortController();
    fetchPhiViewerAvatar(controller.signal)
      .then((avatar) => {
        setViewerAvatarSrc(avatar?.thumbnailUrl ?? avatar?.previewUrl ?? avatar?.deliveryUrl ?? null);
      })
      .catch(() => {
        // No picture is the ordinary answer, and a failed read is indistinguishable from it here. The
        // initials carry the trigger either way.
        setViewerAvatarSrc(null);
      });
    return () => controller.abort();
  }, [avatarRevision, state.kind]);
  // An explicitly configured source still wins: a Site that wants a fixed image says so. A guest never
  // shows one, which is why the fetched value is read through the state rather than stored for them.
  const resolvedAvatarSrc = state.kind === "authenticated"
    ? avatarSrc ?? viewerAvatarSrc ?? undefined
    : avatarSrc;

  return (
    <>
      <PhiAccountMenu
        labels={labels.menu}
        state={
          state.kind === "guest"
            ? {
                kind: "guest",
                onLogin: authUiProvider ? openLoginFromMenu : undefined,
                registerHref: authUiProvider ? state.registerHref : undefined,
              }
            : {
                kind: "authenticated",
                displayName: state.displayName,
              }
        }
        contributedItems={contributedItems}
        areaEntries={areaEntries}
        onOpenOverlay={openOverlay}
        onEmit={emitFromItem}
        avatarSrc={resolvedAvatarSrc}
        avatarAlt={avatarAlt}
        open={state.kind === "guest" ? menuOpen : undefined}
        onOpenChange={state.kind === "guest" ? setMenuOpen : undefined}
        mode={configuredVariant}
        showLabel={showLabel}
        showChevron={showChevron}
      />
    </>
  );
}
