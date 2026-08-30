import { splitPhiCmsLayoutNamespacedTypeKey } from "../../constants/cms-layout-types";
import type { PhiCmsLayoutPlugin } from "../../types";

export type PhiRuntimeCmsLayoutPlugin = PhiCmsLayoutPlugin<unknown>;

export function resolvePhiRuntimeLayoutPluginByTypeKey(
  type: string,
  pluginsByType: ReadonlyMap<string, PhiRuntimeCmsLayoutPlugin>,
) {
  const { pluginKey, typeKey } = splitPhiCmsLayoutNamespacedTypeKey(type);
  const plugin = pluginsByType.get(`${pluginKey}/${typeKey}`) ?? null;
  return plugin;
}

export function resolvePhiRuntimeLayoutPluginConfigParser(
  plugin: PhiRuntimeCmsLayoutPlugin | null | undefined,
) {
  return plugin?.parseConfig ?? null;
}
