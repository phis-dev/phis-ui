export type PhiTranslationParamValue = string | number;

export type PhiTranslationParams =
  | Record<string, PhiTranslationParamValue>
  | PhiTranslationParamValue[]
  | PhiTranslationParamValue
  | 0
  | undefined;

/** `%1`, `%2`, … (one-based) and `{0}`, `{1}`, … (zero-based) name a position; `{key}` names a key. */
const INDEXED_TOKEN_PATTERN = /%(\d+)|\{(\d+)\}/g;
const NAMED_TOKEN_PATTERN = /\{([^{}]+)\}/g;

/**
 * Read in one pass rather than token by token, as `resolvePhiTextPlaceholders` reads: `%1` is the start
 * of `%10`, so replacing one token after another ate the tenth value's token with the first's, and a
 * value that itself contained `%2` was replaced again by the next step. A token nothing answers stays
 * as it is.
 */
export function formatPhiTranslation(input: string, params: PhiTranslationParams = 0) {
  if (!params) {
    return input;
  }

  const text = String(input);

  if (Array.isArray(params)) {
    return text.replace(INDEXED_TOKEN_PATTERN, (token, position: string | undefined, index: string | undefined) => {
      const at = position !== undefined ? Number(position) - 1 : Number(index);
      return at >= 0 && at < params.length ? String(params[at]) : token;
    });
  }

  if (typeof params === "object") {
    return text.replace(NAMED_TOKEN_PATTERN, (token, key: string) =>
      Object.prototype.hasOwnProperty.call(params, key) ? String(params[key]) : token,
    );
  }

  return text.replace(INDEXED_TOKEN_PATTERN, (token, position: string | undefined, index: string | undefined) =>
    position === "1" || index === "0" ? String(params) : token,
  );
}
