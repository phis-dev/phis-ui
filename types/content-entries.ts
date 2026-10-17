import type { PhiLinkTarget } from "./references";

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
  tags: readonly string[];
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
