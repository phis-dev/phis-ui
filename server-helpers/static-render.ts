import type { PhiCmsSiteBridge } from "../types/cms-plugins";

const STATIC_BRIDGES = new WeakMap<PhiCmsSiteBridge, PhiCmsSiteBridge>();

/**
 * The Bridge a static route renders with: the same Area, reading nothing from the request.
 *
 * One object per Bridge, never a fresh copy per call. The per-request loaders are keyed on the Bridge
 * they are given, so a Layout and a Page that each made their own copy would resolve the same page twice.
 */
export function toPhiStaticCmsSiteBridge(cmsBridge: PhiCmsSiteBridge): PhiCmsSiteBridge {
  let staticBridge = STATIC_BRIDGES.get(cmsBridge);
  if (!staticBridge) {
    staticBridge = { ...cmsBridge, renderSource: "static" };
    STATIC_BRIDGES.set(cmsBridge, staticBridge);
  }
  return staticBridge;
}

export function isPhiStaticCmsSiteBridge(cmsBridge: PhiCmsSiteBridge) {
  return cmsBridge.renderSource === "static";
}
