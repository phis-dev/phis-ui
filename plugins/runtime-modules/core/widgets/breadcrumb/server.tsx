import { PhiCmsWidgetType } from "../../../../../constants/cms-widget-types";
import { PhiRuntimeModuleRenderClientHost } from "../../../../../components/runtime/runtime-module-render-client-manifest";
import { fetchSiteNavigationFolderTarget } from "../../../../../gateway/site-nav";
import { readPhiServerApiCredentials } from "../../../../../helpers/phis-server-credentials";
import { resolvePhiWidgetRecordField } from "../../../../../server-helpers/record-fields";
import { resolvePhiRequestModuleFolderTargets } from "../../../../../server-helpers/module-folder-targets";
import type { PhiBlockRuntime } from "../../../../../types";
import type { PhiBreadcrumbWidgetProps } from "./client";

export type PhiBreadcrumbWidgetServerProps = Omit<PhiBreadcrumbWidgetProps, "runtime"> & {
  /** The whole runtime of the render: the record read needs more of it than the client does. */
  runtime: PhiBlockRuntime;
  /** Where the page record is answered; absent outside a page render, where nothing is bound. */
  registry?: Parameters<typeof resolvePhiWidgetRecordField>[0]["registry"];
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
 * addresses") or a Module container's `folderTarget` leads it to one; one that resolves to nothing
 * would be a link into a 404. Asked once per folder of the
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
  // Where the Site chose no target, a Module container's own (`folderTarget`) answers, as on a request.
  const unanswered = folders.filter((_path, index) => answers[index] == null);
  const moduleTargets = unanswered.length > 0
    ? resolvePhiRequestModuleFolderTargets(runtime.area, unanswered)
    : new Map<string, string>();
  return folders.filter((path, index) => answers[index] != null || moduleTargets.has(path));
}

/**
 * The title of the record the Page is about, for the trail's last item; `null` leaves the path segment.
 *
 * The field is the one the route's `pageRecord` made the Page's title (`runtime.page.record.titleField`),
 * read like any Widget bound to a field of the page record: the memoised read Core made for the title, so
 * this costs the Provider no second one. No `titleField`, no record, a record that is missing or
 * unavailable, no registry, a field that is empty and a failure of any kind all give `null`: the trail
 * never fails for it.
 */
async function resolvePageTitle({ config, runtime, registry }: PhiBreadcrumbWidgetServerProps): Promise<string | null> {
  const titleField = runtime?.page?.record?.titleField;
  if (!titleField || !registry || config?.showPath === false || config?.pathLabel?.trim()) {
    return null;
  }
  try {
    const answer = await resolvePhiWidgetRecordField({ registry, runtime, key: titleField, kinds: ["text"] });
    return (answer.bound && answer.field?.value.trim()) || null;
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
