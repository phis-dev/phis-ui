"use client";

import type { PhiBuilderPluginMeta } from "../../../types/builder";
import type { PhiRuntimeModuleDataProviderDescriptor } from "../../../types/cms-plugins";
import type { PhiCollectionItemRendererDescriptor } from "../../../types/collection-provider";
import type { PhiCalendarAdapterDescriptor } from "../../../types/calendar";
import type { PhiControlOption } from "../../../components/controls/phi-control-options";
import { createPhiPluginStateStore } from "../../../components/state/plugin-state-store";

type PhiBuilderModuleMetaState = {
  plugins: readonly PhiBuilderPluginMeta[];
  dataProviders: readonly PhiRuntimeModuleDataProviderDescriptor[];
  collectionItemRenderers: readonly PhiCollectionItemRendererDescriptor[];
  calendarAdapters: readonly PhiCalendarAdapterDescriptor[];
  forms: readonly PhiControlOption[];
};

const builderPluginMetaStore = createPhiPluginStateStore<PhiBuilderModuleMetaState>(
  "@phis/ui/builder-plugin-metas",
  () => ({ plugins: [], dataProviders: [], collectionItemRenderers: [], calendarAdapters: [], forms: [] }),
);

export function usePhiBuilderModuleMetas(area: string) {
  return builderPluginMetaStore.useStore(area);
}

export function getPhiBuilderModuleMetasSnapshot(area: string) {
  return builderPluginMetaStore.getSnapshot(area);
}

export function setPhiBuilderModuleMetas(
  area: string,
  state: PhiBuilderModuleMetaState,
) {
  builderPluginMetaStore.replace(area, state);
}
