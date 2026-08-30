export const PHI_INTERNAL_PAGE_SCHEME = "phi:page/" as const;
export const PHI_INTERNAL_ASSET_SCHEME = "phi:asset/" as const;

export type PhiPageTarget =
  | { kind: "site"; pageScopeId: number }
  | { kind: "module"; ownerModuleId: string; presetKey: string };

export type PhiPageReference = string & { readonly __phiPageReference: unique symbol };

export type PhiInternalReference =
  | { kind: "page"; reference: PhiPageReference; target: PhiPageTarget; fragment: string | null }
  | { kind: "asset"; assetId: number };

type SerializedPageTarget =
  | { v: 1; k: "s"; i: number }
  | { v: 1; k: "m"; m: string; p: string };

const PHI_PAGE_REFERENCE_PREFIX = "v1.";
const PHI_MODULE_ID_PATTERN = /^@[^/]+\/[^/]+(?:\/[^/]+)*$/;

function encodeBase64Url(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]!);
  }
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

function decodeBase64Url(value: string) {
  if (!/^[A-Za-z0-9_-]+$/u.test(value)) {
    return null;
  }
  const padded = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  try {
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function parseSerializedPageTarget(value: unknown): PhiPageTarget | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  if (record.v !== 1) {
    return null;
  }
  if (record.k === "s" && isPositiveInteger(record.i)) {
    return { kind: "site", pageScopeId: record.i };
  }
  if (
    record.k === "m" &&
    typeof record.m === "string" &&
    PHI_MODULE_ID_PATTERN.test(record.m) &&
    typeof record.p === "string" &&
    record.p.trim().length > 0
  ) {
    return { kind: "module", ownerModuleId: record.m, presetKey: record.p };
  }
  return null;
}

export function createPhiPageReference(target: PhiPageTarget): PhiPageReference {
  const serialized: SerializedPageTarget = target.kind === "site"
    ? { v: 1, k: "s", i: target.pageScopeId }
    : { v: 1, k: "m", m: target.ownerModuleId, p: target.presetKey };
  const validated = parseSerializedPageTarget(serialized);
  if (!validated) {
    throw new Error("Invalid Phi Page target.");
  }
  return `${PHI_PAGE_REFERENCE_PREFIX}${encodeBase64Url(JSON.stringify(serialized))}` as PhiPageReference;
}

export function readPhiPageReference(value: unknown): { reference: PhiPageReference; target: PhiPageTarget } | null {
  if (typeof value !== "string" || !value.startsWith(PHI_PAGE_REFERENCE_PREFIX)) {
    return null;
  }
  const decoded = decodeBase64Url(value.slice(PHI_PAGE_REFERENCE_PREFIX.length));
  if (!decoded) {
    return null;
  }
  try {
    const target = parseSerializedPageTarget(JSON.parse(decoded));
    return target ? { reference: value as PhiPageReference, target } : null;
  } catch {
    return null;
  }
}

export function createPhiPageUri(reference: PhiPageReference, fragment?: string | null) {
  if (!readPhiPageReference(reference)) {
    throw new Error("Invalid Phi Page reference.");
  }
  const normalizedFragment = fragment?.replace(/^#/u, "").trim();
  return `${PHI_INTERNAL_PAGE_SCHEME}${reference}${normalizedFragment ? `#${encodeURIComponent(normalizedFragment)}` : ""}`;
}

export function createPhiAssetUri(assetId: number) {
  if (!isPositiveInteger(assetId)) {
    throw new Error("Phi Asset ids must be positive integers.");
  }
  return `${PHI_INTERNAL_ASSET_SCHEME}${assetId}`;
}

export function readPhiInternalReference(value: unknown): PhiInternalReference | null {
  if (typeof value !== "string") {
    return null;
  }
  if (value.startsWith(PHI_INTERNAL_ASSET_SCHEME)) {
    const id = value.slice(PHI_INTERNAL_ASSET_SCHEME.length);
    return /^[1-9]\d*$/u.test(id) && Number.isSafeInteger(Number(id))
      ? { kind: "asset", assetId: Number(id) }
      : null;
  }
  if (!value.startsWith(PHI_INTERNAL_PAGE_SCHEME)) {
    return null;
  }
  const [encodedReference, ...fragmentParts] = value.slice(PHI_INTERNAL_PAGE_SCHEME.length).split("#");
  const parsed = readPhiPageReference(encodedReference);
  if (!parsed) {
    return null;
  }
  try {
    const fragment = fragmentParts.length > 0 ? decodeURIComponent(fragmentParts.join("#")) : null;
    return { kind: "page", ...parsed, fragment };
  } catch {
    return null;
  }
}
