export const PHIS_INTERNAL_PAGE_SCHEME = "phis:page/" as const;
export const PHIS_INTERNAL_ASSET_SCHEME = "phis:asset/" as const;

export type PhiPageTarget =
  | { kind: "site"; pageScopeId: number }
  | { kind: "module"; ownerModuleId: string; presetKey: string };

export type PhiPageReference = string & { readonly __phiPageReference: unique symbol };

export type PhiInternalReference =
  | { kind: "page"; reference: PhiPageReference; target: PhiPageTarget; fragment: string | null }
  | { kind: "asset"; assetId: number };

/**
 * Where a Control that offers one link leads.
 *
 * Two kinds and no third. A Page is named by its reference, which is identity and outlives the path
 * moving under it; everything else is a literal URL somebody typed. What this refuses is the middle --
 * the root-relative string that reads as external and means internal -- because that is the shape that
 * rots in silence: the Page moves, the string does not, and nothing in the system ever knew the two were
 * related. `REFERENCES.md`, "Stable internal targets", states the same refusal for navigation authoring;
 * this is it as a type.
 *
 * `newTab` sits inside the target rather than beside it. A Widget that offers two links -- a Card with a
 * heading and an action -- otherwise grows one flag per link and names them in parallel (`newTab`,
 * `actionNewTab`, and a third the day a third link lands). That is one decision written twice, and it
 * drifts the first time only one of the two is read.
 */
export type PhiLinkTarget =
  | { kind: "page"; reference: PhiPageReference; fragment?: string | null; newTab?: boolean }
  | { kind: "external"; href: string; newTab?: boolean };

/**
 * The field names a stored link target may stand under, and nothing else identifies one in persisted
 * config.
 *
 * The Asset rule in `REFERENCES.md` is the precedent and the reason: the server's reference collector
 * reads persisted JSON, not the Widget catalogue, so it cannot ask a plugin which of its fields hold
 * targets. A Widget that keeps one under another name authors a reference the delete guard cannot see,
 * and the Page it points at can be removed while the Widget still draws a link to it.
 *
 * One plain name for the single-link case and a suffix for the rest, so a Card's second link is
 * `actionLinkTarget` and is found by the same rule that finds the first.
 */
export const PHI_LINK_TARGET_CONFIG_KEY = "linkTarget";
const PHI_LINK_TARGET_CONFIG_KEY_SUFFIX = "LinkTarget";

export function isPhiLinkTargetConfigKey(key: string) {
  return key === PHI_LINK_TARGET_CONFIG_KEY
    || (key.endsWith(PHI_LINK_TARGET_CONFIG_KEY_SUFFIX) && key.length > PHI_LINK_TARGET_CONFIG_KEY_SUFFIX.length);
}

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
  return `${PHIS_INTERNAL_PAGE_SCHEME}${reference}${normalizedFragment ? `#${encodeURIComponent(normalizedFragment)}` : ""}`;
}

export function createPhiAssetUri(assetId: number) {
  if (!isPositiveInteger(assetId)) {
    throw new Error("Phi Asset ids must be positive integers.");
  }
  return `${PHIS_INTERNAL_ASSET_SCHEME}${assetId}`;
}

/**
 * Whether a string may be kept as an external target.
 *
 * Absolute, or an anchor on the document the reader already has. Everything else is refused, and the
 * refusal is the whole point rather than strictness for its own sake: a stored `/pricing` is a Page link
 * that has thrown its identity away, and one of them is enough to give the Site a second internal format
 * -- one the resolver cannot resolve, the index cannot see, and the delete guard cannot warn about.
 *
 * This is deliberately not `isPhiExternalHref`. That one answers a rendering question about an href that
 * already exists -- does this need a plain anchor rather than client navigation. This answers whether a
 * value may be written down at all. Collapsing them would make every string that renders acceptably into
 * a string the Site is allowed to keep, which is how the middle shape gets back in.
 *
 * The reserved scheme is rejected here in its plain form only. Normalising the encodings it can hide in
 * belongs to the server's sanitizer, which sees the whole document; this is the near guard, so a target
 * never carries an unresolved `phis:` URI in the field where a literal URL belongs.
 */
const PHI_STORABLE_EXTERNAL_HREF_PATTERN = /^(?:https?:\/\/|\/\/|mailto:|tel:|#)/iu;

export function isPhiStorableExternalHref(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0
    && !trimmed.toLowerCase().startsWith("phis:")
    && PHI_STORABLE_EXTERNAL_HREF_PATTERN.test(trimmed);
}

/**
 * A stored link target, read back under the contract rather than trusted.
 *
 * Anything that is not one of the two shapes answers `null`, and a Control that gets `null` draws no
 * link at all. That is the same answer the contract gives for a Page reference that no longer resolves:
 * non-interactive text beats a link that goes somewhere nobody chose.
 */
export function readPhiLinkTarget(value: unknown): PhiLinkTarget | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  const newTab = record.newTab === true ? { newTab: true as const } : {};
  if (record.kind === "page") {
    const parsed = readPhiPageReference(record.reference);
    if (!parsed) {
      return null;
    }
    const fragment = typeof record.fragment === "string" ? record.fragment.replace(/^#/u, "").trim() : "";
    return { kind: "page", reference: parsed.reference, ...(fragment ? { fragment } : {}), ...newTab };
  }
  if (record.kind === "external") {
    const href = typeof record.href === "string" ? record.href.trim() : "";
    return isPhiStorableExternalHref(href) ? { kind: "external", href, ...newTab } : null;
  }
  return null;
}

export function readPhiInternalReference(value: unknown): PhiInternalReference | null {
  if (typeof value !== "string") {
    return null;
  }
  if (value.startsWith(PHIS_INTERNAL_ASSET_SCHEME)) {
    const id = value.slice(PHIS_INTERNAL_ASSET_SCHEME.length);
    return /^[1-9]\d*$/u.test(id) && Number.isSafeInteger(Number(id))
      ? { kind: "asset", assetId: Number(id) }
      : null;
  }
  if (!value.startsWith(PHIS_INTERNAL_PAGE_SCHEME)) {
    return null;
  }
  const [encodedReference, ...fragmentParts] = value.slice(PHIS_INTERNAL_PAGE_SCHEME.length).split("#");
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
