/**
 * The pictures a Module's own package declares (`phis.media` in its `package.json`) as the Site's Media
 * library holds them (design/MODULE_MEDIA.md in phis-server; THIRD_PARTY_MODULES.md, "Pictures a Module
 * ships").
 */

/**
 * What a route, Area shell or Area Overlay preset asks for the ids of the names its own package declares.
 *
 * Bound to the package of the preset's owner: a Module cannot ask for another package's names. Each call
 * answers the Asset id (`asset`) or the Media Folder id (`folder`) the Site holds for the name, or `null`
 * where it has none -- the name is not imported yet, or its Asset or folder was deleted. A preset leaves
 * the picture out then. Asynchronous because the Site reads the mapping from Core on first use only: a
 * preset that never asks costs no request.
 */
export type PhiModuleMediaResolver = {
  asset(key: string): Promise<number | null>;
  folder(key: string): Promise<number | null>;
};

/** Package name -> declared key -> id, as `GET /api/v1/site/module-media` answers it. */
export type PhiModuleMediaMapping = {
  assets: Readonly<Record<string, Readonly<Record<string, number>>>>;
  folders: Readonly<Record<string, Readonly<Record<string, number>>>>;
};

/** Reads the Site's mapping. Called at most once per instantiation, on the first question. */
export type PhiModuleMediaLoader = () => Promise<PhiModuleMediaMapping>;

/** The mapping of a Site that holds nothing. */
export const PHI_EMPTY_MODULE_MEDIA_MAPPING: PhiModuleMediaMapping = { assets: {}, folders: {} };

/**
 * For a caller without a Core -- a contract script, a test: every name is answered `null`.
 */
export const PHI_EMPTY_MODULE_MEDIA_LOADER: PhiModuleMediaLoader = async () => PHI_EMPTY_MODULE_MEDIA_MAPPING;
