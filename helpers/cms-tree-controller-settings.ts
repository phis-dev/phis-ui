import type { PhiCmsTreeControllerSettings } from "../types/cms";
import { joinPhiSignalRouteSets } from "./signal-route-set-join";

/**
 * Two trees' Controller settings put together, as their nodes are when a Shell or an Area Overlay is
 * composed.
 *
 * A Controller configured by both is configured once, with the routes of both: each tree names the
 * receivers it holds -- the Shell its header Widgets, an Overlay contribution its dialogs -- and the
 * composed tree holds them all. Anything else both set, and a route both name, is refused like a
 * duplicate node id: which one counted would be left to the order they were composed in.
 */
export function concatPhiCmsTreeControllerSettings(
  base: PhiCmsTreeControllerSettings | null | undefined,
  addition: PhiCmsTreeControllerSettings | null | undefined,
  label: string,
): PhiCmsTreeControllerSettings {
  const settings = [...(base ?? [])];
  for (const setting of addition ?? []) {
    const key = `${setting.type}:${setting.instanceKey}`;
    const index = settings.findIndex((entry) => `${entry.type}:${entry.instanceKey}` === key);
    if (index < 0) {
      settings.push(setting);
      continue;
    }
    const existing = settings[index]!;
    const existingConfig = existing.config ?? {};
    const addedConfig = setting.config ?? {};
    const shared = Object.keys(addedConfig).filter((name) => name !== "signalRoutes" && name in existingConfig);
    if (existing.mountScope !== setting.mountScope || shared.length > 0) {
      throw new Error(`${label} configures Controller "${key}" twice.`);
    }
    const signalRoutes = joinPhiSignalRouteSets(existingConfig.signalRoutes, addedConfig.signalRoutes, {
      duplicate: "refuse",
      label: `${label}, Controller "${key}",`,
    });
    settings[index] = {
      ...existing,
      config: { ...existingConfig, ...addedConfig, ...(signalRoutes ? { signalRoutes } : {}) },
    };
  }
  return settings;
}
