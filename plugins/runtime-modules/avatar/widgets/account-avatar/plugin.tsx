import type { PhiCmsServerWidgetPlugin } from "../../../../../types";
import type { PhiCmsPaddingOnlyWidgetConfig } from "../../../../../components/widgets/config/helpers";
import { PHI_ACCOUNT_AVATAR_WIDGET_DEFINITION } from "./config";
import { PhiAccountAvatarWidget } from "./server";

export const PHI_ACCOUNT_AVATAR_WIDGET_PLUGIN: PhiCmsServerWidgetPlugin<PhiCmsPaddingOnlyWidgetConfig> = {
  ...PHI_ACCOUNT_AVATAR_WIDGET_DEFINITION,
  render: ({ runtime, config }) => <PhiAccountAvatarWidget runtime={runtime} config={config} />,
};
