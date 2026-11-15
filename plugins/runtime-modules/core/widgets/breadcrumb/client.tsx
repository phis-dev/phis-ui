"use client";

import type { PhiClientBlockBaseProps, PhiBlockRuntime, PhiNoLabels } from "../../../../../types";
import type { PhiCmsBreadcrumbWidgetConfig } from "./config";
import { PhiBreadcrumbControl, type PhiBreadcrumbControlItem } from "../../../../../components/controls/phi-breadcrumb-control";
import { PhiFlexControl } from "../../../../../components/controls/phi-flex-control";
import { usePhiPathname } from "../../../../../components/runtime/use-phi-pathname";

export type { PhiCmsBreadcrumbWidgetConfig as PhiBreadcrumbWidgetConfig } from "./config";

export type PhiBreadcrumbWidgetLabels = PhiNoLabels;

export type PhiBreadcrumbWidgetProps = PhiClientBlockBaseProps<
  PhiBreadcrumbWidgetLabels,
  PhiCmsBreadcrumbWidgetConfig,
  Pick<PhiBlockRuntime, "site" | "area" | "locale" | "page">
> & {
  /** The Page's own path in its Area, which the visitor's address ends with. */
  pagePath?: string | null;
  /** The folders of `pagePath` whose address leads to a Page, as the server found them. */
  linkedFolderPaths?: readonly string[];
  /** The title of the record the Page is about, finished text, where the server found one: the trail's last item. */
  pageTitle?: string | null;
};

export function PhiBreadcrumbWidget({ config, runtime, pagePath, linkedFolderPaths, pageTitle }: PhiBreadcrumbWidgetProps) {
  const pathname = usePhiPathname();
  const head = [
    { title: config?.rootLabel?.trim() || runtime?.site.name?.trim() || runtime?.site.key || "Site" },
    config?.showArea === false ? null : { title: runtime?.area ?? "area" },
  ].filter(Boolean) as PhiBreadcrumbControlItem[];

  let tail: PhiBreadcrumbControlItem[] = [];
  if (config?.showPath !== false) {
    tail = config?.pathLabel?.trim() || !pagePath || pagePath === "/"
      ? [{ title: config?.pathLabel?.trim() || pathname || "/" }]
      : buildPhiBreadcrumbPathItems(pathname, pagePath, linkedFolderPaths ?? [], pageTitle);
  }

  return (
    <PhiFlexControl align={config?.align ?? "center"} justify={config?.justify ?? "flex-start"} gap={12} wrap="wrap">
      <PhiBreadcrumbControl items={[...head, ...tail]} separator={config?.separator} />
    </PhiFlexControl>
  );
}

/**
 * One item per segment of the Page's path. A folder segment links to the visitor's own address up to that
 * folder -- the locale and Area prefix kept as the visitor has them -- when the server found that its
 * folder address leads to a Page; every other segment, and the Page itself, is text. The last item, the
 * Page itself, carries `pageTitle` where there is one -- the record's title -- and its segment otherwise.
 */
export function buildPhiBreadcrumbPathItems(
  visitorPathname: string,
  pagePath: string,
  linkedFolderPaths: readonly string[],
  pageTitle?: string | null,
): PhiBreadcrumbControlItem[] {
  const segments = pagePath.split("/").filter(Boolean);
  const base = visitorPathname.endsWith(pagePath) ? visitorPathname.slice(0, -pagePath.length) : null;
  const linked = new Set(linkedFolderPaths);
  return segments.map((segment, index) => {
    const folder = `/${segments.slice(0, index + 1).join("/")}`;
    const isFolder = index < segments.length - 1;
    const title = !isFolder && pageTitle?.trim() ? pageTitle.trim() : decodeSegment(segment);
    return isFolder && base !== null && linked.has(folder)
      ? { key: folder, title, href: `${base}${folder}` }
      : { key: folder, title };
  });
}

function decodeSegment(segment: string) {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}
