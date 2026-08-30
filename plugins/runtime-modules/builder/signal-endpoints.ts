"use client";

import type { PhiRuntimeControllerSetting } from "../../../types";
import type { PhiCmsContentWidgetNode, PhiCmsLayoutRenderNode } from "../../../types/cms";
import type { PhiSignalScope } from "../../../types/signals";
import {
  resolvePhiControllerSignalEndpoints,
  resolvePhiLayoutSignalEndpoints,
  resolvePhiRegionSignalEndpoints,
  resolvePhiWidgetSignalEndpoints,
  type PhiSignalEndpoint,
} from "../../../components/widgets/signals/signal-endpoints";
import { resolvePhiRuntimeAreaDefinition } from "../../../plugins/runtime-modules/area-definitions";
import { resolvePhiRuntimeModuleIdsForArea } from "../../../plugins/runtime-modules/settings";
import { getPhiRegionWidgetLabelEntry, type PhiRegionWidgetLabels } from "../../../components/widgets/label-types/region";
import { isPhiBuilderPageScopedRegion, isPhiBuilderShellRegion } from "./region-keys";
import type { PhiBuilderPluginMeta } from "../../../types/builder";
import type {
  PhiDeveloperBuilderRegionDraft,
} from "./developer-workspace-types";
import type { PhiWorkspaceCatalogState } from "../../../components/workspace/catalog-state";

/**
 * Every Signal endpoint an author may wire to, collected from the Builder's own drafts.
 *
 * This travelled with the wiring Modal and was removed together with it; the wiring overlay needs it
 * again. A receiver list cannot be derived from the selected node alone -- a route points at some OTHER
 * block or controller in the same Area, so the whole draft set has to be walked.
 */

function resolveBuilderPluginMeta(
  builderPlugins: readonly PhiBuilderPluginMeta[],
  kind: PhiBuilderPluginMeta["kind"],
  typeKey: string | null | undefined,
) {
  if (!typeKey) {
    return null;
  }

  return builderPlugins.find((plugin) =>
    plugin.kind === kind &&
    (plugin.typeKey === typeKey || `${plugin.pluginKey}/${plugin.typeKey}` === typeKey),
  ) ?? null;
}

function collectWidgetSignalEndpointsFromNodes({
  widgets,
  builderPlugins,
  routeScope,
  endpoints,
}: {
  widgets: PhiCmsContentWidgetNode[] | undefined;
  builderPlugins: readonly PhiBuilderPluginMeta[];
  routeScope: PhiSignalScope;
  endpoints: PhiSignalEndpoint[];
}) {
  for (const widget of widgets ?? []) {
    const widgetPlugin = resolveBuilderPluginMeta(builderPlugins, "widget", widget.widgetType);
    if (!widgetPlugin || widgetPlugin.kind !== "widget") {
      continue;
    }

    endpoints.push(
      ...resolvePhiWidgetSignalEndpoints({
        blockId: widget.id,
        label: widget.label ?? widget.id,
        typeKey: widgetPlugin.typeKey,
        config: widget.config,
        runtimeSignals: widgetPlugin.runtimeSignals,
        signalSubcontrols: widgetPlugin.signalSubcontrols,
        routeScope,
      }),
    );
  }
}

function collectLayoutSignalEndpointsFromNodes({
  layouts,
  builderPlugins,
  routeScope,
  endpoints,
}: {
  layouts: PhiCmsLayoutRenderNode[] | undefined;
  builderPlugins: readonly PhiBuilderPluginMeta[];
  routeScope: PhiSignalScope;
  endpoints: PhiSignalEndpoint[];
}) {
  for (const layout of layouts ?? []) {
    const kind = "layout" as const;
    const layoutPlugin = resolveBuilderPluginMeta(builderPlugins, kind, layout.widgetType);
    if (layoutPlugin && layoutPlugin.kind !== "widget") {
      endpoints.push(
        ...resolvePhiLayoutSignalEndpoints({
          blockId: layout.id,
          label: layout.label ?? layout.id,
          typeKey: layoutPlugin.typeKey,
          kind,
          runtimeSignals: layoutPlugin.runtimeSignals,
          routeScope,
        }),
      );
    }

    collectWidgetSignalEndpointsFromNodes({ widgets: layout.childWidgets, builderPlugins, routeScope, endpoints });
    collectLayoutSignalEndpointsFromNodes({ layouts: layout.childLayouts, builderPlugins, routeScope, endpoints });
  }
}

