import type {
  PhisMediaSourceListInput,
  PhisMediaSourcePage,
} from "@phis/contracts/media-source";

import type { PhiRuntimeModuleId } from "./cms-module-descriptors";

/**
 * A media source a Module offers: somewhere other than the Site's library a file can be taken from. The
 * list contract is `@phis/contracts/media-source`; what is chosen is imported into the library as an
 * ordinary Asset, and nothing ever stores a reference into the source (THIRD_PARTY_MODULES.md, "Offering a
 * media source").
 */

/** Namespaced like a data provider key: `<owner>/<name>`. */
export type PhiMediaSourceKey = `${string}/${string}`;

/** What the Server half declares: the catalog validates the key and that the declaring Module owns it. */
export type PhiMediaSourceDescriptor = {
  key: PhiMediaSourceKey;
  ownerModuleId: PhiRuntimeModuleId;
  title: string;
  description?: string;
};

/**
 * An item, taken: the bytes in the browser and what is known about them. The picker uploads the file
 * into the Site's library; the Module never writes an Asset itself.
 */
export type PhiMediaSourceTakenFile = {
  file: Blob;
  fileName: string;
  title: string;
  altText?: string | null;
  credit?: string | null;
};

export type PhiMediaSourceClient = {
  /** What the picker's source switch says, in the reader's language; the Module translates its own words. */
  describe(input: { locale: string }): Promise<{ label: string }>;
  list(input: PhisMediaSourceListInput & { signal: AbortSignal }): Promise<PhisMediaSourcePage>;
  take(input: { itemId: string; signal: AbortSignal }): Promise<PhiMediaSourceTakenFile>;
};

export type PhiMediaSourceClientDefinition = {
  key: PhiMediaSourceKey;
  ownerModuleId: PhiRuntimeModuleId;
  load: () => Promise<PhiMediaSourceClient>;
};
