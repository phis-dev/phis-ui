"use client";

import { useEffect, useMemo, type ReactNode } from "react";

import { PhiRuntimeModuleAuthoringClientHost } from "../../../../components/runtime/runtime-module-authoring-client-host";
import { PhiRuntimeModuleAuthoringDataProviderHost } from "../../../../components/runtime/runtime-module-authoring-host";
import { PhiRuntimeModuleDataProviderClientHost } from "../../../../components/runtime/runtime-module-data-provider-client-manifest";
import { PhiRuntimeModuleProvider } from "../../../../components/runtime/runtime-module-context";
import { setPhiBuilderModuleMetas } from "../plugin-meta-store";
import type { PhiBuilderModuleAuthoringCatalogEntry } from "../module-authoring-catalog";
import { usePhiDeveloperBuilderStateValue } from "../developer-workspace-store";
import type { PhiDeveloperBuilderArea } from "../developer-workspace-types";
import type { PhiRuntimeDataProviderKey } from "../../../../types/runtime-data-provider";
import type { PhiModuleIconSet } from "../../../../types/module-icons";
import { PhiModuleIconsProvider } from "../../../../components/shell/phi-module-icons";

export function PhiBuilderRuntimeModuleAuthoringBoundary({
  targetArea,
  catalog,
  pickerDataProviderKeys,
  children,
}: {
  targetArea: PhiDeveloperBuilderArea;
  catalog: readonly PhiBuilderModuleAuthoringCatalogEntry[];
  /**
   * Resolved by the Widget from the whole install catalog, because `catalog` is Area-scoped and has
   * already dropped every Module the edited Area does not activate.
   */
  pickerDataProviderKeys: readonly PhiRuntimeDataProviderKey[];
  children: ReactNode;
}) {
  const selectedModuleIds = usePhiDeveloperBuilderStateValue((state) => state.runtimeModuleIdsByArea[targetArea],
  );
  const activeEntries = useMemo(() => {
    if (selectedModuleIds == null) {
      return catalog;
    }
    const selectedModuleIdSet = new Set(selectedModuleIds);
    return catalog.filter((entry) =>
      entry.locked || selectedModuleIdSet.has(entry.moduleId)
    );
  }, [catalog, selectedModuleIds]);
  const moduleIds = useMemo(
    () => activeEntries.map((entry) => entry.moduleId),
    [activeEntries],
  );
  const plugins = useMemo(
    () => activeEntries.flatMap((entry) => entry.plugins),
    [activeEntries],
  );
  const widgetDefinitions = useMemo(
    () => activeEntries.flatMap((entry) => entry.widgetDefinitions),
    [activeEntries],
  );
  const layoutTypes = useMemo(
    () => activeEntries.flatMap((entry) => entry.layoutTypes),
    [activeEntries],
  );
  const dataProviderDescriptors = useMemo(
    () => activeEntries.flatMap((entry) => entry.dataProviderDescriptors),
    [activeEntries],
  );
  const collectionItemRendererDescriptors = useMemo(
    () => activeEntries.flatMap((entry) => entry.collectionItemRendererDescriptors),
    [activeEntries],
  );
  const calendarAdapterDescriptors = useMemo(
    () => activeEntries.flatMap((entry) => entry.calendarAdapterDescriptors),
    [activeEntries],
  );
  const videoProviderDescriptors = useMemo(
    () => activeEntries.flatMap((entry) => entry.videoProviderDescriptors),
    [activeEntries],
  );
  const formOptions = useMemo(
    () => activeEntries.flatMap((entry) => entry.formOptions),
    [activeEntries],
  );
  const iconSets = useMemo(
    () => activeEntries.flatMap((entry): PhiModuleIconSet[] => entry.iconSet ? [entry.iconSet] : []),
    [activeEntries],
  );
  const authoringDataProviderKeys = useMemo(
    () => activeEntries.flatMap((entry) => entry.authoringDataProviderKeys),
    [activeEntries],
  );

  useEffect(() => {
    setPhiBuilderModuleMetas(targetArea, {
      plugins,
      dataProviders: dataProviderDescriptors,
      collectionItemRenderers: collectionItemRendererDescriptors,
      calendarAdapters: calendarAdapterDescriptors,
      videoProviders: videoProviderDescriptors,
      forms: formOptions,
      icons: iconSets,
    });
  }, [
    calendarAdapterDescriptors,
    collectionItemRendererDescriptors,
    dataProviderDescriptors,
    formOptions,
    iconSets,
    plugins,
    targetArea,
    videoProviderDescriptors,
  ]);

  return (
    <PhiRuntimeModuleProvider
      moduleIds={moduleIds}
      widgetTypes={widgetDefinitions.map((definition) => definition.type)}
      layoutTypes={layoutTypes}
      widgetDefinitions={widgetDefinitions}
      dataProviderDescriptors={dataProviderDescriptors}
      calendarAdapterDescriptors={calendarAdapterDescriptors}
      videoProviderDescriptors={videoProviderDescriptors}
      collectionItemRendererDescriptors={collectionItemRendererDescriptors}
    >
      <PhiRuntimeModuleAuthoringDataProviderHost providerKeys={authoringDataProviderKeys}>
        {/*
          * The canvas hosts the Builder's own pickers, so it mounts their providers the way the Inspector
          * already does -- the Area's authoring providers alone never contain them unless that Area
          * happens to activate the Assets Module.
          */}
        <PhiRuntimeModuleDataProviderClientHost
          providerKeys={pickerDataProviderKeys}
          mode="live"
        >
          <PhiRuntimeModuleAuthoringClientHost moduleIds={moduleIds}>
            {/*
              * The target Area's icons replace the Builder Area's own, and one whose Module is not
              * active there is flagged in the canvas rather than left blank.
              */}
            <PhiModuleIconsProvider sets={iconSets} flagUnavailable>
              {children}
            </PhiModuleIconsProvider>
          </PhiRuntimeModuleAuthoringClientHost>
        </PhiRuntimeModuleDataProviderClientHost>
      </PhiRuntimeModuleAuthoringDataProviderHost>
    </PhiRuntimeModuleProvider>
  );
}
