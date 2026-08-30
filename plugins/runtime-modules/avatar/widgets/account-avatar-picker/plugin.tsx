import type { PhiCmsServerWidgetPlugin } from "../../../../../types";
import { renderPhiWidgetPreviewPlaceholder } from "../../../../../plugins/factories/widget-renderers";
import type { PhiCmsPaddingOnlyWidgetConfig } from "../../../../../components/widgets/config/helpers";
import { PHI_ACCOUNT_AVATAR_PICKER_WIDGET_DEFINITION } from "./config";
import { PhiAccountAvatarPickerWidget } from "./server";

export const PHI_ACCOUNT_AVATAR_PICKER_WIDGET_PLUGIN: PhiCmsServerWidgetPlugin<PhiCmsPaddingOnlyWidgetConfig> = {
  ...PHI_ACCOUNT_AVATAR_PICKER_WIDGET_DEFINITION,
  render: ({ runtime, config }) => <PhiAccountAvatarPickerWidget runtime={runtime} config={config} />,
  renderPreview: ({ widget }) => renderPhiWidgetPreviewPlaceholder(widget),
};
