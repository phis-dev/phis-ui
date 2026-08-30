import type { PhiCmsAreaKey } from "../../constants/cms-areas";
import { PHI_AUTH_RUNTIME_MODULE_ID } from "../../plugins/runtime-modules/auth/ids";
import { createPhiPresetCmsInstanceIdMap } from "../../types/cms-instance-id";

export type PhiAuthLoginOverlayArea = Extract<PhiCmsAreaKey, "public" | "app">;

function createAuthLoginOverlayIds(area: PhiAuthLoginOverlayArea) {
  const presetKey = `auth-${area}-login-overlay`;
  return {
    presetKey,
    ...createPhiPresetCmsInstanceIdMap({
      domain: "area",
      ownerModuleId: PHI_AUTH_RUNTIME_MODULE_ID,
      presetKey,
    }, ["overlayLogin", "layoutBody", "widgetLogin"]),
  } as const;
}

export const PHI_AUTH_LOGIN_OVERLAY_IDS = {
  public: createAuthLoginOverlayIds("public"),
  app: createAuthLoginOverlayIds("app"),
} as const;

export function isPhiAuthLoginOverlayArea(area: PhiCmsAreaKey): area is PhiAuthLoginOverlayArea {
  return area === "public" || area === "app";
}
