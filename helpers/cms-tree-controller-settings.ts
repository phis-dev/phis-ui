import type { PhiCmsTreeControllerSettings } from "../types/cms";

/**
 * Two trees' Controller settings put together, as their nodes are when a Shell or an Area Overlay is
 * composed.
 *
 * A Controller is configured once per tree: two contributions configuring the same type and instance
 * would leave which one counts to the order they were composed in, so that is refused like a duplicate
 * node id.
 */
export function concatPhiCmsTreeControllerSettings(
  base: PhiCmsTreeControllerSettings | null | undefined,
  addition: PhiCmsTreeControllerSettings | null | undefined,
  label: string,
): PhiCmsTreeControllerSettings {
  const settings = [...(base ?? []), ...(addition ?? [])];
  const keys = new Set<string>();
  for (const setting of settings) {
    const key = `${setting.type}:${setting.instanceKey}`;
    if (keys.has(key)) {
      throw new Error(`${label} configures Controller "${key}" twice.`);
    }
    keys.add(key);
  }
  return settings;
}
