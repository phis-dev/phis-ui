import type { PhiServerBlockBaseProps } from "../../../../../types";
import type { PhiPageTitleWidgetConfig } from "./config";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";
import { getPhiPageTitleWidgetLabels } from "../../../../../components/widgets/label-sets/page-title";
import type { PhiPageTitleWidgetLabels } from "../../../../../components/widgets/label-types/page-title";

export function PhiPageTitleWidget({
  labels,
  runtime,
}: PhiServerBlockBaseProps<PhiPageTitleWidgetLabels, PhiPageTitleWidgetConfig>) {
  const title = runtime.page?.title?.trim() || labels.emptyTitle;

  return (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.PageTitle}
      componentProps={{
        initialTitle: title,
        area: runtime.area ?? null,
      }}
    />
  );
}

export async function PhiPageTitleWidgetServer({
  runtime,
}: Pick<PhiServerBlockBaseProps<PhiPageTitleWidgetLabels, PhiPageTitleWidgetConfig>, "runtime">) {
  const labels = await getPhiPageTitleWidgetLabels({
    apiBaseUrl: runtime.phis.apiBaseUrl,
    internalToken: runtime.phis.internalToken,
    locale: runtime.locale.current,
  });

  return <PhiPageTitleWidget labels={labels} runtime={runtime} config={{}} />;
}
