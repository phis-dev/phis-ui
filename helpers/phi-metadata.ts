import type { Metadata } from "next";

import type { PhiCmsAreaKey } from "../constants/cms-areas";
import {
  PHI_AREA_META_PUBLIC_DEFAULTS,
  PHI_AREA_TITLE_TEMPLATE_PLACEHOLDER,
  type PhiAreaMeta,
} from "./cms-area-config";

export type PhiMetadataScope = {
  title?: string | null;
  description?: string | null;
  noindex?: boolean | null;
};

export type PhiRootMetadataInput = {
  metadataBase?: string | URL | null;
  applicationName?: string | null;
  titleTemplate?: string | null;
  defaultTitle?: string | null;
  defaultDescription?: string | null;
  site?: PhiMetadataScope | null;
  area?: PhiMetadataScope | null;
  page?: PhiMetadataScope | null;
};

function resolveFirstText(...values: Array<string | null | undefined>) {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) {
      return trimmed;
    }
  }

  return undefined;
}

function resolveMetadataBase(value: string | URL | null | undefined) {
  if (!value) {
    return undefined;
  }

  if (value instanceof URL) {
    return value;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  try {
    return new URL(trimmed);
  } catch {
    throw new Error(`Invalid metadataBase URL: ${trimmed}`);
  }
}

export function buildPhiRootMetadata(options: PhiRootMetadataInput = {}): Metadata {
  const resolvedSiteTitle = resolveFirstText(options.site?.title);
  const resolvedAreaTitle = resolveFirstText(options.area?.title);
  const resolvedPageTitle = resolveFirstText(options.page?.title);
  const resolvedTitleTemplate = resolveFirstText(options.titleTemplate) ?? "%s";
  const resolvedDefaultTitle = resolveFirstText(
    options.defaultTitle,
    resolvedSiteTitle,
    resolvedAreaTitle,
    options.applicationName,
    "Phi",
  );
  const resolvedDescription = resolveFirstText(
    options.page?.description,
    options.area?.description,
    options.site?.description,
    options.defaultDescription,
  );
  const resolvedApplicationName = resolveFirstText(
    options.applicationName,
    resolvedSiteTitle,
    resolvedAreaTitle,
  );
  const resolvedMetadataBase = resolveMetadataBase(options.metadataBase);
  const shouldNoIndex =
    options.page?.noindex === true ||
    options.area?.noindex === true ||
    options.site?.noindex === true;

  const metadata: Metadata = {
    ...(resolvedMetadataBase ? { metadataBase: resolvedMetadataBase } : {}),
    ...(resolvedApplicationName ? { applicationName: resolvedApplicationName } : {}),
    ...(resolvedDescription ? { description: resolvedDescription } : {}),
    ...(shouldNoIndex
      ? {
          robots: {
            index: false,
            follow: false,
          },
        }
      : {}),
  };

  if (resolvedPageTitle) {
    metadata.title = resolvedPageTitle;
  } else {
    metadata.title = {
      default: resolvedDefaultTitle ?? "Phi",
      template: resolvedTitleTemplate,
    };
  }

  return metadata;
}

/**
 * What one Page of one Area puts in the document head.
 *
 * Separate from the Root builder above, and returning an absolute title, because the two answer at
 * different levels: the Root Layout states a template for the whole Site, and an Area that has stated
 * its own has to override it rather than be wrapped by it. Next has no "replace the inherited
 * template" -- `absolute` is how a page opts out of one -- so the formatting happens here, where both
 * the Area's answer and the Page's own title are known.
 *
 * `robots` is decided here for the same reason: the answer is a fact about the Area, and only Public
 * is ever asked. Every other Area is authenticated, so it is `noindex` whatever is stored -- a Site
 * that never opened the dialog still keeps its Admin out of the index.
 */
export function buildPhiAreaPageMetadata({
  area,
  meta,
  siteName,
  pageTitle,
  pageDescription,
}: {
  area: PhiCmsAreaKey;
  meta: PhiAreaMeta | null | undefined;
  siteName?: string | null;
  pageTitle?: string | null;
  pageDescription?: string | null;
}): Metadata {
  const resolvedSiteName = resolveFirstText(siteName);
  const resolvedPageTitle = resolveFirstText(pageTitle);
  const template = resolveFirstText(meta?.titleTemplate);
  /*
   * An Area that stated no template gets the Site's name appended, which is what the Root Layout has
   * always done. Restated rather than inherited because the title is absolute from here on: dropping
   * the fallback would silently strip the name from every Area that never opened the dialog.
   */
  const effectiveTemplate = template
    ?? (resolvedSiteName ? `${PHI_AREA_TITLE_TEMPLATE_PLACEHOLDER} | ${resolvedSiteName}` : null);
  const fallbackTitle = resolveFirstText(meta?.defaultTitle, resolvedSiteName);
  const title = resolvedPageTitle
    ? (effectiveTemplate
      ? effectiveTemplate.split(PHI_AREA_TITLE_TEMPLATE_PLACEHOLDER).join(resolvedPageTitle)
      : resolvedPageTitle)
    : fallbackTitle;
  const description = resolveFirstText(pageDescription);
  const indexable = area === "public" && (meta?.index ?? PHI_AREA_META_PUBLIC_DEFAULTS.index);

  return {
    ...(title ? { title: { absolute: title } } : {}),
    ...(description ? { description } : {}),
    ...(indexable ? {} : { robots: { index: false, follow: false } }),
  };
}
