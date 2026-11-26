import {
  PHIS_CDN_KEY_SEGMENT_PATTERN,
  PHIS_CDN_KEY_VERSION_PATTERN,
} from "@phis/contracts/addon";

import { guessPhiCdnPlatform, readPhiCdnArchKeys, readPhiCdnOsKeys } from "./platform";

/**
 * What the CDN's upload asks in front of the file, as the upload Form holds it (`forms.ts`) and the
 * upload widget sends it (`widgets/upload/client.tsx`): one field each, the field's key the draft's.
 *
 * Pure, so the Form's descriptor on the server and the widget in the browser read the same rules: what
 * the descriptor's patterns refuse is what keeps the widget's Upload disabled.
 */
export type PhiCdnUploadDraft = { name: string; version: string; fileName: string; os: string[]; arch: string[] };

export const PHI_CDN_UPLOAD_EMPTY_DRAFT: PhiCdnUploadDraft = { name: "", version: "", fileName: "", os: [], arch: [] };

/**
 * The Form's field keys. `heldFile` is no question: a hidden field the widget fills with the name of the
 * file it holds, so the File name stays disabled until there is a file to name -- a name typed before
 * would only be replaced by the picked file's.
 */
export const PHI_CDN_UPLOAD_FIELD_KEYS = {
  heldFile: "heldFile",
  name: "name",
  version: "version",
  fileName: "fileName",
  os: "os",
  arch: "arch",
} as const satisfies Record<keyof PhiCdnUploadDraft | "heldFile", string>;

/** The segment as Core takes it, with the spaces around it the upload trims before it sends. */
function trimmedPatternSource(pattern: RegExp) {
  const inner = pattern.source.replace(/^\^/u, "").replace(/\$$/u, "");
  // Optional, so a value of spaces only is the `blank` rule's to answer, not a second refusal beside it.
  return `^\\s*(?:${inner})?\\s*$`;
}

/**
 * The `pattern` rules' sources (Core's `pattern` validation, flag `u`), each derived from the contract's
 * own pattern: a name and a file name as one key segment, a version as a version segment, `api` not a
 * name, and something other than spaces in each.
 */
export const PHI_CDN_UPLOAD_PATTERN_SOURCES = {
  blank: "\\S",
  segment: trimmedPatternSource(PHIS_CDN_KEY_SEGMENT_PATTERN),
  version: trimmedPatternSource(PHIS_CDN_KEY_VERSION_PATTERN),
  reservedName: "^(?!\\s*api\\s*$)",
} as const;

/** Whether one segment, as typed, is what Core takes once it is trimmed. */
export function isPhiCdnUploadSegmentValid(value: string, kind: "name" | "version" | "fileName") {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (kind === "version") return PHIS_CDN_KEY_VERSION_PATTERN.test(trimmed);
  return PHIS_CDN_KEY_SEGMENT_PATTERN.test(trimmed) && !(kind === "name" && trimmed === "api");
}

/** Whether the held file may be sent: name, version and file name each a segment Core takes. */
export function isPhiCdnUploadDraftComplete(draft: PhiCdnUploadDraft) {
  return isPhiCdnUploadSegmentValid(draft.name, "name") &&
    isPhiCdnUploadSegmentValid(draft.version, "version") &&
    isPhiCdnUploadSegmentValid(draft.fileName, "fileName");
}

function readText(value: unknown) {
  return typeof value === "string" ? value : "";
}

function readKeys(value: unknown) {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

/** The draft out of the Form's values, whatever else they hold. */
export function readPhiCdnUploadDraft(values: Readonly<Record<string, unknown>>): PhiCdnUploadDraft {
  return {
    name: readText(values[PHI_CDN_UPLOAD_FIELD_KEYS.name]),
    version: readText(values[PHI_CDN_UPLOAD_FIELD_KEYS.version]),
    fileName: readText(values[PHI_CDN_UPLOAD_FIELD_KEYS.fileName]),
    os: readKeys(values[PHI_CDN_UPLOAD_FIELD_KEYS.os]),
    arch: readKeys(values[PHI_CDN_UPLOAD_FIELD_KEYS.arch]),
  };
}

/**
 * What a picked file starts the fields with: its own name as the file name, the platform its name states
 * (`guessPhiCdnPlatform`), the name kept from before -- the next file is most often another of the same --
 * and the version left to be typed.
 */
export function readPhiCdnUploadDraftFromFile(fileName: string, name: string): PhiCdnUploadDraft {
  const platform = guessPhiCdnPlatform(fileName);
  return {
    name,
    version: "",
    fileName,
    os: readPhiCdnOsKeys(platform.os),
    arch: readPhiCdnArchKeys(platform.arch),
  };
}
