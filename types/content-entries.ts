import type { PhiLinkTarget } from "./references";

/**
 * A word an entry is filed under: its address, which is its identity and stays as written, and its label in
 * the page's language.
 */
export type PhiSiteContentEntryTerm = {
  slug: string;
  label: string;
};

/**
 * The byline: the name the person chose to be shown under (or their first and last name) and, where they
 * bound one, a picture that is already public. Core never answers an address here.
 */
export type PhiSiteContentEntryAuthor = {
  name: string;
  avatar: { url: string } | null;
};

/**
 * One published entry of a content type, as `GET /api/v1/entries/<kind>` answers it.
 *
 * The shape is Core's and the same for every kind: an entry lives in `site_content` under its kind's
 * type, and what arrives here is already resolved for one locale and already filtered by publication date
 * and expiry. Nothing in this package stores it ([phis-server CONTENT.md](../../phis-server/CONTENT.md)).
 */
export type PhiSiteContentEntry = {
  /** The entry's public identity: its slug where it has one, its numeric id otherwise. */
  id: string;
  slug: string;
  /** When the entry was published, or created where it never named a date. */
  created: string;
  /** When it stops being answered, or `null` where it does not. */
  outdated: string | null;
  title: string;
  subtitle: string;
  content: string;
  /** Where the entry points: a Page of the Public Area or an address elsewhere (`REFERENCES.md`). */
  link: PhiLinkTarget | null;
  /** The category the entry is filed under, or `null` for none (`CONTENT_ENTRIES.md`, Terms). */
  category: PhiSiteContentEntryTerm | null;
  tags: readonly PhiSiteContentEntryTerm[];
  /** Who the entry is attributed to, as a reader may see them, or `null` for no byline. */
  author: PhiSiteContentEntryAuthor | null;
  /**
   * The language the body is written in, or `null` for the Site's own.
   *
   * Core answers `title` and `subtitle` already translated for the asked-for language, but not the body:
   * Markdown is translated paragraph by paragraph where it is rendered, so its structure never reaches a
   * provider. This is what the renderer needs to translate it the right way round.
   */
  sourceLocale: string | null;
  /** Whether a reader in another language may be served a translation of this entry at all. */
  translate: boolean;
};

/**
 * One entry at its address with what a detail Page shows beside it, as
 * `GET /api/v1/entries/<kind>/<slug>` answers it. `related` is there only where it was asked for.
 */
export type PhiSiteContentEntryPage = {
  entry: PhiSiteContentEntry;
  related: readonly PhiSiteContentEntry[] | null;
};
