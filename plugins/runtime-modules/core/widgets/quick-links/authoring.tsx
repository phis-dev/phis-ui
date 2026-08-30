"use client";

import type { PhiCmsBuilderWidgetPlugin, PhiCmsWidgetAuthoringCanvas } from "../../../../../types";
import {
  resolvePhiBuilderAreaAsCmsArea,
} from "../../../../../constants/cms-areas";
import type { PhiBlockRuntime } from "../../../../../types/widget-runtime";
import {
  getPhiBuilderNavigationDefaultScopeKey,
  resolvePhiBuilderNavigationPageTargets,
} from "../../../../../helpers/cms-navigation-catalog";
import { PhiQuickLinksWidgetClient } from "./client";
import { PHI_QUICK_LINKS_WIDGET_DEFINITION, type PhiCmsQuickLinksWidgetConfig } from "./config";
import { mapPhiBuilderNavigationItemsToQuickLinksItems } from "../../../../../components/widgets/quick-links-items";

function PhiQuickLinksWidgetBuilderEditor({
  runtime,
  config,
  canvas,
}: {
  runtime: Pick<PhiBlockRuntime, "locale">;
  config: PhiCmsQuickLinksWidgetConfig;
  canvas: PhiCmsWidgetAuthoringCanvas;
}) {
  if (!canvas.catalogHydrated) {
    return null;
  }
  const currentCmsArea = resolvePhiBuilderAreaAsCmsArea(canvas.area);
  const navKey = config.navKey?.trim() || getPhiBuilderNavigationDefaultScopeKey(currentCmsArea, "footer");
  const navigation = canvas.resolveNavigation(navKey);
  if (!navigation) {
    return null;
  }
  const items = mapPhiBuilderNavigationItemsToQuickLinksItems(
    resolvePhiBuilderNavigationPageTargets(currentCmsArea, navigation.items, canvas.pageCatalog),
    runtime.locale.current,
    currentCmsArea,
  );

  return (
    <PhiQuickLinksWidgetClient
      labels={{ title: config.title }}
      config={{
        columns: config.columns ?? 2,
        separator: config.separator ?? true,
        interactive: false,
        items,
      }}
    />
  );
}

export const PHI_QUICK_LINKS_WIDGET_BUILDER_PLUGIN: PhiCmsBuilderWidgetPlugin<PhiCmsQuickLinksWidgetConfig> = {
  ...PHI_QUICK_LINKS_WIDGET_DEFINITION,
  renderEditor: ({ runtime, config, authoring }) => authoring ? (
    <PhiQuickLinksWidgetBuilderEditor runtime={runtime} config={config} canvas={authoring.canvas} />
  ) : null,
};
