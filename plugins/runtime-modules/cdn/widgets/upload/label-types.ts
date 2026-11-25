import type { PhiCdnArchKey, PhiCdnOsKey } from "../../platform";

/** The words of the CDN upload, as its server half reads them in the page's language. */
export type PhiCdnUploadWidgetLabels = {
  name: string;
  nameHint: string;
  version: string;
  file: string;
  fileDrop: string;
  fileFileName: string;
  os: string;
  arch: string;
  osNames: Readonly<Record<PhiCdnOsKey, string>>;
  archNames: Readonly<Record<PhiCdnArchKey, string>>;
  steps: { checksum: string; upload: string; verify: string };
  resumed: string;
  start: string;
  cancel: string;
  retry: string;
  another: string;
  published: string;
  failed: string;
  required: string;
  invalidSegment: string;
  invalidVersion: string;
  reservedName: string;
  checksumUnavailable: string;
};
