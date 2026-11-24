import type { PhiFormHandlerProviderDescriptor } from "../types/form-descriptor";
import { isPhiRecord } from "../helpers/is-record";

type PhiFormHandlerRequest = PhiFormHandlerProviderDescriptor["request"];

const PATH_PLACEHOLDER = /\{([A-Za-z][A-Za-z0-9_]*)\}/gu;

/** The field keys a handler's `upstreamPath` names as `{key}` segments, in order. */
export function readPhiFormHandlerPathKeys(upstreamPath: string): string[] {
  return [...upstreamPath.matchAll(PATH_PLACEHOLDER)].map((match) => match[1]!);
}

/**
 * Why a handler's request shape cannot be carried out, or null: a field named twice -- in the path, an
 * object or a flag fold -- would leave the relay two places to put one value, and a bit that is no
 * positive power of two would fold into a number no reader of the flags can take apart.
 */
export function readPhiFormHandlerRequestShapeError(
  upstreamPath: string | null,
  request: PhiFormHandlerRequest,
): string | null {
  const named = new Set<string>();
  const claim = (key: string) => {
    if (named.has(key)) return `field "${key}" is named more than once`;
    named.add(key);
    return null;
  };
  for (const key of upstreamPath ? readPhiFormHandlerPathKeys(upstreamPath) : []) {
    const error = claim(key);
    if (error) return error;
  }
  const bodyKeys = new Set<string>();
  for (const [bodyKey, fields] of Object.entries(request?.objects ?? {})) {
    bodyKeys.add(bodyKey);
    if (fields.length === 0) return `object "${bodyKey}" gathers no field`;
    for (const key of fields) {
      const error = claim(key);
      if (error) return error;
    }
  }
  for (const [bodyKey, bits] of Object.entries(request?.flags ?? {})) {
    if (bodyKeys.has(bodyKey)) return `body key "${bodyKey}" is both an object and a flag fold`;
    if (Object.keys(bits).length === 0) return `flag fold "${bodyKey}" folds no field`;
    for (const [key, bit] of Object.entries(bits)) {
      if (!Number.isSafeInteger(bit) || bit <= 0 || (bit & (bit - 1)) !== 0) {
        return `flag fold "${bodyKey}" gives "${key}" the bit ${bit}, which is no power of two`;
      }
      const error = claim(key);
      if (error) return error;
    }
  }
  return null;
}

/**
 * The request a relayed submit makes: the Form's flat values shaped as the handler declares
 * (`PhiFormHandlerProviderDescriptor.request`) -- the path's `{key}` segments filled and percent-encoded, the
 * named fields gathered or folded -- and everything else left at the top of the body. A path value that is
 * empty or no text or number refuses the submit: an address without it is another route.
 */
export function shapePhiFormHandlerRequest(input: {
  upstreamPath: string;
  request: PhiFormHandlerRequest;
  values: unknown;
}): { path: string; body: Record<string, unknown> } | { error: string } {
  const values: Record<string, unknown> = isPhiRecord(input.values) ? { ...input.values } : {};
  let missing: string | null = null;
  const path = input.upstreamPath.replace(PATH_PLACEHOLDER, (_segment, key: string) => {
    const value = values[key];
    delete values[key];
    const text = typeof value === "number" && Number.isFinite(value) ? String(value) : typeof value === "string" ? value.trim() : "";
    if (!text) missing ??= key;
    return encodeURIComponent(text);
  });
  if (missing) return { error: `The form has no value for "${missing}", which the address of its handler needs.` };
  for (const [bodyKey, fields] of Object.entries(input.request?.objects ?? {})) {
    const gathered: Record<string, unknown> = {};
    for (const key of fields) {
      if (key in values) gathered[key] = values[key];
      delete values[key];
    }
    values[bodyKey] = gathered;
  }
  for (const [bodyKey, bits] of Object.entries(input.request?.flags ?? {})) {
    let folded = 0;
    for (const [key, bit] of Object.entries(bits)) {
      if (values[key] === true) folded |= bit;
      delete values[key];
    }
    values[bodyKey] = folded;
  }
  return { path, body: values };
}
