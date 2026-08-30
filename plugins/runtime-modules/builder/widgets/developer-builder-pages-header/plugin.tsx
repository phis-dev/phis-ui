import type { PhiCmsWidgetPlugin } from "../../../../../types";
import { PhiDeveloperBuilderPagesHeaderWidget } from "../../../../../plugins/runtime-modules/builder/pages-header";
import {
  PHI_DEVELOPER_BUILDER_PAGES_HEADER_WIDGET_DEFINITION,
  type PhiDeveloperBuilderPagesHeaderWidgetConfig,
} from "../workspace-headers/config";
import { getPhiPageTitleWidgetLabels } from "../../../../../components/widgets/label-sets/page-title";
import type { PhiBlockRuntime } from "../../../../../types";

async function PhiDeveloperBuilderPagesHeaderWidgetServer({
  runtime,
  config,
  disabled,
}: {
  runtime: PhiBlockRuntime;
  config: PhiDeveloperBuilderPagesHeaderWidgetConfig;
  disabled?: boolean;
}) {
  const labels = await getPhiPageTitleWidgetLabels({
    apiBaseUrl: runtime.phis.apiBaseUrl,
    internalToken: runtime.phis.internalToken,
    locale: runtime.locale.current,
  });

  return (
    <PhiDeveloperBuilderPagesHeaderWidget
      mode={config.mode}
      pageTitle={runtime.page?.title ?? null}
      disabled={disabled}
      labels={labels}
    />
  );
}

export const PHI_DEVELOPER_BUILDER_PAGES_HEADER_WIDGET_PLUGIN: PhiCmsWidgetPlugin<PhiDeveloperBuilderPagesHeaderWidgetConfig> = {
  ...PHI_DEVELOPER_BUILDER_PAGES_HEADER_WIDGET_DEFINITION,
  render: ({ config, runtime }) => <PhiDeveloperBuilderPagesHeaderWidgetServer config={config} runtime={runtime} />,
  renderPreview: ({ config, runtime }) => (
    <PhiDeveloperBuilderPagesHeaderWidgetServer config={config} runtime={runtime} disabled />
  ),
};
