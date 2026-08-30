import type { PhiBlockRuntime, PhiCmsRuntimeRenderRegistry } from "../../../types";
import type { PhiSignalRouteSet } from "../../../types/signals";
import { getPhiBorderWidgetLabels } from "../../../components/widgets/label-sets/border";
import { getPhiBackgroundWidgetLabels } from "../../../components/widgets/label-sets/background";
import { getPhiGeometryWidgetLabels } from "../../../components/widgets/label-sets/geometry";
import { getPhiSignalsWidgetLabels } from "../../../components/widgets/label-sets/signals";
import { getPhiColorPickerLabelsForRuntime } from "../../../components/widgets/label-sets/color-picker";
import {
  PhiBuilderLayoutInspectorSectionWidgetClient,
  PhiBuilderRegionInspectorSectionWidgetClient,
  PhiBuilderWidgetInspectorSectionWidgetClient,
} from "./clients/inspector-section-widget";
import { buildPhiBuilderRuntimeModuleIdsForArea } from "./area-shell-presets.server";
import { resolvePhiBuilderAreaAsCmsArea } from "../../../constants/cms-areas";
import {
  PHI_BUILDER_AREA_SEARCH_PARAM,
  normalizePhiBuilderAreaSearchParam,
} from "../../../helpers/cms-scope-search-params";
import {
  resolvePhiRuntimeModuleAuthoringDataProviderDescriptors,
  resolvePhiRuntimeModuleSet,
} from "../../../plugins/runtime-modules/resolver";
import { PhiRuntimeModuleAuthoringDataProviderHost } from "../../../components/runtime/runtime-module-authoring-host";
import { PhiRuntimeModuleDataProviderClientHost } from "../../../components/runtime/runtime-module-data-provider-client-manifest";
import { resolvePhiBuilderAuthoringPickerDataProviderKeys } from "./authoring-provider-keys";

export type PhiBuilderInspectorSectionWidgetProps = {
  runtime: PhiBlockRuntime;
  registry: PhiCmsRuntimeRenderRegistry;
  view: "region" | "layout" | "widget";
  section?: string;
  signalRoutes?: PhiSignalRouteSet;
};

export async function PhiBuilderInspectorSectionWidget({
  runtime,
  registry,
  view,
  section,
  signalRoutes,
}: PhiBuilderInspectorSectionWidgetProps) {
  const area =
    normalizePhiBuilderAreaSearchParam(
      runtime.request?.searchParams?.[PHI_BUILDER_AREA_SEARCH_PARAM],
    ) ?? "public";
  const moduleIds = await buildPhiBuilderRuntimeModuleIdsForArea(
    runtime,
    area,
    registry.runtimeModuleCatalog,
  );
  const moduleSet = await resolvePhiRuntimeModuleSet({
    catalog: registry.runtimeModuleCatalog,
    area: resolvePhiBuilderAreaAsCmsArea(area),
    moduleIds,
    serverCapabilities: registry.serverCapabilities,
  });
  const builderModuleSet = await resolvePhiRuntimeModuleSet({
    catalog: registry.runtimeModuleCatalog,
    area: "builder",
    serverCapabilities: registry.serverCapabilities,
  });
  const targetDataProviderDescriptors =
    resolvePhiRuntimeModuleAuthoringDataProviderDescriptors({ moduleSet });
  const builderDataProviderDescriptors =
    resolvePhiRuntimeModuleAuthoringDataProviderDescriptors({ moduleSet: builderModuleSet });
  const authoringDataProviderKeys = [
    ...new Set([
      ...builderDataProviderDescriptors.map((descriptor) => descriptor.key),
      ...targetDataProviderDescriptors.map((descriptor) => descriptor.key),
    ]),
  ];
  const [
    backgroundLabels,
    borderLabels,
    geometryLabels,
    signalsLabels,
    colorPickerLabels,
  ] = await Promise.all([
    getPhiBackgroundWidgetLabels({
      apiBaseUrl: runtime.phis.apiBaseUrl,
      internalToken: runtime.phis.internalToken,
      locale: runtime.locale.current,
    }),
    getPhiBorderWidgetLabels({
      apiBaseUrl: runtime.phis.apiBaseUrl,
      internalToken: runtime.phis.internalToken,
      locale: runtime.locale.current,
    }),
    getPhiGeometryWidgetLabels({
      apiBaseUrl: runtime.phis.apiBaseUrl,
      internalToken: runtime.phis.internalToken,
      locale: runtime.locale.current,
    }),
    getPhiSignalsWidgetLabels({
      apiBaseUrl: runtime.phis.apiBaseUrl,
      internalToken: runtime.phis.internalToken,
      locale: runtime.locale.current,
    }),
    getPhiColorPickerLabelsForRuntime(runtime),
  ]);

  return (
    <PhiRuntimeModuleAuthoringDataProviderHost
      providerKeys={authoringDataProviderKeys}
    >
      <PhiRuntimeModuleDataProviderClientHost
        providerKeys={resolvePhiBuilderAuthoringPickerDataProviderKeys(
          [...registry.runtimeModuleCatalog.values()].map((entry) => ({
            dataProviderDescriptors: entry.definition.dataProviders ?? [],
          })),
        )}
        mode="live"
      >
        {view === "region" ? (
          <PhiBuilderRegionInspectorSectionWidgetClient
            section={section}
            signalRoutes={signalRoutes}
            geometryLabels={geometryLabels}
            backgroundLabels={backgroundLabels}
            borderLabels={borderLabels}
            colorPickerLabels={colorPickerLabels}
          />
        ) : view === "layout" ? (
          <PhiBuilderLayoutInspectorSectionWidgetClient
            section={section}
            signalRoutes={signalRoutes}
            signalsLabels={signalsLabels}
            backgroundLabels={backgroundLabels}
            borderLabels={borderLabels}
            colorPickerLabels={colorPickerLabels}
          />
        ) : (
          <PhiBuilderWidgetInspectorSectionWidgetClient
            section={section}
            signalRoutes={signalRoutes}
            geometryLabels={geometryLabels}
            signalsLabels={signalsLabels}
            colorPickerLabels={colorPickerLabels}
          />
        )}
      </PhiRuntimeModuleDataProviderClientHost>
    </PhiRuntimeModuleAuthoringDataProviderHost>
  );
}
