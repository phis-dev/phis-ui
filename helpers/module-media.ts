import { readPhiRuntimeModulePackageName } from "../constants/module-identity";
import type { PhiModuleMediaLoader, PhiModuleMediaResolver } from "../types/module-media";

/**
 * The resolver a preset of `ownerModuleId` is handed: the names of that Module's own package, answered
 * from `load`. `load` runs on the first question only and its promise is kept, so one instantiation asks
 * Core at most once and a preset that asks nothing costs nothing.
 */
export function createPhiModuleMediaResolver(
  ownerModuleId: string,
  load: PhiModuleMediaLoader,
): PhiModuleMediaResolver {
  const packageName = readPhiRuntimeModulePackageName(ownerModuleId);
  let mapping: ReturnType<PhiModuleMediaLoader> | null = null;
  const read = () => (mapping ??= load());
  return {
    asset: async (key) => (await read()).assets[packageName]?.[key] ?? null,
    folder: async (key) => (await read()).folders[packageName]?.[key] ?? null,
  };
}
