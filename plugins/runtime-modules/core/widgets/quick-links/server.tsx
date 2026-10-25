import type { PhiBlockRuntime } from "../../../../../types";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";
import type {
  PhiQuickLinksWidgetClientConfig,
  PhiQuickLinksWidgetClientLabels,
} from "./client";
import { resolvePhiNavigationItems } from "../../../../../components/widgets/server/navigation-request";
import { mapPhiNavItemsToQuickLinksItems } from "./items";
import { trWidgetText } from "../../../../../server-helpers/translate";
import type { PhiTextSource } from "../../../../../helpers/text-source";

export type PhiQuickLinksWidgetProps = {
  runtime: Pick<PhiBlockRuntime, "site" | "locale" | "area" | "viewer" | "request">;
  navKey?: string;
  title?: string;
  /** Whose words the title is, which decides the store that translates it. */
  textSource?: PhiTextSource;
  translate?: boolean;
  columns?: 1 | 2 | 3;
  separator?: boolean;
  interactive?: boolean;
};

export async function PhiQuickLinksWidget({
  runtime,
  navKey,
  title,
  textSource,
  translate = true,
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

  const ownTitle = title?.trim();
  const labels: PhiQuickLinksWidgetClientLabels = {
    title: ownTitle && translate ? await trWidgetText(runtime.locale.current, ownTitle, textSource) : title,
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
