/**
 * How many skeleton rows a loading Table draws (TABLES.md, "Loading").
 *
 * Few on purpose: most Tables hold a handful of rows, and a Table that loads as a page of ten and then
 * shows two shrinks under the reader's eyes and takes the Page below it up with it. Three rows grow into
 * what arrives. A Table that is known to be long -- a paged listing that fills its page -- may state its
 * own count in `presentation.loadingRows`, up to the most a Table may ask for.
 *
 * Imports nothing, so the Table Control and the Widget's config reader share it without the weight of
 * either.
 */
export const PHI_TABLE_LOADING_ROWS = 3;

/** The most skeleton rows a Table may ask for: a page of 25, the usual page. */
export const PHI_TABLE_LOADING_ROWS_MAX = 25;
