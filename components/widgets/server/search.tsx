import type { PhiBlockRuntime } from "../../../types";
import type { PhiCmsSearchWidgetConfig } from "../config/search-shared";
import type { PhiSearchWidgetLabels } from "../label-types/search";
import { getPhiSearchWidgetLabels } from "../label-sets/search";
import { PhiRuntimeRenderClientType } from "../../../constants/runtime-render-client-types";
import { PhiRuntimeModuleRenderClientHost } from "../../runtime/runtime-module-render-client-manifest";
import { readPhiServerApiCredentials } from "../../../helpers/phis-server-credentials";

export type PhiSearchWidgetServerProps = {
  runtime: Pick<PhiBlockRuntime, "locale">;
  config?: PhiCmsSearchWidgetConfig | null;
  query?: string;
  defaultQuery?: string;
  disabled?: boolean;
  onQueryChange?: (query: string) => void;
  onQuerySubmit?: (query: string) => void;
};

export async function loadPhiSearchWidgetLabels(
  runtime: Pick<PhiBlockRuntime, "locale">,
): Promise<PhiSearchWidgetLabels> {
  return getPhiSearchWidgetLabels({
    apiBaseUrl: readPhiServerApiCredentials().apiBaseUrl,
    internalToken: readPhiServerApiCredentials().internalToken,
    locale: runtime.locale.current,
  });
}

export async function PhiSearchWidgetServer({
  runtime,
  config,
  query,
  defaultQuery,
  disabled,
  onQueryChange,
  onQuerySubmit,
}: PhiSearchWidgetServerProps) {
  const labels = await loadPhiSearchWidgetLabels(runtime);

  return (
    <PhiRuntimeModuleRenderClientHost
      type={PhiRuntimeRenderClientType.SearchStandalone}
      componentProps={{
        labels,
        config: config ?? undefined,
        query,
        defaultQuery,
        disabled,
        onQueryChange,
        onQuerySubmit,
      }}
    />
  );
}
