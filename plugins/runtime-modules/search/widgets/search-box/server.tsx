import { PHI_SEARCH_QUERY_PARAM } from "@phis/contracts/search";

import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";
import { getPhiSearchWidgetLabels } from "../../../../../components/widgets/label-sets/search";
import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import { resolvePhiLinkHref } from "../../../../../helpers/link-target";
import { resolvePhiLinkTargetReferences } from "../../../../../server-helpers/cms-link-targets";
import { phiRuntime } from "../../../../../server-helpers/phi-runtime";
import { trBulkForLocale } from "../../../../../server-helpers/translate";
import type { PhiNoLabels, PhiServerBlockBaseProps } from "../../../../../types";
import type { PhiResolvedLinkTargets } from "../../../../../types/references";
import { resolvePhiSearchPageLinkTarget } from "../../page-references";
import type { PhiSearchBoxWidgetConfig } from "./config";

export type PhiSearchBoxWidgetProps = PhiServerBlockBaseProps<PhiNoLabels, PhiSearchBoxWidgetConfig> & {
  /** The page's resolved link targets, where the author chose a results Page. */
  links?: PhiResolvedLinkTargets | null;
  /** Whether the placeholder is translated: the node's `NoTranslate` flag, read by the plugin. */
  translate?: boolean;
};

/**
 * The search box, resolved on the server: where the form goes, what the box says, what it already holds.
 *
 * The results Page is a reference, resolved as every link is -- through the page's targets where the
 * author picked one, or alone where the box takes the Search Module's Page of its Area. An Area whose search Page does not
 * resolve -- a Module switched off, a Page unpublished -- draws no box at all rather than one that
 * leads to "not found".
 *
 * On the results Page itself the box shows the query it is answering, read from the same URL parameter
 * the results Widget reads.
 */
export async function PhiSearchBoxWidget({ config, runtime, links, translate = true }: PhiSearchBoxWidgetProps) {
  const rt = phiRuntime(runtime);
  const locale = runtime.locale.current;
  const target = config?.linkTarget ?? resolvePhiSearchPageLinkTarget(runtime.area);
  const resolved = config?.linkTarget
    ? links ?? null
    : target.kind === "page"
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
    config?.placeholder && translate ? trBulkForLocale(locale, [config.placeholder]) : [config?.placeholder ?? ""],
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
