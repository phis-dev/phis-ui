/**
 * One published News entry, as `GET /api/v1/news` answers it.
 *
 * The shape is Core's: an entry lives in `site_content` as content type `news`, and what arrives here is
 * already resolved for one locale and already filtered by publication date and expiry. Nothing in this
 * package stores it -- the Module that renders it owns no data
 * ([phis-server design/NEWS.md](../../phis-server/design/NEWS.md)).
 */
export type PhiSiteNewsEntry = {
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
  /** Where the entry points, as the Site wrote it: its own path or an absolute address. */
  link: string | null;
  tags: readonly string[];
};
