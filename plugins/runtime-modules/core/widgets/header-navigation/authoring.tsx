"use client";

import {
  resolvePhiBuilderAreaAsCmsArea,
} from "../../../../../constants/cms-areas";
import {
  getPhiBuilderNavigationDefaultScopeKey,
  resolvePhiBuilderNavigationPageTargets,
} from "../../../../../helpers/cms-navigation-catalog";
import { PhiHeaderNavigationWidgetClient } from "./client";
import {
  PHI_HEADER_NAVIGATION_WIDGET_DEFINITION,
  type PhiCmsHeaderNavigationWidgetConfig,
  type PhiHeaderNavigationWidgetRenderableConfig,
} from "./config";
import type {
  PhiBlockRuntime,
  PhiCmsBuilderWidgetPlugin,
  PhiCmsWidgetAuthoringCanvas,
} from "../../../../../types";
import { mapPhiBuilderNavigationItemsToNavItems } from "../../../../../components/widgets/builder/navigation-items";

function PhiHeaderNavigationWidgetEditor({
  runtime,
  config,
  canvas,
}: {
  runtime: Pick<PhiBlockRuntime, "site" | "locale">;
  config: PhiHeaderNavigationWidgetRenderableConfig & Pick<PhiCmsHeaderNavigationWidgetConfig, "navKey">;
  canvas: PhiCmsWidgetAuthoringCanvas;
}) {
  if (!canvas.catalogHydrated) {
    return null;
  }
  const currentCmsArea = resolvePhiBuilderAreaAsCmsArea(canvas.area);
  const navKey = config.navKey?.trim() || getPhiBuilderNavigationDefaultScopeKey(currentCmsArea, "header");
  const navigation = canvas.resolveNavigation(navKey);
  if (!navigation) {
    return null;
  }

  return (
    <PhiHeaderNavigationWidgetClient
      runtime={{ locale: runtime.locale, area: currentCmsArea }}
      items={mapPhiBuilderNavigationItemsToNavItems(
        resolvePhiBuilderNavigationPageTargets(currentCmsArea, navigation.items, canvas.pageCatalog),
      )}
      menuTheme={runtime.site.theme?.mode === "dark" ? "dark" : "light"}
      height={config.height}
      align={config.align}
      interactive={false}
    />
  );
}

export const PHI_HEADER_NAVIGATION_WIDGET_BUILDER_PLUGIN: PhiCmsBuilderWidgetPlugin<PhiCmsHeaderNavigationWidgetConfig> = {
  ...PHI_HEADER_NAVIGATION_WIDGET_DEFINITION,
  renderEditor: ({ runtime, regionConfig, config, authoring }) => authoring ? (
    <PhiHeaderNavigationWidgetEditor
      runtime={runtime}
      config={{ ...config, height: regionConfig?.size?.height ?? undefined }}
      canvas={authoring.canvas}
    />
  ) : null,
};
