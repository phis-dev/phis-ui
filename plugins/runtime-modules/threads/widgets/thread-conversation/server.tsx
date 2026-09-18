import type { PhiBlockRuntime } from "../../../../../types";
import { getPhiThreadConversationLabels } from "../../../../../components/widgets/label-sets/threads";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";
import { readPhiServerApiCredentials } from "../../../../../helpers/phis-server-credentials";

export type PhiThreadConversationWidgetProps = {
  runtime: Pick<PhiBlockRuntime, "site" | "locale" | "viewer" | "area">;
  config?: { padding?: number | string };
};

export async function PhiThreadConversationWidget({ runtime, config }: PhiThreadConversationWidgetProps) {
  /*
   * A visitor has no conversations, so there is nothing to render rather than an empty frame.
   *
   * Which threads exist for this person is the server's answer and never this widget's: it renders what
   * `/api/site/threads` hands back, and that route applies the same visibility predicate to everybody.
   * This check is about not drawing furniture nobody can use.
   */
  if (runtime.viewer.access !== "authenticated") {
    return null;
  }

  const credentials = readPhiServerApiCredentials();
  const labels = await getPhiThreadConversationLabels({
    apiBaseUrl: credentials.apiBaseUrl,
    internalToken: credentials.internalToken,
    locale: runtime.locale.current,
  });

  return (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.ThreadConversation}
      componentProps={{ runtime, labels, config }}
    />
  );
}
