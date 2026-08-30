import type { PhiBlockRuntime } from "../../../types";
import type { PhiGlobalTranslatorOptions } from "../../../gateway/tr";

export function buildPhiWidgetLabelTranslatorOptions(
  runtime: Pick<PhiBlockRuntime, "phis" | "locale" | "site">,
): PhiGlobalTranslatorOptions {
  return {
    apiBaseUrl: runtime.phis.apiBaseUrl,
    internalToken: runtime.phis.internalToken,
    locale: runtime.locale.current,
  };
}
