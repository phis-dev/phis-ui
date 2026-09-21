import type { PhiBlockRuntime } from "../../../../../types";
import { getPhiThreadComposerLabels } from "../../../../../components/widgets/label-sets/threads";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import type { PhiThreadWidgetConfig } from "../thread-widget-config";
import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";
import { readPhiServerApiCredentials } from "../../../../../helpers/phis-server-credentials";

export type PhiThreadComposerWidgetProps = {
  runtime: Pick<PhiBlockRuntime, "site" | "locale" | "viewer" | "area">;
  config?: PhiThreadWidgetConfig | null;
};

export async function PhiThreadComposerWidget({ runtime, config }: PhiThreadComposerWidgetProps) {
  // Writing into a conversation is something only a person does, and a visitor has none to write in.
  if (runtime.viewer.access !== "authenticated") {
    return null;
  }

  const labels = await getPhiThreadComposerLabels({
    apiBaseUrl: readPhiServerApiCredentials().apiBaseUrl,
    internalToken: readPhiServerApiCredentials().internalToken,
    locale: runtime.locale.current,
  });

  return (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.ThreadComposer}
      componentProps={{ runtime, labels, config }}
    />
  );
}
