"use client";

import { useEffect, useMemo, type ReactNode } from "react";

import { PhiRuntimeModuleAuthoringClientHost } from "../../../../components/runtime/runtime-module-authoring-client-host";
import { PhiRuntimeModuleAuthoringDataProviderHost } from "../../../../components/runtime/runtime-module-authoring-host";
import { PhiRuntimeModuleDataProviderClientHost } from "../../../../components/runtime/runtime-module-data-provider-client-manifest";
import { PhiRuntimeModuleProvider } from "../../../../components/runtime/runtime-module-context";
import { resolvePhiBuilderAuthoringPickerDataProviderKeys } from "../authoring-provider-keys";
import { setPhiBuilderModuleMetas } from "../plugin-meta-store";
import type { PhiBuilderModuleAuthoringCatalogEntry } from "../module-authoring-catalog";
import { usePhiDeveloperBuilderStateValue } from "../developer-workspace-store";
import type { PhiDeveloperBuilderArea } from "../developer-workspace-types";

export function PhiBuilderRuntimeModuleAuthoringBoundary({
  targetArea,
  catalog,
  children,
}: {
  targetArea: PhiDeveloperBuilderArea;
  catalog: readonly PhiBuilderModuleAuthoringCatalogEntry[];
  children: ReactNode;
}) {
  const selectedModuleIds = usePhiDeveloperBuilderStateValue(
    "public",
    (state) => state.runtimeModuleIdsByArea[targetArea],
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
  const pickerDataProviderKeys = useMemo(
    () => resolvePhiBuilderAuthoringPickerDataProviderKeys(catalog),
    [catalog],
  );
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
  const calendarAdapterDescriptors = useMemo(
    () => activeEntries.flatMap((entry) => entry.calendarAdapterDescriptors),
    [activeEntries],
  );
  const formOptions = useMemo(
    () => activeEntries.flatMap((entry) => entry.formOptions),
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
      calendarAdapters: calendarAdapterDescriptors,
      forms: formOptions,
    });
  }, [calendarAdapterDescriptors, dataProviderDescriptors, formOptions, plugins, targetArea]);

  return (
    <PhiRuntimeModuleProvider
      moduleIds={moduleIds}
      widgetTypes={widgetDefinitions.map((definition) => definition.type)}
      layoutTypes={layoutTypes}
      widgetDefinitions={widgetDefinitions}
      dataProviderDescriptors={dataProviderDescriptors}
      calendarAdapterDescriptors={calendarAdapterDescriptors}
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
            {children}
          </PhiRuntimeModuleAuthoringClientHost>
        </PhiRuntimeModuleDataProviderClientHost>
      </PhiRuntimeModuleAuthoringDataProviderHost>
    </PhiRuntimeModuleProvider>
  );
}
