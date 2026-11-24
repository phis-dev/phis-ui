import type { Metadata } from "next";

import type { PhiCmsAreaKey } from "../constants/cms-areas";
import {
  PHI_AREA_META_PUBLIC_DEFAULTS,
  PHI_AREA_TITLE_TEMPLATE_PLACEHOLDER,
  type PhiAreaMeta,
} from "./cms-area-config";
import type { PhiSignetHead } from "./phi-signet-head";
import { buildPhiPublicPageAlternates, type PhiPublicPageAddress } from "./phi-seo";
import { readPhiXAccount } from "../types/link-preview";

/**
 * What the head says of a Site that has said nothing: neither the Page's description nor the Theme's
 * slogan. Worded as the placeholder it is, so a link shared before anybody replaced it tells the operator
 * where to.
 */
export const PHI_DEFAULT_SITE_DESCRIPTION =
  "Default description of the phis starter. Set your own in the Page meta or as the Theme's slogan.";

/** The Site's description: the Theme's slogan, else the starter's placeholder. */
export function resolvePhiSiteDescription(slogan: string | null | undefined) {
  return slogan?.trim() || PHI_DEFAULT_SITE_DESCRIPTION;
}

/** The picture of a link preview, resolved: its absolute address, its exact size and what it shows. */
export type PhiLinkPreviewImage = {
  url: string;
  width: number;
  height: number;
  alt: string;
  type: string;
};

/**
 * What a Public Page's link preview is built from, beside the Page's own title and description
 * (NEXT_INTEGRATION.md, "Link previews").
 */
export type PhiLinkPreviewInput = {
  /** The record's preview title and description, where the Page is about a record whose Provider marks them. */
  recordTitle?: string | null;
  recordDescription?: string | null;
  /** The Theme's slogan, the description where the Page states none. */
  slogan?: string | null;
  image?: PhiLinkPreviewImage | null;
  /** `brand.xAccount`; stated as `twitter:site` only where it is an X account name. */
  xAccount?: string | null;
};

