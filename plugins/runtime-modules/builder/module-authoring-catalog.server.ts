import "server-only";

import type { PhiAccessViewer } from "../../../types/access";
import { canPhiViewerAccessOwnedPolicy } from "../../../types/access";
import type {
  PhiRuntimeModuleCatalog,
  PhiRuntimeModuleId,
} from "../../../types";
import {
  buildPhiRuntimeModuleLayoutType,
  buildPhiRuntimeModuleWidgetType,
} from "../../../plugins/runtime-modules/contracts";
import type { PhiDeveloperBuilderArea } from "./developer-workspace-types";
import {
  buildPhiBuilderLayoutPluginMetas,
  buildPhiBuilderPluginMeta,
} from "./plugin-metas";
import type { PhiBuilderModuleAuthoringCatalogEntry } from "./module-authoring-catalog";

export function buildPhiBuilderModuleAuthoringCatalog({
  catalog,
  area,
  activeModuleIds,
  viewer,
}: {
  catalog: PhiRuntimeModuleCatalog;
  area: PhiDeveloperBuilderArea;
  activeModuleIds: ReadonlySet<PhiRuntimeModuleId>;
  viewer: PhiAccessViewer;
}): PhiBuilderModuleAuthoringCatalogEntry[] {
  const areaDefinition = catalog.areaDefinitions.find((definition) => definition.area === area);
  if (!areaDefinition) {
    throw new Error(`Area "${area}" is not declared in the runtime module catalog.`);
  }
  const platformModuleId = catalog.platformModuleId;
  if (!platformModuleId) {
    throw new Error("Runtime module catalog has no Platform contribution.");
  }
  const lockedModuleIds = new Set<PhiRuntimeModuleId>([
    platformModuleId,
    areaDefinition.baseModuleId,
  ]);
  return [...catalog.entries()].flatMap(([moduleId, entry]) => {
    const locked = lockedModuleIds.has(moduleId);
    if (!activeModuleIds.has(moduleId)) {
      return [];
    }

    const providerId = entry.definition.serverBinding.providerId;
    const widgets = entry.widgets.filter((widget) =>
      canPhiViewerAccessOwnedPolicy(viewer, widget.accessPolicy, providerId)
    );
    const layouts = entry.layouts.filter((layout) =>
      canPhiViewerAccessOwnedPolicy(viewer, layout.accessPolicy, providerId)
    );

    return [{
      moduleId,
      locked,
      plugins: [
        ...layouts.flatMap((layout) => buildPhiBuilderLayoutPluginMetas(layout.definition)),
        ...widgets.map((widget) => buildPhiBuilderPluginMeta(widget.definition)),
      ],
      widgetDefinitions: widgets.map((widget) => ({
        type: buildPhiRuntimeModuleWidgetType(widget),
        ownerModuleId: widget.ownerModuleId,
        title: widget.definition.title,
        signalSubcontrols: widget.definition.signalSubcontrols,
        slotSizePolicy: widget.definition.slotSizePolicy,
        renderPolicies: widget.renderPolicies,
      })),
      layoutTypes: layouts.map(buildPhiRuntimeModuleLayoutType),
      dataProviderDescriptors: entry.definition.dataProviders ?? [],
      calendarAdapterDescriptors: entry.definition.calendarAdapters ?? [],
      formOptions: (entry.forms ?? []).map((form) => ({
        value: form.formId,
        label: form.title,
        description: form.description ?? undefined,
      })),
      authoringDataProviderKeys: (entry.definition.dataProviders ?? [])
        .filter((descriptor) => descriptor.authoringMode !== "none")
        .map((descriptor) => descriptor.key),
    }];
  });
}
