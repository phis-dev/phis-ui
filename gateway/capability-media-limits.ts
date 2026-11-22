import { PhiMediaKind } from "../constants/media";
import { isPhiRecord } from "../helpers/is-record";
import type { PhiAddonMediaLimits } from "../types/server-capabilities";
import type { PhiMediaKindValue } from "../types/media";

const MEDIA_LIMIT_KEYS = new Set(["maxFileBytes", "kinds", "maxPerField"]);
const MEDIA_KINDS = new Set<string>(Object.values(PhiMediaKind));

function isPositiveWholeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

/**
 * The Media limits of a provider in the capability snapshot (`PhiCapabilityProvider.media`), read as
 * strictly as phis-server admits them from the manifest: absent is no limit of the Add-on's own; anything
 * stated is an object with no other keys, `maxFileBytes` and `maxPerField` positive whole numbers, and
 * `kinds` a non-empty list of `PhiMediaKind` values without duplicates. Anything else throws, as every
 * other malformed part of the snapshot does -- a limit read past would be a Media field that takes what
 * the Add-on refuses on save.
 */
export function readPhiCapabilityProviderMediaLimits(value: unknown): PhiAddonMediaLimits | undefined {
  if (value === undefined) return undefined;
  if (!isPhiRecord(value)) {
    throw new Error("Invalid server capability provider media limits.");
  }
  const record = value;
  if (Object.keys(record).some((key) => !MEDIA_LIMIT_KEYS.has(key))) {
    throw new Error("Invalid server capability provider media limits.");
  }
  const { maxFileBytes, kinds, maxPerField } = record;
  if (
    (maxFileBytes !== undefined && !isPositiveWholeNumber(maxFileBytes)) ||
    (maxPerField !== undefined && !isPositiveWholeNumber(maxPerField)) ||
    (kinds !== undefined && (
      !Array.isArray(kinds) ||
      kinds.length === 0 ||
      kinds.some((kind) => typeof kind !== "string" || !MEDIA_KINDS.has(kind)) ||
      new Set(kinds).size !== kinds.length
    ))
  ) {
    throw new Error("Invalid server capability provider media limits.");
  }
  return {
    ...(maxFileBytes !== undefined ? { maxFileBytes } : {}),
    ...(kinds !== undefined ? { kinds: [...kinds] as PhiMediaKindValue[] } : {}),
    ...(maxPerField !== undefined ? { maxPerField } : {}),
  };
}