/** A Site locale as Open Graph spells it: `pt-BR` is `pt_BR`. */
function toPhiOpenGraphLocale(locale: string) {
  return locale.replaceAll("-", "_");
}

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
  /**
   * The Signet as the head names it (`describePhiSignetHead`).
   *
   * The Site's own is the address it delivers it at, with its media type and size where they are known;
   * `apple` is present only where the picture is a PNG of at least 180 px, because an Apple touch icon
   * has to be a raster of a stated size. A followed Set's Signet is its data URL and nothing else:
   * Chrome and Firefox show it, Safari does not, and a Theme save is what gives the Site a real address.
   * A Site that has no Signet says nothing at all here, and `/favicon.ico` answers 404 for it.
   */
  signet?: PhiSignetHead | null;
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
  const signet = options.signet?.href?.trim() ? options.signet : null;
  const shouldNoIndex =
    options.page?.noindex === true ||
    options.area?.noindex === true ||
    options.site?.noindex === true;

  const metadata: Metadata = {
    ...(resolvedMetadataBase ? { metadataBase: resolvedMetadataBase } : {}),
    ...(resolvedApplicationName ? { applicationName: resolvedApplicationName } : {}),
    ...(resolvedDescription ? { description: resolvedDescription } : {}),
    ...(signet
      ? {
          icons: {
            icon: { url: signet.href, ...(signet.type ? { type: signet.type } : {}), ...(signet.sizes ? { sizes: signet.sizes } : {}) },
            ...(signet.apple ? { apple: { url: signet.apple.href, type: signet.apple.type, sizes: signet.apple.sizes } } : {}),
          },
        }
      : {}),
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
 * `robots` is decided here for the same reason, and in two rungs. The Area answers first and answers
 * hardest: every Area but Public is authenticated, so it is `noindex` whatever is stored -- a Site
 * that never opened the dialog still keeps its Admin out of the index. Inside Public the Page may then
 * withdraw itself, which is how a sign-in Form stays out of a search result without the Area having to
 * close. The Page can only ever add to the Area's answer: a Public Area that was switched off is not
 * reopened by a Page that never asked to be indexed in the first place.
 *
 * The canonical URL and the hreflang set follow the same answer: they are said only of a Page that may
 * be indexed, because naming the preferred address of a Page that asks to stay out says nothing a
 * search engine can use, and an hreflang set pointing at it contradicts the sitemap that leaves it out.
 */
export function buildPhiAreaPageMetadata({
  area,
  meta,
  siteName,
  pageTitle,
  pageDescription,
  pageNoindex,
  publicAddress,
  linkPreview,
}: {
  area: PhiCmsAreaKey;
  meta: PhiAreaMeta | null | undefined;
  siteName?: string | null;
  pageTitle?: string | null;
  pageDescription?: string | null;
  pageNoindex?: boolean | null;
  /** Where this Page lives. Only Public has such an address; elsewhere it is ignored. */
  publicAddress?: PhiPublicPageAddress | null;
  /** What a link preview is built from; stated only for a Public Page with an address. */
  linkPreview?: PhiLinkPreviewInput | null;
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
  const indexable = area === "public"
    && (meta?.index ?? PHI_AREA_META_PUBLIC_DEFAULTS.index)
    && pageNoindex !== true;
  const alternates = indexable && publicAddress ? buildPhiPublicPageAlternates(publicAddress) : null;
  const preview = area === "public" && publicAddress && linkPreview
    ? buildPhiLinkPreviewMetadata({
        input: linkPreview,
        address: publicAddress,
        siteName: resolvedSiteName,
        title: resolveFirstText(resolvedPageTitle, fallbackTitle),
        description,
      })
    : null;

  return {
    ...(title ? { title: { absolute: title } } : {}),
    ...(description ? { description } : {}),
    ...(indexable ? {} : { robots: { index: false, follow: false } }),
    ...(alternates ? { alternates: { canonical: alternates.canonical, languages: alternates.languages } } : {}),
    ...(preview ?? {}),
  };
}

/**
 * The Open Graph and X tags of one Public Page (NEXT_INTEGRATION.md, "Link previews").
 *
 * Said of every Public Page, indexable or not: a link is shared whether or not a search engine may file
 * it. The title is the Page's own, without the template the tab title wears -- the preview names the Site
 * beside it as `og:site_name` -- and a record the Page is about may answer title and description first.
 * The description falls back as the Root's does: the Theme's slogan, then the starter's placeholder. X
 * reads the Open Graph tags; what this states for it is the card, large with a picture, and the Site's
 * account where the Theme names one. Next copies title, description and picture into `twitter:*` itself.
 */
function buildPhiLinkPreviewMetadata({
  input,
  address,
  siteName,
  title,
  description,
}: {
  input: PhiLinkPreviewInput;
  address: PhiPublicPageAddress;
  siteName: string | undefined;
  title: string | undefined;
  description: string | undefined;
}): Pick<Metadata, "openGraph" | "twitter"> {
  const url = buildPhiPublicPageAlternates(address)?.canonical;
  const image = input.image ?? null;
  const xAccount = readPhiXAccount(input.xAccount);
  const previewTitle = resolveFirstText(input.recordTitle, title, siteName);
  return {
    openGraph: {
      type: "website",
      ...(siteName ? { siteName } : {}),
      ...(previewTitle ? { title: previewTitle } : {}),
      description: resolveFirstText(input.recordDescription, description) ?? resolvePhiSiteDescription(input.slogan),
      ...(url ? { url } : {}),
      locale: toPhiOpenGraphLocale(address.locale),
      alternateLocale: address.availableLocales
        .filter((code) => code !== address.locale)
        .map(toPhiOpenGraphLocale),
      ...(image
        ? { images: [{ url: image.url, width: image.width, height: image.height, alt: image.alt, type: image.type }] }
        : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      ...(xAccount ? { site: xAccount } : {}),
    },
  };
}
