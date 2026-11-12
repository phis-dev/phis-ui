import { PHI_SEARCH_QUERY_PARAM } from "@phis/contracts/search";

import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";
import { getPhiSearchWidgetLabels } from "../../../../../components/widgets/label-sets/search";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import { resolvePhiLinkHref } from "../../../../../helpers/link-target";
import { resolvePhiLinkTargetReferences } from "../../../../../server-helpers/cms-link-targets";
import { phiRuntime } from "../../../../../server-helpers/phi-runtime";
import { trBulkForLocale } from "../../../../../server-helpers/translate";
import type { PhiNoLabels, PhiServerBlockBaseProps } from "../../../../../types";
import { resolvePhiSearchPageLinkTarget } from "../../page-references";
import type { PhiSearchBoxWidgetConfig } from "./config";

export type PhiSearchBoxWidgetProps = PhiServerBlockBaseProps<PhiNoLabels, PhiSearchBoxWidgetConfig>;

/**
 * The search box, resolved on the server: where the form goes, what the box says, what it already holds.
 *
 * Where it goes is the Search Module's results Page of the Area it stands in, a reference resolved as
 * every link is. A Page that does not resolve -- unpublished -- draws no box at all rather than one that
 * leads to "not found". The placeholder is the author's words, always translated: a box whose prompt
 * stays in one language on a Site that speaks several has nothing to gain from it.
 *
 * On the results Page itself the box shows the query it is answering, read from the same URL parameter
 * the results Widget reads.
 */
export async function PhiSearchBoxWidget({ config, runtime }: PhiSearchBoxWidgetProps) {
  const rt = phiRuntime(runtime);
  const locale = runtime.locale.current;
  const target = resolvePhiSearchPageLinkTarget(runtime.area);
  const resolved = target.kind === "page"
    ? await resolvePhiLinkTargetReferences(
        new Map([["linkTarget", { reference: target.reference, area: target.area ?? null }]]),
        runtime,
      )
    : null;
  const href = resolvePhiLinkHref(target, resolved);
  if (!href) {
    return null;
  }

  const [labels, [placeholder]] = await Promise.all([
    getPhiSearchWidgetLabels({ apiBaseUrl: rt.apiBaseUrl, internalToken: rt.internalToken, locale }),
    config?.placeholder ? trBulkForLocale(locale, [config.placeholder]) : [""],
  ]);

  return (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.SearchBox}
      componentProps={{
        labels,
        config: {
          action: href.href,
          placeholder,
          ...(config?.controlSize ? { size: config.controlSize } : {}),
          ...(config?.variant ? { variant: config.variant } : {}),
          initialQuery: runtime.request?.searchParams?.[PHI_SEARCH_QUERY_PARAM] ?? "",
        },
      }}
    />
  );
}
