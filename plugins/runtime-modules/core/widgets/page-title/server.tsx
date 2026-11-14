import type { PhiServerBlockBaseProps } from "../../../../../types";
import type { PhiPageTitleWidgetConfig } from "./config";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";
import { getPhiPageTitleWidgetLabels } from "../../../../../components/widgets/label-sets/page-title";
import type { PhiPageTitleWidgetLabels } from "../../../../../components/widgets/label-types/page-title";
import { buildPhiWidgetLabelTranslatorOptions } from "../../../../../components/widgets/label-sets/runtime-options";

function PhiPageTitleWidget({
  labels,
  runtime,
  config,
}: PhiServerBlockBaseProps<PhiPageTitleWidgetLabels, PhiPageTitleWidgetConfig> & { config: PhiPageTitleWidgetConfig }) {
  const title = runtime.page?.title?.trim() || labels.emptyTitle;

  return (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.PageTitle}
      componentProps={{
        initialTitle: title,
        area: runtime.area ?? null,
        display: config.display,
      }}
    />
  );
}

export async function PhiPageTitleWidgetServer({
  runtime,
  config,
}: Pick<PhiServerBlockBaseProps<PhiPageTitleWidgetLabels, PhiPageTitleWidgetConfig>, "runtime"> & {
  config: PhiPageTitleWidgetConfig;
}) {
  const labels = await getPhiPageTitleWidgetLabels(buildPhiWidgetLabelTranslatorOptions(runtime));

  return <PhiPageTitleWidget labels={labels} runtime={runtime} config={config} />;
}
