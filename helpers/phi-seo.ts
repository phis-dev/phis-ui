import { localizePath } from "./locale";

/**
 * Where one Public Page lives, in every language the Site speaks.
 *
 * The head and the sitemap both state this, and a search engine discards hreflang that is not
 * reciprocal -- so both build it here, from the same inputs, rather than each assembling its own.
 */
export type PhiPublicPageAddress = {
  /** The Site's absolute base, from `resolvePhiSitePublicBase`. Without one nothing absolute can be said. */
  publicBase: string | null;
  /** The Area-relative path, locale-neutral: `/` or `/terms-and-conditions`. */
  path: string;
  locale: string;
  availableLocales: readonly string[];
  defaultLocale: string;
};

export type PhiPublicPageAlternates = {
  canonical: string;
  /** Keyed by locale code, plus `x-default` for the Site's default locale. */
  languages: Readonly<Record<string, string>>;
};

export const PHI_HREFLANG_DEFAULT_KEY = "x-default";

/**
 * The first of the given values that is an absolute http(s) URL, without a trailing slash.
 *
 * A Site without one is a configuration that has not been finished, not a vocabulary that was
 * violated: it still renders, it just cannot name its own addresses. Callers answer `null` by saying
 * nothing absolute -- no canonical, no alternates, no sitemap -- rather than by guessing a host.
 */
export function resolvePhiSitePublicBase(...candidates: ReadonlyArray<string | null | undefined>): string | null {
  for (const candidate of candidates) {
    const value = candidate?.trim();
    if (!value) {
      continue;
    }
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      continue;
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      continue;
    }
    return `${url.origin}${url.pathname.replace(/\/+$/, "")}`;
  }
  return null;
}

/** The absolute URL of one Public path in one locale. */
export function buildPhiPublicPageUrl(publicBase: string, locale: string, path: string) {
  return `${publicBase}${localizePath(locale, path)}`;
}

/**
 * The canonical URL and the hreflang set of one Public Page, or `null` without a public base.
 *
 * Every language version is canonical to itself: translations are not duplicates, and pointing one
 * at another would take it out of the index. The versions are tied together by `languages` instead,
 * which lists every locale the Site has -- paths are locale-neutral, so a version differs only in its
 * prefix -- and names the default locale as `x-default`.
 */
export function buildPhiPublicPageAlternates(address: PhiPublicPageAddress): PhiPublicPageAlternates | null {
  const { publicBase, path, locale, availableLocales, defaultLocale } = address;
  if (!publicBase) {
    return null;
  }

  const languages: Record<string, string> = {};
  for (const code of availableLocales) {
    languages[code] = buildPhiPublicPageUrl(publicBase, code, path);
  }
  languages[PHI_HREFLANG_DEFAULT_KEY] = buildPhiPublicPageUrl(publicBase, defaultLocale, path);

  return {
    canonical: buildPhiPublicPageUrl(publicBase, locale, path),
    languages,
  };
}

/** One address that could be in the sitemap, before anybody asked whether it is. */
export type PhiSitemapCandidate = {
  path: string;
  /** When the live revision was written. Absent for a Module Page the Site never stored. */
  lastModified?: string;
};

/**
 * Every Public address a sitemap could list, once each.
 *
 * Three sources, because a Public address comes from three places: the Area root, which is a slot and
 * always worth asking about; the Modules' exact routes, whose address the route table decided; and the
 * Pages the Site published. A Module Page the Site stored has no path of its own, so its revision time
 * is matched to its route by preset identity. Dynamic routes are not candidates -- there is no list of
 * the values their segments take.
 */
export function collectPhiSitemapCandidates({
  moduleRoutes,
  publishedPages,
}: {
  moduleRoutes: Iterable<readonly [path: string, identity: { ownerModuleId: string; presetKey: string }]>;
  publishedPages: ReadonlyArray<{
    path: string | null;
    ownerModuleId: string | null;
    presetKey: string | null;
    publishedAt: string;
  }>;
}): PhiSitemapCandidate[] {
  const byPath = new Map<string, PhiSitemapCandidate>([["/", { path: "/" }]]);
  const publishedByPreset = new Map<string, string>();
  for (const page of publishedPages) {
    if (page.ownerModuleId && page.presetKey) {
      publishedByPreset.set(`${page.ownerModuleId} ${page.presetKey}`, page.publishedAt);
    }
  }

  for (const [path, identity] of moduleRoutes) {
    const lastModified = publishedByPreset.get(`${identity.ownerModuleId} ${identity.presetKey}`);
    byPath.set(path, { path, ...(lastModified ? { lastModified } : {}) });
  }
  for (const page of publishedPages) {
    if (page.path && !byPath.get(page.path)?.lastModified) {
      byPath.set(page.path, { path: page.path, lastModified: page.publishedAt });
    }
  }

  return [...byPath.values()].sort((left, right) => left.path.localeCompare(right.path));
}

function escapePhiXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * The sitemap: one `<url>` per Page per locale, each carrying the whole hreflang set.
 *
 * Every version lists every other one, itself included, because that is what makes the set
 * reciprocal -- and a set that is not reciprocal is ignored without a word.
 */
export function renderPhiSitemapXml(
  pages: ReadonlyArray<PhiSitemapCandidate>,
  site: { publicBase: string; availableLocales: readonly string[]; defaultLocale: string },
) {
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
  ];
  for (const page of pages) {
    for (const locale of site.availableLocales) {
      const alternates = buildPhiPublicPageAlternates({ ...site, path: page.path, locale });
      if (!alternates) {
        continue;
      }
      lines.push("  <url>");
      lines.push(`    <loc>${escapePhiXml(alternates.canonical)}</loc>`);
      if (page.lastModified) {
        lines.push(`    <lastmod>${escapePhiXml(page.lastModified)}</lastmod>`);
      }
      for (const [hreflang, href] of Object.entries(alternates.languages)) {
        lines.push(
          `    <xhtml:link rel="alternate" hreflang="${escapePhiXml(hreflang)}" href="${escapePhiXml(href)}"/>`,
        );
      }
      lines.push("  </url>");
    }
  }
  lines.push("</urlset>");
  return `${lines.join("\n")}\n`;
}

/**
 * The robots.txt: everything allowed, and the sitemap named when there is one.
 *
 * No `Disallow` for the staff Areas, on purpose. A robots.txt is public, and a list of what it hides is
 * a list of where to look; those Areas are kept out of the index by `noindex`, which a crawler can
 * only read on a page it was allowed to fetch.
 */
export function renderPhiRobotsTxt(sitemapUrl: string | null) {
  return [
    "User-agent: *",
    "Allow: /",
    ...(sitemapUrl ? ["", `Sitemap: ${sitemapUrl}`] : []),
    "",
  ].join("\n");
}
