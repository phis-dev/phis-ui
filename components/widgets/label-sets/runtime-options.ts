import type { PhiBlockRuntime } from "../../../types";
import type { PhiGlobalTranslatorOptions } from "../../../gateway/tr";
import { readPhiServerApiCredentials } from "../../../helpers/phis-server-credentials";

export function buildPhiWidgetLabelTranslatorOptions(
  runtime: Pick<PhiBlockRuntime, "locale" | "site">,
): PhiGlobalTranslatorOptions {
  return {
    apiBaseUrl: readPhiServerApiCredentials().apiBaseUrl,
    internalToken: readPhiServerApiCredentials().internalToken,
    locale: runtime.locale.current,
  };
}
