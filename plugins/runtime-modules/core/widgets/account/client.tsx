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
import type { PhiNavItem } from "../../../../../components/shell/shell-types";
import { fetchPhiViewerAvatar } from "../../../../../components/account/avatar-client";
import { PHI_AVATAR_REVISION } from "../../../../../components/account/avatar-revision";
import { PHIS_SITE_KEY_HEADER } from "../../../../../constants/http-headers";

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
  successAction?: "reload" | "none";
  state: PhiAccountWidgetState;
};

export function PhiAccountWidgetClient({
  runtime,
  avatarSrc,
  avatarAlt,
  contributedItems,
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

  async function handleLogout() {
    try {
      const csrfResponse = await fetch("/api/auth/csrf", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });
      const csrfPayload = (await csrfResponse.json().catch(() => ({}))) as { token?: string };
      const csrfToken = csrfPayload.token?.trim() ?? "";

      if (!csrfResponse.ok || !csrfToken) {
        return;
      }

      const headers = new Headers({
        "x-csrf-token": csrfToken,
      });

      if (runtime?.site.key?.trim()) {
        headers.set(PHIS_SITE_KEY_HEADER, runtime.site.key.trim().toLowerCase());
      }

      const logoutResponse = await fetch("/api/auth/logout", {
        method: "POST",
        headers,
        credentials: "include",
        cache: "no-store",
      });

      if (logoutResponse.ok) {
        window.location.reload();
      }
    } finally {
      setMenuOpen(false);
    }
  }

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
                profileHref: state.profileHref,
                settingsHref: state.settingsHref,
                logoutHref: state.logoutHref,
                displayName: state.displayName,
                onLogout: state.logoutHref ? undefined : handleLogout,
              }
        }
        contributedItems={contributedItems}
        onOpenOverlay={openOverlay}
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
