import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";
import { fetchSiteNavigationFolderTarget } from "../../../../../gateway/site-nav";
import { readPhiServerApiCredentials } from "../../../../../helpers/phis-server-credentials";
import { resolvePhiPageRecordFields } from "../../../../../server-helpers/record-fields";
import type { PhiBlockRuntime } from "../../../../../types";
import type { PhiCmsRuntimeRenderRegistry } from "../../../../../types/cms-plugins";
import type { PhiBreadcrumbWidgetProps } from "./client";

export type PhiBreadcrumbWidgetServerProps = Omit<PhiBreadcrumbWidgetProps, "runtime"> & {
  /** The whole runtime of the render: the record read needs more of it than the client does. */
  runtime: PhiBlockRuntime;
  /** Where the page record is answered; absent outside a page render, where nothing is bound. */
  registry?: Pick<
    PhiCmsRuntimeRenderRegistry,
    "recordProviderLoadersByKey" | "recordFieldsLoadersByKey" | "dataProviderDescriptorsByKey"
  >;
};

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
async function resolveLinkedFolderPaths(props: PhiBreadcrumbWidgetServerProps): Promise<string[]> {
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

/**
 * The title of the record the Page is about, for the trail's last item; `null` leaves the path segment.
 *
 * Core has already read the record and made its title the Page's (`runtime.page.title`), but the runtime
 * does not say whether that title is the record's or the route's own, and the route's `titleField` is not
 * known here. So the title counts only where it is the value of one of the record's `text` fields. The
 * fields are the read Core itself did for the title, memoised per request by Provider and parameters
 * (`resolvePhiRecordFields`), so this costs the Provider no second read. A record that is missing or
 * unavailable, a Page about no record, and a failure of any kind all give `null`: the trail never fails.
 */
async function resolvePageTitle({ config, runtime, registry }: PhiBreadcrumbWidgetServerProps): Promise<string | null> {
  const title = runtime?.page?.title?.trim();
  if (!title || !registry || !runtime?.page?.record || config?.showPath === false || config?.pathLabel?.trim()) {
    return null;
  }
  try {
    const result = await resolvePhiPageRecordFields({ registry, runtime });
    if (result.status !== "ok") return null;
    const isRecordText = [...result.fields.values()].some((field) => field.kind === "text" && field.value.trim() === title);
    return isRecordText ? title : null;
  } catch {
    return null;
  }
}

export async function PhiBreadcrumbWidget({ registry, ...props }: PhiBreadcrumbWidgetServerProps) {
  const [linkedFolderPaths, pageTitle] = await Promise.all([
    resolveLinkedFolderPaths({ registry, ...props }),
    resolvePageTitle({ registry, ...props }),
  ]);
  return (
    <PhiRuntimeModuleRenderClientHost
      type={PhiCmsWidgetType.Breadcrumb}
      componentProps={{ ...props, pagePath: props.runtime?.page?.path ?? null, linkedFolderPaths, pageTitle }}
    />
  );
}
