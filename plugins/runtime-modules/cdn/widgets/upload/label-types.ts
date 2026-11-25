import type { PhiCdnArchKey, PhiCdnOsKey } from "../../platform";

/** The CDN's own words of its upload, as its server half reads them in the page's language. */
export type PhiCdnUploadWidgetLabels = {
  name: string;
  nameHint: string;
  version: string;
  fileFileName: string;
  os: string;
  arch: string;
  osNames: Readonly<Record<PhiCdnOsKey, string>>;
  archNames: Readonly<Record<PhiCdnArchKey, string>>;
  /** What the file's tag says while it is hashed and while Core hashes it whole. */
  steps: { checksum: string; verify: string };
  start: string;
  cancel: string;
  required: string;
  invalidSegment: string;
  invalidVersion: string;
  reservedName: string;
  checksumUnavailable: string;
};
