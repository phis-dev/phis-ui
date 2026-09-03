"use client";

import {
  resolvePhiBuilderAreaAsCmsArea,
} from "../../../../../constants/cms-areas";
import type {
  PhiBlockRuntime,
  PhiCmsBuilderWidgetPlugin,
  PhiCmsWidgetAuthoringCanvas,
} from "../../../../../types";
import {
  getPhiBuilderNavigationDefaultScopeKey,
  resolvePhiBuilderNavigationPageTargets,
} from "../../../../../helpers/cms-navigation-catalog";
import { PhiSidebarNavigationWidgetPreviewClient } from "./client";
import { PhiWidgetTypographyToolButton } from "../../../../../components/widgets/client/shared/phi-widget-tool-buttons";
import {
  PHI_SIDEBAR_NAVIGATION_WIDGET_DEFINITION,
  type PhiCmsSidebarNavigationWidgetConfig,
} from "./config";
import { mapPhiBuilderNavigationItemsToNavItems } from "../../../../../components/widgets/builder/navigation-items";

function PhiSidebarNavigationWidgetEditor({
  runtime,
  config,
  canvas,
}: {
  runtime: Pick<PhiBlockRuntime, "site" | "locale">;
  config: PhiCmsSidebarNavigationWidgetConfig;
  canvas: PhiCmsWidgetAuthoringCanvas;
}) {
  if (!canvas.catalogHydrated) {
    return null;
  }
  const currentCmsArea = resolvePhiBuilderAreaAsCmsArea(canvas.area);
  const navKey = config.navKey?.trim() || getPhiBuilderNavigationDefaultScopeKey(currentCmsArea, "sidebar");
  const navigation = canvas.resolveNavigation(navKey);
  if (!navigation) {
    return null;
  }

  return (
    <PhiSidebarNavigationWidgetPreviewClient
      runtime={{ site: runtime.site, locale: runtime.locale, area: currentCmsArea }}
      config={config}
      items={mapPhiBuilderNavigationItemsToNavItems(
        resolvePhiBuilderNavigationPageTargets(currentCmsArea, navigation.items, canvas.pageCatalog),
      )}
      menuTheme="light"
    />
  );
}

export const PHI_SIDEBAR_NAVIGATION_WIDGET_BUILDER_PLUGIN: PhiCmsBuilderWidgetPlugin<PhiCmsSidebarNavigationWidgetConfig> = {
  ...PHI_SIDEBAR_NAVIGATION_WIDGET_DEFINITION,
  renderEditor: ({ runtime, config, authoring }) => authoring ? (
    <PhiSidebarNavigationWidgetEditor runtime={runtime} config={config} canvas={authoring.canvas} />
  ) : null,
  renderEditorTools: ({ config, authoring }) => authoring?.updateConfig ? (
    <PhiWidgetTypographyToolButton
      fontFamily={config.fontFamily}
      fontSize={config.fontSize}
      defaultFontSize="lg"
      ariaLabel="Sidebar navigation typography"
      onChange={({ fontFamily, fontSize }) => authoring.updateConfig?.({
        ...(fontFamily !== undefined ? { fontFamily: fontFamily ?? undefined } : {}),
        ...(fontSize !== undefined ? { fontSize: fontSize ?? undefined } : {}),
      })}
    />
  ) : null,
};
