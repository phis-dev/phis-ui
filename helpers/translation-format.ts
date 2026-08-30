export type PhiTranslationParamValue = string | number;

export type PhiTranslationParams =
  | Record<string, PhiTranslationParamValue>
  | PhiTranslationParamValue[]
  | PhiTranslationParamValue
  | 0
  | undefined;

export function formatPhiTranslation(input: string, params: PhiTranslationParams = 0) {
  if (!params) {
    return input;
  }

  const text = String(input);

  if (Array.isArray(params)) {
    return params.reduce<string>((current, value, index) => {
      const tokenIndex = index + 1;
      return current
        .replaceAll(`%${tokenIndex}`, String(value))
        .replaceAll(`{${index}}`, String(value));
    }, text);
  }

  if (typeof params === "object") {
    return Object.entries(params).reduce(
      (current, [key, value]) => current.replaceAll(`{${key}}`, String(value)),
      text,
    );
  }

  return text.replaceAll("%1", String(params)).replaceAll("{0}", String(params));
}
