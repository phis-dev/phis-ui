import type {
  PhiResolvedRuntimeModuleSet,
  PhiRuntimeModuleClientWidgetDefinition,
} from "../../types/cms-plugins";
import type { PhiAccessViewer } from "../../types/access";
import { canPhiViewerAccessOwnedPolicy } from "../../types/access";

export function filterPhiRuntimeModuleWidgetDefinitionsForViewer(
  moduleSet: PhiResolvedRuntimeModuleSet,
  viewer: PhiAccessViewer,
) {
  return [...moduleSet.widgetDefinitionsByType].filter(([, entry]) =>
    canPhiViewerAccessOwnedPolicy(
      viewer,
      entry.accessPolicy,
      moduleSet.moduleDefinitionsById.get(entry.ownerModuleId)?.serverBinding.providerId,
    )
  );
}

export function filterPhiRuntimeModuleLayoutDefinitionsForViewer(
  moduleSet: PhiResolvedRuntimeModuleSet,
  viewer: PhiAccessViewer,
) {
  return [...moduleSet.layoutDefinitionsByType].filter(([, entry]) =>
    canPhiViewerAccessOwnedPolicy(
      viewer,
      entry.accessPolicy,
      moduleSet.moduleDefinitionsById.get(entry.ownerModuleId)?.serverBinding.providerId,
    )
  );
}

export function buildPhiRuntimeModuleClientWidgetDefinitions(
  moduleSet: PhiResolvedRuntimeModuleSet,
  viewer: PhiAccessViewer,
): PhiRuntimeModuleClientWidgetDefinition[] {
  return filterPhiRuntimeModuleWidgetDefinitionsForViewer(moduleSet, viewer).map(([type, entry]) => ({
    type,
    ownerModuleId: entry.ownerModuleId,
    title: entry.definition.title,
    signalSubcontrols: entry.definition.signalSubcontrols,
    slotSizePolicy: entry.definition.slotSizePolicy,
    renderPolicies: entry.renderPolicies,
  }));
}