export function collectPhiBuilderSignalEndpointsFromDrafts({
  regionDrafts,
  builderPlugins,
  area,
  pageKey,
  regionLabels,
}: {
  regionDrafts: Record<string, PhiDeveloperBuilderRegionDraft>;
  builderPlugins: readonly PhiBuilderPluginMeta[];
  area: string;
  pageKey: string;
  regionLabels?: PhiRegionWidgetLabels;
}) {
  const endpoints: PhiSignalEndpoint[] = [];
  const areaPrefix = `${area}:`;
  const pagePrefix = `${area}:${pageKey}:`;

  for (const [draftKey, draft] of Object.entries(regionDrafts)) {
    if (!draftKey.startsWith(areaPrefix)) {
      continue;
    }

    const isPageDraft = draftKey.startsWith(pagePrefix);
    const regionKey = isPageDraft ? draftKey.slice(pagePrefix.length) : draftKey.slice(areaPrefix.length);
    const isPageRegion = isPhiBuilderPageScopedRegion(regionKey);
    const isShellRegion = isPhiBuilderShellRegion(regionKey);
    if (
      !regionKey ||
      regionKey.includes(":") ||
      (isPageDraft && !isPageRegion) ||
      (!isPageDraft && !isShellRegion)
    ) {
      continue;
    }
    const routeScope: Extract<PhiSignalScope, "area" | "page"> = isPageRegion ? "page" : "area";

    endpoints.push(
      ...resolvePhiRegionSignalEndpoints({
        regionKey,
        label: getPhiRegionWidgetLabelEntry(regionKey, regionLabels)?.title,
        routeScope,
      }),
    );

    if (draft.rootNodeId != null && draft.rootNodeTypeKey && draft.rootNodeKind === "widget") {
      const widgetPlugin = resolveBuilderPluginMeta(builderPlugins, "widget", draft.rootNodeTypeKey);
      if (widgetPlugin && widgetPlugin.kind === "widget") {
        endpoints.push(
          ...resolvePhiWidgetSignalEndpoints({
            blockId: draft.rootNodeId,
            label: draft.rootNodeTitle ?? draft.rootNodeId,
            typeKey: widgetPlugin.typeKey,
            config: draft.rootNodeConfig ?? null,
            runtimeSignals: widgetPlugin.runtimeSignals,
            signalSubcontrols: widgetPlugin.signalSubcontrols,
            routeScope,
          }),
        );
      }
    }

    if (draft.rootNodeId != null && draft.rootNodeTypeKey && draft.rootNodeKind === "layout") {
      const layoutPlugin = resolveBuilderPluginMeta(builderPlugins, "layout", draft.rootNodeTypeKey);
      if (layoutPlugin && layoutPlugin.kind !== "widget") {
        endpoints.push(
          ...resolvePhiLayoutSignalEndpoints({
            blockId: draft.rootNodeId,
            label: draft.rootNodeTitle ?? draft.rootNodeId,
            typeKey: layoutPlugin.typeKey,
            kind: "layout",
            runtimeSignals: layoutPlugin.runtimeSignals,
            routeScope,
          }),
        );
      }
    }

    collectWidgetSignalEndpointsFromNodes({ widgets: draft.rootNodeChildWidgets, builderPlugins, routeScope, endpoints });
    collectLayoutSignalEndpointsFromNodes({ layouts: draft.rootNodeChildLayouts, builderPlugins, routeScope, endpoints });
  }

  return endpoints;
}

export function collectPhiBuilderControllerSignalEndpoints({
  moduleDefinitions,
  selectedModuleIds,
  area,
  demandSettings,
}: {
  moduleDefinitions: PhiWorkspaceCatalogState["runtimeModuleDefinitions"];
  selectedModuleIds: readonly string[] | undefined;
  area: PhiWorkspaceCatalogState["area"];
  demandSettings: readonly PhiRuntimeControllerSetting[];
}) {
  const activeModuleIds = new Set([
    ...moduleDefinitions.filter((definition) => definition.kind === "platform").map((definition) => definition.moduleId),
    resolvePhiRuntimeAreaDefinition(area === "public" ? "public" : area).baseModuleId,
    ...resolvePhiRuntimeModuleIdsForArea(area, selectedModuleIds as never, moduleDefinitions),
  ]);

  const endpointsByKey = new Map<string, PhiSignalEndpoint>();
  for (const definition of moduleDefinitions) {
    if (!definition.controllerType || !definition.controller || !definition.controllerMountPolicy) {
      continue;
    }
    const routeScope = definition.controllerMountPolicy === "site" ? "site" : "area";
    if (
      !activeModuleIds.has(definition.moduleId) ||
      (definition.controllerMountPolicy !== "site" && definition.controllerMountPolicy !== "area") ||
      !definition.controller.allowedMountScopes.includes(routeScope)
    ) {
      continue;
    }

    const [endpoint] = resolvePhiControllerSignalEndpoints({
      definition: definition.controller,
      setting: { instanceKey: "default" },
      routeScope,
    });
    if (endpoint) endpointsByKey.set(`${endpoint.routeScope}:${endpoint.address}`, endpoint);
  }

  const activeDefinitionsByControllerType = new Map(
    moduleDefinitions
      .filter((definition) => activeModuleIds.has(definition.moduleId) && definition.controllerType)
      .map((definition) => [definition.controllerType!, definition]),
  );
  for (const setting of demandSettings) {
    if (setting.enabled === false || (setting.mountScope !== "area" && setting.mountScope !== "page")) {
      continue;
    }
    const definition = activeDefinitionsByControllerType.get(setting.type);
    if (!definition?.controller || !definition.controller.allowedMountScopes.includes(setting.mountScope)) {
      continue;
    }
    const [endpoint] = resolvePhiControllerSignalEndpoints({
      definition: definition.controller,
      setting,
      routeScope: setting.mountScope,
    });
    if (endpoint) endpointsByKey.set(`${endpoint.routeScope}:${endpoint.address}`, endpoint);
  }

  return [...endpointsByKey.values()];
}
