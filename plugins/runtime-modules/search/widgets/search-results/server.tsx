import {
  PHI_SEARCH_MIN_QUERY_LENGTH,
  PHI_SEARCH_QUERY_PARAM,
  readPhiSearchQuery,
} from "@phis/contracts/search";
import { PhiCmsVisibilityContext } from "@phis/contracts/cms";

import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";
import { getPhiSearchResultsWidgetLabels } from "../../../../../components/widgets/label-sets/search-results";
import { PhiWidgetFailureServer } from "../../../../../components/widgets/shared/widget-failure.server";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import type { PhiCmsAreaKey } from "../../../../../constants/cms-areas";
import { resolvePhiNavHref } from "../../../../../helpers/locale";
import { fetchPhiSiteSearch } from "../../../../../gateway/site-search";
import { phiRuntime } from "../../../../../server-helpers/phi-runtime";
import { trBulkForLocale } from "../../../../../server-helpers/translate";
import type { PhiNoLabels, PhiServerBlockBaseProps } from "../../../../../types";
import type { PhiCmsInstanceId } from "../../../../../types/cms-instance-id";
import { readPhiRuntimeTreeRenderMode } from "../../../render-mode";
import type { PhiSearchResultsWidgetConfig } from "./config";
import type { PhiSearchResultsWidgetClientConfig, PhiSearchResultsWidgetHit } from "./client";

export type PhiSearchResultsWidgetProps = PhiServerBlockBaseProps<PhiNoLabels, PhiSearchResultsWidgetConfig> & {
  widgetId?: PhiCmsInstanceId | null;
};

/** The Areas a reader standing in `area` may search (SEARCH.md): App and Public from the App, else Public. */
function resolvePhiSearchedAreas(area: PhiCmsAreaKey): readonly PhiCmsAreaKey[] {
  return area === "app" ? ["app", "public"] : ["public"];
}

function readHitArea(areaMask: number): PhiCmsAreaKey {
  return areaMask === PhiCmsVisibilityContext.AppArea ? "app" : "public";
}

/**
 * The results, decided on the server from the URL alone.
 *
 * No parameter at all is a page nobody searched on yet -- the preset Page opened directly -- and says so
 * quietly. A parameter too short to be a query says what a query needs. A query is asked of Core with the
 * Areas this reader may search, and each hit's address is written the way every link of this Site is,
 * locale and Area in front (`resolvePhiNavHref`), so a hit from Public read in the App still leads to
 * Public.
 *
 * A failed read is `PhiWidgetFailureServer`: an empty list would tell the visitor the Site has nothing on
 * the subject, which is not what happened.
 */
export async function PhiSearchResultsWidget({ config, runtime, widgetId }: PhiSearchResultsWidgetProps) {
  const rt = phiRuntime(runtime);
  const locale = runtime.locale.current;
  const renderMode = readPhiRuntimeTreeRenderMode(config ?? {});
  const [labels, [title]] = await Promise.all([
    getPhiSearchResultsWidgetLabels({ apiBaseUrl: rt.apiBaseUrl, internalToken: rt.internalToken, locale }),
    config?.title ? trBulkForLocale(locale, [config.title]) : [""],
  ]);

  const raw = runtime.request?.searchParams?.[PHI_SEARCH_QUERY_PARAM];
  const query = readPhiSearchQuery(raw);
  const base = { title: title || undefined, minLength: PHI_SEARCH_MIN_QUERY_LENGTH } as const;

  const render = (state: PhiSearchResultsWidgetClientConfig) => (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.SearchResults}
      componentProps={{ labels, config: state }}
    />
  );

  if (raw === undefined) {
    return render({ ...base, state: "idle" });
  }
  if (!query) {
    return render({ ...base, state: "short", query: raw.trim() });
  }

  let answer;
  try {
    answer = await fetchPhiSiteSearch({
      apiBaseUrl: rt.apiBaseUrl,
      internalToken: rt.internalToken,
      siteKey: rt.siteKey,
      query,
      locale,
      areas: resolvePhiSearchedAreas(runtime.area),
      limit: config?.limit ?? 20,
    });
  } catch (error) {
    return (
      <PhiWidgetFailureServer
        renderMode={renderMode}
        widgetType={PhiCmsWidgetType.SearchResults}
        widgetId={widgetId}
        title={labels.unavailable}
        description={error instanceof Error ? error.message : String(error)}
        error={error}
      />
    );
  }

  const hits: PhiSearchResultsWidgetHit[] = answer.hits.map((hit) => ({
    href: resolvePhiNavHref(locale, readHitArea(hit.areaMask), hit.path),
    title: hit.title || hit.path,
    description: hit.description,
    snippet: hit.snippet,
    area: readHitArea(hit.areaMask),
  }));

  return render({ ...base, state: "results", query: answer.query || query, total: answer.total, hits });
}
