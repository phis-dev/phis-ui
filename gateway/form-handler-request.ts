import { isPhiRecord } from "../helpers/is-record";
import {
  PHI_THREAD_MESSAGE_OTHER_LANGUAGE_VALUE,
  PHI_THREAD_MESSAGE_SOURCE_LANG_FIELD_KEY,
} from "../components/forms/thread-message-source-lang";

const PATH_PLACEHOLDER = /\{([A-Za-z][A-Za-z0-9_]*)\}/gu;

/** The field keys a handler's `upstreamPath` names as `{key}` segments, in order. */
export function readPhiFormHandlerPathKeys(upstreamPath: string): string[] {
  return [...upstreamPath.matchAll(PATH_PLACEHOLDER)].map((match) => match[1]!);
}

/**
 * Why a handler's `upstreamPath` cannot be filled, or null: a field named in two `{key}` segments would
 * leave the relay two places for one value.
 */
export function readPhiFormHandlerPathError(upstreamPath: string | null): string | null {
  const named = new Set<string>();
  for (const key of upstreamPath ? readPhiFormHandlerPathKeys(upstreamPath) : []) {
    if (named.has(key)) return `field "${key}" is named more than once`;
    named.add(key);
  }
  return null;
}

/**
 * The request a relayed submit makes (FORMS.md, "Request shape"): the path's `{key}` segments filled with
 * those fields' values, percent-encoded, and those fields left out of the body, which is every other value
 * as the Form holds it -- except a message's "Other language", which declares nothing and is left out
 * (THREADS.md section 9). A path value that is empty or no text or number refuses the submit: an address
 * without it is another route.
 */
export function shapePhiFormHandlerRequest(input: {
  upstreamPath: string;
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
  if (values[PHI_THREAD_MESSAGE_SOURCE_LANG_FIELD_KEY] === PHI_THREAD_MESSAGE_OTHER_LANGUAGE_VALUE) {
    delete values[PHI_THREAD_MESSAGE_SOURCE_LANG_FIELD_KEY];
  }
  if (missing) return { error: `The form has no value for "${missing}", which the address of its handler needs.` };
  return { path, body: values };
}
