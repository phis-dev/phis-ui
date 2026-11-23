/*
 * Apart from `money-field.ts` because the Form reads it for every field it draws, to know what to
 * watch: that file brings the currency table and the config reader, which a Form without a money field
 * has no use for.
 */

/**
 * The Form field a money field takes its currency from, or `null` for one that states its own: what the
 * Form watches for it, read as loosely as a list of watched keys needs and as strictly as the field's
 * own Control reads it once drawn.
 */
export function readPhiMoneyFieldCurrencyFieldKey(config: Readonly<Record<string, unknown>> | undefined): string | null {
  const key = config?.currencyField;
  return typeof key === "string" && key !== "" ? key : null;
}
