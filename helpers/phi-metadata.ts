import type { Metadata } from "next";

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
