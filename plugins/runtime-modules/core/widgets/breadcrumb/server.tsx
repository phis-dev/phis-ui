import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";
import { fetchSiteNavigationFolderTarget } from "../../../../../gateway/site-nav";
import { readPhiServerApiCredentials } from "../../../../../helpers/phis-server-credentials";
import type { PhiBreadcrumbWidgetProps } from "./client";

export type {
  PhiBreadcrumbWidgetConfig,
  PhiBreadcrumbWidgetLabels,
  PhiBreadcrumbWidgetProps,
} from "./client";

/** The folders a Page path lies in, outermost first: `/docs/guides/a` gives `/docs` and `/docs/guides`. */
export function listPhiBreadcrumbFolderPaths(pagePath: string) {
  const segments = pagePath.split("/").filter(Boolean);
  return segments.slice(0, -1).map((_segment, index) => `/${segments.slice(0, index + 1).join("/")}`);
}

/**
 * Which folders of the Page's path lead somewhere, so the client links exactly those.
 *
 * A folder segment is a link when its folder address resolves to a Page (REFERENCES.md, "Folder
 * addresses"); one that resolves to nothing would be a link into a 404. Asked once per folder of the
 * path, which is the depth of the path and not the size of the Site, and only when the trail shows the
 * path at all. A failed lookup leaves that segment unlinked rather than failing the trail.
 */
async function resolveLinkedFolderPaths(props: PhiBreadcrumbWidgetProps): Promise<string[]> {
  const { config, runtime } = props;
  const pagePath = runtime?.page?.path;
  if (!pagePath || !runtime?.site?.key || config?.showPath === false || config?.pathLabel?.trim()) {
    return [];
  }
  const folders = listPhiBreadcrumbFolderPaths(pagePath);
  if (folders.length === 0) return [];
  const { apiBaseUrl, internalToken } = readPhiServerApiCredentials();
  const answers = await Promise.all(folders.map((path) => fetchSiteNavigationFolderTarget({
    apiBaseUrl,
    internalToken,
    siteKey: runtime.site.key,
    area: String(runtime.area),
    path,
  }).catch(() => null)));
  return folders.filter((_path, index) => answers[index] != null);
}

export async function PhiBreadcrumbWidget(props: PhiBreadcrumbWidgetProps) {
  const linkedFolderPaths = await resolveLinkedFolderPaths(props);
  return (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.Breadcrumb}
      componentProps={{ ...props, pagePath: props.runtime?.page?.path ?? null, linkedFolderPaths }}
    />
  );
}
