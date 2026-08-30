import type { PhiBlockRuntime } from "../../../../../types";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";
import type {
  PhiQuickLinksWidgetClientConfig,
  PhiQuickLinksWidgetClientLabels,
} from "./client";
import { resolvePhiNavigationItems } from "../../../../../components/widgets/server/navigation-request";
import { mapPhiNavItemsToQuickLinksItems } from "../../../../../components/widgets/quick-links-items";

export type PhiQuickLinksWidgetProps = {
  runtime: Pick<PhiBlockRuntime, "site" | "locale" | "area" | "phis" | "viewer" | "request">;
  navKey?: string;
  title?: string;
  columns?: 1 | 2 | 3;
  separator?: boolean;
  interactive?: boolean;
};

export async function PhiQuickLinksWidget({
  runtime,
  navKey,
  title,
  columns = 2,
  separator = true,
  interactive = true,
}: PhiQuickLinksWidgetProps) {
  const resolvedNavKey =
    navKey?.trim() ||
    `${runtime.area}:footer`;

  const resolvedNavigationItems = (await resolvePhiNavigationItems(runtime, resolvedNavKey)) ?? [];

  if (resolvedNavigationItems.length === 0) {
    return null;
  }

  const labels: PhiQuickLinksWidgetClientLabels = {
    title,
  };
  const config: PhiQuickLinksWidgetClientConfig = {
    columns,
    separator,
    interactive,
    items: mapPhiNavItemsToQuickLinksItems(
      resolvedNavigationItems,
      runtime.locale.current,
      runtime.area,
      interactive,
    ),
  };

  return (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.QuickLinks}
      componentProps={{ labels, config }}
    />
  );
}
